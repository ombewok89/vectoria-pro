const installButton=document.querySelector("#installApp");
const installHelp=document.querySelector("#installHelp");
const standalone=matchMedia("(display-mode: standalone)");
let installEvent=null,installed=false;

function updateInstallButton(){
  installButton.hidden=installed||standalone.matches||Boolean(navigator.standalone);
}

window.addEventListener("beforeinstallprompt",event=>{
  event.preventDefault();
  installEvent=event;
  updateInstallButton();
});
window.addEventListener("appinstalled",()=>{
  installed=true;
  installEvent=null;
  updateInstallButton();
});
standalone.addEventListener("change",updateInstallButton);

installButton.addEventListener("click",async()=>{
  const prompt=installEvent;
  if(prompt){
    installEvent=null;
    installButton.disabled=true;
    try{
      const result=await prompt.prompt();
      if(result.outcome==="accepted"){
        installed=true;
        updateInstallButton();
      }
      return;
    }catch{
      // Some browsers invalidate the prompt when the page loses focus.
    }finally{installButton.disabled=false;}
  }
  const appleMobile=/iPhone|iPad|iPod/.test(navigator.userAgent)||
    (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  document.querySelector("#installApple").hidden=!appleMobile;
  document.querySelector("#installBrowser").hidden=appleMobile;
  installHelp.showModal();
});

updateInstallButton();
if("serviceWorker" in navigator){
  navigator.serviceWorker.register(new URL("./sw.js",import.meta.url),{updateViaCache:"none"}).catch(error=>{
    console.warn("Akses offline Vektora Studio belum tersedia.",error);
  });
}
