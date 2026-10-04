/* MANJAZ 4.3 — workshops + applied lessons management */
(()=>{"use strict";
const WK="manjaz:v43:workshops", LK="manjaz:v43:lessons";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const load=k=>{try{return JSON.parse(localStorage.getItem(k)||"[]")}catch(_){return[]}};
const save=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const uid=p=>p+"-"+Date.now()+"-"+Math.random().toString(36).slice(2,7);

function mergeSaved(){
  const w=Array.isArray(window.MANJAZ_CERTIFICATE_WORKSHOPS)?window.MANJAZ_CERTIFICATE_WORKSHOPS:[];
  const l=Array.isArray(window.MANJAZ_APPLIED_LESSONS)?window.MANJAZ_APPLIED_LESSONS:[];
  load(WK).forEach(x=>{const i=w.findIndex(y=>String(y.id)===String(x.id));i>=0?w[i]=x:w.push(x)});
  load(LK).forEach(x=>{const i=l.findIndex(y=>String(y.id)===String(x.id));i>=0?l[i]=x:l.push(x)});
  window.MANJAZ_CERTIFICATE_WORKSHOPS=w; window.MANJAZ_APPLIED_LESSONS=l;
}
mergeSaved();

function ask(label,current=""){const v=prompt(label,current||"");return v===null?null:v.trim()}
function refreshRoute(){const h=location.hash||"#home";location.hash="#home";setTimeout(()=>location.hash=h,20)}

function addWorkshop(){
  const title=ask("اسم الورشة"); if(!title)return;
  const date=ask("التاريخ"); if(date===null)return;
  const duration=ask("المدة"); if(duration===null)return;
  const impl=ask("منفذة الورشة"); if(impl===null)return;
  const item={id:uid("workshop"),title,date,duration,implementers:impl?[impl]:[],available:true};
  const saved=load(WK);saved.push(item);save(WK,saved);
  window.MANJAZ_CERTIFICATE_WORKSHOPS.push(item);
  alert("تم حفظ الورشة بنجاح");refreshRoute();
}
function editWorkshop(item){
  const title=ask("اسم الورشة",item.title);if(title===null)return;
  const date=ask("التاريخ",item.date);if(date===null)return;
  const duration=ask("المدة",item.duration);if(duration===null)return;
  Object.assign(item,{title,date,duration});
  const saved=load(WK);const i=saved.findIndex(x=>String(x.id)===String(item.id));i>=0?saved[i]=item:saved.push(item);save(WK,saved);
  alert("تم حفظ التعديل");refreshRoute();
}
function deleteWorkshop(item){
  if(!confirm("حذف هذه الورشة؟"))return;
  item.available=false;
  let saved=load(WK);const i=saved.findIndex(x=>String(x.id)===String(item.id));i>=0?saved[i]=item:saved.push(item);save(WK,saved);
  alert("تم الحذف");refreshRoute();
}
function workshopById(id){return (window.MANJAZ_CERTIFICATE_WORKSHOPS||[]).find(x=>String(x.id)===String(id))}

function decorateWorkshops(){
  if((location.hash||"").slice(1)!=="certificates")return;
  const panel=document.querySelector(".certificates-page .panel");
  if(panel&&!panel.querySelector(".v43-add-workshop")){
    const b=document.createElement("button");b.className="cert-btn secondary v43-add-workshop";b.textContent="إضافة ورشة";b.onclick=addWorkshop;
    panel.querySelector(".panel-head")?.append(b);
  }
  document.querySelectorAll(".cert-workshop-card").forEach(card=>{
    if(card.dataset.v43)return;card.dataset.v43="1";
    const item=workshopById(card.dataset.workshopId);if(!item)return;
    const actions=document.createElement("div");actions.className="v43-mini-actions";
    actions.innerHTML='<button class="v43-icon v43-edit" title="تعديل" aria-label="تعديل">✎</button><button class="v43-icon v43-delete" title="حذف" aria-label="حذف">🗑</button>';
    actions.querySelector(".v43-edit").onclick=e=>{e.stopPropagation();editWorkshop(item)};
    actions.querySelector(".v43-delete").onclick=e=>{e.stopPropagation();deleteWorkshop(item)};
    card.append(actions);
  });
}

function lessonByTitle(t){return (window.MANJAZ_APPLIED_LESSONS||[]).find(x=>(x.lessonName||x.title||"").trim()===t.trim())}
function persistLesson(item){
  const saved=load(LK),i=saved.findIndex(x=>String(x.id)===String(item.id));i>=0?saved[i]=item:saved.push(item);save(LK,saved);
}
function addLesson(){
  const lessonName=ask("اسم الدرس التطبيقي");if(!lessonName)return;
  const date=ask("التاريخ");if(date===null)return;
  const teacher=ask("المعلمة المنفذة");if(teacher===null)return;
  const grade=ask("الصف");if(grade===null)return;
  const strategies=ask("الاستراتيجيات");if(strategies===null)return;
  const item={id:uid("lesson"),lessonName,date,teacher,grade,strategies,available:true};
  window.MANJAZ_APPLIED_LESSONS.push(item);persistLesson(item);
  alert("تم حفظ الدرس التطبيقي بنجاح");refreshRoute();
}
function editLesson(item){
  const lessonName=ask("اسم الدرس التطبيقي",item.lessonName||item.title);if(lessonName===null)return;
  const date=ask("التاريخ",item.date);if(date===null)return;
  const teacher=ask("المعلمة المنفذة",item.teacher);if(teacher===null)return;
  const grade=ask("الصف",item.grade);if(grade===null)return;
  const strategies=ask("الاستراتيجيات",item.strategies);if(strategies===null)return;
  Object.assign(item,{lessonName,date,teacher,grade,strategies});persistLesson(item);alert("تم حفظ التعديل");refreshRoute();
}
function deleteLesson(item){if(!confirm("حذف هذا الدرس التطبيقي؟"))return;item.available=false;persistLesson(item);alert("تم الحذف");refreshRoute()}

function decorateLessons(){
  if((location.hash||"").slice(1)!=="lessons")return;
  const intro=document.querySelector("#view .page-intro");
  if(intro&&!intro.querySelector(".v43-add-lesson")){
    const b=document.createElement("button");b.className="cert-btn secondary v43-add-lesson";b.textContent="إضافة درس تطبيقي";b.onclick=addLesson;intro.append(b);
  }
  document.querySelectorAll(".applied-lesson-card").forEach(card=>{
    if(card.dataset.v43)return;card.dataset.v43="1";card.classList.add("cert-workshop-card","v43-lesson-card");
    const title=card.querySelector("h3")?.textContent||"",item=lessonByTitle(title);if(!item)return;
    const oldBadge=card.querySelector(".badge");if(oldBadge){oldBadge.className="cert-status";oldBadge.textContent="متاح للإصدار"}
    const meta=card.querySelector(".meta");if(meta)meta.classList.add("cert-meta","cert-meta-stack");
    const cert=card.querySelector(".applied-certificate-btn");if(cert){cert.className="cert-btn primary applied-certificate-btn";cert.textContent="إصدار الشهادة"}
    const actions=document.createElement("div");actions.className="v43-mini-actions";
    actions.innerHTML='<button class="v43-icon v43-edit" title="تعديل" aria-label="تعديل">✎</button><button class="v43-icon v43-delete" title="حذف" aria-label="حذف">🗑</button>';
    actions.querySelector(".v43-edit").onclick=e=>{e.stopPropagation();editLesson(item)};
    actions.querySelector(".v43-delete").onclick=e=>{e.stopPropagation();deleteLesson(item)};
    card.append(actions);
  });
}

/* Lesson certificate: same approved visual distribution as the older workshop certificate. */
window.openAppliedLessonCertificate=function(lesson){
  const name=ask("الاسم كما ترغبين في ظهوره في الشهادة");if(!name)return;
  document.getElementById("v43LessonCertDialog")?.remove();
  const today=new Intl.DateTimeFormat("ar-SA-u-ca-islamic",{day:"numeric",month:"long",year:"numeric"}).format(new Date());
  const title=esc(lesson.lessonName||lesson.title||"");
  const d=document.createElement("dialog");d.id="v43LessonCertDialog";d.className="v43-cert-dialog";
  d.innerHTML=`<div class="v43-cert-shell"><div class="v43-cert-controls"><button class="cert-btn secondary" data-close>إغلاق</button><button class="cert-btn gold" data-pdf>تحميل الشهادة PDF</button></div>
  <div class="certificate-stage"><div id="v43LessonPaper" class="certificate-paper cert-approved">
    <div class="cert-approved-bg"></div>
    <header class="cert-approved-header">
      <div class="cert-header-right"><strong>وزارة التعليم</strong><span>إدارة تعليم جدة</span><span>الثانوية الرابعة والتسعون - مسارات</span></div>
      <div class="cert-header-center"><img class="cert-ministry-logo" src="ministry-logo.png" alt="شعار وزارة التعليم"></div>
      <div class="cert-header-left"><strong>بوابة منجز الرقمية</strong><span>توثيق • متابعة • أثر</span></div>
    </header>
    <main class="cert-approved-main">
      <div class="cert-approved-heading">شهادة حضور</div>
      <div class="cert-approved-program">درس تطبيقي «${title}»</div>
      <div class="cert-approved-testimony">تشهد الثانوية الرابعة والتسعون - مسارات بأن المعلمة</div>
      <div class="cert-approved-name">${esc(name)}</div>
      <div class="cert-approved-text">قد حضرت الدرس التطبيقي بعنوان «${title}»، والمنفذ بتاريخ ${esc(lesson.date||"—")}، متمنين لها دوام التوفيق ومزيدًا من التميز والعطاء</div>
      ${lesson.teacher?`<section class="cert-facilitators"><div class="cert-facilitators-title">منفذة الدرس</div><div class="cert-facilitators-grid count-1"><div class="cert-facilitator-name">${esc(lesson.teacher)}</div></div></section>`:""}
    </main>
    <footer class="cert-approved-footer"><div class="cert-footer-right"><strong>تاريخ التحرير</strong><span>${esc(today)}</span></div><div class="cert-stamp-zone"><img class="cert-official-stamp" src="official-school-stamp.png" alt="الختم الرسمي للمدرسة"></div><div class="cert-footer-left"><strong>مديرة المدرسة</strong><span>زينب ناصر حكمي</span></div></footer>
    <div class="cert-approved-watermark">تم إصدار هذه الشهادة إلكترونيًا عبر بوابة منجز الرقمية</div>
  </div></div></div>`;
  document.body.append(d);d.showModal();
  d.querySelector("[data-close]").onclick=()=>d.close();
  d.querySelector("[data-pdf]").onclick=async()=>{
    const btn=d.querySelector("[data-pdf]");btn.disabled=true;btn.textContent="جاري تجهيز PDF...";
    try{
      await loadLibs();
      const paper=d.querySelector("#v43LessonPaper");
      const canvas=await html2canvas(paper,{scale:3,useCORS:true,backgroundColor:"#fff"});
      const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
      pdf.addImage(canvas.toDataURL("image/jpeg",.96),"JPEG",0,0,297,210);
      pdf.save(`شهادة - ${String(lesson.lessonName||lesson.title||"درس تطبيقي").replace(/[\\/:*?"<>|]/g,"-")} - ${name}.pdf`);
    }finally{btn.disabled=false;btn.textContent="تحميل الشهادة PDF"}
  };
};
function loadLibs(){
 const one=(src,key)=>new Promise((res,rej)=>{if(window[key])return res();const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.append(s)});
 return one("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas").then(()=>one("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf"));
}

let timer;const enhance=()=>{clearTimeout(timer);timer=setTimeout(()=>{decorateWorkshops();decorateLessons()},80)};
addEventListener("hashchange",enhance);addEventListener("DOMContentLoaded",enhance);addEventListener("load",enhance);
new MutationObserver(enhance).observe(document.documentElement,{childList:true,subtree:true});
})();