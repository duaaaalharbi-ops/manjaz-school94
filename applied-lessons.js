/* MANJAZ 4.4 applied lessons */
(function(){"use strict";
const KEY="manjaz_applied_lessons_v44";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const rows=()=>Array.isArray(window.MANJAZ_APPLIED_LESSONS)?window.MANJAZ_APPLIED_LESSONS:(window.MANJAZ_APPLIED_LESSONS=[]);
function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||"null");if(Array.isArray(x))window.MANJAZ_APPLIED_LESSONS=x}catch(_){}}
function save(){try{localStorage.setItem(KEY,JSON.stringify(rows()));return true}catch(_){return false}}
function uid(){return "lesson-"+Date.now()+"-"+Math.random().toString(36).slice(2,7)}
function card(x){return `<article class="cert-workshop-card v44-lesson-card" data-lesson-id="${esc(x.id)}">
<span class="cert-status">متاح</span><h3>${esc(x.title||"درس تطبيقي")}</h3>
<div class="cert-meta cert-meta-stack"><span><b>التاريخ:</b> ${esc(x.date||"—")}</span><span><b>المادة:</b> ${esc(x.subject||"—")}</span><span><b>المنفذة:</b> ${esc(x.teacher||"—")}</span></div>
<button class="cert-btn primary lesson-cert" data-id="${esc(x.id)}">إصدار الشهادة</button>
<div class="v44-mini-actions"><button class="v44-icon v44-edit lesson-edit" data-id="${esc(x.id)}">تعديل</button><button class="v44-icon v44-delete lesson-delete" data-id="${esc(x.id)}">حذف</button></div></article>`}
function page(){return `<div class="certificates-page"><section class="page-intro certificates-intro"><div><span class="kicker">منجز</span><h2>الدروس التطبيقية</h2><p>توثيق الدروس التطبيقية وإدارة بياناتها وإصدار شهادات الحضور</p></div></section>
<section class="surface panel"><div class="panel-head"><h3>الدروس التطبيقية</h3><button class="cert-btn primary" id="lessonAdd">إضافة درس تطبيقي</button></div><div class="cert-grid">${rows().length?rows().map(card).join(""):'<div class="cert-empty"><h3>لا توجد دروس تطبيقية بعد</h3></div>'}</div></section>
<dialog id="lessonDialog" class="v44-cert-dialog"><div class="v44-cert-shell"><div class="v44-cert-controls"><button class="cert-btn secondary" id="lessonClose">إغلاق</button><button class="cert-btn gold" id="lessonPdf">تحميل PDF</button></div><div class="certificate-stage"><div id="lessonPaper" class="certificate-paper cert-approved"></div></div></div></dialog></div>`}
function form(old={}){
 const title=prompt("عنوان الدرس التطبيقي",old.title||"");if(title===null)return null;
 const date=prompt("التاريخ",old.date||"");if(date===null)return null;
 const subject=prompt("المادة",old.subject||"");if(subject===null)return null;
 const teacher=prompt("اسم المنفذة",old.teacher||"");if(teacher===null)return null;
 return {id:old.id||uid(),title:title.trim(),date:date.trim(),subject:subject.trim(),teacher:teacher.trim()};
}
function certificate(x){
 const p=document.getElementById("lessonPaper");if(!p)return;
 const today=new Intl.DateTimeFormat("ar-SA-u-ca-islamic",{day:"numeric",month:"long",year:"numeric"}).format(new Date());
 p.innerHTML=`<div class="cert-approved-bg"></div><header class="cert-approved-header"><div class="cert-header-right"><strong>وزارة التعليم</strong><span>إدارة تعليم جدة</span><span>الثانوية الرابعة والتسعون</span></div><div class="cert-header-center"><img class="cert-ministry-logo" src="ministry-logo.png"></div><div class="cert-header-left"><strong>بوابة منجز الرقمية</strong><span>توثيق • متابعة • أثر</span></div></header>
 <main class="cert-approved-main"><div class="cert-approved-heading">شهادة حضور</div><div class="cert-approved-program">درس تطبيقي «${esc(x.title)}»</div><div class="cert-approved-testimony">تشهد الثانوية الرابعة والتسعون بحضور الدرس التطبيقي</div><div class="cert-approved-name">${esc(x.title)}</div><div class="cert-approved-text">في مادة ${esc(x.subject||"—")}، والمنفذ بتاريخ ${esc(x.date||"—")}، بإشراف المعلمة ${esc(x.teacher||"—")}</div></main>
 <footer class="cert-approved-footer"><div class="cert-footer-right"><strong>تاريخ التحرير</strong><span>${esc(today)}</span></div><div class="cert-stamp-zone"><img class="cert-official-stamp" src="official-school-stamp.png"></div><div class="cert-footer-left"><strong>مديرة المدرسة</strong><span>زينب ناصر حكمي</span></div></footer><div class="cert-approved-watermark">تم إصدار هذه الشهادة إلكترونيًا عبر بوابة منجز الرقمية</div>`}
async function download(){
 const n=document.getElementById("lessonPaper");if(!n)return;
 const load=(src,key)=>new Promise((res,rej)=>{if(window[key])return res();const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)});
 await load("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas");await load("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf");
 const c=await html2canvas(n,{scale:2,useCORS:true,backgroundColor:"#fff"}),{jsPDF}=window.jspdf,p=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
 p.addImage(c.toDataURL("image/jpeg",.96),"JPEG",0,0,297,210,undefined,"FAST");p.save("شهادة-درس-تطبيقي.pdf")}
function wire(){
 document.getElementById("lessonAdd")?.addEventListener("click",()=>{const x=form();if(!x)return;rows().push(x);save();render(true)});
 document.querySelectorAll(".lesson-edit").forEach(b=>b.onclick=()=>{const i=rows().findIndex(x=>String(x.id)===b.dataset.id);if(i<0)return;const x=form(rows()[i]);if(!x)return;rows()[i]=x;save();render(true)});
 document.querySelectorAll(".lesson-delete").forEach(b=>b.onclick=()=>{const i=rows().findIndex(x=>String(x.id)===b.dataset.id);if(i<0||!confirm("حذف الدرس التطبيقي؟"))return;rows().splice(i,1);save();render(true)});
 document.querySelectorAll(".lesson-cert").forEach(b=>b.onclick=()=>{const x=rows().find(x=>String(x.id)===b.dataset.id);if(!x)return;certificate(x);document.getElementById("lessonDialog").showModal()});
 document.getElementById("lessonClose")?.addEventListener("click",()=>document.getElementById("lessonDialog")?.close());document.getElementById("lessonPdf")?.addEventListener("click",download)}
function render(force=false){if(!force&&(location.hash||"").slice(1)!=="lessons")return;const v=document.getElementById("view");if(!v)return;v.innerHTML=page();wire()}
load();addEventListener("hashchange",()=>setTimeout(render,0));document.readyState==="loading"?addEventListener("DOMContentLoaded",()=>render(),{once:true}):render();
})();