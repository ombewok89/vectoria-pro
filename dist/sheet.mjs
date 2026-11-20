export const luminance=(pixels,i)=>Math.round(pixels[i]*.213+pixels[i+1]*.715+pixels[i+2]*.072);
const rgbLuminance=rgb=>luminance(rgb,0);

export function detectInkPaper(pixels,w,h){
  const corners=[0,w-1,w*(h-1),w*h-1];
  if(corners.some(i=>pixels[i*4+3]!==255||luminance(pixels,i*4)<225))return null;
  const dark=new Map(),light=new Map(),grid=new Map();
  let total=0,neutral=0,paper=0,ink=0;
  for(let i=0;i<pixels.length;i+=76){
    total++;
    if(pixels[i+3]!==255)return null;
    const r=pixels[i],g=pixels[i+1],b=pixels[i+2];
    if(Math.max(r,g,b)-Math.min(r,g,b)<=16)neutral++;
    const value=luminance(pixels,i);
    const color=(r<<16)|(g<<8)|b;
    if(value<=32){dark.set(color,(dark.get(color)??0)+1);ink++;}
    if(value>=225){light.set(color,(light.get(color)??0)+1);paper++;}
    if(value>=250)grid.set(color,(grid.get(color)??0)+1);
  }
  if(neutral<total*.99||paper<total*.55||ink<total*.012||ink+paper<total*.93)return null;
  function dominant(samples){
    let most=0,chosen=0;
    for(const [color,count] of samples){
      if(count>most){most=count;chosen=color;}
    }
    return [chosen>>16,(chosen>>8)&255,chosen&255];
  }
  const inkColor=dominant(dark),paperColor=dominant(light);
  const accentColor=grid.size?dominant(grid):null;
  const paperLuma=rgbLuminance(paperColor),accentLuma=accentColor?rgbLuminance(accentColor):0;
  return {
    inkColor,paperColor,inkThreshold:Math.round((rgbLuminance(inkColor)+paperLuma)/2),
    accent:accentLuma-paperLuma>=6?{color:accentColor,threshold:Math.ceil((paperLuma+accentLuma)/2)}:null
  };
}

function inferBackground(pixels,w,h){
  const bins=new Map();
  let transparent=0,total=0;
  function sample(x,y){
    const p=(y*w+x)*4;
    total++;
    if(pixels[p+3]<48){transparent++;return;}
    const r=pixels[p],g=pixels[p+1],b=pixels[p+2];
    const key=(r>>4)*256+(g>>4)*16+(b>>4);
    const bin=bins.get(key)??[0,0,0,0];
    bin[0]+=r;bin[1]+=g;bin[2]+=b;bin[3]++;
    bins.set(key,bin);
  }
  for(let x=0;x<w;x+=2){sample(x,0);sample(x,h-1);}
  for(let y=0;y<h;y+=2){sample(0,y);sample(w-1,y);}
  if(transparent>total*.30)return {transparent:true};
  const best=[...bins.values()].sort((a,b)=>b[3]-a[3])[0];
  if(!best||best[3]<total*.52)
    throw Error("Latar lembar sulit dikenali. Gunakan PNG transparan, latar polos, atau mode kisi manual.");
  const [r,g,b,count]=best;
  return {color:[r/count,g/count,b/count]};
}

function matches(pixels,p,bg,tolerance){
  if(pixels[p+3]<40)return true;
  if(bg.transparent||!bg.color)return false;
  return bg.color.every((value,i)=>Math.abs(pixels[p+i]-value)<=tolerance);
}

function bands(projection,gap){
  const result=[];
  let start=-1,last=-1;
  for(let i=0;i<projection.length;i++){
    if(!projection[i])continue;
    if(start>=0&&i-last-1>=gap){result.push([start,last+1]);start=-1;}
    if(start<0)start=i;
    last=i;
  }
  if(start>=0)result.push([start,last+1]);
  return result;
}

function bounds(mask,w,x0,y0,x1,y1){
  let left=x1,top=y1,right=x0,bottom=y0,area=0;
  for(let y=y0;y<y1;y++){
    for(let x=x0;x<x1;x++){
      if(!mask[y*w+x])continue;
      left=Math.min(left,x);right=Math.max(right,x+1);
      top=Math.min(top,y);bottom=Math.max(bottom,y+1);area++;
    }
  }
  return {x:left,y:top,w:right-left,h:bottom-top,area};
}

export function detectIcons(pixels,w,h){
  const background=inferBackground(pixels,w,h);
  const inkPaper=detectInkPaper(pixels,w,h);
  const mask=new Uint8Array(w*h);
  for(let i=0;i<mask.length;i++)mask[i]=inkPaper?luminance(pixels,i*4)<inkPaper.inkThreshold:!matches(pixels,i*4,background,23);
  // Ignore isolated dust without treating a thin continuous stroke as noise.
  for(let y=1;y<h-1;y++){
    for(let x=1;x<w-1;x++){
      const i=y*w+x;
      if(mask[i]&&!mask[i-1]&&!mask[i+1]&&!mask[i-w]&&!mask[i+w])mask[i]=0;
    }
  }
  const minGap=Math.max(3,Math.min(12,Math.round(Math.min(w,h)*.006)));
  const rows=new Uint16Array(h),columns=new Uint16Array(w);
  for(let y=0;y<h;y++){
    for(let x=0;x<w;x++)if(mask[y*w+x]){rows[y]++;columns[x]++;}
  }
  const rowBands=bands(rows,minGap),columnBands=bands(columns,minGap);
  const output=[];
  function add(x0,y0,x1,y1){
    const box=bounds(mask,w,x0,y0,x1,y1);
    if(box.area<12||box.w<3||box.h<3)return;
    const margin=Math.max(1,Math.round(Math.max(box.w,box.h)*.045));
    const x=Math.max(x0,box.x-margin),y=Math.max(y0,box.y-margin);
    output.push({x,y,w:Math.min(x1,box.x+box.w+margin)-x,h:Math.min(y1,box.y+box.h+margin)-y});
  }
  function padded(groups,i,size){
    const [start,end]=groups[i];
    return [i?Math.floor((groups[i-1][1]+start)/2):0,
      i+1<groups.length?Math.floor((end+groups[i+1][0])/2):size];
  }
  if(rowBands.length&&columnBands.length>1&&rowBands.length>1&&rowBands.length*columnBands.length<=400){
    rowBands.forEach((_,row)=>{
      const [top,bottom]=padded(rowBands,row,h);
      columnBands.forEach((_,column)=>{
        const [left,right]=padded(columnBands,column,w);
        add(left,top,right,bottom);
      });
    });
  }else{
    rowBands.forEach(([start,end],row)=>{
      const horizontal=new Uint16Array(w);
      for(let y=start;y<end;y++){
        for(let x=0;x<w;x++)horizontal[x]+=mask[y*w+x];
      }
      const local=bands(horizontal,minGap);
      const [top,bottom]=padded(rowBands,row,h);
      local.forEach((_,column)=>{
        const [left,right]=padded(local,column,w);
        add(left,top,right,bottom);
      });
    });
  }
  if(output.length>400)throw Error("Terlalu banyak potongan. Bagi lembar menjadi beberapa bagian.");
  return {background,boxes:output,inkPaper};
}

export function gridIcons(w,h,rows,columns){
  const boxes=[];
  for(let row=0;row<rows;row++){
    for(let col=0;col<columns;col++){
      const x=Math.floor(col*w/columns),y=Math.floor(row*h/rows);
      boxes.push({x,y,w:Math.floor((col+1)*w/columns)-x,h:Math.floor((row+1)*h/rows)-y});
    }
  }
  return boxes;
}

export function removeBorderColor(pixels,w,h,bg,tolerance=24){
  if(!bg?.color)return;
  const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
  let read=0,write=0;
  function visit(i){
    if(seen[i])return;
    seen[i]=1;
    const offset=i*4;
    const backgroundPixel=tolerance===0
      ? pixels[offset+3]===0||(pixels[offset+3]===255&&bg.color.every((value,channel)=>Math.round(value)===pixels[offset+channel]))
      : matches(pixels,offset,bg,tolerance);
    if(backgroundPixel){
      pixels[i*4+3]=0;
      queue[write++]=i;
    }
  }
  for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}
  for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
  while(read<write){
    const i=queue[read++],x=i%w;
    if(x)visit(i-1);
    if(x<w-1)visit(i+1);
    if(i>=w)visit(i-w);
    if(i<w*(h-1))visit(i+w);
  }
}
