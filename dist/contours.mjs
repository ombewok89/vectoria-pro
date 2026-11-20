// Fit each boundary once. Adjacent fills reuse precisely the same path in reverse.
const distance = (a,b) => Math.hypot(b[0]-a[0], b[1]-a[1]);
const unit = (a,b) => {
  const length = distance(a,b);
  return length ? [(b[0]-a[0])/length,(b[1]-a[1])/length] : [0,0];
};
const dot = (a,b) => a[0]*b[0]+a[1]*b[1];

function simplify(points, anchors, tolerance){
  const kept = new Set(anchors);
  const stack = anchors.slice(1).map((b,i)=>[anchors[i],b]);
  while(stack.length){
    const [a,b] = stack.pop();
    const [x,y] = points[a];
    const dx = points[b][0]-x,dy = points[b][1]-y;
    const squared = dx*dx+dy*dy;
    let largest=tolerance*tolerance,split=-1;
    for(let i=a+1;i<b;i++){
      const px=points[i][0]-x,py=points[i][1]-y;
      const t=squared?Math.max(0,Math.min(1,(px*dx+py*dy)/squared)):0;
      const error=(px-t*dx)**2+(py-t*dy)**2;
      if(error>largest){largest=error;split=i;}
    }
    if(split>=0){kept.add(split);stack.push([a,split],[split,b]);}
  }
  return [...kept].sort((a,b)=>a-b);
}

function fitChain(raw, detail, hd, closed, tonal){
  const last=raw.length-1;
  if(last<4)return raw.slice(1).map(end=>({end}));
  const maxRadius=hd?(tonal?10:7):(tonal?7:5);
  const radius=Math.max(1,Math.min(maxRadius,Math.floor(last/14)));
  const span=radius*2;
  const at=i=>raw[closed?(i+last)%last:Math.max(0,Math.min(last,i))];
  const turns=[];
  for(let i=closed?0:span;i<(closed?last:last-span+1);i++){
    const incoming=unit(at(i-span),at(i));
    const outgoing=unit(at(i),at(i+span));
    const angle=dot(incoming,outgoing);
    if(angle<.58)turns.push([i,angle]);
  }
  const hard=new Set();
  // One anchor per sharp bend keeps real corners while rejecting steps in a sloped edge.
  turns.sort((a,b)=>a[1]-b[1]);
  for(const [i] of turns){
    let nearby=false;
    for(let j=-span;j<=span&&!nearby;j++){
      if(j)nearby=hard.has(closed?(i+j+last)%last:i+j);
    }
    if(!nearby)hard.add(i);
  }
  if(closed&&hard.has(0))hard.add(last);
  const points=raw.map((point,i)=>{
    if(i===0||i===last||hard.has(i))return point;
    let x=point[0]*(radius+1),y=point[1]*(radius+1),weight=radius+1;
    for(const direction of [-1,1]){
      for(let j=1;j<=radius;j++){
        const index=i+j*direction;
        if(!closed&&(index<0||index>last))break;
        const p=at(index),fraction=radius+1-j;
        x+=p[0]*fraction;y+=p[1]*fraction;weight+=fraction;
        if(hard.has(closed?(index+last)%last:index))break;
      }
    }
    return [x/weight,y/weight];
  });
  const anchors=[...new Set([0,last,...hard,...(closed?[Math.floor(last/2)]:[])])].sort((a,b)=>a-b);
  const tolerance=[1.40,1.10,.82,.63,.50][detail];
  const indexes=simplify(points,anchors,tolerance);
  const sample=Math.max(2,radius);
  const pt=i=>points[closed?(i+last)%last:Math.min(last,Math.max(0,i))];
  function tangent(i, other, incoming){
    if(hard.has(i))return incoming?unit(points[other],points[i]):unit(points[i],points[other]);
    return unit(pt(i-sample),pt(i+sample));
  }
  const segments=[];
  for(let i=1;i<indexes.length;i++){
    const a=indexes[i-1],b=indexes[i],start=points[a],end=points[b];
    const length=distance(start,end);
    if(length<=.001)continue;
    const direction=unit(start,end),first=tangent(a,b,false),second=tangent(b,a,true);
    const startAlignment=dot(first,direction),endAlignment=dot(second,direction);
    if(length<1.1||startAlignment<.42||endAlignment<.42||(startAlignment>.9995&&endAlignment>.9995)){
      segments.push({end});continue;
    }
    // Cap the perpendicular displacement of handles so long straight runs stay straight.
    const maxDeviation=1.3;
    const handleStart=Math.min(length/3,maxDeviation/Math.sqrt(Math.max(0,1-startAlignment**2)));
    const handleEnd=Math.min(length/3,maxDeviation/Math.sqrt(Math.max(0,1-endAlignment**2)));
    segments.push({end,controls:[
      start[0]+first[0]*handleStart,start[1]+first[1]*handleStart,
      end[0]-second[0]*handleEnd,end[1]-second[1]*handleEnd
    ]});
  }
  return segments;
}

function reversed(geometry){
  const result=[];
  for(let i=geometry.length-1;i>=0;i--){
    const segment=geometry[i];
    if(segment.controls){
      const [x1,y1,x2,y2]=segment.controls;
      result.push({end:segment.start,controls:[x2,y2,x1,y1]});
    }else result.push({end:segment.start});
  }
  return result;
}

export function sharedContours(width,detail,hd,tonal=false){
  const cache=new Map();
  const key=([x,y])=>y*(width+1)+x;
  function chain(points,closed){
    let start=0,direction=1;
    if(closed){
      const n=points.length-1;
      for(let i=1;i<n;i++)if(key(points[i])<key(points[start]))start=i;
      if(key(points[(start+1)%n])>key(points[(start+n-1)%n]))direction=-1;
      points=Array.from({length:n+1},(_,i)=>points[(start+direction*i+n)%n]);
    }else if(key(points[0])>key(points.at(-1))||
      (key(points[0])===key(points.at(-1))&&key(points[1])>key(points.at(-2)))){
      direction=-1;
      points=[...points].reverse();
    }
    const label=key(points[0])+":"+key(points[1])+":"+key(points.at(-1));
    let geometry=cache.get(label);
    if(!geometry){
      let previous=points[0];
      geometry=fitChain(points,detail,hd,closed,tonal).map(segment=>{
        const result={...segment,start:previous};previous=segment.end;
        return result;
      });
      cache.set(label,geometry);
    }
    return {
      start:direction===1?points[0]:points.at(-1),
      segments:direction===1?geometry:reversed(geometry)
    };
  }
  return (points,junctions)=>{
    const paths=[];
    if(!junctions.length)paths.push(chain([...points,points[0]],true));
    else{
      const n=points.length;
      const indexes=[...junctions,junctions[0]+n];
      for(let i=1;i<indexes.length;i++){
        const a=indexes[i-1],length=indexes[i]-a+1;
        const part=Array.from({length},(_,offset)=>points[(a+offset)%n]);
        paths.push(chain(part,false));
      }
    }
    const commands=[["M",paths[0].start]];
    for(const path of paths){
      for(const {end,controls} of path.segments)commands.push(controls?["C",[...controls,...end]]:["L",end]);
    }
    return commands;
  };
}
