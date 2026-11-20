const signatures = {
  png: [137,80,78,71,13,10,26,10],
  jpeg: [255,216,255],
  gif: [71,73,70,56],
  bmp: [66,77]
};

export function detectImageType(bytes){
  const token=(start,end)=>String.fromCharCode(...bytes.subarray(start,end));
  for(const [format,signature] of Object.entries(signatures)){
    if(signature.every((value,i)=>bytes[i]===value))return "image/"+format;
  }
  if(token(0,4)==="RIFF"&&token(8,12)==="WEBP")return "image/webp";
  if(token(4,8)==="ftyp"&&token(8,40).match(/avif|avis/))return "image/avif";
  if(token(4,8)==="ftyp"&&token(8,40).match(/heic|heix|hevc|mif1/))return "image/heic";
  if(token(0,4)==="II*\0"||token(0,4)==="MM\0*")return "image/tiff";
  return "";
}

export async function prepareImageFile(file){
  const type=detectImageType(new Uint8Array(await file.slice(0,40).arrayBuffer()));
  if(!type)throw Error("Isi file tidak dikenali sebagai gambar. Ekspor ulang dari aplikasi asal sebagai PNG atau JPG.");
  return URL.createObjectURL(file.type===type?file:file.slice(0,file.size,type));
}

export async function loadImage(url,{exporting=false}={}){
  const image=new Image();
  image.decoding="async";
  const loaded=new Promise(resolve=>{
    image.onload=()=>resolve(true);
    image.onerror=()=>resolve(false);
  });
  image.src=url;
  try {
    if(typeof image.decode==="function")await image.decode();
    else await loaded;
  }catch {
    await loaded;
  }
  image.onload=image.onerror=null;
  if(!image.naturalWidth||!image.naturalHeight){
    if(exporting)throw Error("Browser gagal merender hasil vektor. Pilih SVG atau turunkan resolusi PNG/JPG.");
    throw Error("Browser tidak dapat membuka gambar ini. Jika file utuh, ekspor ulang sebagai PNG atau JPG agar kompatibel.");
  }
  if(image.naturalWidth*image.naturalHeight>60e6)throw Error("Resolusi gambar melebihi 60 MP.");
  return image;
}
