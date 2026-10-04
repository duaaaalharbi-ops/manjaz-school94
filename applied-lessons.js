/* MANJAZ 4.3 — applied lesson certificate */
(()=>{"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const clean=s=>String(s||"").replace(/\s+/g," ").trim().slice(0,80);
async function libs(){
 const load=(src,key)=>new Promise((ok,no)=>{if(window[key])return ok();let s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=no;document.head.appendChild(s)});
 await load("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas");
 await load("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf");
}
function openLesson(x){
 const view=document.getElementById("view"); if(!view)return;
 const title=esc(x.lessonName||x.title||"");
 view.innerHTML=`<div class="certificates-page lesson-certificate-page">
 <section class="page-intro certificates-intro"><div><span class="kicker">منجز</span><h2>إصدار شهادة حضور درس تطبيقي</h2><p>اكتبي الاسم ثم أنشئي الشهادة وحمّليها بصيغة PDF</p></div></section>
 <section class="cert-form">
  <div class="cert-selected-workshop"><strong>${title}</strong><span>${esc(x.date||"")} • ${esc(x.grade||"")}</span><small>المعلمة: ${esc(x.teacher||"")}</small></div>
  <label>الاسم كما ترغبين في ظهوره في الشهادة<input id="lessonCertName" maxlength="80" autocomplete="name"></label>
  <div class="cert-actions"><button class="cert-btn primary" id="lessonCertPreview">إنشاء الشهادة</button><button class="cert-btn gold" id="lessonCertDownload" disabled>تحميل الشهادة PDF</button><button class="cert-btn secondary" id="lessonCertBack">رجوع</button></div>
  <div id="lessonCertMsg" class="cert-message"></div>
 </section>
 <section id="lessonCertPreviewWrap" class="cert-preview-wrap"><div class="cert-preview-note">هذه هي الشهادة النهائية نفسها التي سيتم تحميلها</div><div class="certificate-stage"><div id="lessonCertificatePaper" class="certificate-paper"></div></div></section>
 </div>`;
 const name=document.getElementById("lessonCertName"), paper=document.getElementById("lessonCertificatePaper"), wrap=document.getElementById("lessonCertPreviewWrap"), dl=document.getElementById("lessonCertDownload"), msg=document.getElementById("lessonCertMsg");
 function render(){
   const n=clean(name.value); if(n.length<3){msg.textContent="اكتبي الاسم كاملًا";return}
   paper.className="certificate-paper cert-final";
   paper.style.backgroundImage='url("manjaz-certificate-background.png")';
   paper.innerHTML=`<header class="cert-final-header"><div class="cert-final-org"><strong>وزارة التعليم</strong><span>إدارة تعليم جدة</span><span>الثانوية الرابعة والتسعون - مسارات</span></div><div class="cert-final-ministry"><img src="ministry-logo.png"></div><div class="cert-final-manjaz"><img src="manjaz-logo.png"></div></header>
   <main class="cert-final-main"><div class="cert-final-title">شهادة حضور</div><div class="cert-final-workshop">درس تطبيقي «${title}»</div><div class="cert-final-testimony">تشهد الثانوية الرابعة والتسعون - مسارات بأن المعلمة</div><div class="cert-final-name">${esc(n)}</div><div class="cert-final-attendance">قد حضرت الدرس التطبيقي بعنوان «${title}»${x.date?`، والمنفذ بتاريخ ${esc(x.date)}`:""}${x.teacher?`، لدى المعلمة ${esc(x.teacher)}`:""}</div><div class="cert-final-wish">متمنين لها دوام التوفيق ومزيدًا من التميز والعطاء</div></main>
   <footer class="cert-final-footer"><div class="cert-final-principal"><strong>مديرة المدرسة</strong><span>زينب ناصر علي حكمي</span></div><div class="cert-final-stamp"><img src="official-school-stamp.png"></div></footer>`;
   wrap.classList.add("is-visible");dl.disabled=false;msg.textContent="تم إنشاء الشهادة";
 }
 document.getElementById("lessonCertPreview").onclick=render;
 document.getElementById("lessonCertBack").onclick=()=>{location.hash="#lessons"};
 dl.onclick=async()=>{try{dl.disabled=true;await libs();await document.fonts?.ready;const rect=paper.getBoundingClientRect();const scale=Math.max(3,Math.min(12,4200/Math.max(rect.width,rect.height,1)));const canvas=await html2canvas(paper,{scale,useCORS:true,backgroundColor:"#fff",logging:false});const img=canvas.toDataURL("image/jpeg",.98);const {jsPDF}=window.jspdf;const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});pdf.addImage(img,"JPEG",0,0,297,210,undefined,"FAST");pdf.save(`شهادة درس تطبيقي - ${clean(x.lessonName||x.title)} - ${clean(name.value)}.pdf`)}catch(e){msg.textContent="تعذر إنشاء PDF"}finally{dl.disabled=false}};
}
window.openAppliedLessonCertificate=openLesson;
})();