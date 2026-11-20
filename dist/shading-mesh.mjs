import {resample} from "./resample.mjs?v=14";

const channels=[0,1,2];
const luma=(pixels,i)=>Math.round(.2126*pixels[i]+.7152*pixels[i+1]+.0722*pixels[i+2]);

export function hasSmoothShading(pixels,w,h){
  // Gradasi yang sangat halus berubah terlalu sedikit pada jarak ±3 px untuk
  // terbaca sebagai tren, jadi tren juga diukur pada jarak yang lebih lebar
  // memakai rata-rata blok tegak lurus agar derau JPEG tidak ikut terbaca.
  const step=Math.max(6,Math.min(30,Math.round(Math.min(w,h)/48)));
  const margin=step+2;
  let continuous=0,total=0;
  for(let y=margin;y<h-margin;y+=4){
    for(let x=margin;x<w-margin;x+=4){
      const i=(y*w+x)*4;
      if(pixels[i+3]<250)continue;
      total++;
      const horizontal=trend(i,12),vertical=trend(i,w*12);
      if(horizontal||vertical||wideTrend(x,y))continuous++;
    }
  }
  return total>=40&&continuous/total>.12;

  function trend(i,step){
    return channels.some(c=>{
      const a=pixels[i+c]-pixels[i+c-step],b=pixels[i+c+step]-pixels[i+c];
      return a*b>0&&Math.min(Math.abs(a),Math.abs(b))>=2&&Math.max(Math.abs(a),Math.abs(b))<=22;
    });
  }
  function wideTrend(x,y){
    const minDelta=Math.max(1.8,step/10),maxDelta=step*1.6;
    const avgH=(cx,cy,c)=>{let s=0;for(const o of[-1,0,1])s+=pixels[((cy+o)*w+cx)*4+c];return s/3;};
    const avgV=(cx,cy,c)=>{let s=0;for(const o of[-1,0,1])s+=pixels[(cy*w+cx+o)*4+c];return s/3;};
    const runs=(a,m,b)=>{
      const d1=m-a,d2=b-m;
      return d1*d2>0&&Math.min(Math.abs(d1),Math.abs(d2))>=minDelta&&Math.max(Math.abs(d1),Math.abs(d2))<=maxDelta;
    };
    const spread=(c)=>{
      let mn=255,mx=0;
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const v=pixels[((y+dy)*w+x+dx)*4+c];
        if(v<mn)mn=v;
        if(v>mx)mx=v;
      }
      return mx-mn;
    };
    return channels.some(c=>spread(c)<=12&&(
      runs(avgH(x-step,y,c),avgH(x,y,c),avgH(x+step,y,c))||
      runs(avgV(x,y-step,c),avgV(x,y,c),avgV(x,y+step,c))));
  }
}

export function wantsSmoothShading(pixels,w,h,settings){
  if(settings.contourOutput)return false;
  if(settings.mode==="mono"){
    if(settings.monoStyle==="tone")return true;
    if(settings.monoStyle==="ink"||!settings.monoAuto||settings.monoInvert||settings.monoBackground==="transparent")return false;
  }else{
    if(settings.removeWhite||settings.isolatedPaper)return false;
    if(settings.profile==="gradient")return true;
    if(settings.profile!=="auto")return false;
  }
  return hasSmoothShading(pixels,w,h);
}

export function canUseMesh(pixels,w,h){
  if(w<2||h<2)return false;
  for(let i=3;i<pixels.length;i+=4)if(pixels[i]!==255)return false;
  return true;
}

function meshSamples(pixels,w,h,cols,height,gray,hd){
  const source=w===cols&&h===height?pixels:resample(pixels,w,h,cols,height,hd);
  const samples=new Uint8Array(cols*height*3);
  const light=Uint8Array.from({length:cols*height},(_,i)=>luma(source,i*4));
  for(let y=0;y<height;y++){
    for(let x=0;x<cols;x++){
      const i=y*cols+x,from=i*4,to=i*3;
      let adjustment=0;
      if(hd&&y>0&&y<height-1&&x>0&&x<cols-1){
        const offset=cols*2;
        const left=i-Math.min(2,x),right=i+Math.min(2,cols-1-x);
        const top=y>1?i-offset:i-cols,bottom=y<height-2?i+offset:i+cols;
        const middle=light[i],average=(light[left]+light[right]+light[top]+light[bottom])*.25;
        const detail=middle-average;
        if(Math.abs(detail)>2){
          const min=Math.min(source[from],source[from+1],source[from+2]);
          const max=Math.max(source[from],source[from+1],source[from+2]);
          adjustment=Math.round(Math.min(255-max,4,Math.max(-min,-4,detail*.32)));
        }
      }
      for(const c of channels)samples[to+c]=(gray?light[i]:source[from+c])+adjustment;
    }
  }
  return samples;
}

export function shadingMesh(pixels,w,h,{detail,gray,hd},progress){
  const scale=Math.min(hd?2:1,(hd?1536:1200)/Math.max(w,h),Math.sqrt(1.8e6/(w*h)));
  const cols=Math.max(2,Math.round(w*scale)),height=Math.max(2,Math.round(h*scale));
  const samples=meshSamples(pixels,w,h,cols,height,gray,hd);
  const maxSpan=[14,11,8,6,4][detail]*(hd?2:1),verticalError=[19,14,8,6,5][detail],
    horizontalError=[8,6,3,2,2][detail];
  const stride=cols*3,rows=[];
  function addRows(a,b){
    if(b-a<2){rows.push(a);return;}
    let split=false;
    // Test every interior row so a small highlight between sampled rows is still retained.
    for(let y=a+1;y<b&&!split;y++){
      const t=(y-a)/(b-a);
      for(let x=0;x<stride;x++){
        const error=Math.abs(samples[y*stride+x]-((1-t)*samples[a*stride+x]+t*samples[b*stride+x]));
        if(error>verticalError){split=true;break;}
      }
    }
    if(split){
      const middle=(a+b)>>1;
      addRows(a,middle);addRows(middle,b);
    }else rows.push(a);
  }
  for(let y=0;y<height-1;y+=maxSpan)addRows(y,Math.min(height-1,y+maxSpan));
  rows.push(height-1);
  progress(.55);
  let points=0;
  const mesh=rows.map((y,index)=>{
    const row=samples.subarray(y*stride,(y+1)*stride),kept=[0];
    const stack=[[0,cols-1]];
    while(stack.length){
      const [a,b]=stack.pop();
      let worst=horizontalError,chosen=-1;
      for(let x=a+1;x<b;x++){
        const t=(x-a)/(b-a);
        for(const c of channels){
          const error=Math.abs(row[x*3+c]-((1-t)*row[a*3+c]+t*row[b*3+c]));
          if(error>worst){worst=error;chosen=x;}
        }
      }
      if(chosen!==-1)stack.push([chosen,b],[a,chosen]);
      else kept.push(b);
    }
    points+=kept.length;
    if(index%32===0)progress(.55+.42*index/rows.length);
    const stops=new Uint8Array(kept.length*5);
    kept.forEach((x,i)=>{
      const at=i*5;
      stops[at]=x&255;
      stops[at+1]=x>>8;
      stops.set(row.subarray(x*3,x*3+3),at+2);
    });
    return {y:(y+.5)*h/height,stops};
  });
  return {w,h,mesh,meshColumns:cols,layers:[],points,objects:mesh.length-1};
}
