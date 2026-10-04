
(function(){
"use strict";

const SPEC = [
 {heading:"الممارسات الميدانية", cards:[
   {title:"أبرز المنجزات", keys:["أبرز المنجزات"], actions:[
     ["استعراض المنجزات","view"],["إضافة منجز","add"]
   ]}
 ]},
 {heading:"النمو المهني", cards:[
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
 {heading:"الشراكة المجتمعية", cards:[
   {title:"الشراكة المجتمعية", keys:["الشراكة المجتمعية"], actions:[
     ["استعراض الشراكات","view"],["إضافة شراكة","add"]
   ]}
 ]},
 {heading:"برامج الهيكل الإداري", cards:[
   {title:"برامج الهيكل الإداري", keys:["برامج الهيكل الإداري"], actions:[
     ["استعراض البرامج","view"],["إضافة برنامج","add"],["إصدار شهادة حضور","certificate"]
   ]}
 ]}
];

const N=s=>String(s||"").replace(/\s+/g," ").trim();

function originals(view){
 return [...view.querySelectorAll("article,.category-card,.surface,.cert-home-card,.home-service-card")]
   .filter(x=>!x.closest("#homeExactV3"));
}
function findCard(view,def){
 return originals(view).find(el=>{
   const t=N(el.textContent);
   return def.keys.some(k=>t.includes(k));
 })||null;
}
function findControl(src,type){
 if(!src) return null;
 const all=[...src.querySelectorAll("a,button")];
 const rx = type==="add" ? /إضافة/ :
            type==="certificate" ? /إصدار.*شهادة|شهادة/ :
            /استعراض|عرض|فتح/;
 return all.find(x=>rx.test(N(x.textContent)))||null;
}
function makeAction(src,label,type){
 const old=findControl(src,type);
 const b=document.createElement("button");
 b.type="button";
 b.className="hx-action hx-"+type;
 b.textContent=label;
 if(old){
   b.addEventListener("click",()=>old.click());
 }else{
   b.disabled=true;
   b.classList.add("hx-disabled");
 }
 return b;
}
function makeCard(view,def){
 const src=findCard(view,def);
 const c=document.createElement("article");
 c.className="hx-card";
 const h=document.createElement("h3");
 h.textContent=def.title;
 c.appendChild(h);

 if(src){
   const d=src.querySelector("p,small");
   if(d && N(d.textContent)){
     const p=document.createElement("p");
     p.textContent=N(d.textContent);
     c.appendChild(p);
   }
 }
 const a=document.createElement("div");
 a.className="hx-actions";
 def.actions.forEach(([label,type])=>a.appendChild(makeAction(src,label,type)));
 c.appendChild(a);
 return c;
}
function render(){
 if((location.hash||"#home")!=="#home") return;
 const view=document.getElementById("view");
 if(!view) return;

 document.getElementById("homeExactV3")?.remove();

 // Build before hiding anything so controls are linked to the real existing functions.
 const root=document.createElement("div");
 root.id="homeExactV3";
 root.className="hx-home";

 SPEC.forEach(group=>{
   const sec=document.createElement("section");
   sec.className="hx-section";
   const hh=document.createElement("h2");
   hh.className="hx-heading";
   hh.textContent=group.heading;
   sec.appendChild(hh);
   const grid=document.createElement("div");
   grid.className="hx-grid";
   group.cards.forEach(def=>grid.appendChild(makeCard(view,def)));
   sec.appendChild(grid);
   root.appendChild(sec);
 });

 // Hide old homepage content blocks that contain the replaced cards.
 [...view.children].forEach(el=>{
   if(el===root || el.classList.contains("hero") || el.classList.contains("footer")) return;
   const t=N(el.textContent);
   if(["أبرز المنجزات","الورش التدريبية","الدروس التطبيقية","الشراكة المجتمعية",
       "نماذج الإنتاج المعرفي","نماذج الانتاج المعرفي","برامج طور الإنشاء",
       "برامج قيد الإنشاء","الخدمات الرقمية"].some(k=>t.includes(k))){
      el.classList.add("hx-old-home");
   }
 });

 const footer=view.querySelector(".footer");
 if(footer) footer.before(root); else view.appendChild(root);
}
let timer;
function schedule(){clearTimeout(timer);timer=setTimeout(render,100)}
addEventListener("hashchange",schedule);
if(document.readyState==="loading") addEventListener("DOMContentLoaded",render,{once:true}); else render();
})();
