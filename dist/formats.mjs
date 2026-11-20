const encoder=new TextEncoder();
const round=value=>Number(value.toFixed(5));
export function outputSize(w,h,stock){
  if(!stock)return [w,h];
  const scale=Math.sqrt(16e6/(w*h));
  return [Math.max(1,Math.ceil(w*scale)),Math.max(1,Math.ceil(h*scale))];
}
export function rasterSize(w,h,preset){
  const longest = Math.max(w,h);
  const requested = preset==="native" ? longest : Number(preset);
  const edge = Math.min(4096,requested);
  const scale = Math.min(edge/longest,Math.sqrt(16e6/(w*h)));
  const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
  if(width*height<=16e6)return [width,height];
  return [Math.max(1,Math.floor(w*scale)),Math.max(1,Math.floor(h*scale))];
}
export function traceSize(w,h,detail,hd){
  const edgeLimit = hd ? [700,1050,1600,2000,2400][detail] : [450,700,1000,1350,1750][detail];
  const scale = Math.min(hd?2:1,edgeLimit/Math.max(w,h),Math.sqrt(4.5e6/(w*h)));
  return [Math.max(1,Math.floor(w*scale)),Math.max(1,Math.floor(h*scale))];
}
const coords=values=>values.map(round).join(" ");

const polygon = ring => ring.map((point,index)=>[index?"L":"M",point]);
const seamStroke = model => model.monochrome ? 0 : (model.smooth ? .56 : .36);
const sequence = commands => commands.map(([op,points])=>op+coords(points)).join("")+"Z";
function exactPaths(layers,crop,outlines){
  const shapes=[];
  for(const {fill,opacity,boxes} of layers){
    const paint=outlines?`fill="none" stroke="${fill}" stroke-width=".18"`:`fill="${fill}"${opacity<1?` fill-opacity="${Number(opacity.toFixed(4))}"`:""}`;
    let paths=[];
    for(const [x,y,w,h] of boxes){
      if(x+w<=crop.x||y+h<=crop.y||x>=crop.x+crop.w||y>=crop.y+crop.h)continue;
      paths.push(`M${x} ${y}h${w}v${h}h-${w}Z`);
      if(paths.length===1500){shapes.push(`<path ${paint} d="${paths.join("")}"/>`);paths=[];}
    }
    if(paths.length)shapes.push(`<path ${paint} d="${paths.join("")}"/>`);
  }
  return shapes.join("");
}

function meshArt(model){
  const {mesh,w,h,meshColumns}=model;
  const offsets=Array.from({length:meshColumns},(_,x)=>String(round((x+.5)/meshColumns)).replace(/^0\./,"."));
  const hex=Array.from({length:256},(_,i)=>i.toString(16).padStart(2,"0"));
  const definitions=[],art=[];
  mesh.forEach(({y,stops},i)=>{
    const stopsMarkup=[];
    for(let at=0;at<stops.length;at+=5){
      const offset=offsets[stops[at]+256*stops[at+1]];
      const r=hex[stops[at+2]],g=hex[stops[at+3]],b=hex[stops[at+4]];
      const color=r[0]===r[1]&&g[0]===g[1]&&b[0]===b[1]?r[0]+g[0]+b[0]:r+g+b;
      stopsMarkup.push(`<stop offset="${offset}" stop-color="#${color}"/>`);
    }
    const colors=stopsMarkup.join("");
    definitions.push(`<linearGradient id="shade${i}">${colors}</linearGradient>`);
    if(i===0){
      art.push(`<rect width="${w}" height="${h}" fill="url(#shade0)"/>`);
      return;
    }
    // Each row fades in over the previous row and stays opaque past the next boundary.
    const top=round(mesh[i-1].y),bottom=Math.min(h,(mesh[i+1]?.y??h)+2);
    const height=round(bottom-top);
    definitions.push(
      `<linearGradient id="mix${i}" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${top}" y2="${round(y)}"><stop stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient>`,
      `<mask id="fade${i}" maskUnits="userSpaceOnUse" x="0" y="${top}" width="${w}" height="${height}"><rect y="${top}" width="${w}" height="${height}" fill="url(#mix${i})"/></mask>`
    );
    art.push(`<rect y="${top}" width="${w}" height="${height}" fill="url(#shade${i})" mask="url(#fade${i})"/>`);
  });
  return {definitions,art:`<g color-interpolation="sRGB">${art.join("")}</g>`};
}

export const svgStart='<svg xmlns="http://www.w3.org/2000/svg"';

export function svgText(model,options={}){
  const {w,h,layers}=model;
  const crop=options.crop??{x:0,y:0,w,h};
  const [width,height]=options.dimensions ?? (options.crop
    ? outputSize(Math.round(crop.w),Math.round(crop.h),options.stock)
    : outputSize(model.originalWidth??w,model.originalHeight??h,options.stock));
  const dim=options.preview ? "" : ` width="${width}" height="${height}"`;
  const backgroundFill=options.background==="white"?"#ffffff":
    options.background==="transparent"||options.outlines?null:model.backgroundFill;
  const background=backgroundFill?`<rect width="${crop.w}" height="${crop.h}" fill="${backgroundFill}"/>`:"";
  const fading=model.mesh?meshArt(model):null;
  const gradients=fading?.definitions??[],shapes=[];
  for(const {fill,rings,paths:geometry,regions} of model.exact?[]:layers){
    const groups=new Map();
    for(const [i,ring] of rings.entries()){
      if(options.crop&&!intersects(ring,crop))continue;
      const id=options.outlines?0:regions?.[i]??0;
      const group=model.gradients?.[id]?id:0;
      groups.set(group,(groups.get(group)??"")+sequence(geometry?.[i]??polygon(ring)));
    }
    for(const [id,paths] of groups){
      const gradient=id?model.gradients[id]:null;
      let color=fill;
      if(gradient){
        const {x1,y1,x2,y2,startColor,endColor}=gradient;
        gradients.push(`<linearGradient id="g${id}" gradientUnits="userSpaceOnUse" x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}"><stop stop-color="${startColor}"/><stop offset="1" stop-color="${endColor}"/></linearGradient>`);
        color=`url(#g${id})`;
      }
      const paint=options.outlines ? `fill="none" stroke="${fill}" stroke-width="${round(Math.max(w,h)/545)}"` : model.monochrome ? `fill="${color}"` : `fill="${color}" stroke="${color}" stroke-width="${seamStroke(model)}" stroke-linejoin="round"`;
      shapes.push(`<path ${paint} d="${paths}"/>`);
    }
  }
  const clip=options.crop?`<clipPath id="tile"><rect width="${crop.w}" height="${crop.h}"/></clipPath>`:"";
  const definitions=clip||gradients.length?`<defs>${clip}${gradients.join("")}</defs>`:"";
  const art=fading?.art??(model.exact?exactPaths(layers,crop,options.outlines):shapes.join(""));
  const content=options.crop?`<g clip-path="url(#tile)"><g transform="translate(${-crop.x} ${-crop.y})">${art}</g></g>`:art;
  return `${svgStart}${dim} viewBox="0 0 ${crop.w} ${crop.h}" fill-rule="evenodd"${model.exact&&!options.outlines?' shape-rendering="crispEdges"':""}>${definitions}${background}${content}</svg>`;
}
function intersects(ring,crop) {
  let left=Infinity,top=Infinity,right=-Infinity,bottom=-Infinity;
  for(const [x,y] of ring){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  return left<crop.x+crop.w&&right>crop.x&&top<crop.y+crop.h&&bottom>crop.y;
}
const rgb=fill=>[1,3,5].map(i=>round(parseInt(fill.slice(i,i+2),16)/255)).join(" ");
function drawCommands(model,pdf){
  if(model.mesh)throw Error("Gunakan SVG untuk menyimpan gradasi halus. Untuk EPS/PDF, pilih Logo dan ikon datar atau Siluet hitam-putih.");
  const cmd=[];
  if(model.backgroundFill){
    cmd.push(rgb(model.backgroundFill)+(pdf?" rg":" setrgbcolor"));
    cmd.push(`0 0 ${model.w} ${model.h}`+(pdf?" re f":" rectfill"));
  }
  if(model.exact){
    if(model.layers.some(layer=>layer.opacity<1))throw Error("Gunakan SVG atau PNG untuk mempertahankan transparansi parsial di Presisi piksel.");
    for(const {fill,boxes} of model.layers){
      cmd.push(rgb(fill)+(pdf?" rg":" setrgbcolor"));
      for(const box of boxes)cmd.push(box.join(" ")+(pdf?" re f":" rectfill"));
    }
    return cmd.join("\n");
  }
  const operations=pdf?{M:"m",L:"l",C:"c"}:{M:"moveto",L:"lineto",C:"curveto"};
  for(const {fill,rings,paths} of model.layers){
    const color=rgb(fill);
    if(pdf)cmd.push(color+" rg",color+" RG",seamStroke(model)+" w","1 j");
    else cmd.push(color+" setrgbcolor",seamStroke(model)+" setlinewidth","1 setlinejoin","newpath");
    for(const [i,ring] of rings.entries()){
      for(const [op,points] of paths?.[i]??polygon(ring)) cmd.push(coords(points)+" "+operations[op]);
      cmd.push(pdf?"h":"closepath");
    }
    cmd.push(model.monochrome?(pdf?"f*":"eofill"):(pdf?"B*":"gsave eofill grestore stroke"));
  }
  return cmd.join("\n");
}
function outputTitle(name){
  return name.replace(/[^a-z0-9 ._-]/gi,"-").slice(0,110)||"vektora";
}
export function epsText(model,stock,name){
  const [w,h]=outputSize(model.originalWidth??model.w,model.originalHeight??model.h,stock);
  return `%!PS-Adobe-3.0 EPSF-3.0
%%Title: ${outputTitle(name)}
%%BoundingBox: 0 0 ${w} ${h}
%%Pages: 1
%%LanguageLevel: 2
%%EndComments
gsave
0 ${h} translate
${round(w/model.w)} ${round(-h/model.h)} scale
${drawCommands(model,false)}
grestore
%%EOF
`;
}
export function pdfText(model,stock){
  const [w,h]=outputSize(model.originalWidth??model.w,model.originalHeight??model.h,stock);
  const stream=`q\n${round(w/model.w)} 0 0 ${round(-h/model.h)} 0 ${h} cm\n${drawCommands(model,true)}\nQ\n`;
  const objects=[
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Resources << >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}endstream`
  ];
  let pdf="%PDF-1.4\n";
  const index=[];
  for(const object of objects){
    index.push(pdf.length);
    pdf+=`${index.length} 0 obj\n${object}\nendobj\n`;
  }
  const offset=pdf.length;
  pdf+="xref\n0 5\n0000000000 65535 f \n";
  for(const position of index) pdf+=String(position).padStart(10,"0")+" 00000 n \n";
  return pdf+`trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF\n`;
}
const CRC_TABLE=Uint32Array.from({length:256},(_,value)=>{
  for(let bit=0;bit<8;bit++) value=value&1?0xedb88320^(value>>>1):value>>>1;
  return value;
});
async function crc32(source){
  let sum=0xffffffff;
  if(source instanceof Blob){
    const reader=source.stream().getReader();
    try{
      while(true){
        const {value,done}=await reader.read();
        if(done)break;
        for(const byte of value)sum=CRC_TABLE[(sum^byte)&255]^(sum>>>8);
      }
    }finally{reader.releaseLock();}
  }else{
    for(const byte of source)sum=CRC_TABLE[(sum^byte)&255]^(sum>>>8);
  }
  return (sum^0xffffffff)>>>0;
}
export async function zipFiles(files){
  const contents=[],directory=[];
  let offset=0,directorySize=0,count=0;
  for await(const {name,text,bytes,blob} of files){
    const safeName=String(name).replace(/[\\/:*?"<>|\u0000-\u001f]/g,"-").replace(/^\.+/,"").trim()||"vektora";
    const title=encoder.encode(safeName);
    const original=bytes??blob??encoder.encode(text);
    const originalSize=original instanceof Blob?original.size:original.length;
    const checksum=await crc32(original);
    let body=original,method=0;
    if(originalSize>=256&&safeName.endsWith(".svg")&&typeof CompressionStream==="function"){
      try{
        const input=blob??new Blob([original]);
        const compressed=await new Response(input.stream().pipeThrough(new CompressionStream("deflate-raw"))).blob();
        if(compressed.size<originalSize){
          body=compressed;
          method=8;
        }
      }catch{
        // Store entries unchanged on browsers without raw DEFLATE.
      }
    }
    const length=body instanceof Blob?body.size:body.length;
    const header=new Uint8Array(30),entry=new Uint8Array(46);
    const h=new DataView(header.buffer),d=new DataView(entry.buffer);
    h.setUint32(0,0x04034b50,true);
    h.setUint16(4,20,true);
    h.setUint16(6,0x800,true);
    h.setUint16(8,method,true);
    h.setUint16(12,33,true);
    h.setUint32(14,checksum,true);
    h.setUint32(18,length,true);
    h.setUint32(22,originalSize,true);
    h.setUint16(26,title.length,true);
    d.setUint32(0,0x02014b50,true);
    d.setUint16(4,20,true);
    entry.set(header.subarray(4,30),6);
    d.setUint32(42,offset,true);
    contents.push(header,title,body);
    directory.push(entry,title);
    offset+=header.length+title.length+length;
    if(offset+directorySize+entry.length+title.length+22>0xffffffff||count>=65535){
      throw Error("ZIP terlalu besar. Bagi gambar menjadi beberapa antrean.");
    }
    count++;
    directorySize+=entry.length+title.length;
  }
  const end=new Uint8Array(22),e=new DataView(end.buffer);
  e.setUint32(0,0x06054b50,true);
  e.setUint16(8,count,true);
  e.setUint16(10,count,true);
  e.setUint32(12,directorySize,true);
  e.setUint32(16,offset,true);
  return new Blob([...contents,...directory,end],{type:"application/zip"});
}
