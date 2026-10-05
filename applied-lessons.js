/* MANJAZ 4.3 — independent applied-lesson certificate */
(()=>{"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
async function libs(){
  const load=(src,key)=>new Promise((res,rej)=>{if(window[key])return res();const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=rej;document.head.appendChild(s)});
  await load("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas");
  await load("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf");
}
function certificateHTML(x,name){
 return `<div class="certificate-paper cert-final v43-lesson-certificate" id="v43LessonPaper" style="background-image:url('manjaz-certificate-background.png')">
  <header class="cert-final-header">
   <div class="cert-final-org"><strong>وزارة التعليم</strong><span>إدارة تعليم جدة</span><span>الثانوية الرابعة والتسعون - مسارات</span></div>
   <div class="cert-final-ministry"><img src="ministry-logo.png" alt="شعار وزارة التعليم"></div>
   <div class="cert-final-manjaz"><img src="manjaz-logo.png" alt="شعار منجز"></div>
  </header>
  <main class="cert-final-main">
   <div class="cert-final-title">شهادة حضور</div>
   <div class="cert-final-workshop">درس تطبيقي «${esc(x.lessonName||x.title||"")}»</div>
   <div class="cert-final-testimony">تشهد الثانوية الرابعة والتسعون - مسارات بأن المعلمة</div>
   <div class="cert-final-name">${esc(name)}</div>
   <div class="cert-final-attendance">قد حضرت الدرس التطبيقي بعنوان «${esc(x.lessonName||x.title||"")}» بتاريخ ${esc(x.date||"—")}${x.duration?`، لمدة ${esc(x.duration)}`:""}</div>
   <div class="cert-final-wish">متمنين لها دوام التوفيق ومزيدًا من التميز والعطاء</div>
   <div class="cert-facilitators-inline count-1"><span class="cert-facilitator-inline"><b>منفذة الدرس:</b><span>${esc(x.teacher||"")}</span></span></div>
  </main>
  <footer class="cert-final-footer"><div class="cert-final-principal"><strong>مديرة المدرسة</strong><span>زينب ناصر علي حكمي</span></div><div class="cert-final-stamp"><img src="official-school-stamp.png" alt="الختم الرسمي للمدرسة"></div></footer>
 </div>`;
}
window.openAppliedLessonCertificate=function(x){
 document.getElementById("v43LessonCertDialog")?.remove();
 const d=document.createElement("dialog");d.id="v43LessonCertDialog";d.className="v43-cert-dialog";
 d.innerHTML=`<div class="v43-cert-shell"><div class="v43-cert-controls"><input id="v43LessonName" placeholder="اسم المستفيدة"><button class="cert-btn primary" id="v43LessonPreview">معاينة</button><button class="cert-btn gold" id="v43LessonDownload" disabled>تحميل PDF</button><button class="cert-btn secondary" id="v43LessonClose">إغلاق</button></div><div id="v43LessonPreviewArea"></div></div>`;
 document.body.appendChild(d);d.showModal();
 const input=d.querySelector("#v43LessonName"),area=d.querySelector("#v43LessonPreviewArea"),download=d.querySelector("#v43LessonDownload");
 d.querySelector("#v43LessonClose").onclick=()=>d.close();
 d.querySelector("#v43LessonPreview").onclick=()=>{const n=clean(input.value);if(n.length<3){input.focus();return}area.innerHTML=`<div class="certificate-stage">${certificateHTML(x,n)}</div>`;download.disabled=false};
 download.onclick=async()=>{const n=clean(input.value),paper=d.querySelector("#v43LessonPaper");if(!paper||!n)return;download.disabled=true;try{await libs();if(document.fonts?.ready)await document.fonts.ready;const canvas=await html2canvas(paper,{scale:4,useCORS:true,backgroundColor:"#fff",logging:false});const {jsPDF}=window.jspdf,pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});pdf.addImage(canvas.toDataURL("image/png"),"PNG",0,0,297,210,undefined,"NONE");pdf.save(`شهادة درس تطبيقي - ${clean(x.lessonName||x.title)} - ${n}.pdf`)}finally{download.disabled=false}};
};
})();