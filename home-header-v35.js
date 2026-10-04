/* MANJAZ 3.5 — approved home/header patch */
(function(){
"use strict";
function cleanDigitalServices(){
  document.querySelectorAll(".cert-home-section").forEach(el=>el.remove());
  [...document.querySelectorAll(".section-block")].forEach(el=>{
    const h=el.querySelector(".section-title h3");
    if(h && h.textContent.trim()==="الخدمات الرقمية") el.remove();
  });
}
function schoolHeader(){
  if((location.hash||"#home")!=="#home")return;
  const view=document.getElementById("view"); if(!view)return;
  cleanDigitalServices();
  if(view.querySelector(".school-home-header"))return;
  const hero=view.querySelector(".hero");
  const header=document.createElement("header");
  header.className="school-home-header surface";
  header.innerHTML='<span>وزارة التعليم • إدارة تعليم جدة</span><h1>الثانوية الرابعة والتسعون - مسارات</h1><small>بوابة منجز المدرسية</small>';
  hero?view.insertBefore(header,hero):view.prepend(header);
}
let timer;
function apply(){clearTimeout(timer);timer=setTimeout(()=>{cleanDigitalServices();schoolHeader()},40)}
new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
addEventListener("hashchange",apply);
document.readyState==="loading"?addEventListener("DOMContentLoaded",apply,{once:true}):apply();
})();