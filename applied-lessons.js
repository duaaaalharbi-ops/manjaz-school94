/* MANJAZ 13.1 — canonical applied-lessons route; persistent certificate issue action */
(()=>{"use strict";
const STORE="manjaz_applied_lessons_managed_v1";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const baseLessons=()=>Array.isArray(window.MANJAZ_APPLIED_LESSONS)?window.MANJAZ_APPLIED_LESSONS:[];
const managedLessons=()=>{try{const v=JSON.parse(localStorage.getItem(STORE)||"[]");return Array.isArray(v)?v:[]}catch(_){return []}};
const saveManaged=x=>localStorage.setItem(STORE,JSON.stringify(x));
function lessons(){const m=managedLessons(),map=new Map(m.map(x=>[String(x.id),x]));return [...baseLessons().map(x=>map.get(String(x.id))||x),...m.filter(x=>!baseLessons().some(b=>String(b.id)===String(x.id)))].filter(x=>x&&x.available!==false&&x.availability!=="hidden");}
function getLesson(id){return lessons().find(x=>String(x.id)===String(id));}

async function libs(){
 const load=(src,key)=>new Promise((res,rej)=>{if(window[key])return res();let s=[...document.scripts].find(x=>x.src===src);if(!s){s=document.createElement("script");s.src=src;s.async=true;document.head.appendChild(s)}s.addEventListener("load",res,{once:true});s.addEventListener("error",rej,{once:true})});
 await load("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas");
 await load("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf");
}
function certificateHTML(x,name){
 return `<div class="certificate-paper cert-final lesson-certificate" id="lessonCertificatePaper" style="background-image:url('manjaz-certificate-background.png')">
  <header class="cert-final-header"><div class="cert-final-org"><strong>وزارة التعليم</strong><span>إدارة تعليم جدة</span><span>الثانوية الرابعة والتسعون - مسارات</span></div><div class="cert-final-ministry"><img src="ministry-logo.png" alt="شعار وزارة التعليم"></div><div class="cert-final-manjaz"><img src="manjaz-logo.png" alt="شعار منجز"></div></header>
  <main class="cert-final-main"><div class="cert-final-title">شهادة حضور</div><div class="cert-final-workshop">درس تطبيقي «${esc(x.lessonName||x.title||"")}»</div><div class="cert-final-testimony">تشهد الثانوية الرابعة والتسعون - مسارات بأن المعلمة</div><div class="cert-final-name">${esc(name)}</div><div class="cert-final-attendance">قد حضرت الدرس التطبيقي بعنوان «${esc(x.lessonName||x.title||"")}» بتاريخ ${esc(x.date||"—")}${x.duration?`، لمدة ${esc(x.duration)}`:""}</div><div class="cert-final-wish">متمنين لها دوام التوفيق ومزيدًا من التميز والعطاء</div><div class="cert-facilitators-inline count-1"><span class="cert-facilitator-inline"><b>منفذة الدرس:</b><span>${esc(x.teacher||"")}</span></span></div></main>
  <footer class="cert-final-footer"><div class="cert-final-principal"><strong>مديرة المدرسة</strong><span>زينب ناصر علي حكمي</span></div><div class="cert-final-stamp"><img src="official-school-stamp.png" alt="الختم الرسمي للمدرسة"></div></footer>
 </div>`;
}
window.openAppliedLessonCertificate=function(x){
 document.getElementById("lessonCertDialog")?.remove();
 const d=document.createElement("dialog");d.id="lessonCertDialog";d.className="v43-cert-dialog";
 d.innerHTML=`<div class="v43-cert-shell"><div class="v43-cert-controls"><input id="lessonCertName" maxlength="80" placeholder="اسم المستفيدة"><button class="cert-btn primary" id="lessonCertPreview">معاينة</button><button class="cert-btn gold" id="lessonCertDownload" disabled>تحميل PDF</button><button class="cert-btn secondary" id="lessonCertClose">إغلاق</button></div><div id="lessonCertPreviewArea"></div></div>`;
 document.body.appendChild(d);
 if(typeof d.showModal==="function"){try{d.showModal()}catch(_){d.setAttribute("open","")}}else{d.setAttribute("open","")}
 const input=d.querySelector("#lessonCertName"),area=d.querySelector("#lessonCertPreviewArea"),download=d.querySelector("#lessonCertDownload");
 d.querySelector("#lessonCertClose").onclick=()=>d.close();
 d.querySelector("#lessonCertPreview").onclick=()=>{const n=clean(input.value);input.value=n;if(n.length<3){input.focus();return}area.innerHTML=`<div class="certificate-stage">${certificateHTML(x,n)}</div>`;download.disabled=false};
 download.onclick=async()=>{const n=clean(input.value),paper=d.querySelector("#lessonCertificatePaper");if(!paper||!n)return;download.disabled=true;try{await libs();if(document.fonts?.ready)await document.fonts.ready;const rect=paper.getBoundingClientRect();const scale=Math.max(3,Math.min(12,4200/Math.max(rect.width,rect.height,1)));const canvas=await html2canvas(paper,{scale,useCORS:true,allowTaint:false,backgroundColor:"#fff",logging:false});const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});const ratio=Math.min(297/canvas.width,210/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio;pdf.addImage(canvas.toDataURL("image/png"),"PNG",(297-w)/2,(210-h)/2,w,h,undefined,"NONE");pdf.save(`شهادة درس تطبيقي - ${clean(x.lessonName||x.title)} - ${n}.pdf`)}finally{download.disabled=false}};
};

function editorHTML(){return `<details class="cert-manage lesson-manage"><summary>إضافة درس تطبيقي</summary><form id="lessonManageForm" class="cert-manage-form"><input type="hidden" id="lmId"><label>عنوان الدرس<input id="lmTitle" required></label><label>المادة<input id="lmSubject"></label><label>الصف<input id="lmGrade"></label><label>التاريخ<input id="lmDate" required></label><label>منفذة الدرس<input id="lmTeacher"></label><label>الاستراتيجيات<input id="lmStrategies"></label><label>رابط المنجز<input id="lmLink" type="url" placeholder="https://"></label><div class="cert-manage-actions"><button class="cert-btn primary" type="submit">حفظ</button><button class="cert-btn secondary" id="lmCancel" type="button">إلغاء</button></div><div id="lmMsg" class="cert-message"></div></form></details>`;}
function detailsHTML(x){return `<div class="lesson-details"><h3>${esc(x.lessonName||x.title||"")}</h3><div class="cert-meta cert-meta-stack">${x.subject?`<span><b>المادة:</b> ${esc(x.subject)}</span>`:""}${x.grade?`<span><b>الصف:</b> ${esc(x.grade)}</span>`:""}<span><b>التاريخ:</b> ${esc(x.date||"—")}</span>${x.strategies?`<span><b>الاستراتيجيات:</b> ${esc(x.strategies)}</span>`:""}${x.teacher?`<span><b>المعلمة:</b> ${esc(x.teacher)}</span>`:""}</div></div>`;}
function openDetails(x){
 const link=clean(x.link||x.url||x.achievementUrl||"");if(link){window.open(link,"_blank","noopener");return;}
 document.getElementById("lessonDetailsDialog")?.remove();const d=document.createElement("dialog");d.id="lessonDetailsDialog";d.className="lesson-details-dialog";d.innerHTML=`<div class="lesson-details-shell">${detailsHTML(x)}<button type="button" class="cert-btn secondary">إغلاق</button></div>`;document.body.appendChild(d);d.querySelector("button").onclick=()=>d.close();d.showModal();
}
function lessonCard(x){
 const card=document.createElement("article");card.className="manjaz-record-card cert-workshop-card applied-lesson-card";card.dataset.lessonId=x.id;
 card.innerHTML=`<span class="cert-status">متاحة للإصدار</span><h3>${esc(x.lessonName||x.title||"بدون عنوان")}</h3><div class="cert-meta cert-meta-stack">${x.date?`<span><b>التاريخ:</b> ${esc(x.date)}</span>`:""}${x.subject?`<span><b>المادة:</b> ${esc(x.subject)}</span>`:""}${x.strategies?`<span><b>الاستراتيجيات:</b> ${esc(x.strategies)}</span>`:""}${x.grade?`<span><b>الصف:</b> ${esc(x.grade)}</span>`:""}${x.teacher?`<span><b>المعلمة:</b> ${esc(x.teacher)}</span>`:""}</div><div class="cert-card-actions" data-lesson-actions="canonical"><button type="button" class="cert-btn primary cert-choose certificate" data-lesson-cert-id="${esc(x.id)}">إصدار الشهادة</button><div class="record-mini-actions"><button type="button" class="cert-mini-action edit">تعديل</button><button type="button" class="cert-mini-action danger delete">حذف</button></div></div>`;
 card.querySelector(".certificate").onclick=()=>window.openAppliedLessonCertificate(x);
 card.querySelector(".edit").onclick=()=>fillEditor(x);
 card.querySelector(".delete").onclick=()=>deleteLesson(x);
 return card;
}
function fillEditor(x){
 const f=document.getElementById("lessonManageForm");if(!f)return;const q=id=>document.getElementById(id);q("lmId").value=x.id;q("lmTitle").value=x.lessonName||x.title||"";q("lmSubject").value=x.subject||"";q("lmGrade").value=x.grade||"";q("lmDate").value=x.date||"";q("lmTeacher").value=x.teacher||"";q("lmStrategies").value=x.strategies||"";q("lmLink").value=x.link||x.url||x.achievementUrl||"";f.closest("details").open=true;f.scrollIntoView({behavior:"smooth",block:"start"});
}
function deleteLesson(x){if(!confirm(`حذف الدرس «${x.lessonName||x.title||""}»؟`))return;const m=managedLessons(),i=m.findIndex(r=>String(r.id)===String(x.id));if(i>=0)m.splice(i,1);else m.push({...x,available:false,availability:"hidden"});saveManaged(m);window.wireAppliedLessons();}
function wireEditor(){
 const f=document.getElementById("lessonManageForm");if(!f)return;const q=id=>document.getElementById(id),msg=q("lmMsg"),submit=f.querySelector('button[type="submit"]');let busy=false;
 q("lmCancel")?.addEventListener("click",()=>{f.reset();q("lmId").value="";msg.textContent=""});
 f.addEventListener("submit",e=>{e.preventDefault();if(busy)return;if(!f.checkValidity()){f.reportValidity();return}busy=true;submit.disabled=true;const id=q("lmId").value||`lesson-${Date.now()}`;const r={id,lessonName:clean(q("lmTitle").value),title:clean(q("lmTitle").value),subject:clean(q("lmSubject").value),grade:clean(q("lmGrade").value),date:clean(q("lmDate").value),teacher:clean(q("lmTeacher").value),strategies:clean(q("lmStrategies").value),link:clean(q("lmLink").value),status:"معتمد",available:true,availability:"available"};const m=managedLessons(),i=m.findIndex(x=>String(x.id)===String(id));if(i>=0)m[i]={...m[i],...r};else m.push(r);saveManaged(m);msg.className="cert-message success";msg.textContent="تم الحفظ بنجاح";setTimeout(()=>{busy=false;submit.disabled=false;window.wireAppliedLessons();},120)});
}
function removeLegacyLessonViewActions(root=document){
 const list=root.querySelector?.("#lessonList")||document.getElementById("lessonList");if(!list)return;
 list.querySelectorAll("a,button").forEach(el=>{
  const t=clean(el.textContent);
  if(/استعراض|عرض المنجز|فتح المنجز/.test(t)) el.remove();
 });
 list.querySelectorAll(".applied-lesson-card").forEach(card=>{
  const actions=card.querySelector(".lesson-card-actions");
  if(actions){
   [...actions.querySelectorAll("a,button")].forEach(el=>{
    const t=clean(el.textContent);
    if(!/إصدار|تعديل|حذف/.test(t)) el.remove();
   });
  }
 });
}

window.wireAppliedLessons=function(){
 const list=document.getElementById("lessonList"),empty=document.getElementById("lessonEmpty");if(!list||!empty)return;
 /* Block the legacy community-sections renderer from taking over #lessons.
    Its observer only rewires when #communityForm is absent, so this route-scoped
    sentinel keeps the canonical lesson renderer authoritative without affecting
    any other section; it disappears automatically when #view is replaced. */
 if(!document.getElementById("communityForm")){
   const guard=document.createElement("span");
   guard.id="communityForm";
   guard.hidden=true;
   guard.setAttribute("aria-hidden","true");
   list.parentNode.insertBefore(guard,list);
 }
 if(!document.getElementById("lessonManageForm")){list.insertAdjacentHTML("beforebegin",editorHTML());wireEditor();}
 const items=lessons();list.className="cert-grid";list.innerHTML="";empty.style.display=items.length?"none":"block";items.forEach(x=>list.appendChild(lessonCard(x)));removeLegacyLessonViewActions(document);
 try{if(sessionStorage.getItem("manjaz_home_open_add")==="lesson"){sessionStorage.removeItem("manjaz_home_open_add");const d=document.querySelector(".lesson-manage");if(d){d.open=true;d.scrollIntoView({behavior:"smooth",block:"start"})}}}catch(_){ }
};

let repairingLessons=false;
function ensureCanonicalLessons(){
 if(repairingLessons || (location.hash||"").slice(1)!=="lessons") return;
 const view=document.getElementById("view");
 if(!view) return;
 let list=document.getElementById("lessonList");
 if(!list){
   repairingLessons=true;
   try{
     view.innerHTML=`<section class="page-intro"><div><span class="kicker">التطوير المهني</span><h2>الدروس التطبيقية</h2><p>توثيق الدروس التطبيقية وإصدار شهادات الحضور</p></div></section><span id="communityForm" hidden aria-hidden="true"></span><div id="lessonList" class="cert-grid"></div><div id="lessonEmpty" class="surface empty-state"><div class="empty-mark">▣</div><h3>لا توجد دروس تطبيقية متاحة حاليًا</h3><p>ستظهر الدروس المتاحة هنا عند إضافتها</p></div>`;
     window.wireAppliedLessons();
   } finally { setTimeout(()=>{repairingLessons=false},0); }
   return;
 }
 const canonical=list.querySelector("[data-lesson-actions='canonical']");
 const legacy=[...list.querySelectorAll("a,button")].some(el=>/استعراض|عرض المنجز|فتح المنجز/.test(clean(el.textContent)));
 if(!canonical || legacy){
   repairingLessons=true;
   try{ window.wireAppliedLessons(); } finally { setTimeout(()=>{repairingLessons=false},0); }
 }
}
function observeLessonRendererConflicts(){
 const view=document.getElementById("view");
 if(!view || view.dataset.lessonCanonicalObserver==="1") return;
 view.dataset.lessonCanonicalObserver="1";
 let timer;
 new MutationObserver(()=>{
   clearTimeout(timer);
   timer=setTimeout(ensureCanonicalLessons,35);
 }).observe(view,{childList:true,subtree:true});
}

// Persistent delegated certificate action: survives card re-renders and Safari DOM replacement.
if(!window.__MANJAZ_LESSON_CERT_DELEGATED__){
 window.__MANJAZ_LESSON_CERT_DELEGATED__=true;
 document.addEventListener("click",function(e){
   const btn=e.target.closest?.(".applied-lesson-card [data-lesson-cert-id]");
   if(!btn) return;
   e.preventDefault();
   e.stopPropagation();
   const x=getLesson(btn.getAttribute("data-lesson-cert-id"));
   if(x) window.openAppliedLessonCertificate(x);
 },true);
}

window.addEventListener("hashchange",()=>setTimeout(()=>{observeLessonRendererConflicts();ensureCanonicalLessons();},0));
if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>{observeLessonRendererConflicts();setTimeout(ensureCanonicalLessons,0)},{once:true});
else {observeLessonRendererConflicts();setTimeout(ensureCanonicalLessons,0);}
window.addEventListener("load",()=>setTimeout(ensureCanonicalLessons,0),{once:true});
})();
