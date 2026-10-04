
(function(){
  "use strict";
  function fitCertificate(){
    if(window.innerWidth>768) return;
    const stage=document.querySelector(".certificate-stage");
    const paper=document.querySelector(".certificate-paper");
    if(!stage||!paper) return;
    paper.style.transform="";
    paper.style.marginBottom="";
    const natural=paper.scrollWidth || paper.offsetWidth;
    const available=Math.max(1,stage.clientWidth-4);
    if(!natural) return;
    const scale=Math.min(1,available/natural);
    paper.style.transform=`scale(${scale})`;
    paper.style.transformOrigin="top center";
    const h=paper.scrollHeight || paper.offsetHeight;
    if(scale<1) paper.style.marginBottom=`-${Math.max(0,h*(1-scale))}px`;
  }
  let t;
  const queue=()=>{clearTimeout(t);t=setTimeout(fitCertificate,40);};
  addEventListener("resize",queue);
  addEventListener("hashchange",()=>setTimeout(queue,80));
  new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==="loading") addEventListener("DOMContentLoaded",queue,{once:true}); else queue();
})();
