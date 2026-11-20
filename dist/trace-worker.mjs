import {vectorize} from "./trace.mjs?v=26";

self.onmessage=event=>{
  const {id,pixels,w,h,settings}=event.data;
  try {
    const result=vectorize(pixels,w,h,settings,value=>self.postMessage({id,progress:value}));
    self.postMessage({id,result},result.mesh?.map(row=>row.stops.buffer)??[]);
  } catch (error) {
    self.postMessage({id,error:error.message});
  }
};
