import {resample} from "./resample.mjs?v=14";

const limit=(value,min,max)=>Math.max(min,Math.min(max,value));

export function upscaleDetail(pixels,w,h,width,height,enhance){
  const output=resample(pixels,w,h,width,height,enhance);
  if(!enhance||width<3||height<3)return output;

  // Keep luminance premultiplied so outside pixels cannot outline transparent artwork.
  const light=new Uint8Array(width*height);
  for(let i=0;i<light.length;i++){
    const p=i*4;
    light[i]=Math.round((.2126*output[p]+.7152*output[p+1]+.0722*output[p+2])*output[p+3]/255);
  }
  const step=limit(Math.round(Math.min(width/w,height/h)*.75),1,3);
  const span=step*width;
  function sample(x,y){
    const u=Math.floor(x),v=Math.floor(y),dx=x-u,dy=y-v,i=v*width+u;
    return (light[i]*(1-dx)+light[i+1]*dx)*(1-dy)+(light[i+width]*(1-dx)+light[i+width+1]*dx)*dy;
  }

  // Follow strong edges along the tangent, then recover contrast across the edge.
  for(let y=step;y<height-step;y++){
    for(let x=step;x<width-step;x++){
      const i=y*width+x,p=i*4;
      if(output[p+3]<250)continue;
      const center=light[i],left=light[i-step],right=light[i+step],top=light[i-span],bottom=light[i+span];
      const gx=right-left,gy=bottom-top,strength=Math.hypot(gx,gy);
      if(strength<14)continue;
      const nx=gx/strength,ny=gy/strength;
      const tangent=(sample(x-ny*step*.85,y+nx*step*.85)+sample(x+ny*step*.85,y-nx*step*.85))*.5;
      const normal=(sample(x-nx*step*.9,y-ny*step*.9)+sample(x+nx*step*.9,y+ny*step*.9))*.5;
      const low=Math.min(center,left,right,top,bottom),high=Math.max(center,left,right,top,bottom);
      const corrected=limit(center+limit((tangent-center)*.6,-9,9)+(center-normal)*.55,low,high);
      const minChannel=Math.min(output[p],output[p+1],output[p+2]);
      const maxChannel=Math.max(output[p],output[p+1],output[p+2]);
      const delta=Math.round(limit(corrected-center,Math.max(-15,-minChannel),Math.min(15,255-maxChannel)));
      output[p]+=delta;
      output[p+1]+=delta;
      output[p+2]+=delta;
    }
  }
  return output;
}
