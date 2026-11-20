const gradients={
  dusk:["#2b1558","#cb87ed"],
  sunrise:["#a43f7d","#ffd28c"],
  forest:["#12313c","#9fbb8e"],
  ocean:["#162a69","#60d5df"]
};
const studioCopy={
  upscale:["Perbesar gambar.","Naikkan resolusi hingga 4× dan perjelas tepi yang masih terlihat pada gambar sumber."],
  pattern:["Buat pola berulang.","Ubah gambar menjadi ubin pola untuk latar, kemasan, atau tekstil."],
  gradient:["Rancang gradien.","Pilih dua warna, tambahkan tekstur, lalu ekspor gambar atau video yang berulang."]
};
const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
function fit(w,h,maxArea,maxEdge){
  const scale=Math.min(1,Math.sqrt(maxArea/(w*h)),maxEdge/Math.max(w,h));
  return [Math.max(1,Math.floor(w*scale)),Math.max(1,Math.floor(h*scale))];
}
function gradientDimensions(ratio,edge){
  return ratio>=1?[edge,Math.round(edge/ratio)]:[Math.round(edge*ratio),edge];
}
function noiseTexture(size){
  const values=new Int8Array(size);
  let state=0x149b39f2;
  for(let i=0;i<values.length;i++){
    state^=state<<13;state^=state>>>17;state^=state<<5;
    values[i]=(state&255)-128;
  }
  return values;
}
function gradient(canvas,opts,texture,offset=0){
  const {width:w,height:h}=canvas,g=canvas.getContext("2d",{willReadFrequently:Boolean(opts.grain)});
  const direction=(opts.angle+offset)*Math.PI/180;
  const dx=Math.cos(direction),dy=Math.sin(direction);
  const span=(Math.abs(w*dx)+Math.abs(h*dy))/2;
  const paint=g.createLinearGradient(w/2-dx*span,h/2-dy*span,w/2+dx*span,h/2+dy*span);
  paint.addColorStop(0,opts.first);
  paint.addColorStop(1,opts.second);
  g.fillStyle=paint;
  g.fillRect(0,0,w,h);
  if(!opts.grain)return;
  const image=g.getImageData(0,0,w,h),pixels=image.data;
  for(let i=0;i<texture.length;i++){
    const amount=texture[i]*opts.grain/128,j=i*4;
    pixels[j]+=amount;pixels[j+1]+=amount;pixels[j+2]+=amount;
  }
  g.putImageData(image,0,0);
}
function resizeInWorker(image,canvas,sharp,signal,session){
  const w=image.naturalWidth,h=image.naturalHeight;
  // Downscaled or very large sources use the browser path to bound input-memory costs.
  if(typeof Worker!=="function"||w*h>9e6||canvas.width<w||canvas.height<h){
    const context=canvas.getContext("2d");
    context.imageSmoothingQuality="high";
    context.drawImage(image,0,0,canvas.width,canvas.height);
    return Promise.resolve(false);
  }
  const source=document.createElement("canvas");
  source.width=w;source.height=h;
  const input=source.getContext("2d",{willReadFrequently:true});
  input.drawImage(image,0,0);
  const pixels=input.getImageData(0,0,w,h).data;
  source.width=source.height=0;
  return new Promise((resolve,reject)=>{
    const worker=session?.worker??new Worker(new URL("./resample-worker.mjs?v=15",import.meta.url),{type:"module"});
    if(session)session.worker=worker;
    function close(reuse=false){
      signal.removeEventListener("abort",cancel);
      worker.onmessage=worker.onerror=null;
      if(!reuse||!session){
        worker.terminate();
        if(session)session.worker=null;
      }
    }
    function cancel(){
      close();
      reject(new DOMException("Dibatalkan","AbortError"));
    }
    if(signal.aborted){cancel();return;}
    signal.addEventListener("abort",cancel,{once:true});
    worker.onmessage=({data})=>{
      close(!data.error);
      if(data.error){reject(Error(data.error));return;}
      try{
        canvas.getContext("2d").putImageData(new ImageData(data.output,canvas.width,canvas.height),0,0);
        resolve(true);
      }catch(error){reject(error);}
    };
    worker.onerror=()=>{close();reject(Error("Mesin upscale gagal berjalan di browser ini."));};
    try{worker.postMessage({pixels,w,h,width:canvas.width,height:canvas.height,sharp},[pixels.buffer]);}
    catch(error){close();reject(error);}
  });
}
function pattern(canvas,image,style){
  const w=canvas.width/2,h=canvas.height/2,g=canvas.getContext("2d");
  g.imageSmoothingQuality="high";
  for(let row=0;row<2;row++){
    for(let col=0;col<2;col++){
      g.save();
      const mirror=style==="mirror";
      g.translate((col+(mirror?col:0))*w,(row+(mirror?row:0))*h);
      g.scale(mirror&&col?-1:1,mirror&&row?-1:1);
      g.drawImage(image,0,0,w,h);
      g.restore();
    }
  }
}
function videoType(){
  if(typeof MediaRecorder!=="function"||!HTMLCanvasElement.prototype.captureStream)return "";
  return ["video/webm;codecs=vp8","video/webm","video/mp4"].find(type=>MediaRecorder.isTypeSupported(type))??"";
}
async function recordLoop(opts,mime,onProgress){
  const canvas=document.createElement("canvas");
  [canvas.width,canvas.height]=gradientDimensions(opts.ratio,720);
  const texture=opts.grain?noiseTexture(canvas.width*canvas.height):null;
  gradient(canvas,opts,texture);
  const stream=canvas.captureStream(24);
  let recorder;
  try{
    recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2400000});
    const chunks=[];
    const done=new Promise((resolve,reject)=>{
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onstop=()=>chunks.length?resolve(new Blob(chunks,{type:recorder.mimeType})):reject(Error("Video kosong."));
      recorder.onerror=()=>reject(Error("Browser gagal merekam video."));
    });
    const started=performance.now(),duration=4000;
    recorder.start();
    function step(now){
      const phase=Math.min(1,(now-started)/duration);
      gradient(canvas,opts,texture,72*Math.sin(phase*Math.PI*2));
      onProgress(phase);
      if(phase<1&&recorder.state==="recording")requestAnimationFrame(step);
      else if(recorder.state==="recording")recorder.stop();
    }
    requestAnimationFrame(step);
    return await done;
  }finally{for(const track of stream.getTracks())track.stop();}
}

export function setupUtilities({$,notify,saveFile,collectBatch,fileName,zipFiles,loadImage,prepareImageFile,rasterBlob,sampleUrl}){
  let kind="upscale",source=sampleUrl,base="botanika",serial=0,ready=false,lastGradient=null,recording=false;
  let queue=[],batchController=null,batchExport=null;
  const batchSelect=$("utilityQueue"),batchProgress=$("utilityProgress");
  const batchStatus=message=>$("utilityBatchStatus").textContent=message;
  const availableVideo=videoType();
  const preview=$("utilityCanvas"),view=$("upscalePreviewMode"),split=$("upscaleSplitRange");
  let output=null,previewSource=null,controller,previewFrame=0;
  const state=message=>$("utilityStatus").textContent=message;
  function setReady(value){
    ready=value;
    $("utilityDownload").disabled=!ready||recording||Boolean(batchController);
    split.disabled=!ready||kind!=="upscale";
  }
  function refreshBatch(){
    const busy=Boolean(batchController), queued=kind!=="gradient"&&queue.length>1;
    $("utilityQueueBox").hidden=!queued;
    for(const id of ["utilityRun","utilityChoose","utilitySample","utilityFormat","upscaleFactor","sharpen","patternStyle","utilityQueue"])$(id).disabled=busy;
    $("utilityRun").lastChild.textContent=queued?`Proses ${queue.length} gambar`:"Buat hasil";
    $("utilityCancel").hidden=batchProgress.hidden=!busy;
    $("utilityBatchDownload").disabled=busy||Boolean(batchExport)||!queue.some(job=>job.blob);
    $("utilityBatchDownload").lastChild.textContent=batchExport?"Menyiapkan ZIP…":"Unduh hasil (.zip)";
    setReady(ready);
  }
  function queueLabel(job,index){
    const state=job.error?"gagal":job.blob?"selesai":"menunggu";
    return `${index+1}. ${job.file.name} · ${state}`;
  }
  function resetBatch(){
    batchExport=null;
    for(const [index,job] of queue.entries()){
      job.blob=null;job.error=null;
      batchSelect.options[index].text=queueLabel(job,index);
    }
    if(queue.length>1)batchStatus(`${queue.length} gambar siap diproses.`);
    refreshBatch();
  }
  function clearPreview(){
    serial++;
    controller?.abort();
    if(output instanceof HTMLCanvasElement)output.width=output.height=0;
    output=previewSource=null;
    preview.getContext("2d").clearRect(0,0,preview.width,preview.height);
    setReady(false);
  }
  function paintPreview(){
    $("upscaleSplit").hidden=kind!=="upscale"||view.value!=="compare";
    if(!output)return;
    const isUpscale=kind==="upscale"&&previewSource;
    const detail=isUpscale&&$("upscaleDetail").checked;
    const [w,h]=detail
      ?[Math.min(480,output.width),Math.min(480,output.height)]
      :fit(output.width,output.height,800**2,800);
    if(preview.width!==w||preview.height!==h){preview.width=w;preview.height=h;}
    const context=preview.getContext("2d");
    context.clearRect(0,0,w,h);
    context.imageSmoothingQuality="high";
    if(!isUpscale){
      context.drawImage(output,0,0,w,h);
      return;
    }
    const cropW=detail?w:output.width,cropH=detail?h:output.height;
    const x=(output.width-cropW)/2,y=(output.height-cropH)/2;
    function drawSource(){
      const sx=previewSource.naturalWidth/output.width,sy=previewSource.naturalHeight/output.height;
      context.drawImage(previewSource,x*sx,y*sy,cropW*sx,cropH*sy,0,0,w,h);
    }
    const boundary=Math.round(w*split.valueAsNumber/100);
    const compare=view.value==="compare";
    if(view.value==="source"||(compare&&boundary===w)){
      drawSource();
      return;
    }
    context.drawImage(output,x,y,cropW,cropH,0,0,w,h);
    if(!compare||boundary===0)return;

    context.save();
    context.beginPath();
    context.rect(0,0,boundary,h);
    context.clip();
    context.clearRect(0,0,w,h);
    drawSource();
    context.restore();
    context.fillStyle="#2b2039";
    context.fillRect(boundary-2,0,4,h);
    context.fillStyle="#fff";
    context.fillRect(boundary-1,0,2,h);
  }
  function gradientOptions(){
    const angle=$("angle").valueAsNumber;
    if(!Number.isFinite(angle)||angle<0||angle>=360)throw Error("Arah gradien harus antara 0 dan 359 derajat.");
    return {angle,ratio:Number($("gradientRatio").value),grain:Number($("grain").value),first:$("gradientFirst").value,second:$("gradientSecond").value};
  }
  function setPalette(){
    const [first,second]=gradients[$("gradientPreset").value];
    $("gradientFirst").value=first;
    $("gradientSecond").value=second;
  }
  setPalette();
  function rasterOptions(){
    return {choice:$("upscaleFactor").value,sharp:$("sharpen").checked,style:$("patternStyle").value};
  }
  async function renderRaster(canvas,image,tool,options,signal,session){
    const w=image.naturalWidth,h=image.naturalHeight;
    if(tool==="pattern"){
      const [width,height]=fit(w,h,2.5e6,2000);
      canvas.width=width*2;canvas.height=height*2;
      pattern(canvas,image,options.style);
      return {};
    }
    const {choice,sharp}=options;
    const factor=choice==="stock"?Math.max(1,Math.sqrt(4e6/(w*h))):choice==="4k"?4096/Math.max(w,h):Number(choice);
    const width=Math.ceil(w*factor),height=Math.ceil(h*factor);
    [canvas.width,canvas.height]=fit(width,height,16e6,4096);
    const capped=canvas.width!==width||canvas.height!==height;
    const browserResize=!await resizeInWorker(image,canvas,sharp,signal,session);
    return {capped,browserResize};
  }
  async function encodeRaster(canvas,format){
    if(format!=="JPG")return rasterBlob(canvas,format);
    const temp=document.createElement("canvas");
    temp.width=canvas.width;temp.height=canvas.height;
    const context=temp.getContext("2d");
    context.fillStyle="#fff";context.fillRect(0,0,temp.width,temp.height);
    context.drawImage(canvas,0,0);
    try{return await rasterBlob(temp,format);}
    finally{temp.width=temp.height=0;}
  }
  function outputName(name,tool,format){
    return name+(tool==="pattern"?"-ubin":"-diperbesar")+"."+format.toLowerCase();
  }
  async function runBatch(){
    if(batchController||queue.length<2||kind==="gradient"||recording)return;
    clearPreview();
    resetBatch();
    const process=new AbortController();
    batchController=process;
    const {signal}=process, tool=kind, jobs=queue, options=rasterOptions(), format=$("utilityFormat").value;
    const session={worker:null};
    batchProgress.value=0;
    refreshBatch();
    state("Pratinjau tersedia setelah pemrosesan.");
    let completed=0,failed=0;
    for(const [index,job] of jobs.entries()){
      if(signal.aborted)break;
      batchStatus(`Memproses ${index+1} dari ${jobs.length} gambar…`);
      const canvas=document.createElement("canvas");
      let url;
      try{
        url=await prepareImageFile(job.file);
        if(signal.aborted)break;
        const image=await loadImage(url);
        if(signal.aborted)break;
        await renderRaster(canvas,image,tool,options,signal,session);
        if(signal.aborted)break;
        const blob=await encodeRaster(canvas,format);
        if(signal.aborted)break;
        job.blob=blob;
        job.name=outputName(fileName(job.file.name),tool,format);
        completed++;
      }catch(error){
        if(signal.aborted)break;
        job.error=error.message;
        failed++;
      }finally{
        if(url)URL.revokeObjectURL(url);
        canvas.width=canvas.height=0;
      }
      batchSelect.options[index].text=queueLabel(job,index);
      batchProgress.value=(index+1)/jobs.length;
    }
    session.worker?.terminate();
    if(batchController!==process)return;
    batchController=null;
    const result=`${completed} dari ${jobs.length} gambar selesai${failed?`, ${failed} gagal`:""}.`;
    batchStatus(signal.aborted?`Dibatalkan. ${result}`:result);
    refreshBatch();
    const first=jobs.findIndex(job=>job.blob);
    if(first>=0){
      batchSelect.value=String(first);
      showSelection();
    }else state(failed?"Tidak ada hasil. Pilih nama file untuk melihat penyebabnya.":"Belum ada hasil.");
  }
  async function downloadBatch(){
    if(batchController||batchExport)return;
    const jobs=queue.filter(job=>job.blob),tool=kind;
    if(!jobs.length)return;
    const ticket={};
    batchExport=ticket;
    refreshBatch();
    function* files(){
      for(const [index,job] of jobs.entries()){
        if(batchExport!==ticket)throw new DOMException("Dibatalkan","AbortError");
        yield {name:`${String(index+1).padStart(3,"0")}-${job.name}`,blob:job.blob};
      }
    }
    try{
      const zip=await zipFiles(files());
      if(batchExport===ticket)saveFile(tool==="pattern"?"vektora-pola.zip":"vektora-upscale.zip",zip);
    }catch(error){if(error.name!=="AbortError")notify(error.message);}
    finally{
      if(batchExport===ticket){batchExport=null;refreshBatch();}
    }
  }
  async function showSelection(){
    const job=queue[Number(batchSelect.value)];
    if(!job?.blob){
      clearPreview();
      state(job?.error??"Jalankan antrean untuk melihat hasil gambar.");
      return;
    }
    // Use the encoded result and decode just the selected pair for inspection.
    clearPreview();
    const ticket=serial,tool=kind;
    state("Memuat pratinjau…");
    let sourceUrl,resultUrl;
    try{
      sourceUrl=await prepareImageFile(job.file);
      resultUrl=URL.createObjectURL(job.blob);
      const [before,after]=await Promise.all([loadImage(sourceUrl),loadImage(resultUrl)]);
      if(ticket!==serial)return;
      output=after;
      previewSource=tool==="upscale"?before:null;
      paintPreview();
      const size=previewSource?`${before.naturalWidth} × ${before.naturalHeight} → `:"";
      state(`${size}${after.naturalWidth} × ${after.naturalHeight} px · ${job.file.name}`);
      setReady(true);
    }catch(error){
      if(ticket===serial)state(error.message);
    }finally{
      if(sourceUrl)URL.revokeObjectURL(sourceUrl);
      if(resultUrl)URL.revokeObjectURL(resultUrl);
    }
  }
  async function run(){
    const ticket=++serial;
    const current=kind;
    controller?.abort();
    controller=new AbortController();
    const signal=controller.signal;
    setReady(false);
    if(output instanceof HTMLCanvasElement)output.width=output.height=0;
    output=null;
    previewSource=null;
    state("Menyiapkan pratinjau…");
    await frame();
    if(signal.aborted)return;
    const canvas=document.createElement("canvas");
    let inputImage=null;
    try{
      let capped=false,browserResize=false;
      if(current==="gradient"){
        const options=gradientOptions();
        [canvas.width,canvas.height]=gradientDimensions(options.ratio,1920);
        gradient(canvas,options,options.grain?noiseTexture(canvas.width*canvas.height):null);
        lastGradient=options;
      }else{
        const image=await loadImage(source);
        if(signal.aborted)return;
        inputImage=image;
        ({capped,browserResize}=await renderRaster(canvas,image,current,rasterOptions(),signal));
      }
      if(ticket!==serial)return;
      output=canvas;
      previewSource=current==="upscale"?inputImage:null;
      paintPreview();
      const inputSize=previewSource?`${previewSource.naturalWidth} × ${previewSource.naturalHeight} → `:"";
      state(`${inputSize}${output.width.toLocaleString("id-ID")} × ${output.height.toLocaleString("id-ID")} px${capped?" · batas 4K / 16 MP":""}${browserResize?" · interpolasi browser":""}`);
      setReady(true);
    }catch(error){
      if(ticket===serial&&error.name!=="AbortError"){state(error.message);notify(error.message);}
    }finally{if(output!==canvas)canvas.width=canvas.height=0;}
  }
  $("utilityChoose").onclick=()=>$("utilityFile").click();
  $("utilityFile").onchange=async event=>{
    const selected=collectBatch(event.target.files);
    event.target.value="";
    if(!selected.length)return;
    queue=selected.length>1?selected.map(file=>({file})):[];
    batchSelect.replaceChildren(...queue.map((job,index)=>new Option(queueLabel(job,index),index)));
    resetBatch();
    if(queue.length){
      clearPreview();
      state("Jalankan antrean untuk melihat hasil gambar.");
      return;
    }
    const [file]=selected;
    const request=++serial;
    controller?.abort();
    setReady(false);
    try{
      const url=await prepareImageFile(file);
      if(request!==serial){URL.revokeObjectURL(url);return;}
      if(source!==sampleUrl)URL.revokeObjectURL(source);
      source=url;
      base=file.name.replace(/\.[^.]+$/,"").slice(0,100);
      run();
    }catch(error){if(request===serial){state(error.message);notify(error.message);}}
  };
  $("utilitySample").onclick=()=>{
    queue=[];
    resetBatch();
    if(source!==sampleUrl)URL.revokeObjectURL(source);
    source=sampleUrl;base="botanika";
    run();
  };
  $("utilityRun").onclick=()=>queue.length>1&&kind!=="gradient"?runBatch():run();
  $("utilityCancel").onclick=()=>batchController?.abort();
  $("utilityBatchDownload").onclick=downloadBatch;
  batchSelect.onchange=showSelection;
  $("utilityFormat").onchange=()=>{
    if(queue.length>1&&kind!=="gradient"){clearPreview();resetBatch();state("Jalankan antrean dengan format yang dipilih.");}
  };
  view.onchange=$("upscaleDetail").onchange=paintPreview;
  split.oninput=()=>{
    if(previewFrame)return;
    previewFrame=requestAnimationFrame(()=>{
      previewFrame=0;
      paintPreview();
    });
  };
  $("gradientPreset").onchange=()=>{setPalette();run();};
  for(const id of ["gradientFirst","gradientSecond","gradientRatio","angle","grain"])$(id).onchange=run;
  for(const id of ["patternStyle","upscaleFactor","sharpen"])$(id).onchange=()=>{
    if(queue.length<2){run();return;}
    clearPreview();
    resetBatch();
    state("Jalankan antrean dengan pengaturan baru.");
  };
  $("utilityDownload").onclick=async()=>{
    if(!ready||recording||!output)return;
    const job=queue[Number(batchSelect.value)];
    if(kind!=="gradient"&&job?.blob){saveFile(job.name,job.blob);return;}
    const exportCanvas=output;
    const format=$("utilityFormat").value;
    const name=kind==="gradient"?"vektora-gradien":base+(kind==="pattern"?"-ubin":"-diperbesar");
    try{
      if(format==="VIDEO"){
        recording=true;
        setReady(true);
        const ticket=serial;
        const video=await recordLoop(lastGradient,availableVideo,phase=>{if(ticket===serial)state(`Merekam video… ${Math.round(phase*100)}%`);});
        saveFile(name+(video.type.includes("mp4")?".mp4":".webm"),video);
        if(ticket===serial)state("Video loop 4 detik siap diunduh.");
      }else saveFile(name+"."+format.toLowerCase(),await encodeRaster(exportCanvas,format));
    }catch(error){notify(error.message);}
    finally{recording=false;setReady(ready);}
  };
  return function open(studio){
    if(studio==="vector"){
      if(batchController){
        batchController.abort();
        batchController=null;
        batchStatus("Antrean dihentikan saat berganti alat.");
      }
      batchExport=null;
      clearPreview();
      refreshBatch();
      return;
    }
    const changed=studio!==kind;
    if(changed&&batchController){
      batchController.abort();
      batchController=null;
    }
    kind=studio;
    $("upscaleSplit").hidden=studio!=="upscale"||view.value!=="compare";
    const isGradient=studio==="gradient";
    [$("utilityTitle").textContent,$("utilityDescription").textContent]=studioCopy[studio];
    $("upscaleFields").hidden=$("upscaleCompare").hidden=studio!=="upscale";
    $("patternFields").hidden=studio!=="pattern";
    $("gradientFields").hidden=!isGradient;
    $("utilityChoose").hidden=$("utilitySample").hidden=isGradient;
    $("videoOption").hidden=!isGradient||!availableVideo;
    $("videoOption").disabled=$("videoOption").hidden;
    if(changed){
      $("utilityFormat").value="PNG";
      resetBatch();
    }
    if(studio==="gradient"||queue.length<2){
      refreshBatch();
      run();
    }else if(!batchController){
      refreshBatch();
      showSelection();
    }
  };
}
