import {upscaleDetail} from "./upscale-detail.mjs?v=1";
self.onmessage=({data:{pixels,w,h,width,height,sharp}})=>{
  try{
    const output=upscaleDetail(pixels,w,h,width,height,sharp);
    self.postMessage({output},[output.buffer]);
  }catch(error){self.postMessage({error:error.message});}
};
