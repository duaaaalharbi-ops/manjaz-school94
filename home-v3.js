/* MANJAZ HOME 4.0 */
(()=>{"use strict";
const S=[
["1","الممارسات الميدانية",[["1","أبرز المنجزات",["أبرز المنجزات"],[["استعراض","v"],["إضافة","a"]]]]],
["2","النمو المهني",[
["2-1","الورش التدريبية",["الورش التدريبية"],[["استعراض","v"],["إضافة","a"],["إصدار شهادة حضور","c"]]],
["2-2","الدروس التطبيقية",["الدروس التطبيقية"],[["استعراض","v"],["إضافة","a"],["إصدار شهادة حضور","c"]]],
["2-3","نماذج الإنتاج المعرفي",["نماذج الإنتاج المعرفي","نماذج الانتاج المعرفي"],[["استعراض","v"],["إضافة","a"]]],
["2-4","برامج قيد الإنشاء",["برامج قيد الإنشاء","برامج طور الإنشاء"],[["استعراض","v"],["إضافة","a"]]]]],
["3","الشراكة المجتمعية",[["3","الشراكة المجتمعية",["الشراكة المجتمعية"],[["استعراض","v"],["إضافة","a"]]]]],
["4","برامج الهيكل الإداري",[["4","برامج الهيكل الإداري",["برامج الهيكل الإداري"],[["استعراض","v"],["إضافة","a"],["إصدار شهادة","c"]]]]]
];
const n=x=>String(x||"").replace(/\s+/g," ").trim(),home=()=>(location.hash||"#home")==="#home";
function all(v){return [...v.querySelectorAll(".category-card,.home-service-card,.home-section-card,.service-card,[data-home-service-card],.section-block")].filter(x=>!x.closest("#manjazHome"))}
function src(v,k){return all(v).find(x=>k.some(y=>n(x.textContent).includes(y)))}
function old(s,t){if(!s)return null;const r=t==="a"?/إضافة/:t==="c"?/إصدار.*شهادة|شهادة/:/استعراض|عرض|فتح/;return [...s.querySelectorAll("a,button")].find(x=>r.test(n(x.textContent)))}
function btn(s,l,t){const b=document.createElement("button");b.type="button";b.className="manjaz-action "+t;b.textContent=l;const o=old(s,t);if(o)b.onclick=()=>o.click();else{b.disabled=true;b.classList.add("off")}return b}
function card(v,no,title,keys,acts){const s=src(v,keys),c=document.createElement("article");c.className="manjaz-card";const d=s?.querySelector("small,p");c.innerHTML=`<div class="manjaz-card-head"><span>${no}</span><h3>${title}</h3></div>${d&&n(d.textContent)?`<p>${n(d.textContent)}</p>`:""}<div class="manjaz-actions"></div>`;acts.forEach(a=>c.querySelector(".manjaz-actions").append(btn(s,...a)));return c}
function render(){if(!home())return;const v=document.getElementById("view");if(!v)return;document.getElementById("manjazHome")?.remove();const r=document.createElement("main");r.id="manjazHome";r.dir="rtl";r.innerHTML=`<header class="manjaz-brand-header"><div class="manjaz-mark"><i></i><i></i><i></i><b></b></div><div class="manjaz-brand-copy"><strong>منجز</strong><small>بوابة منجزات المدرسة الرقمية</small><span>الثانوية الرابعة والتسعون</span></div></header>`;
S.forEach(([no,title,defs])=>{const s=document.createElement("section");s.className="manjaz-section";s.innerHTML=`<div class="manjaz-section-title"><span>${no}</span><h2>${title}</h2></div><div class="manjaz-grid"></div>`;defs.forEach(d=>s.querySelector(".manjaz-grid").append(card(v,...d)));r.append(s)});
all(v).forEach(x=>x.classList.add("manjaz-legacy-hidden"));[...v.querySelectorAll(".hero,.school-home-header,.cert-home-section,#home4")].forEach(x=>x.classList.add("manjaz-legacy-hidden"));v.prepend(r)}
let t;const go=()=>{clearTimeout(t);t=setTimeout(render,80)};addEventListener("hashchange",go);document.readyState==="loading"?document.addEventListener("DOMContentLoaded",go,{once:true}):go();addEventListener("load",go,{once:true});
})();