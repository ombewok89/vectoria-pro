function kernel(x,sharp){
  const a=Math.abs(x);
  if(a>=2)return 0;
  if(sharp){
    if(!a)return 1;
    const t=Math.PI*a;
    return Math.sin(t)*Math.sin(t/2)/(t*t/2);
  }
  // Mitchell–Netravali balances sharpness and ringing.
  return a<1?((7*a-12)*a*a+16/3)/6:(((-7/3*a+12)*a-20)*a+32/3)/6;
}

function weights(source,target,sharp){
  const offsets=new Int32Array(target*4), values=new Float32Array(target*4);
  for(let x=0;x<target;x++){
    const center=(x+.5)*source/target-.5,left=Math.floor(center)-1;
    let sum=0;
    for(let j=0;j<4;j++){
      const p=x*4+j;
      offsets[p]=Math.max(0,Math.min(source-1,left+j));
      values[p]=kernel(center-left-j,sharp);
      sum+=values[p];
    }
    for(let j=0;j<4;j++)values[x*4+j]/=sum;
  }
  return {offsets,values};
}

export function resample(pixels,w,h,targetWidth,targetHeight,sharp){
  const x=weights(w,targetWidth,sharp),y=weights(h,targetHeight,sharp);
  const stride=targetWidth*4,output=new Uint8ClampedArray(stride*targetHeight);
  const cache=new Map();
  function horizontal(row){
    const result=new Float32Array(stride);
    for(let col=0;col<targetWidth;col++){
      const at=col*4;
      for(let j=0;j<4;j++){
        const p=(row*w+x.offsets[at+j])*4,k=x.values[at+j],alpha=pixels[p+3];
        result[at]+=pixels[p]*alpha*k;
        result[at+1]+=pixels[p+1]*alpha*k;
        result[at+2]+=pixels[p+2]*alpha*k;
        result[at+3]+=alpha*k;
      }
    }
    return result;
  }
  for(let row=0;row<targetHeight;row++){
    const at=row*4,rows=[];
    for(let i=0;i<4;i++){
      const index=y.offsets[at+i];
      if(!cache.has(index))cache.set(index,horizontal(index));
      rows.push(cache.get(index));
    }
    for(const index of cache.keys())if(index<y.offsets[at])cache.delete(index);
    for(let i=0;i<stride;i+=4){
      let alpha=0,r=0,g=0,b=0;
      for(let j=0;j<4;j++){
        const k=y.values[at+j],line=rows[j];
        r+=line[i]*k;g+=line[i+1]*k;b+=line[i+2]*k;alpha+=line[i+3]*k;
      }
      if(alpha<=.5)continue;
      const p=row*stride+i;
      output[p]=r/alpha;output[p+1]=g/alpha;output[p+2]=b/alpha;output[p+3]=alpha;
    }
  }
  return output;
}
