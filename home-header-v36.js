/* MANJAZ 3.6 — home cleanup + branded header */
(function(){
"use strict";
function isHome(){ return (location.hash||"#home")==="#home"; }

function cleanHome(){
  if(!isHome()) return;
  const view=document.getElementById("view");
  if(!view) return;

  /* Remove old hero/branding so copy and elements do not repeat */
  view.querySelectorAll(".hero").forEach(el=>el.remove());

  /* Remove digital services in every known rendering */
  view.querySelectorAll(".cert-home-section").forEach(el=>el.remove());
  view.querySelectorAll(".section-block").forEach(el=>{
    const txt=(el.textContent||"").replace(/\s+/g," ").trim();
    const title=el.querySelector(".section-title h3");
    if((title && title.textContent.trim()==="الخدمات الرقمية") ||
       txt.startsWith("الخدمات الرقمية")) el.remove();
  });

  /* Remove duplicate headers */
  const old=view.querySelectorAll(".school-home-header");
  old.forEach(el=>el.remove());

  const header=document.createElement("header");
  header.className="manjaz-brand-header";
  header.innerHTML=`
    <div class="manjaz-brand-icon" aria-hidden="true">
      <i class="book b1"></i><i class="book b2"></i><i class="book b3"></i>
      <i class="sq s1"></i><i class="sq s2"></i><i class="sq s3"></i>
    </div>
    <div class="manjaz-brand-text">
      <div class="manjaz-word">منجز</div>
      <div class="manjaz-subtitle">بوابة منجزات المدرسة الرقمية</div>
      <div class="manjaz-school">الثانوية الرابعة والتسعون</div>
    </div>`;
  view.prepend(header);
}

let scheduled=false;
function apply(){
  if(scheduled) return;
  scheduled=true;
  requestAnimationFrame(()=>{scheduled=false;cleanHome();});
}
window.addEventListener("hashchange",()=>setTimeout(apply,60));
window.addEventListener("load",()=>setTimeout(apply,100),{once:true});
document.addEventListener("DOMContentLoaded",()=>setTimeout(apply,100),{once:true});

/* One short observer only until home has rendered; prevents loops/shaking */
const obs=new MutationObserver(()=>{
  if(!isHome()) return;
  const view=document.getElementById("view");
  if(view && view.children.length){
    obs.disconnect();
    setTimeout(apply,40);
  }
});
obs.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(()=>{obs.disconnect();apply();},1200);
})();