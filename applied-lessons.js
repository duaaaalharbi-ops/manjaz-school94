/* MANJAZ 11.0 — applied lessons: unified cards, persistent CRUD, independent certificate */
(()=>{"use strict";
const ROUTE="lessons", ADD_ROUTE="lessons-add", STORE="manjaz_applied_lessons_managed_v1", MAX_NAME=80;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const routeName=()=>String((location.hash||"#home").slice(1));
const isLessonRoute=()=>routeName()===ROUTE||routeName()===ADD_ROUTE;
const baseLessons=()=>Array.isArray(window.MANJAZ_APPLIED_LESSONS)?window.MANJAZ_APPLIED_LESSONS:[];
const managedLessons=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||"[]");return Array.isArray(x)?x:[]}catch(_){return[]}};
const saveManagedLessons=x=>localStorage.setItem(STORE,JSON.stringify(x));
const lessons=()=>{const m=managedLessons(),map=new Map(m.map(x=>[String(x.id),x]));return [...baseLessons().map(x=>map.get(String(x.id))||x),...m.filter(x=>!baseLessons().some(b=>String(b.id)===String(x.id)))];};
const isVisible=x=>!!x&&x.available!==false&&x.availability!=="hidden";
const getLesson=id=>lessons().find(x=>String(x.id)===String(id));
let flash="";

function ensureCertificateStyle(){
  if(document.querySelector('link[data-certificates-style]')) return;
  const link=document.createElement("link");link.rel="stylesheet";link.href="certificates.css?v=11.0";link.dataset.certificatesStyle="1";document.head.appendChild(link);
}
function editorHTML(){return `<details id="lessonManageDetails" class="cert-manage lesson-manage"><summary>إضافة درس تطبيقي</summary><form id="lessonManageForm" class="cert-manage-form"><input type="hidden" id="lmId"><label>عنوان الدرس<input id="lmTitle" required></label><label>المادة<input id="lmSubject"></label><label>الصف<input id="lmGrade"></label><label>التاريخ<input id="lmDate" required></label><label>منفذة الدرس<input id="lmTeacher" required></label><label>المدة<input id="lmDuration"></label><label>الاستراتيجيات<input id="lmStrategies"></label><div class="cert-manage-actions"><button class="cert-btn primary" type="submit">حفظ</button><button class="cert-btn secondary" id="lmCancel" type="button">إلغاء</button></div><div id="lmMsg" class="cert-message"></div></form></details>`;}
function metaLine(label,value){return value?`<span><b>${esc(label)}:</b> ${esc(value)}</span>`:"";}
function cardHTML(x){return `<article class="cert-workshop-card applied-lesson-card" data-lesson-id="${esc(x.id)}"><span class="cert-status">درس تطبيقي</span><h3>${esc(x.lessonName||x.title||"بدون عنوان")}</h3><div class="cert-meta cert-meta-stack">${metaLine("المادة",x.subject)}${metaLine("الصف",x.grade)}${metaLine("التاريخ",x.date)}${metaLine("منفذة الدرس",x.teacher)}${metaLine("المدة",x.duration)}${metaLine("الاستراتيجيات",x.strategies)}</div><div class="cert-card-actions"><button type="button" class="cert-btn primary lesson-certificate" data-id="${esc(x.id)}">إصدار الشهادة</button><button type="button" class="cert-mini-action lesson-edit" data-id="${esc(x.id)}">تعديل</button><button type="button" class="cert-mini-action danger lesson-delete" data-id="${esc(x.id)}">حذف</button></div></article>`;}
function renderAppliedLessonsSection(){
  if(!isLessonRoute()) return;
  ensureCertificateStyle();
  const list=document.getElementById("lessonList"),empty=document.getElementById("lessonEmpty");if(!list)return;
  const items=lessons().filter(isVisible);
  list.className="cert-grid applied-lessons-grid";
  list.innerHTML=`<div class="lesson-tools-span"><div id="lessonFlash" class="cert-message success">${esc(flash)}</div>${editorHTML()}</div>${items.map(cardHTML).join("")}`;flash="";
  if(empty) empty.style.display=items.length?"none":"block";
  wireLessonManagement();
  if(routeName()===ADD_ROUTE){const d=document.getElementById("lessonManageDetails");if(d)d.open=true;setTimeout(()=>document.getElementById("lmTitle")?.focus(),0);}
}
window.renderAppliedLessonsSection=renderAppliedLessonsSection;

function wireLessonManagement(){
  const f=document.getElementById("lessonManageForm");if(!f)return;
  const q=id=>document.getElementById(id),id=q("lmId"),title=q("lmTitle"),subject=q("lmSubject"),grade=q("lmGrade"),date=q("lmDate"),teacher=q("lmTeacher"),duration=q("lmDuration"),strategies=q("lmStrategies"),msg=q("lmMsg"),submit=f.querySelector('button[type="submit"]');
  const reset=()=>{f.reset();id.value="";msg.textContent="";delete f.dataset.busy;if(submit){submit.disabled=false;submit.textContent="حفظ";}};
  q("lmCancel")?.addEventListener("click",reset);
  f.addEventListener("submit",e=>{e.preventDefault();if(f.dataset.busy==="1")return;const existingId=id.value.trim();const previous=existingId?(getLesson(existingId)||{}):{};const r={...previous,id:existingId||`lesson-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,lessonName:title.value.trim(),title:title.value.trim(),subject:subject.value.trim(),grade:grade.value.trim(),date:date.value.trim(),teacher:teacher.value.trim(),duration:duration.value.trim(),strategies:strategies.value.trim(),available:true,availability:"available"};if(!r.title||!r.date||!r.teacher){msg.className="cert-message error";msg.textContent="أكملي عنوان الدرس والتاريخ ومنفذة الدرس";return;}f.dataset.busy="1";if(submit){submit.disabled=true;submit.textContent="جارٍ الحفظ...";}try{const m=managedLessons(),i=m.findIndex(x=>String(x.id)===String(r.id));if(i>=0)m[i]={...m[i],...r};else m.push(r);saveManagedLessons(m);flash=existingId?"تم تحديث الدرس بنجاح":"تمت إضافة الدرس وحفظه بنجاح";renderAppliedLessonsSection();}catch(err){console.error(err);delete f.dataset.busy;if(submit){submit.disabled=false;submit.textContent="حفظ";}msg.className="cert-message error";msg.textContent="تعذر حفظ الدرس. لم يتم تغيير البيانات السابقة";}});
  document.querySelectorAll(".lesson-edit").forEach(b=>b.onclick=()=>{const x=getLesson(b.dataset.id);if(!x)return;id.value=x.id;title.value=x.lessonName||x.title||"";subject.value=x.subject||"";grade.value=x.grade||"";date.value=x.date||"";teacher.value=x.teacher||"";duration.value=x.duration||"";strategies.value=x.strategies||"";const d=f.closest("details");if(d)d.open=true;msg.textContent="";f.scrollIntoView({behavior:"smooth",block:"start"});});
  document.querySelectorAll(".lesson-delete").forEach(b=>b.onclick=()=>{const x=getLesson(b.dataset.id);if(!x||!confirm(`حذف الدرس «${x.lessonName||x.title||""}»؟`))return;const m=managedLessons(),i=m.findIndex(v=>String(v.id)===String(x.id));if(i>=0)m.splice(i,1);else m.push({...x,available:false,availability:"hidden"});saveManagedLessons(m);flash="تم حذف الدرس المحدد";renderAppliedLessonsSection();});
  document.querySelectorAll(".lesson-certificate").forEach(b=>b.onclick=()=>{const x=getLesson(b.dataset.id);if(x)openAppliedLessonCertificate(x);});
}

async function loadLibraries(){
  const load=(src,key)=>new Promise((resolve,reject)=>{if(window[key])return resolve();let s=[...document.scripts].find(x=>x.src===src);if(!s){s=document.createElement("script");s.src=src;s.async=true;document.head.appendChild(s);}s.addEventListener("load",resolve,{once:true});s.addEventListener("error",reject,{once:true});});
  await load("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas");
  await load("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf");
}
function lessonCertificateHTML(x,name){
  const title=esc(x.lessonName||x.title||"");
  return `<div class="certificate-paper cert-final lesson-certificate-final" id="lessonCertificatePaper" style="background-image:url('manjaz-certificate-background.png')"><header class="cert-final-header"><div class="cert-final-org"><strong>وزارة التعليم</strong><span>إدارة تعليم جدة</span><span>الثانوية الرابعة والتسعون - مسارات</span></div><div class="cert-final-ministry"><img src="ministry-logo.png" alt="شعار وزارة التعليم"></div><div class="cert-final-manjaz"><img src="manjaz-logo.png" alt="شعار منجز"></div></header><main class="cert-final-main"><div class="cert-final-title">شهادة حضور</div><div class="cert-final-workshop">درس تطبيقي «${title}»</div><div class="cert-final-testimony">تشهد الثانوية الرابعة والتسعون - مسارات بأن المعلمة</div><div class="cert-final-name">${esc(name)}</div><div class="cert-final-attendance">قد حضرت الدرس التطبيقي بعنوان «${title}»${x.subject?` في مادة ${esc(x.subject)}`:""}${x.grade?` للصف ${esc(x.grade)}`:""} بتاريخ ${esc(x.date||"—")}${x.duration?`، لمدة ${esc(x.duration)}`:""}</div><div class="cert-final-wish">متمنين لها دوام التوفيق ومزيدًا من التميز والعطاء</div><div class="cert-facilitators-inline count-1"><span class="cert-facilitator-inline"><b>منفذة الدرس:</b><span>${esc(x.teacher||"")}</span></span></div></main><footer class="cert-final-footer"><div class="cert-final-principal"><strong>مديرة المدرسة</strong><span>زينب ناصر علي حكمي</span></div><div class="cert-final-stamp"><img src="official-school-stamp.png" alt="الختم الرسمي للمدرسة"></div></footer></div>`;
}
async function waitAssets(root){try{if(document.fonts?.ready)await document.fonts.ready}catch(_){};await Promise.all([...root.querySelectorAll("img")].map(img=>new Promise(r=>{if(img.complete)return r();img.addEventListener("load",r,{once:true});img.addEventListener("error",r,{once:true});})));}
async function snapshot(root){await waitAssets(root);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const rect=root.getBoundingClientRect(),scale=Math.max(3,Math.min(12,4200/Math.max(rect.width,rect.height,1)));return await html2canvas(root,{scale,useCORS:true,allowTaint:false,backgroundColor:"#fff",logging:false,scrollX:-window.scrollX,scrollY:-window.scrollY});}
function fileName(x,name){const safe=s=>clean(s).replace(/[\\/:*?"<>|]+/g,"-");return `شهادة درس تطبيقي - ${safe(x.lessonName||x.title)} - ${safe(name)}.pdf`;}
function openAppliedLessonCertificate(x){
  ensureCertificateStyle();document.getElementById("lessonCertDialog")?.remove();
  const d=document.createElement("dialog");d.id="lessonCertDialog";d.className="v43-cert-dialog lesson-cert-dialog";d.innerHTML=`<div class="v43-cert-shell"><div class="lesson-cert-selected"><strong>${esc(x.lessonName||x.title||"")}</strong><span>${esc(x.subject||"")} ${x.grade?`• ${esc(x.grade)}`:""} ${x.date?`• ${esc(x.date)}`:""}</span></div><div class="v43-cert-controls"><input id="lessonBeneficiaryName" maxlength="${MAX_NAME}" placeholder="اسم المستفيدة"><button class="cert-btn primary" id="lessonPreview">معاينة الشهادة</button><button class="cert-btn gold" id="lessonDownload" disabled>تحميل الشهادة PDF</button><button class="cert-btn secondary" id="lessonClose">إغلاق</button></div><div id="lessonCertMsg" class="cert-message"></div><div id="lessonPreviewArea"></div></div>`;document.body.appendChild(d);if(typeof d.showModal==="function")d.showModal();else d.setAttribute("open","");
  const input=d.querySelector("#lessonBeneficiaryName"),area=d.querySelector("#lessonPreviewArea"),download=d.querySelector("#lessonDownload"),msg=d.querySelector("#lessonCertMsg");
  d.querySelector("#lessonClose").onclick=()=>{if(typeof d.close==="function")d.close();else d.removeAttribute("open");};
  d.querySelector("#lessonPreview").onclick=()=>{const n=clean(input.value).slice(0,MAX_NAME);input.value=n;if(n.length<3){msg.className="cert-message error";msg.textContent="اكتبي اسم المستفيدة كاملًا";input.focus();return;}area.innerHTML=`<div class="certificate-stage">${lessonCertificateHTML(x,n)}</div>`;download.disabled=false;msg.className="cert-message info";msg.textContent="تمت معاينة شهادة الدرس المحدد";};
  download.onclick=async()=>{const n=clean(input.value),paper=d.querySelector("#lessonCertificatePaper");if(!paper||n.length<3){msg.className="cert-message error";msg.textContent="عايني الشهادة أولًا";return;}download.disabled=true;msg.className="cert-message info";msg.textContent="جارٍ تجهيز الشهادة عالية الجودة...";try{await loadLibraries();const canvas=await snapshot(paper);const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true}),pageW=297,pageH=210,ratio=Math.min(pageW/canvas.width,pageH/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio;pdf.addImage(canvas.toDataURL("image/png"),"PNG",(pageW-w)/2,(pageH-h)/2,w,h,undefined,"NONE");pdf.save(fileName(x,n));msg.className="cert-message success";msg.textContent="تم إنشاء شهادة الدرس بنجاح";}catch(err){console.error(err);msg.className="cert-message error";msg.textContent="تعذر إنشاء الشهادة. تحققي من الاتصال ثم أعيدي المحاولة";}finally{download.disabled=false;}};
  setTimeout(()=>input.focus(),0);
}
window.openAppliedLessonCertificate=openAppliedLessonCertificate;

function onRoute(){if(!isLessonRoute())return;setTimeout(()=>{const view=document.getElementById("view");if(!view)return;if(!document.getElementById("lessonList")){const tpl=document.getElementById("lessonsTpl");if(tpl){view.innerHTML="";view.appendChild(tpl.content.cloneNode(true));}}renderAppliedLessonsSection();},0);}
window.addEventListener("hashchange",onRoute);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",onRoute,{once:true});else onRoute();
})();
