/* MANJAZ HOME 4.1 — single-source home renderer */
(()=>{"use strict";
const sections=[
["1","الممارسات الميدانية",[["1","أبرز المنجزات","استعراض أبرز منجزات المدرسة وشواهد الأثر",[["استعراض","#achievements"],["إضافة","#add"]]]]],
["2","النمو المهني",[
["2-1","الورش التدريبية","الورش المنفذة وتوثيق حضورها",[["استعراض","#certificates"]]],
["2-2","الدروس التطبيقية","توثيق الدروس التطبيقية وحضورها",[["استعراض","#lessons"]]],
["2-3","نماذج الإنتاج المعرفي","نماذج وأدوات معرفية قابلة للاستفادة والتطبيق",[["استعراض","#knowledge"],["إضافة","#knowledge"]]]
]],
["3","الشراكة المجتمعية",[["3","الشراكة المجتمعية","توثيق الشراكات والمبادرات المشتركة وأثرها",[["استعراض","#partners"],["إضافة","#partners"]]]]],
["4","برامج الهيكل الإداري",[["4","برامج الهيكل الإداري","إدارة برامج الهيكل الإداري واستعراضها",[["استعراض","#admin-programs"],["إضافة","#admin-programs"]]]]]
];

const isHome=()=>!location.hash || location.hash==="#home";
const actionClass=(label)=>label.includes("شهادة")?"certificate":label==="إضافة"?"add":"view";

function buildHome(){
  const view=document.getElementById("view");
  if(!view || !isHome()) return;
  view.innerHTML="";
  const main=document.createElement("main");
  main.id="manjazHome";
  main.dir="rtl";

  const header=document.createElement("header");
  header.className="manjaz-brand-header";
  header.innerHTML=`
    <div class="manjaz-mark" aria-hidden="true"><i></i><i></i><i></i><b></b></div>
    <div class="manjaz-brand-copy">
      <strong>منجز</strong>
      <small>بوابة منجزات المدرسة الرقمية</small>
      <span>الثانوية الرابعة والتسعون</span>
    </div>`;
  main.append(header);

  sections.forEach(([no,title,cards])=>{
    const section=document.createElement("section");
    section.className="manjaz-section";
    section.innerHTML=`<div class="manjaz-section-title"><span>${no}</span><h2>${title}</h2></div><div class="manjaz-grid"></div>`;
    const grid=section.querySelector(".manjaz-grid");

    cards.forEach(([cardNo,cardTitle,desc,actions])=>{
      const card=document.createElement("article");
      card.className="manjaz-card";
      card.innerHTML=`
        <div class="manjaz-card-head"><span>${cardNo}</span><h3>${cardTitle}</h3></div>
        <p>${desc}</p>
        <div class="manjaz-actions"></div>`;
      const actionBox=card.querySelector(".manjaz-actions");
      actions.forEach(([label,href])=>{
        const a=document.createElement("a");
        a.className=`manjaz-action ${actionClass(label)}`;
        a.href=href;
        a.textContent=label;
        actionBox.append(a);
      });
      grid.append(card);
    });
    main.append(section);
  });
  view.append(main);
}

function render(){
  if(isHome()) buildHome();
}
addEventListener("hashchange",()=>setTimeout(render,0));
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",render,{once:true});
else render();
addEventListener("load",render,{once:true});
})();