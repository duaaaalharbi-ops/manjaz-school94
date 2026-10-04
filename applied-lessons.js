window.MANJAZ_APPLIED_LESSONS_RUNTIME_VERSION = "10.7.26";
(function(){
  "use strict";
  const MAX_NAME=80;
  let activeLesson=null;
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const cleanName=v=>String(v||"").replace(/\s+/g," ").trim().slice(0,MAX_NAME);
  const lessons=()=>Array.isArray(window.MANJAZ_APPLIED_LESSONS)?window.MANJAZ_APPLIED_LESSONS:[];
  const available=x=>x&&x.available!==false&&x.availability!=="unavailable"&&x.availability!=="hidden";

  function injectStyle(){
    if(document.getElementById("appliedLessonCertificateStyle")) return;
    const st=document.createElement("style");st.id="appliedLessonCertificateStyle";
    st.textContent=`
      .applied-cert-overlay{position:fixed;inset:0;z-index:99999;background:rgba(3,25,39,.72);overflow:auto;padding:24px;display:none;direction:rtl}
      .applied-cert-overlay.open{display:block}.applied-cert-shell{max-width:1120px;margin:auto;background:#fff;border-radius:20px;padding:22px;box-shadow:0 24px 80px #0005}
      .applied-cert-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px}.applied-cert-head h2{margin:0}.applied-cert-close{border:0;background:#eef3f5;border-radius:10px;padding:9px 14px;cursor:pointer}
      .applied-cert-form{display:grid;gap:12px;margin:12px 0 18px}.applied-cert-form input{width:100%;padding:12px;border:1px solid #ccd8de;border-radius:10px;font:inherit}.applied-cert-actions{display:flex;gap:10px;flex-wrap:wrap}
      .applied-cert-msg{min-height:24px;margin-top:8px}.applied-cert-preview{display:none;margin-top:18px}.applied-cert-preview.show{display:block}.applied-cert-note{text-align:center;margin:8px 0;color:#52646d}
      .applied-cert-stage{overflow:auto;padding:8px}.applied-cert-paper{width:min(100%,1122px);aspect-ratio:297/210;margin:auto;position:relative;background:#fff center/100% 100% no-repeat;overflow:hidden;direction:rtl;font-family:inherit}
      .applied-cert-paper .cert-final-main{position:absolute;inset:23% 8% 19%;display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center}
      .applied-cert-paper .cert-final-title{font-size:clamp(24px,3vw,46px);font-weight:800}.applied-cert-paper .cert-final-workshop{font-size:clamp(18px,2vw,30px);font-weight:700;margin-top:1.2%}
      .applied-cert-paper .cert-final-testimony,.applied-cert-paper .cert-final-attendance,.applied-cert-paper .cert-final-wish{font-size:clamp(13px,1.45vw,22px);line-height:1.8;margin-top:1%}
      .applied-cert-paper .cert-final-name{font-size:clamp(21px,2.5vw,38px);font-weight:800;margin-top:.5%}.applied-cert-paper .cert-final-facilitator{font-size:clamp(12px,1.25vw,19px);margin-top:1%}
      .applied-cert-paper .cert-final-header{position:absolute;inset:5% 6% auto;display:grid;grid-template-columns:1fr auto 1fr;align-items:start}.applied-cert-paper .cert-final-org{display:flex;flex-direction:column;font-size:clamp(9px,1vw,15px);line-height:1.5}
      .applied-cert-paper .cert-final-ministry img,.applied-cert-paper .cert-final-manjaz img{max-height:72px;max-width:150px;object-fit:contain}.applied-cert-paper .cert-final-manjaz{justify-self:end}
      .applied-cert-paper .cert-final-footer{position:absolute;inset:auto 7% 6%;display:flex;align-items:end;justify-content:flex-end;gap:18px}.applied-cert-paper .cert-final-principal{display:flex;flex-direction:column;text-align:center;font-size:clamp(10px,1.1vw,17px)}.applied-cert-paper .cert-final-stamp img{width:clamp(70px,10vw,145px)}
      @media(max-width:700px){.applied-cert-overlay{padding:8px}.applied-cert-shell{padding:12px}.applied-cert-paper{min-width:760px}}
    `;document.head.appendChild(st);
  }
  function ensureUI(){
    if(document.getElementById("appliedCertOverlay")) return;
    const el=document.createElement("div");el.id="appliedCertOverlay";el.className="applied-cert-overlay";
    el.innerHTML=`<div class="applied-cert-shell"><div class="applied-cert-head"><h2>إصدار شهادة حضور درس تطبيقي</h2><button class="applied-cert-close" type="button">إغلاق</button></div><div id="appliedCertLesson"></div><div class="applied-cert-form"><label>الاسم كما ترغبين في ظهوره في الشهادة<input id="appliedCertName" maxlength="${MAX_NAME}" autocomplete="name"></label><div class="applied-cert-actions"><button class="btn btn-primary" id="appliedCertPreviewBtn" type="button">إنشاء الشهادة</button><button class="btn btn-ghost" id="appliedCertDownloadBtn" type="button" disabled>تحميل الشهادة PDF</button></div><div class="applied-cert-msg" id="appliedCertMsg"></div></div><div class="applied-cert-preview" id="appliedCertPreview"><div class="applied-cert-note">هذه هي الشهادة النهائية، وسيتم تحميل نفس الشهادة الظاهرة</div><div class="applied-cert-stage"><div class="applied-cert-paper" id="appliedCertificatePaper"></div></div></div></div>`;
    document.body.appendChild(el);
    el.querySelector(".applied-cert-close").onclick=()=>el.classList.remove("open");
    document.getElementById("appliedCertPreviewBtn").onclick=preview;
    document.getElementById("appliedCertDownloadBtn").onclick=download;
  }
  function render(lesson,name){
    const paper=document.getElementById("appliedCertificatePaper");
    const title=esc(lesson.lessonName||lesson.title||"");
    const date=esc(lesson.date||""); const grade=esc(lesson.grade||""); const strategies=esc(lesson.strategies||""); const teacher=esc(lesson.teacher||"");
    paper.style.backgroundImage='url("manjaz-certificate-background.png")';
    paper.innerHTML=`<header class="cert-final-header"><div class="cert-final-org"><strong>وزارة التعليم</strong><span>إدارة تعليم جدة</span><span>الثانوية الرابعة والتسعون - مسارات</span></div><div class="cert-final-ministry"><img src="ministry-logo.png" alt="شعار وزارة التعليم"></div><div class="cert-final-manjaz"><img src="manjaz-logo.png" alt="شعار منجز"></div></header><main class="cert-final-main"><div class="cert-final-title">شهادة حضور</div><div class="cert-final-workshop">درس تطبيقي «${title}»</div><div class="cert-final-testimony">تشهد الثانوية الرابعة والتسعون - مسارات بأن المعلمة</div><div class="cert-final-name">${esc(name)}</div><div class="cert-final-attendance">قد حضرت الدرس التطبيقي بعنوان «${title}»${grade?` للصف ${grade}`:""}${strategies?`، والمتضمن تطبيق استراتيجيات: ${strategies}`:""}${teacher?`، والذي نفذته الأستاذة / ${teacher}`:""}${date?`، بتاريخ ${date}`:""}</div><div class="cert-final-wish">متمنين لها دوام التوفيق ومزيدًا من التميز والعطاء</div></main><footer class="cert-final-footer"><div class="cert-final-principal"><strong>مديرة المدرسة</strong><span>زينب ناصر علي حكمي</span></div><div class="cert-final-stamp"><img src="official-school-stamp.png" alt="الختم الرسمي للمدرسة"></div></footer>`;
  }
  function open(lesson){
    if(!available(lesson)) return; activeLesson=lesson;ensureUI();
    document.getElementById("appliedCertLesson").innerHTML=`<strong>${esc(lesson.lessonName||lesson.title||"")}</strong><div>التاريخ: ${esc(lesson.date||"")} • الصف: ${esc(lesson.grade||"")} • المعلمة: ${esc(lesson.teacher||"")}</div>`;
    const name=document.getElementById("appliedCertName");name.value="";document.getElementById("appliedCertPreview").classList.remove("show");document.getElementById("appliedCertDownloadBtn").disabled=true;document.getElementById("appliedCertMsg").textContent="";document.getElementById("appliedCertOverlay").classList.add("open");name.focus();
  }
  function preview(){
    const name=cleanName(document.getElementById("appliedCertName").value),msg=document.getElementById("appliedCertMsg");
    if(!activeLesson){msg.textContent="اختاري درسًا تطبيقيًا";return} if(name.length<3){msg.textContent="يرجى كتابة الاسم بشكل كامل";return}
    document.getElementById("appliedCertName").value=name;render(activeLesson,name);document.getElementById("appliedCertPreview").classList.add("show");document.getElementById("appliedCertDownloadBtn").disabled=false;msg.textContent="تم إنشاء الشهادة النهائية";
  }
  async function libs(){
    const load=(src,key)=>new Promise((res,rej)=>{if(window[key])return res();let s=[...document.scripts].find(x=>x.src===src);if(!s){s=document.createElement("script");s.src=src;s.async=true;document.head.appendChild(s)}s.addEventListener("load",res,{once:true});s.addEventListener("error",rej,{once:true})});
    await load("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas");await load("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf");
  }
  async function download(){
    const name=cleanName(document.getElementById("appliedCertName").value),paper=document.getElementById("appliedCertificatePaper"),msg=document.getElementById("appliedCertMsg");if(!activeLesson||!name||!document.getElementById("appliedCertPreview").classList.contains("show"))return;
    try{msg.textContent="جارٍ تجهيز نفس الشهادة الظاهرة بصيغة PDF عالية الجودة...";await libs();if(document.fonts?.ready)await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));const rect=paper.getBoundingClientRect(),scale=Math.max(3,Math.min(12,4200/Math.max(rect.width,rect.height,1)));const canvas=await html2canvas(paper,{scale,useCORS:true,allowTaint:false,backgroundColor:"#fff",logging:false,scrollX:-window.scrollX,scrollY:-window.scrollY,windowWidth:document.documentElement.clientWidth,windowHeight:document.documentElement.clientHeight});const img=canvas.toDataURL("image/png"),{jsPDF}=window.jspdf,pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true}),ratio=Math.min(297/canvas.width,210/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio;pdf.addImage(img,"PNG",(297-w)/2,(210-h)/2,w,h,undefined,"NONE");const clean=s=>String(s||"").replace(/[\\/:*?"<>|]+/g,"-").replace(/\s+/g," ").trim();pdf.save(`شهادة حضور درس تطبيقي - ${clean(activeLesson.lessonName||activeLesson.title)} - ${clean(name)}.pdf`);msg.textContent="تم تحميل الشهادة بنجاح"}catch(e){console.error(e);msg.textContent="تعذر إنشاء ملف PDF، تحققي من الاتصال ثم أعيدي المحاولة"}
  }
  window.openAppliedLessonCertificate=open;
  window.addEventListener("manjaz:applied-lesson-certificate",e=>{if(e.detail) open(e.detail)});
  injectStyle();ensureUI();
})();
