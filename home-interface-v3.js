
(function(){
"use strict";

const CONFIG=[
 {section:"الممارسات الميدانية", cards:[
  {title:"أبرز المنجزات", keys:["أبرز المنجزات"], actions:[
   ["استعراض المنجزات","view"],["إضافة منجز","add"]
  ]}
 ]},
 {section:"النمو المهني", cards:[
  {title:"الورش التدريبية", keys:["الورش التدريبية","إصدار الشهادات للورش المنفذة رقميًا"], actions:[
   ["استعراض الورش","view"],["إضافة ورشة","add"],["إصدار شهادة حضور ورشة","certificate"]
  ]},
  {title:"الدروس التطبيقية", keys:["الدروس التطبيقية"], actions:[
   ["استعراض الدروس","view"],["إضافة درس تطبيقي","add"],["إصدار شهادة حضور","certificate"]
  ]},
  {title:"نماذج الإنتاج المعرفي القابلة للتطبيق", keys:["نماذج الإنتاج المعرفي القابلة للتطبيق","نماذج الانتاج المعرفي القابلة للتطبيق"], actions:[
   ["استعراض النماذج","view"],["إضافة نموذج","add"]
  ]},
  {title:"برامج قيد الإنشاء", keys:["برامج قيد الإنشاء","برامج طور الإنشاء"], actions:[
   ["استعراض البرامج","view"],["إضافة برنامج","add"]
  ]}
 ]},
 {section:"الشراكة المجتمعية", cards:[
  {title:"الشراكة المجتمعية", keys:["الشراكة المجتمعية"], actions:[
   ["استعراض الشراكات","view"],["إضافة شراكة","add"]
  ]}
 ]},
 {section:"برامج الهيكل الإداري", cards:[
  {title:"برامج الهيكل الإداري", keys:["برامج الهيكل الإداري"], actions:[
   ["استعراض البرامج","view"],["إضافة برنامج","add"],["إصدار شهادة حضور","certificate"]
  ]}
 ]}
];

const norm=s=>String(s||"").replace(/\s+/g," ").trim();

function candidates(view){
 return [...view.querySelectorAll("article,.category-card,.home-service-card,.surface,.cert-home-card")];
}
function sourceFor(view,cardDef){
 return candidates(view).find(el=>{
   if(el.closest("#manjazHomeInterfaceV3")) return false;
   const t=norm(el.textContent);
   return cardDef.keys.some(k=>t.includes(k));
 })||null;
}
function descriptionOf(source){
 if(!source) return "";
 const d=source.querySelector("p,small");
 return d ? norm(d.textContent) : "";
}
function findOriginal(source,type){
 if(!source) return null;
 const els=[...source.querySelectorAll("a,button")];
 const rx={
  view:/استعراض|عرض|فتح/,
  add:/إضافة/,
  certificate:/إصدار.*شهادة|شهادة/
 }[type];
 return els.find(el=>rx.test(norm(el.textContent)))||null;
}
function action(source,label,type){
 const original=findOriginal(source,type);
 const el=document.createElement("button");
 el.type="button";
 el.className="m3-action m3-"+type;
 el.textContent=label;
 if(!original){
   // Certificate routes have known entry points even when not inside the source card.
   if(type==="certificate" && /ورشة/.test(label)){
     el.addEventListener("click",()=>document.querySelector("[data-open-certificates='1']")?.click());
   } else if(type==="certificate" && source && norm(source.textContent).includes("الدروس التطبيقية")){
     el.addEventListener("click",()=>source.querySelector("[data-open-applied-lessons],[data-issue-certificate]")?.click());
   } else {
     el.disabled=true;
     el.classList.add("is-disabled");
   }
 } else {
   el.addEventListener("click",e=>{e.preventDefault();original.click();});
 }
 return el;
}
function card(view,def){
 const src=sourceFor(view,def);
 const art=document.createElement("article");
 art.className="m3-card";
 const h=document.createElement("h3"); h.textContent=def.title; art.appendChild(h);
 const desc=descriptionOf(src);
 if(desc){
   const p=document.createElement("p"); p.textContent=desc; art.appendChild(p);
 }
 const actions=document.createElement("div"); actions.className="m3-actions";
 def.actions.forEach(([label,type])=>actions.appendChild(action(src,label,type)));
 art.appendChild(actions);
 return art;
}

function build(){
 if((location.hash||"#home")!=="#home") return;
 const view=document.getElementById("view");
 if(!view) return;

 // Remove any previous generated version, then rebuild from current functional source cards.
 view.querySelector("#manjazHomeInterfaceV3")?.remove();

 const root=document.createElement("div");
 root.id="manjazHomeInterfaceV3";
 root.className="m3-home";

 CONFIG.forEach(group=>{
   const sec=document.createElement("section");
   sec.className="m3-section";
   const title=document.createElement("h2");
   title.className="m3-section-title";
   title.textContent=group.section;
   sec.appendChild(title);
   const grid=document.createElement("div");
   grid.className="m3-grid";
   group.cards.forEach(def=>grid.appendChild(card(view,def)));
   sec.appendChild(grid);
   root.appendChild(sec);
 });

 // Hide legacy home collections only after the new UI is fully built.
 [...view.children].forEach(el=>{
   if(el===root || el.classList.contains("hero") || el.classList.contains("topbar") || el.classList.contains("footer")) return;
   const t=norm(el.textContent);
   if(["أبرز المنجزات","الخدمات الرقمية","الورش التدريبية","الدروس التطبيقية",
       "الشراكة المجتمعية","نماذج الإنتاج المعرفي","نماذج الانتاج المعرفي",
       "برامج طور الإنشاء","برامج قيد الإنشاء"].some(k=>t.includes(k))){
     el.classList.add("m3-legacy-home");
   }
 });

 const footer=view.querySelector(".footer");
 if(footer) footer.before(root); else view.appendChild(root);
}

let busy=false;
function queue(){
 if(busy) return;
 busy=true;
 setTimeout(()=>{busy=false;build();},80);
}
const observer=new MutationObserver(muts=>{
 if((location.hash||"#home")!=="#home") return;
 if(muts.some(m=>[...m.addedNodes].some(n=>n.nodeType===1 && !n.closest?.("#manjazHomeInterfaceV3")))) queue();
});
observer.observe(document.documentElement,{childList:true,subtree:true});
addEventListener("hashchange",()=>setTimeout(build,100));
if(document.readyState==="loading") addEventListener("DOMContentLoaded",build,{once:true}); else build();
})();
