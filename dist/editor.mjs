import {icon, mountIcons} from "./icons.mjs?v=1";
const $ = id => document.getElementById(id);
mountIcons();
const NS = "http://www.w3.org/2000/svg";
const make = (tag, attrs={}) => {
  const el = document.createElementNS(NS,tag);
  for (const [key,value] of Object.entries(attrs)) el.setAttribute(key,value);
  return el;
};
const html = value => String(value).replace(/[&<>"']/g, character => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[character]);
const uid = () => globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36)+Math.random().toString(36).slice(2);
const P = (name,d,fill,stroke="none",sw=0) => ({id:uid(),name,k:"pen",d,fill,stroke,sw,dx:0,dy:0,hidden:false});
const R = (name,x,y,w,h,fill,round=0) => ({id:uid(),name,k:"rect",x,y,w,h,round,fill,stroke:"none",sw:0,dx:0,dy:0,hidden:false});
const E = (name,x,y,w,h,fill) => ({...R(name,x,y,w,h,fill),k:"ellipse"});
const blank = (name="Aset baru",w=4000,h=4000) => ({v:1,name,w,h,title:"",keywords:"",items:[]});
function sample() {
  const doc=blank("Botanical Study");
  doc.items=[
    R("Latar krem",0,0,4000,4000,"#fbefda"),
    P("Lengkung tanah","M0 3050 Q810 2500 1560 2850 T3020 3090 Q3590 3080 4000 2720 L4000 4000 L0 4000 Z","#e9bd9f"),
    P("Bukit terakota","M0 3520 Q810 3350 1490 3500 Q2250 3740 2780 3450 Q3500 3040 4000 3110 L4000 4000 H0 Z","#c77e63"),
    P("Bukit mawar","M0 3745 Q680 3460 1410 3820 Q1980 4070 2550 3700 Q3350 3240 4000 3570 L4000 4000 H0 Z","#a9564a"),
    E("Matahari",2440,650,780,780,"#e5a253"),
    P("Aksen langit","M765 1120 Q970 919 1175 1120 M904 1235 Q1040 1110 1180 1235 M3020 1710 Q3190 1540 3370 1710","none","#bc775e",21),
    P("Tangkai utama","M1870 3580 C1700 2770 2180 2550 2010 1350 M1820 3120 Q1640 2550 1160 2210 M1870 2840 Q2130 2270 2490 2120 M1950 2470 Q1870 2060 1535 1760","none","#3b4941",38),
    P("Daun zaitun","M2010 1570 C1720 1460 1650 1150 1725 820 C1940 972 2040 1230 2010 1570 Z M2000 2085 C1685 1980 1510 1775 1415 1560 C1710 1595 1920 1750 2000 2085 Z M1827 2960 C1400 2760 1100 2520 940 2150 C1290 2190 1720 2450 1827 2960 Z","#667658"),
    P("Daun hijau tua","M2020 1735 C1970 1450 2110 1170 2350 985 C2420 1270 2270 1550 2020 1735 Z M1950 2480 C2070 2110 2360 1900 2725 1865 C2530 2185 2255 2400 1950 2480 Z M1870 3250 C1990 2910 2250 2710 2540 2620 C2400 2940 2150 3170 1870 3250 Z","#3e5145"),
    P("Urat daun","M2025 1685 Q2170 1430 2280 1190 M1980 2430 Q2260 2160 2550 1995 M1780 2890 Q1550 2520 1090 2260 M1965 2040 Q1750 1780 1530 1640 M1900 3195 Q2210 2920 2430 2760","none","#f5daa6",15),
    P("Aksen bintang","M2850 515v235m-118-118h236 M1260 675v110m-55-55h110 M3240 2220v135m-67-67h134","none","#9c5948",19)
  ];
  doc.title="Botanical desert landscape with olive leaves";
  doc.keywords="botanical, landscape, olive leaves, desert, terracotta, sun, vector, nature, boho, warm colors";
  return doc;
}
const validColor = color => typeof color==="string" && /^(none|#[\da-f]{6})$/i.test(color);
const number = value => Number.isFinite(value) && Math.abs(value)<=1000000;
function valid(doc) {
  if (!doc || doc.v!==1 || !["name","title","keywords"].every(key=>typeof doc[key]==="string" && doc[key].length<=2500)
      || !["w","h"].every(key=>Number.isInteger(doc[key]) && doc[key]>=50 && doc[key]<=12000)
      || !Array.isArray(doc.items) || doc.items.length>500 || new Set(doc.items.map(item=>item?.id)).size!==doc.items.length) return false;
  return doc.items.every(item => item && typeof item.id==="string" && /^[\w-]{1,100}$/.test(item.id)
    && typeof item.name==="string" && item.name.length<=100 && ["pen","rect","ellipse"].includes(item.k)
    && validColor(item.fill) && validColor(item.stroke) && [item.dx,item.dy,item.sw].every(number) && item.sw>=0
    && typeof item.hidden==="boolean" && (item.k==="pen"
      ? typeof item.d==="string" && item.d.length<=90000 && /^\s*[Mm][\d\s.,+eEMmLlHhVvCcSsQqTtAaZz-]+$/.test(item.d)
      : [item.x,item.y,item.w,item.h,item.round].every(number) && item.w>0 && item.h>0 && item.round>=0));
}
let doc;
try { doc=JSON.parse(localStorage.getItem("vektora-v1")); } catch {}
if (!valid(doc)) doc=sample();
let active=null,tool="select",tab="layers",zoom=1,grid=false,gesture=null,past=[],future=[];
const board=$("board"),stage=$("stage");
const copy = () => structuredClone(doc);
const selected = () => doc.items.find(item=>item.id===active);
const save = () => {
  const mark=$("saveState");
  try {
    localStorage.setItem("vektora-v1",JSON.stringify(doc));
    mark.removeAttribute("data-failed");
    mark.lastElementChild.textContent="Tersimpan di perangkat";
  } catch {
    mark.setAttribute("data-failed","");
    mark.lastElementChild.textContent="Penyimpanan lokal gagal";
    toast("Penyimpanan lokal gagal. Unduh cadangan melalui menu proyek.");
  }
};
function record(before) {
  past.push(before);
  if(past.length>50) past.shift();
  future=[];
  save();
}
function change(edit) {
  const before=copy();
  edit();
  record(before);
  render();
}
function navigateHistory(from,to) {
  if (!from.length || gesture) return;
  to.push(copy());
  doc=from.pop();
  if(!selected()) active=null;
  save();
  render();
}
const tools=[["select","Pilih","Ketuk objek untuk memilih, lalu seret untuk memindahkannya."],["rect","Kotak","Seret di kanvas untuk membuat kotak."],["ellipse","Oval","Seret di kanvas untuk membuat oval."],["pen","Pena","Gambar garis bebas dengan menyeret jari di kanvas."]];
$("toolList").innerHTML=tools.map(([id,label])=>`<button class="tool" data-tool="${id}" aria-label="${label}">${icon(id)}<span>${label}</span></button>`).join("");
function selectTool(id) {
  tool=id;
  for (const el of $("toolList").children) el.setAttribute("aria-pressed",el.dataset.tool===id);
  board.dataset.tool=id;
  $("hint").textContent=tools.find(entry=>entry[0]===id)[2];
}
$("toolList").addEventListener("click",event=>{const button=event.target.closest("button");if(button) selectTool(button.dataset.tool);});
function node(item) {
  let el;
  if (item.k==="pen") el=make("path",{d:item.d,"stroke-linecap":"round","stroke-linejoin":"round"});
  else if (item.k==="rect") el=make("rect",{x:item.x,y:item.y,width:item.w,height:item.h,rx:item.round});
  else el=make("ellipse",{cx:item.x+item.w/2,cy:item.y+item.h/2,rx:item.w/2,ry:item.h/2});
  for (const [key,value] of Object.entries({fill:item.fill,stroke:item.stroke,"stroke-width":item.sw,transform:`translate(${item.dx} ${item.dy})`})) el.setAttribute(key,value);
  return el;
}
function renderBoard() {
  board.setAttribute("viewBox",`0 0 ${doc.w} ${doc.h}`);
  const content=doc.items.filter(item=>!item.hidden).map(item=>{
    const group=make("g",{"data-shape":item.id});
    group.append(node(item));return group;
  });
  board.replaceChildren(...content);
  if(grid){
    const gridGroup=make("g",{stroke:"#665192",opacity:".32","pointer-events":"none","stroke-width":Math.min(doc.w,doc.h)/440});
    for(let i=1;i<8;i++){
      gridGroup.append(make("path",{d:`M${i*doc.w/8} 0V${doc.h}M0 ${i*doc.h/8}H${doc.w}`}));
    }
    board.append(gridGroup);
  }
  const element=content.find(group=>group.dataset.shape===active);
  if(element){
    const {x,y,width,height}=element.getBBox();
    board.append(make("rect",{x:x-2,y:y-2,width:width+4,height:height+4,fill:"none",stroke:"#6747db","stroke-width":1.5,"stroke-dasharray":"5 3","vector-effect":"non-scaling-stroke","pointer-events":"none"}));
  }
}
function sizeBoard() {
  const margin=matchMedia("(max-width:720px)").matches ? 30 : 58;
  const scale=Math.max(.001,Math.min((stage.clientWidth-margin)/doc.w,(stage.clientHeight-margin)/doc.h,640/Math.max(doc.w,doc.h)))*zoom;
  board.style.width=(doc.w*scale)+"px";
  board.style.height=(doc.h*scale)+"px";
  $("zoomLabel").textContent=Math.round(zoom*100)+"%";
  $("minus").disabled=zoom<=.5;
  $("plus").disabled=zoom>=3;
}
function point(event){
  const bounds=board.getBoundingClientRect();
  return {x:Math.round((event.clientX-bounds.left)*doc.w/bounds.width),y:Math.round((event.clientY-bounds.top)*doc.h/bounds.height)};
}
board.addEventListener("pointerdown",event=>{
  if(gesture || event.button!==0) return;
  const origin=point(event);
  const target=event.target.closest("[data-shape]");
  if(tool==="select"){
    active=target?.dataset.shape??null;
    if(!active){render();return;}
    const item=selected();
    gesture={origin,before:copy(),dx:item.dx,dy:item.dy,mode:tool,id:event.pointerId};
  }else{
    if(doc.items.length>=500){toast("Batas proyek adalah 500 objek.");return;}
    const before=copy();
    const label=tools.find(entry=>entry[0]===tool)[1]+" "+(doc.items.length+1);
    const item=tool==="pen" ? P(label,`M${origin.x} ${origin.y}`,"none","#6747db",Math.max(3,Math.round(Math.min(doc.w,doc.h)/180)))
      : (tool==="rect"?R:E)(label,origin.x,origin.y,1,1,"#9a82eb");
    doc.items.push(item);active=item.id;
    gesture={origin,before,mode:tool,id:event.pointerId,last:origin};
  }
  board.setPointerCapture(event.pointerId);
  renderBoard();
});
board.addEventListener("pointermove",event=>{
  if(!gesture || gesture.id!==event.pointerId) return;
  const current=point(event),{origin,mode}=gesture,item=selected();
  const dx=current.x-origin.x,dy=current.y-origin.y;
  if(mode==="select"){
    item.dx=gesture.dx+dx;item.dy=gesture.dy+dy;
  }else if(mode==="pen"){
    if(item.d.length<89950 && Math.hypot(current.x-gesture.last.x,current.y-gesture.last.y)>=Math.min(doc.w,doc.h)/700){
      item.d+=` L${current.x} ${current.y}`;gesture.last=current;gesture.moved=true;
    }
  }else{
    item.x=Math.min(origin.x,current.x);item.y=Math.min(origin.y,current.y);
    item.w=Math.max(1,Math.abs(dx));item.h=Math.max(1,Math.abs(dy));
  }
  if(mode!=="pen") gesture.moved=Math.hypot(dx,dy)>Math.min(doc.w,doc.h)/450;
  renderBoard();
});
function endGesture(event,cancelled){
  if(!gesture || event.pointerId!==gesture.id) return;
  const {before,moved}=gesture;
  gesture=null;
  if(moved&&!cancelled) record(before);
  else {doc=before;if(!selected()) active=null;}
  render();
}
board.addEventListener("pointerup",event=>endGesture(event,false));
board.addEventListener("pointercancel",event=>endGesture(event,true));
board.addEventListener("lostpointercapture",event=>endGesture(event,true));

function action(id,glyph,label,disabled=false) {
  return `<button class="icon-btn" data-action="${id}" aria-label="${label}" title="${label}" ${disabled?"disabled":""}>${icon(glyph)}</button>`;
}
function renderLayers(){
  const panel=$("layers");
  const rows=[...doc.items].reverse().map(item=>`<div class="layer ${item.id===active?"active":""} ${item.hidden?"muted":""}" data-id="${item.id}"><button class="layer-name" data-action="select" aria-pressed="${item.id===active}"><span class="swatch" style="background:${item.fill==="none"?"#f8f5fc":item.fill};color:${item.fill==="none"&&item.stroke!=="none"?item.stroke:"#29203e"}">${icon(item.k)}</span><span>${html(item.name)}</span></button>${action("visibility",item.hidden?"eyeOff":"eye",item.hidden?"Tampilkan layer":"Sembunyikan layer")}</div>`).join("");
  const index=doc.items.findIndex(item=>item.id===active);
  const scroll=panel.scrollTop;
  panel.innerHTML=`<div class="row-head"><h3>Layer kanvas</h3><span class="count">${doc.items.length} objek</span></div>${rows||'<p class="subtle">Kanvas kosong. Tambahkan objek dengan Kotak, Oval, atau Pena.</p>'}<div class="layer-actions">${action("up","up","Naikkan layer",index===-1||index===doc.items.length-1)}${action("down","down","Turunkan layer",index<=0)}${action("copy","copy","Duplikat layer",index===-1||doc.items.length>=500)}${action("trash","trash","Hapus layer",index===-1)}</div>`;
  panel.scrollTop=scroll;
}
$("layers").addEventListener("click",event=>{
  const button=event.target.closest("[data-action]");
  if(!button)return;
  const {action}=button.dataset;
  const item=doc.items.find(entry=>entry.id===button.closest("[data-id]")?.dataset.id);
  if(action==="select"){active=item.id;render();return;}
  if(action==="visibility"){change(()=>{item.hidden=!item.hidden;});return;}
  const index=doc.items.findIndex(entry=>entry.id===active);
  if(index<0)return;
  if(action==="copy"){change(()=>{const clone={...selected(),id:uid(),name:(selected().name+" salin").slice(0,100),dx:selected().dx+doc.w/40,dy:selected().dy+doc.h/40};doc.items.splice(index+1,0,clone);active=clone.id;});return;}
  if(action==="trash"){removeSelected();return;}
  const destination=index+(action==="up"?1:-1);
  if(destination>=0&&destination<doc.items.length) change(()=>{[doc.items[index],doc.items[destination]]=[doc.items[destination],doc.items[index]];});
});
function removeSelected(){
  if(gesture||!selected())return;
  change(()=>{doc.items=doc.items.filter(item=>item.id!==active);active=null;});
}
function field(name,label,value,props=""){
  return `<label class="field">${label}<input name="${name}" value="${html(value)}" ${props}></label>`;
}
function renderStyle(){
  const item=selected();
  $("style").innerHTML=item?`<div class="row-head"><h3>Properti objek</h3></div>
    ${field("name","Nama layer",item.name,'maxlength="100"')}
    <div class="fields">${field("fill","Warna isi",item.fill==="none"?"#9a82eb":item.fill,'type="color"')}${field("stroke","Warna garis",item.stroke==="none"?"#6747db":item.stroke,'type="color"')}</div>
    <label class="field inline"><input name="noFill" type="checkbox" ${item.fill==="none"?"checked":""}> Isi transparan</label>
    ${field("sw","Tebal garis (px)",item.sw,'type="number" min="0" max="1000000" step="any"')}
    <div class="fields">${field("dx","Geser X (px)",item.dx,'type="number" min="-1000000" max="1000000" step="any"')}${field("dy","Geser Y (px)",item.dy,'type="number" min="-1000000" max="1000000" step="any"')}</div>`
    :'<div class="row-head"><h3>Properti objek</h3></div><p class="subtle">Pilih objek di kanvas atau dari tab Layer untuk mengatur tampilannya.</p>';
}
$("style").addEventListener("change",event=>{
  const input=event.target,item=selected();
  if(!item||!input.name||!input.checkValidity())return;
  change(()=>{
    if(input.name==="noFill") {item.fill=input.checked?"none":$("style").querySelector('[name="fill"]').value;return;}
    if(["dx","dy","sw"].includes(input.name)){
      item[input.name]=Number(input.value);
      if(input.name==="sw"&&item.sw>0&&item.stroke==="none") item.stroke="#6747db";
    }else{
      item[input.name]=input.value.trim()||"Objek";
      if(input.name==="stroke"&&!item.sw)item.sw=Math.max(1,Math.round(Math.min(doc.w,doc.h)/200));
    }
  });
});
const adobe="https://helpx.adobe.com/stock/contributor/submit-your-content/submit-vectors/technical-requirements-for-vector-submissions.html";
function exportSvg(){
  const svg=make("svg",{width:doc.w,height:doc.h,viewBox:`0 0 ${doc.w} ${doc.h}`,overflow:"hidden"});
  if(doc.title.trim()){const title=make("title");title.textContent=doc.title.trim();svg.append(title);}
  for(const item of doc.items.filter(entry=>!entry.hidden)){
    const layer=make("g",{"aria-label":item.name});
    const title=make("title");title.textContent=item.name;
    layer.append(title,node(item));svg.append(layer);
  }
  return '<?xml version="1.0" encoding="UTF-8"?>\n'+new XMLSerializer().serializeToString(svg);
}
function technical(){
  const area=doc.w*doc.h/1e6;
  const mb=new Blob([exportSvg()]).size/1e6;
  const visible=doc.items.some(item=>!item.hidden&&(item.fill!=="none"||(item.sw>0&&item.stroke!=="none")));
  return [
    [visible,"Ada objek dengan isi atau garis aktif"],
    [area>=15&&area<=65,`Artboard ${area.toLocaleString("id",{maximumFractionDigits:3})} MP · syarat 15–65 MP`],
    [mb<=45,`SVG ${Math.max(1,Math.round(mb*1000))} KB · batas 45 MB`],
    [true,"Warna RGB, titik awal artboard (0, 0)"],
    [true,"Bentuk vektor yang dapat diedit"]
  ];
}
const checklist = checks => '<ul class="checklist">'+checks.map(([ok,label])=>`<li ${ok?"":"data-fail"}><i aria-hidden="true">${icon(ok?"check":"alert")}</i><span><span class="screen-reader">${ok?"Lolos: ":"Periksa: "}</span>${html(label)}</span></li>`).join("")+'</ul>';
function renderStock(checks){
  $("stock").innerHTML=`<div class="row-head"><h3>Pemeriksaan teknis</h3></div>${checklist(checks)}
    <p class="subtle">Adobe meninjau kualitas, orisinalitas, dan hak penggunaan secara terpisah. <a href="${adobe}" target="_blank" rel="noopener">Lihat panduan Adobe</a></p>
    <div class="row-head"><h3>Metadata unggahan</h3></div>
    ${field("title","Judul aset",doc.title,'maxlength="150" placeholder="Contoh: Botanical desert landscape"')}
    <label class="field">Kata kunci (pisahkan dengan koma)<textarea name="keywords" maxlength="2500" rows="3" placeholder="botanical, landscape, olive leaves">${html(doc.keywords)}</textarea></label>
    <button class="secondary" data-metadata>Unduh metadata</button>
    <p class="subtle">Salin judul dan kata kunci ke portal Adobe Stock. Urutkan kata kunci dari yang paling relevan.</p>`;
}
$("stock").addEventListener("change",event=>{
  const input=event.target;
  if(!["title","keywords"].includes(input.name)||!input.checkValidity())return;
  const before=copy();
  doc[input.name]=input.value.trim();
  record(before);
  updateHistory();
});
$("stock").addEventListener("click",event=>{
  if(!event.target.closest("[data-metadata]"))return;
  const keywords=[...new Set(doc.keywords.split(",").map(keyword=>keyword.trim()).filter(Boolean))];
  download(fileBase()+"-metadata.txt",`Judul: ${doc.title}\n\nKata kunci: ${keywords.join(", ")}\n`,"text/plain");
  toast("Metadata diunduh.");
});
function renderTabs() {
  for(const button of document.querySelectorAll("[data-tab]")){
    const current=button.dataset.tab===tab;
    button.setAttribute("aria-selected",current);
    $(button.dataset.tab).hidden=!current;
  }
}
function updateHistory() {
  $("undo").disabled=!past.length;
  $("redo").disabled=!future.length;
}
function render() {
  $("projectName").textContent=doc.name;
  $("sizeText").textContent=`${doc.w} × ${doc.h} px`;
  updateHistory();
  renderBoard();
  renderLayers();
  renderStyle();
  const checks=technical();
  renderStock(checks);
  $("stockSummary").textContent=checks.every(([ok])=>ok)?"Pemeriksaan dasar lulus":"Ada syarat yang perlu diperiksa";
  renderTabs();
  sizeBoard();
}
function setTab(next){tab=next;renderTabs();}
const onMobile=()=>matchMedia("(max-width:720px)").matches;
function openPanel(next) {
  if(next)setTab(next);
  if(onMobile()){
    $("panel").classList.add("open");
    $("panelBackdrop").hidden=false;
    $("mobilePanel").setAttribute("aria-expanded","true");
    $("closePanel").focus();
  }
}
function closePanel(){
  if(!$("panel").classList.contains("open")) return;
  $("panel").classList.remove("open");
  $("panelBackdrop").hidden=true;
  $("mobilePanel").setAttribute("aria-expanded","false");
  if(onMobile()) $("mobilePanel").focus();
}
$("mobilePanel").setAttribute("aria-expanded","false");
$("mobilePanel").setAttribute("aria-controls","panel");
$("mobilePanel").onclick=()=>openPanel();
$("closePanel").onclick=closePanel;
$("panelBackdrop").onclick=closePanel;
$("stockShortcut").onclick=()=>setTab("stock");
for(const button of document.querySelectorAll("[data-tab]")) button.onclick=()=>setTab(button.dataset.tab);
$("undo").onclick=()=>navigateHistory(past,future);
$("redo").onclick=()=>navigateHistory(future,past);
$("gridToggle").onclick=()=>{
  grid=!grid;
  $("gridToggle").setAttribute("aria-pressed",grid);
  $("gridToggle").setAttribute("aria-label",grid?"Sembunyikan kisi":"Tampilkan kisi");
  renderBoard();
};
function setZoom(value){zoom=value;sizeBoard();}
$("fit").onclick=()=>{setZoom(1);stage.scrollTo(0,0);};
$("minus").onclick=()=>setZoom(Math.max(.5,zoom-.25));
$("plus").onclick=()=>setZoom(Math.min(3,zoom+.25));
new ResizeObserver(sizeBoard).observe(stage);

let toastTimer;
function toast(message){
  clearTimeout(toastTimer);
  $("toast").hidden=false;
  $("toast").textContent=message;
  toastTimer=setTimeout(()=>$("toast").hidden=true,2900);
}
function download(name,data,type){
  const url=URL.createObjectURL(new Blob([data],{type}));
  const anchor=document.createElement("a");
  anchor.href=url;anchor.download=name;
  document.body.append(anchor);anchor.click();anchor.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
}
const fileBase=()=>doc.name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"vektora";
function showModal(title,body) {
  $("modalTitle").textContent=title;
  $("modalBody").innerHTML=body;
  if(!$("modal").open)$("modal").showModal();
}
$("modalClose").onclick=()=>$("modal").close();
function backup(){
  download(fileBase()+".vektora.json",JSON.stringify(doc,null,2),"application/json");
  toast("Cadangan proyek diunduh.");
}
function replaceProject(next){
  change(()=>{doc=next;active=null;});
  setZoom(1);
  selectTool("select");
  $("modal").close();
}
function confirmBlank(){
  showModal("Buat proyek baru",'<p class="subtle">Kanvas baru akan menjadi proyek aktif. Unduh cadangan jika ingin membuka kembali proyek ini nanti.</p><div class="modal-actions"><button id="blankBackup" class="secondary">Unduh cadangan</button><button id="newConfirm" class="primary">Buat kanvas kosong</button></div>');
  $("blankBackup").onclick=backup;
  $("newConfirm").onclick=()=>replaceProject(blank());
}
$("project").onclick=()=>{
  showModal("Pengaturan proyek",`<form id="projectForm">
    ${field("name","Nama proyek",doc.name,'required maxlength="100"')}
    <div class="fields">${field("w","Lebar (px)",doc.w,'type="number" required min="50" max="12000"')}${field("h","Tinggi (px)",doc.h,'type="number" required min="50" max="12000"')}</div>
    <p class="subtle">Mengubah ukuran kanvas tidak mengubah ukuran objek.</p>
    <button class="primary" type="submit">Simpan pengaturan</button>
  </form><div class="modal-actions"><button id="newProject" class="secondary">Proyek baru</button><button id="backup" class="secondary">Unduh cadangan</button><button id="openProject" class="secondary">Buka cadangan</button><button id="projectHelp" class="secondary">Panduan</button></div>`);
  $("projectForm").onsubmit=event=>{
    event.preventDefault();
    const fields=new FormData(event.currentTarget);
    change(()=>{doc.name=fields.get("name").trim()||"Aset baru";doc.w=Number(fields.get("w"));doc.h=Number(fields.get("h"));});
    $("modal").close();
  };
  $("newProject").onclick=confirmBlank;
  $("backup").onclick=backup;
  $("openProject").onclick=()=>$("importProject").click();
  $("projectHelp").onclick=showHelp;
};
$("importProject").onchange=async event=>{
  const file=event.target.files[0];
  event.target.value="";
  if(!file)return;
  try {
    if(file.size>12e6)throw Error();
    const incoming=JSON.parse(await file.text());
    if(!valid(incoming))throw Error();
    showModal("Buka cadangan",`<p class="subtle">Jadikan <strong>${html(incoming.name)}</strong> proyek aktif?</p><div class="modal-actions"><button id="importBackup" class="secondary">Cadangkan proyek aktif</button><button id="importConfirm" class="primary">Buka proyek</button></div>`);
    $("importBackup").onclick=backup;
    $("importConfirm").onclick=()=>{replaceProject(incoming);toast("Proyek berhasil dibuka.");};
  } catch {toast("File tidak cocok. Pilih cadangan JSON dari Vektora.");}
};
$("export").onclick=()=>{
  const checks=technical();
  showModal("Ekspor aset SVG",`${checklist(checks)}<p class="subtle">${checks.every(([ok])=>ok)?"SVG siap diperiksa dan diunggah secara manual melalui Adobe Stock Contributor.":"Perbaiki poin teknis sebelum mengunggah ke Adobe Stock. Kamu tetap bisa mengunduh SVG untuk ditinjau."}</p><div class="modal-actions"><button id="downloadSvg" class="primary">${icon("download")} Unduh SVG</button><button id="openStock" class="secondary">Buka panel Stock</button></div>`);
  $("downloadSvg").onclick=()=>{download(fileBase()+".svg",exportSvg(),"image/svg+xml");$("modal").close();toast("SVG diunduh.");};
  $("openStock").onclick=()=>{$("modal").close();openPanel("stock");};
};
function showHelp(){
  showModal("Panduan Vektora",'<ol class="subtle"><li>Ketuk nama proyek untuk membuat kanvas kosong atau mengatur ukurannya.</li><li>Pilih Kotak, Oval, atau Pena, kemudian seret jari pada kanvas.</li><li>Gunakan Pilih untuk memindahkan objek. Buka Panel untuk menata Layer dan Gaya.</li><li>Isi metadata di tab Stock, periksa SVG, lalu unggah melalui portal Contributor.</li></ol><p class="subtle">Satu proyek aktif disimpan otomatis di browser ini. Unduh cadangan JSON sebelum pindah perangkat atau membersihkan data browser.</p>');
}
$("help").onclick=showHelp;
document.addEventListener("keydown",event=>{
  if($("modal").open||event.target.matches("input,textarea,select"))return;
  if(event.key==="Escape"){closePanel();return;}
  if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z"){event.preventDefault();event.shiftKey?$("redo").click():$("undo").click();}
  if(event.key==="Delete"||event.key==="Backspace"){event.preventDefault();removeSelected();}
});
selectTool("select");
save();
render();
