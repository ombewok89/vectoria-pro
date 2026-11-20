const clamp=value=>Math.max(0,Math.min(255,Math.round(value)));
const paint=rgb=>"#"+rgb.map(value=>clamp(value).toString(16).padStart(2,"0")).join("");

export function hasShading(pixels,w,h){
  const histogram=new Uint32Array(4096);
  let samples=0;
  for(let y=2;y<h;y+=6){
    for(let x=2;x<w;x+=6){
      const p=(y*w+x)*4;
      if(pixels[p+3]<128)continue;
      histogram[(pixels[p]>>4)*256+(pixels[p+1]>>4)*16+(pixels[p+2]>>4)]++;
      samples++;
    }
  }
  const colors=[...histogram].filter(count=>count>=Math.max(2,samples*.00035)).sort((a,b)=>b-a);
  return colors.length>115&&colors.slice(0,12).reduce((sum,count)=>sum+count,0)<samples*.76;
}

export function fitRegionTones(labels,pixels,w,h){
  const ids=new Uint32Array(w*h),queue=new Int32Array(w*h),gradients=[null];
  for(let start=0;start<labels.length;start++){
    const label=labels[start];
    if(!label||ids[start])continue;
    const id=gradients.length;
    ids[start]=id;queue[0]=start;
    let length=1,xSum=0,ySum=0,xx=0,yy=0,xy=0,dx=0,dy=0,gx=0,gy=0;
    const sum=[0,0,0],xc=[0,0,0],yc=[0,0,0],deviation=[0,0,0];
    function visit(index){
      if(!ids[index]&&labels[index]===label){ids[index]=id;queue[length++]=index;}
    }
    for(let i=0;i<length;i++){
      const p=queue[i],col=p%w,row=Math.floor(p/w);
      if(col)visit(p-1);
      if(col<w-1)visit(p+1);
      if(row)visit(p-w);
      if(row<h-1)visit(p+w);
      if(i%2)continue;
      xSum+=col;ySum+=row;xx+=col*col;yy+=row*row;xy+=col*row;
      for(let c=0;c<3;c++){
        const value=pixels[4*p+c];
        sum[c]+=value;xc[c]+=col*value;yc[c]+=row*value;deviation[c]+=value*value;
      }
    }
    const n=Math.ceil(length/2),x=xSum/n,y=ySum/n;
    const vxx=xx/n-x*x,vyy=yy/n-y*y,vxy=xy/n-x*y,det=vxx*vyy-vxy*vxy;
    if(n<42||det<4){gradients.push(null);continue;}
    const mean=sum.map(value=>value/n),slopes=[];
    let energy=0;
    for(let c=0;c<3;c++){
      const a=xc[c]/n-x*mean[c],b=yc[c]/n-y*mean[c];
      const sx=(a*vyy-b*vxy)/det,sy=(b*vxx-a*vxy)/det;
      const predicted=a*sx+b*sy;
      slopes.push([sx,sy]);
      if(predicted>energy){energy=predicted;dx=sx;dy=sy;}
    }
    const magnitude=Math.hypot(dx,dy);
    if(energy<1.7||magnitude<1e-6){gradients.push(null);continue;}
    gx=dx/magnitude;gy=dy/magnitude;
    const spread=Math.sqrt(gx*gx*vxx+gy*gy*vyy+2*gx*gy*vxy);
    if(spread<1){gradients.push(null);continue;}
    const left=[],right=[];
    for(let c=0;c<3;c++){
      const sigma=Math.sqrt(Math.max(0,deviation[c]/n-mean[c]*mean[c]));
      const amount=(slopes[c][0]*gx+slopes[c][1]*gy)*spread*2;
      const delta=Math.max(-1.6*sigma,Math.min(1.6*sigma,amount));
      left.push(mean[c]-delta);right.push(mean[c]+delta);
    }
    const startColor=paint(left),endColor=paint(right);
    gradients.push(startColor===endColor?null:{
      x1:x-gx*spread*2,y1:y-gy*spread*2,x2:x+gx*spread*2,y2:y+gy*spread*2,
      startColor,endColor
    });
  }
  return {ids,gradients};
}

export function smoothTonePixels(pixels,w,h){
  const work=pixels.slice(),result=pixels.slice();
  const radius=6,range=44;
  function pass(source,target,vertical){
    const step=vertical?w:1;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const count=vertical?h:w,index=vertical?y:x;
        const p=(y*w+x)*4;
        if(source[p+3]<128)continue;
        const r=source[p],g=source[p+1],b=source[p+2];
        let mr=r*6,mg=g*6,mb=b*6,total=6;
        for(let i=Math.max(-radius,-index);i<=Math.min(radius,count-index-1);i++){
          if(!i)continue;
          const n=p+i*step*4;
          if(source[n+3]<128)continue;
          const dr=source[n]-r,dg=source[n+1]-g,db=source[n+2]-b;
          const contrast=Math.max(Math.abs(dr),Math.abs(dg),Math.abs(db));
          if(contrast>=range)continue;
          const weight=(radius+1-Math.abs(i))*(1-contrast/range);
          mr+=source[n]*weight;mg+=source[n+1]*weight;mb+=source[n+2]*weight;total+=weight;
        }
        target[p]=mr/total;target[p+1]=mg/total;target[p+2]=mb/total;
      }
    }
  }
  pass(pixels,work,false);
  pass(work,result,true);
  return result;
}
