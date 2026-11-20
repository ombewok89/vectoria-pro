// Edges are ordered top, right, bottom, left. Each pair keeps ink on its right.
const EDGES=[
  [],[0,3],[1,0],[1,3],[2,1],[0,3,2,1],[2,0],[2,3],
  [3,2],[0,2],[1,0,3,2],[1,2],[3,1],[0,1],[3,0],[]
];
const CONNECT_FIVE=[0,1,2,3];
const CONNECT_TEN=[1,2,3,0];

export function isoRings(field,w,h,progress){
  const stride=w+2,next=new Map();
  for(let y=0;y<=h;y++){
    for(let x=0;x<=w;x++){
      const cell=y*stride+x;
      const a=field[cell],b=field[cell+1],c=field[cell+stride+1],d=field[cell+stride];
      const mask=(a>0?1:0)|(b>0?2:0)|(c>0?4:0)|(d>0?8:0);
      if(mask===0||mask===15)continue;
      const edges=mask===5&&a*c>b*d?CONNECT_FIVE:mask===10&&b*d>a*c?CONNECT_TEN:EDGES[mask];
      const ids=[cell*2,(cell+1)*2+1,(cell+stride)*2,cell*2+1];
      for(let i=0;i<edges.length;i+=2)next.set(ids[edges[i]],ids[edges[i+1]]);
      if(next.size>1200000)throw Error("Kontur terlalu rumit. Kurangi detail gambar atau bagi gambar menjadi beberapa bagian.");
    }
    if(y%32===0)progress(.4+.4*y/h);
  }

  function point(edge){
    const vertical=edge%2,cell=Math.floor(edge/2);
    const a=field[cell],b=field[cell+(vertical?stride:1)],offset=a/(a-b);
    const x=cell%stride-.5,y=Math.floor(cell/stride)-.5;
    return [Math.max(0,Math.min(w,x+(vertical?0:offset))),Math.max(0,Math.min(h,y+(vertical?offset:0)))];
  }
  const rings=[];
  for(const start of next.keys()){
    const ring=[];
    let edge=start;
    do{
      const p=point(edge);
      const previous=ring.at(-1);
      if(!previous||p[0]!==previous[0]||p[1]!==previous[1])ring.push(p);
      const to=next.get(edge);
      next.delete(edge);
      edge=to;
    }while(edge!==start&&edge!==undefined);
    if(edge!==start||ring.length<3)continue;
    const [firstX,firstY]=ring[0],last=ring.at(-1);
    if(last[0]===firstX&&last[1]===firstY)ring.pop();
    if(ring.length>=3)rings.push(ring);
  }
  return rings;
}

export function roundInkJoins(ring,limit){
  const n=ring.length;
  const joins=ring.map(([x,y],i)=>{
    const previous=ring[(i+n-1)%n],next=ring[(i+1)%n];
    const ax=previous[0]-x,ay=previous[1]-y,bx=next[0]-x,by=next[1]-y;
    const a=Math.hypot(ax,ay),b=Math.hypot(bx,by);
    if(a===0||b===0)return null;
    const cosine=-(ax*bx+ay*by)/(a*b);
    if(cosine<.62||cosine>.9999)return null;
    // A quadratic through the corner deviates at most half the setback times sin(turn/2).
    const halfTurn=Math.sqrt((1-cosine)/2);
    const setback=Math.min(a*.5,b*.5,3,2*limit/halfTurn);
    const start=[x+ax*setback/a,y+ay*setback/a];
    const end=[x+bx*setback/b,y+by*setback/b];
    return {start,end,controls:[
      start[0]+(x-start[0])*2/3,start[1]+(y-start[1])*2/3,
      end[0]+(x-end[0])*2/3,end[1]+(y-end[1])*2/3
    ]};
  });
  const commands=[];
  for(let i=0;i<n;i++){
    const join=joins[i];
    commands.push([i?"L":"M",join?.start??ring[i]]);
    if(join)commands.push(["C",[...join.controls,...join.end]]);
  }
  return commands;
}

const RIDGE_AXES=[[1,0],[0,1],[1,1],[1,-1]];

// Recover a faint stroke only when there is contrast on both sides and a continuation.
export function reinforceInkStrokes(field,pixels,w,h){
  const stride=w+2, additions=new Uint8Array(field.length);
  for(let y=3;y<h;y++){
    for(let x=3;x<w;x++){
      const i=y*stride+x,value=field[i];
      const alpha=pixels[((y-1)*w+x-1)*4+3];
      if(alpha<128||value>=0||value< -70)continue;
      for(const [dx,dy] of RIDGE_AXES){
        const across=dx+dy*stride,along=dy-dx*stride;
        const edge=Math.max(field[i-across],field[i+across]);
        if(edge>value-28)continue;
        const aligned=[i-along,i+along].some(j=>Math.abs(field[j]-value)<=18&&
          Math.max(field[j-across],field[j+across])<=field[j]-24);
        if(aligned)additions[i]=Math.min(alpha-127,Math.round(-edge*.88));
      }
    }
  }
  for(let i=0;i<field.length;i++){
    if(additions[i])field[i]=additions[i]-.5;
  }
}

export function steadyInkRing(ring){
  if(ring.length<16)return ring;
  const span=1.6,n=ring.length;
  function sample(i,direction){
    let distance=0;
    let current=ring[i];
    for(let step=1;step<n;step++){
      const next=ring[(i+step*direction+n)%n];
      const length=Math.hypot(next[0]-current[0],next[1]-current[1]);
      if(!length)continue;
      if(distance+length>=span){
        const t=(span-distance)/length;
        return [current[0]+(next[0]-current[0])*t,current[1]+(next[1]-current[1])*t];
      }
      distance+=length;
      current=next;
    }
    return current;
  }
  return ring.map(([x,y],i)=>{
    const a=sample(i,-1),b=sample(i,1);
    const ax=x-a[0],ay=y-a[1],bx=b[0]-x,by=b[1]-y;
    const length=Math.hypot(ax,ay)*Math.hypot(bx,by);
    if(!length||(ax*bx+ay*by)/length<.79)return ring[i];
    const chord=Math.hypot(ax+bx,ay+by);
    if(!chord)return ring[i];
    const nx=-(ay+by)/chord,ny=(ax+bx)/chord;
    const shift=Math.max(-.085,Math.min(.085,((bx-ax)*nx+(by-ay)*ny)*.28));
    return [x+nx*shift,y+ny*shift];
  });
}
