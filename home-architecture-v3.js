
(function(){
"use strict";

const SECTION_DEFS = [
  {
    title:"الممارسات الميدانية",
    cards:[
      {title:"أبرز المنجزات", view:"استعراض المنجزات", add:"إضافة منجز",
       match:["أبرز المنجزات"]}
    ]
  },
  {
    title:"النمو المهني",
    cards:[
      {title:"الورش التدريبية", view:"استعراض الورش", add:"إضافة ورشة", certificate:"إصدار شهادة حضور ورشة",
       match:["الورش التدريبية","إصدار الشهادات للورش المنفذة رقميًا"]},
      {title:"الدروس التطبيقية", view:"استعراض الدروس", add:"إضافة درس تطبيقي", certificate:"إصدار شهادة حضور",
       match:["الدروس التطبيقية"]},
      {title:"نماذج الإنتاج المعرفي القابلة للتطبيق", view:"استعراض النماذج", add:"إضافة نموذج",
       match:["نماذج الإنتاج المعرفي القابلة للتطبيق","نماذج الانتاج المعرفي القابلة للتطبيق"]},
      {title:"برامج قيد الإنشاء", view:"استعراض البرامج", add:"إضافة برنامج",
       match:["برامج قيد الإنشاء","برامج طور الإنشاء"]}
    ]
  },
  {
    title:"الشراكة المجتمعية",
    cards:[
      {title:"الشراكة المجتمعية", view:"استعراض الشراكات", add:"إضافة شراكة",
       match:["الشراكة المجتمعية"]}
    ]
  },
  {
    title:"برامج الهيكل الإداري",
    cards:[
      {title:"برامج الهيكل الإداري", view:"استعراض البرامج", add:"إضافة برنامج", certificate:"إصدار شهادة حضور",
       match:["برامج الهيكل الإداري"]}
    ]
  }
];

function allHomeCards(view){
  return [...view.querySelectorAll("article,.category-card,.home-service-card,.surface")];
}
function findSourceCard(view,def){
  const cards=allHomeCards(view);
  return cards.find(el=>{
    const t=(el.textContent||"").replace(/\s+/g," ").trim();
    return def.match.some(m=>t.includes(m));
  }) || null;
}
function findAction(source,kind){
  if(!source) return null;
  const els=[...source.querySelectorAll("a,button")];
  const patterns={
    view:/استعراض|عرض|فتح/,
    add:/إضافة/,
    certificate:/إصدار.*شهادة|شهادة/
  };
  return els.find(el=>patterns[kind].test((el.textContent||"").trim()))||null;
}
function cloneAction(source,kind,label,cls){
  const original=findAction(source,kind);
  const tag=original && original.tagName==="A" ? "a" : "button";
  const el=document.createElement(tag);
  el.className=`v3-action ${cls}`;
  el.textContent=label;
  if(tag==="button") el.type="button";
  if(original){
    if(tag==="a") el.href=original.getAttribute("href")||"#";
    [...original.attributes].forEach(a=>{
      if(["class","style","href"].includes(a.name)) return;
      el.setAttribute(a.name,a.value);
    });
    el.addEventListener("click",e=>{
      e.preventDefault();
      original.click();
    });
  }else{
    el.disabled=true;
    el.classList.add("is-unavailable");
  }
  return el;
}
function makeCard(view,def){
  const source=findSourceCard(view,def);
  const card=document.createElement("article");
  card.className="v3-home-card";

  const title=document.createElement("h3");
  title.textContent=def.title;
  card.appendChild(title);

  // Preserve existing description text if available.
  if(source){
    const desc=source.querySelector("p,small");
    if(desc && (desc.textContent||"").trim()){
      const p=document.createElement("p");
      p.className="v3-card-description";
      p.textContent=(desc.textContent||"").trim();
      card.appendChild(p);
    }
  }

  const actions=document.createElement("div");
  actions.className="v3-actions";
  actions.appendChild(cloneAction(source,"view",def.view,"is-view"));
  actions.appendChild(cloneAction(source,"add",def.add,"is-add"));
  if(def.certificate){
    actions.appendChild(cloneAction(source,"certificate",def.certificate,"is-certificate"));
  }
  card.appendChild(actions);
  return card;
}

function render(){
  if((location.hash||"#home")!=="#home") return;
  const view=document.getElementById("view");
  if(!view) return;

  let root=view.querySelector("#manjazHomeV3");
  if(root) return;

  // Hide only the previous homepage card collections; no underlying data/functions are deleted.
  [...view.querySelectorAll(".section-block")].forEach(sec=>{
    const t=(sec.textContent||"").replace(/\s+/g," ");
    if(["أبرز المنجزات","الورش التدريبية","الدروس التطبيقية","الشراكة المجتمعية",
        "نماذج الإنتاج المعرفي","نماذج الانتاج المعرفي","برامج طور الإنشاء","برامج قيد الإنشاء",
        "الخدمات الرقمية"].some(x=>t.includes(x))){
      sec.classList.add("v3-source-section");
    }
  });

  root=document.createElement("div");
  root.id="manjazHomeV3";
  root.className="v3-home-architecture";

  SECTION_DEFS.forEach(sectionDef=>{
    const section=document.createElement("section");
    section.className="v3-home-section";
    const heading=document.createElement("h2");
    heading.className="v3-section-heading";
    heading.textContent=sectionDef.title;
    section.appendChild(heading);

    const grid=document.createElement("div");
    grid.className="v3-card-grid";
    sectionDef.cards.forEach(def=>grid.appendChild(makeCard(view,def)));
    section.appendChild(grid);
    root.appendChild(section);
  });

  const footer=view.querySelector(".footer");
  if(footer) footer.before(root); else view.appendChild(root);
}

let timer;
const queue=()=>{clearTimeout(timer);timer=setTimeout(render,60);};
new MutationObserver(queue).observe(document.documentElement,{childList:true,subtree:true});
addEventListener("hashchange",()=>setTimeout(render,80));
if(document.readyState==="loading") addEventListener("DOMContentLoaded",render,{once:true}); else render();
})();
