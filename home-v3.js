/* MANJAZ HOME 5.3 — cloud excellence team + admin card last */
(()=>{"use strict";
const cards=[
  {title:"المنجزات الداخلية",view:"#achievements",add:"#add",icon:"▤"},
  {title:"المنجزات الخارجية",view:"#awards",add:"#awards",addKind:"award",icon:"◇",singleLine:true},
  {title:"الورش التدريبية",view:"#certificates",add:"#certificates-add",addKind:"workshop",icon:"▧"},
  {title:"الدروس التطبيقية",view:"#lessons",add:"#lessons-add",addKind:"lesson",icon:"▣"},
  {title:"مجتمعات التعلم المهنية",view:"https://padlet.com/Teacherswork/94-1448-s024drtqwwt2dlw25dlf",icon:"▧",viewOnly:true,external:true},
  {title:"الشراكة المجتمعية",view:"#partners",add:"#partners",icon:"◎"},
  {title:"الموهبة",view:"#talent",add:"#talent",addKind:"talent",icon:"✦"},
  {title:"نماذج الإنتاج المعرفي",view:"#knowledge",add:"#knowledge",icon:"◇"},
  {title:"برامج الهيكل الإداري",view:"#admin-programs",add:"#admin-programs",icon:"▦"},
  {title:"الحوسبة السحابية | منجزات النشاط",view:"#cloud-activity",icon:"☁",viewOnly:true},
  {title:"الحوسبة السحابية | فريق التميز",view:"#cloud-excellence",icon:"☁",viewOnly:true},
  {title:"الحوسبة السحابية | الخطة التشغيلية",view:"#cloud-operational-plan",icon:"☁",viewOnly:true},
  {title:"الحوسبة السحابية | ملفات الإنجاز",view:"#cloud-portfolios",icon:"☁",viewOnly:true},
  {title:"الاحتياط اليومي",view:"#daily-reserve",icon:"▦",viewOnly:true},
  {title:"تفعيل الاحتياط اليومي",view:"#daily-activation",icon:"▣",viewOnly:true},
  {title:"صلاحيات إدارية",view:"#admin-permissions",icon:"▥",viewOnly:true,singleLine:true}
];

const isHome=()=>!location.hash || location.hash==="#home";

function enhanceAwardsSection(){
  if((location.hash||"").slice(1)!=="awards") return;
  const view=document.getElementById("view");
  if(!view) return;

  const intro=view.querySelector(".page-intro");
  const kicker=intro?.querySelector(".kicker");
  const heading=intro?.querySelector("h2");
  const description=intro?.querySelector("p");
  if(kicker) kicker.textContent="التكريمات وشهادات الشكر";
  if(heading) heading.textContent="التكريمات وشهادات الشكر";
  if(description) description.textContent="إضافة التكريمات وشهادات الشكر واستعراضها ضمن سجل موحد";

  const show=document.getElementById("showAwardForm");
  if(show) show.textContent="إضافة تكريم أو شهادة شكر";

  const form=document.getElementById("awardForm");
  if(form){
    const formTitle=form.querySelector(".form-section-title");
    if(formTitle) formTitle.textContent="بيانات التكريم أو شهادة الشكر";

    const type=form.querySelector('select[name="type"]');
    if(type && ![...type.options].some(o=>o.value==="شهادة شكر")){
      const opt=document.createElement("option");
      opt.value="شهادة شكر";
      opt.textContent="شهادة شكر";
      type.insertBefore(opt,type.options[1]||null);
    }

    const imageInput=form.querySelector('input[name="images"]');
    if(imageInput){
      const label=imageInput.closest("label");
      if(label && label.firstChild) label.firstChild.textContent="إضافة الصور ";
      imageInput.multiple=true;
      imageInput.accept="image/*";
    }
  }

  let openAdd=false;
  try{openAdd=sessionStorage.getItem("manjaz_home_open_add")==="award"}catch(_){}
  if(openAdd && show){
    try{sessionStorage.removeItem("manjaz_home_open_add")}catch(_){}
    show.click();
  }else if(openAdd){
    setTimeout(enhanceAwardsSection,70);
  }
}

function action(label,href,kind,addKind){
  const a=document.createElement("a");
  a.className=`manjaz-home-action ${kind}`;
  a.href=href;
  a.textContent=label;
  if(addKind){
    a.addEventListener("click",()=>{
      try{sessionStorage.setItem("manjaz_home_open_add",addKind)}catch(_){ }
      if(addKind==="award") setTimeout(enhanceAwardsSection,70);
    });
  }
  return a;
}
function ensureCloudLinksScript(){
  if(document.querySelector('script[data-manjaz-cloud-links="1"]')) return;
  const s=document.createElement("script");
  s.src="cloud-links.js?v=20261028-operational-plan";
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
  // نَتاج: first and taller card; independent link, no impact on existing cards.
  const nataj=document.createElement("a");
  nataj.className="manjaz-home-card nataj-entry";
  nataj.href="https://school-selfeval-compass.lovable.app";
  nataj.target="_blank";
  nataj.rel="noopener noreferrer";
  nataj.setAttribute("aria-label","نَتاج – لوحة الأداء المدرسي");
  nataj.innerHTML=`
    <div class="manjaz-home-card-title">
      <span class="manjaz-home-icon" aria-hidden="true">▥</span>
      <h3 class="nataj-name">نَتاج</h3>
    </div>
    <div class="nataj-body">
      <span class="nataj-kicker">لوحة الأداء المدرسي</span>
      <strong>من المؤشرات إلى الإنجازات</strong>
      <p>عرض مؤشرات الأداء المدرسي ونتائج التقويم، وتحديد أولويات التحسين، والاطلاع على التقارير.</p>
    </div>
    <div class="manjaz-home-actions"><span class="manjaz-home-action view">استعراض</span></div>`;
  grid.append(nataj);
  cards.forEach(item=>{
    const card=document.createElement(item.external?"a":"article");
    card.className="manjaz-home-card";
    if(item.external){
      card.href=item.view;
      card.target="_blank";
      card.rel="noopener noreferrer";
      card.setAttribute("aria-label",item.title);
      card.style.textDecoration="none";
      card.style.color="inherit";
      card.style.cursor="pointer";
    }
    if(item.view==="#achievements"||item.view==="#awards") card.style.gridColumn="1 / -1";
    const titleStyle=item.singleLine?' style="white-space:nowrap;font-size:clamp(13px,1.4vw,17px)"':'';
    card.innerHTML=`<div class="manjaz-home-card-title"><span class="manjaz-home-icon" aria-hidden="true">${item.icon}</span><h3${titleStyle}>${item.title}</h3></div><div class="manjaz-home-actions"></div>`;
    const actions=card.querySelector(".manjaz-home-actions");
    if(item.external){
      actions.style.gridTemplateColumns="1fr";
      const open=document.createElement("span");
      open.className="manjaz-home-action view";
      open.textContent="استعراض";
      actions.append(open);
    }else{
      actions.append(action("استعراض",item.view,"view"));
    }
    if(!item.viewOnly && item.add) actions.append(action("إضافة",item.add,"add",item.addKind));
    grid.append(card);
  });
  main.append(grid);
  view.append(main);
}
function render(){
  if(isHome()) buildHome();
  else if((location.hash||"").slice(1)==="awards") setTimeout(enhanceAwardsSection,70);
}
window.renderManjazHome=buildHome;
ensureCloudLinksScript();
addEventListener("hashchange",()=>setTimeout(render,0));
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",render,{once:true}); else render();
addEventListener("load",()=>{render();setTimeout(enhanceAwardsSection,80)},{once:true});
})();

/* MANJAZ: isolated cloud-first partnership update loader */
(()=>{if(document.querySelector('script[data-manjaz-partners-cloud="2.0"]'))return;const s=document.createElement("script");s.src="partners-cloud.js?v=20261028-admin-content-only";s.dataset.manjazPartnersCloud="2.0";document.head.appendChild(s)})();


/* MANJAZ: isolated daily reserve section loader */
(()=>{if(document.querySelector('script[data-manjaz-daily-reserve="2.0"]'))return;const s=document.createElement("script");s.src="daily-reserve.js?v=20261029-official-publication";s.dataset.manjazDailyReserve="2.0";document.head.appendChild(s)})();


/* Daily activation now loaded directly in index.html, in a predictable order. */

