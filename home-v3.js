/* MANJAZ HOME 5.1 — add two view-only cloud sections */
(()=>{"use strict";
const cards=[
  {title:"أبرز المنجزات",view:"#achievements",add:"#add",icon:"▤"},
  {title:"الورش التدريبية",view:"#certificates",add:"#certificates-add",addKind:"workshop",icon:"▧"},
  {title:"الدروس التطبيقية",view:"#lessons",add:"#lessons-add",addKind:"lesson",icon:"▣"},
  {title:"نماذج الإنتاج المعرفي",view:"#knowledge",add:"#knowledge",icon:"◇"},
  {title:"الشراكة المجتمعية",view:"#partners",add:"#partners",icon:"◎"},
  {title:"برامج الهيكل الإداري",view:"#admin-programs",add:"#admin-programs",icon:"▦"},
  {title:"الحوسبة السحابية | منجزات النشاط",view:"#cloud-activity",icon:"☁",viewOnly:true},
  {title:"الحوسبة السحابية | ملفات الإنجاز",view:"#cloud-portfolios",icon:"☁",viewOnly:true}
];

const isHome=()=>!location.hash || location.hash==="#home";
function action(label,href,kind,addKind){
  const a=document.createElement("a");
  a.className=`manjaz-home-action ${kind}`;
  a.href=href;
  a.textContent=label;
  if(addKind){
    a.addEventListener("click",()=>{
      try{sessionStorage.setItem("manjaz_home_open_add",addKind)}catch(_){ }
    });
  }
  return a;
}
function ensureCloudLinksScript(){
  if(document.querySelector('script[data-manjaz-cloud-links="1"]')) return;
  const s=document.createElement("script");
  s.src="cloud-links.js?v=1.0";
  s.dataset.manjazCloudLinks="1";
  document.head.appendChild(s);
}
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

  const title=document.createElement("div");
  title.className="manjaz-home-heading";
  title.innerHTML="<h2>الأقسام</h2>";
  main.append(title);

  const grid=document.createElement("section");
  grid.className="manjaz-home-grid";
  cards.forEach(item=>{
    const card=document.createElement("article");
    card.className="manjaz-home-card";
    card.innerHTML=`<div class="manjaz-home-card-title"><span class="manjaz-home-icon" aria-hidden="true">${item.icon}</span><h3>${item.title}</h3></div><div class="manjaz-home-actions"></div>`;
    const actions=card.querySelector(".manjaz-home-actions");
    actions.append(action("استعراض",item.view,"view"));
    if(!item.viewOnly && item.add) actions.append(action("إضافة",item.add,"add",item.addKind));
    grid.append(card);
  });
  main.append(grid);
  view.append(main);
}
function render(){ if(isHome()) buildHome(); }
/* المصدر الرسمي لرسم الرئيسية: يستخدمه app.js أيضًا بعد اكتمال المزامنة السحابية */
window.renderManjazHome=buildHome;
ensureCloudLinksScript();
addEventListener("hashchange",()=>setTimeout(render,0));
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",render,{once:true}); else render();
addEventListener("load",render,{once:true});
})();