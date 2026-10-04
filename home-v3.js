(()=>{"use strict";
const S=[
["الممارسات الميدانية",[["أبرز المنجزات",["أبرز المنجزات"],[["استعراض المنجزات","v"],["إضافة منجز","a"]]]]],
["النمو المهني",[
["الورش التدريبية",["الورش التدريبية"],[["استعراض الورش","v"],["إضافة ورشة","a"],["إصدار شهادة حضور ورشة","c"]]],
["الدروس التطبيقية",["الدروس التطبيقية"],[["استعراض الدروس","v"],["إضافة درس تطبيقي","a"],["إصدار شهادة حضور","c"]]],
["نماذج الإنتاج المعرفي القابلة للتطبيق",["نماذج الإنتاج المعرفي القابلة للتطبيق","نماذج الانتاج المعرفي القابلة للتطبيق"],[["استعراض النماذج","v"],["إضافة نموذج","a"]]],
["برامج قيد الإنشاء",["برامج قيد الإنشاء","برامج طور الإنشاء"],[["استعراض البرامج","v"],["إضافة برنامج","a"]]]
]],
["الشراكة المجتمعية",[["الشراكة المجتمعية",["الشراكة المجتمعية"],[["استعراض الشراكات","v"],["إضافة شراكة","a"]]]]],
["برامج الهيكل الإداري",[["برامج الهيكل الإداري",["برامج الهيكل الإداري"],[["استعراض البرامج","v"],["إضافة برنامج","a"],["إصدار شهادة حضور","c"]]]]]
];
const n=x=>String(x||"").replace(/\s+/g," ").trim();
function cards(v){return [...v.querySelectorAll(".category-card,.home-service-card,.home-section-card,.service-card,[data-home-service-card]")].filter(x=>!x.closest("#home4"))}
function src(v,keys){return cards(v).find(x=>keys.some(k=>n(x.textContent).includes(k)))}
function old(s,t){if(!s)return null;let r=t==="a"?/إضافة/:t==="c"?/إصدار.*شهادة|شهادة/:/استعراض|عرض|فتح/;return [...s.querySelectorAll("a,button")].find(x=>r.test(n(x.textContent)))}
function btn(s,l,t){let b=document.createElement("button"),o=old(s,t);b.type="button";b.className="h4btn "+t;b.textContent=l;if(o)b.onclick=()=>o.click();else{b.disabled=true;b.classList.add("off")}return b}
function render(){if((location.hash||"#home")!=="#home")return;let v=document.getElementById("view");if(!v)return;document.getElementById("home4")?.remove();
let root=document.createElement("div");root.id="home4";
S.forEach(([heading,defs])=>{let sec=document.createElement("section");sec.className="h4sec";let h=document.createElement("h2");h.textContent=heading;sec.append(h);let g=document.createElement("div");g.className="h4grid";
defs.forEach(([title,keys,acts])=>{let s=src(v,keys),c=document.createElement("article");c.className="h4card";let h3=document.createElement("h3");h3.textContent=title;c.append(h3);let d=s?.querySelector("small,p");if(d&&n(d.textContent)){let p=document.createElement("p");p.textContent=n(d.textContent);c.append(p)}let a=document.createElement("div");a.className="h4actions";acts.forEach(([l,t])=>a.append(btn(s,l,t)));c.append(a);g.append(c)});sec.append(g);root.append(sec)});
[...v.querySelectorAll(".section-block")].forEach(x=>{let t=n(x.textContent);if(["أبرز المنجزات","الورش التدريبية","الدروس التطبيقية","الشراكة المجتمعية","نماذج الإنتاج المعرفي","نماذج الانتاج المعرفي","برامج طور الإنشاء","برامج قيد الإنشاء"].some(k=>t.includes(k)))x.classList.add("h4old")});
(v.querySelector(".footer")||v).before(root)}
addEventListener("hashchange",()=>setTimeout(render,50));document.readyState==="loading"?addEventListener("DOMContentLoaded",render,{once:true}):render();
})();