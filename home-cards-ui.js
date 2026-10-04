
(function(){
"use strict";
const names=["أبرز المنجزات","الورش التدريبية","الدروس التطبيقية","الشراكة المجتمعية","نماذج الإنتاج المعرفي القابلة للتطبيق","برامج طور الإنشاء"];

function tune(){
  if((location.hash||"#home")!=="#home") return;
  const view=document.getElementById("view");
  if(!view) return;

  const candidates=[...view.querySelectorAll("article,.category-card,.surface")];
  const cards=candidates.filter(el=>{
    const t=(el.textContent||"").trim();
    return names.some(n=>t.includes(n));
  });

  cards.forEach(card=>{
    card.classList.add("home-service-card");
    card.dataset.homeServiceCard="1";

    // Keep description untouched; only strengthen title.
    const title=[...card.querySelectorAll("h2,h3,strong")].find(el=>{
      const t=(el.textContent||"").trim();
      return names.some(n=>t===n || t.includes(n));
    });
    if(title) title.classList.add("home-service-title");

    const actions=[...card.querySelectorAll("a,button")].filter(el=>{
      const t=(el.textContent||"").trim();
      return /^استعراض/.test(t)||/^إضافة/.test(t);
    });
    if(actions.length){
      let wrap=actions[0].parentElement;
      const sameParent=actions.every(a=>a.parentElement===wrap);
      if(!sameParent || !wrap){
        wrap=document.createElement("div");
        wrap.className="home-card-actions";
        actions[0].before(wrap);
        actions.forEach(a=>wrap.appendChild(a));
      } else {
        wrap.classList.add("home-card-actions");
      }
      actions.forEach(a=>{
        a.style.textDecoration="none";
        const t=(a.textContent||"").trim();
        a.classList.toggle("home-action-view",/^استعراض/.test(t));
        a.classList.toggle("home-action-add",/^إضافة/.test(t));
      });
    }
  });

  // Remove only the decorative heading/side-description immediately associated
  // with the home service-card collection, not the card descriptions themselves.
  cards.forEach(card=>{
    const section=card.closest("section");
    if(!section) return;
    const title=section.querySelector(":scope > .section-title");
    if(title && !title.closest(".home-service-card")) title.style.display="none";
  });
}
let timer;
const queue=()=>{clearTimeout(timer);timer=setTimeout(tune,40);};
new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
addEventListener("hashchange",()=>setTimeout(tune,60));
if(document.readyState==="loading") addEventListener("DOMContentLoaded",tune,{once:true}); else tune();
})();
