const cacheName="vektora-converter-v35";
const assets=[
  "./","./converter.css?v=23","./converter.mjs?v=34","./icons.mjs?v=1","./trace-worker.mjs?v=26","./trace.mjs?v=26","./contours.mjs?v=18","./ink-contours.mjs?v=20","./formats.mjs?v=27","./sheet.mjs?v=17","./utilities.mjs?v=23","./image-codec.mjs?v=14","./tones.mjs?v=14","./shading-mesh.mjs?v=4","./resample-worker.mjs?v=15","./resample.mjs?v=14","./upscale-detail.mjs?v=1","./app.webmanifest?v=6","./pwa.mjs?v=1",
  "./editor.html","./style.css?v=8","./editor.mjs?v=8","./assets/vektora-192.png","./assets/vektora-512.png","./assets/vektora-apple-180.png","./assets/vektora-maskable-512.png","./assets/botanika.jpg"
];
self.addEventListener("install",event=>{
  event.waitUntil((async()=>{
    const root=await fetch("./",{cache:"reload"});
    if(!root.ok||!(await root.clone().text()).includes('name="vektora-app"')) throw Error("Studio belum bisa disimpan untuk offline.");
    const cache=await caches.open(cacheName);
    const editor = await fetch("./editor.html", {cache:"reload"});
    if (!editor.ok) throw Error("Editor belum bisa disimpan untuk offline.");
    const editorHtml = await editor.text();
    if (!editorHtml.includes('id="board"')) throw Error("Halaman editor tidak cocok.");
    const otherAssets = assets.slice(1).filter(path=>path!=="./editor.html");
    await cache.addAll(otherAssets.map(path=>new Request(path,{cache:"reload"})));
    const editorHeaders = new Headers(editor.headers);
    editorHeaders.delete("Content-Encoding");
    editorHeaders.delete("Content-Length");
    editorHeaders.set("Content-Type","text/html; charset=utf-8");
    await cache.put("./editor.html",new Response(editorHtml,{headers:editorHeaders}));
    await cache.put("./",root);
    await self.skipWaiting();
  })());
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys()) if(key.startsWith("vektora-converter-")&&key!==cacheName)await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET") return;
  const url=new URL(event.request.url);
  const scope=new URL(self.registration.scope);
  if(url.origin!==scope.origin||!url.pathname.startsWith(scope.pathname))return;
  const page=url.pathname.slice(scope.pathname.length);
  const navigation=event.request.mode==="navigate";
  const asset=navigation&&["","index.html"].includes(page)?"./"
    : navigation&&["editor","editor.html"].includes(page)?"./editor.html"
    : assets.find(path=>new URL(path,scope).href===url.href);
  if(!asset)return;
  if(navigation){
    event.respondWith(fetch(event.request).then(response=>{
      return response.status>=500?caches.match(asset).then(cached=>cached||response):response;
    }).catch(()=>caches.match(asset)));
  }else{
    event.respondWith(caches.match(asset).then(hit=>hit||fetch(event.request)));
  }
});
