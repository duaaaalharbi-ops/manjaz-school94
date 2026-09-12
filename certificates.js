window.MANJAZ_CERTIFICATES_RUNTIME_VERSION = "10.7.14-verified-layout";
(function(){
  "use strict";

  const ROUTE="certificates";
  const MAX_NAME=80;
  const SCHOOL="الثانوية الرابعة والتسعون - مسارات";
  const SECTION_TITLE="إصدار شهادات الورش المنفذة الرقمية";
  const workshops=()=>Array.isArray(window.MANJAZ_CERTIFICATE_WORKSHOPS)?window.MANJAZ_CERTIFICATE_WORKSHOPS:[];

  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
  const cleanName=value=>String(value||"").replace(/\s+/g," ").trim().slice(0,MAX_NAME);

  function normalizeWorkshopDate(raw){
    const source=String(raw||"").trim().replace(/\s+/g," ");
    const m=source.match(/^(.+?)\s+([٠-٩0-9]{1,2})\/([٠-٩0-9]{1,2})\/([٠-٩0-9]{3,4})\s*هـ?$/);
    if(!m) return {day:"",date:source};
    return {day:m[1],date:`${m[4]}.${m[3]}.${m[2]}هـ`};
  }

  function hijriTodayNumeric(){
    try{
      const parts=new Intl.DateTimeFormat("ar-SA-u-ca-islamic",{day:"numeric",month:"numeric",year:"numeric"}).formatToParts(new Date());
      const get=t=>(parts.find(p=>p.type===t)?.value||"").replace(/[^\u0660-\u06690-9]/g,"");
      const y=get("year"),m=get("month"),d=get("day");
      return y&&m&&d?`${y}.${m}.${d}هـ`:"";
    }catch(_){return "";}
  }

  function dateSpan(text){
    return `<span class="cert-ar-date" dir="ltr">${esc(text)}</span>`;
  }
  const getActive=()=>workshops().filter(w=>w&&w.available!==false);
  const getWorkshop=id=>workshops().find(w=>String(w.id)===String(id));

  function injectStyle(){
    if(document.querySelector('link[data-certificates-style]')) return;
    const link=document.createElement("link");
    link.rel="stylesheet"; link.href="certificates.css?v=10.7.14"; link.dataset.certificatesStyle="1";
    document.head.appendChild(link);
  }

  function injectLibraries(){
    const load=(src,key)=>new Promise((resolve,reject)=>{
      if(window[key]) return resolve();
      let s=[...document.scripts].find(x=>x.src===src);
      if(!s){s=document.createElement("script");s.src=src;s.async=true;document.head.appendChild(s);}
      s.addEventListener("load",resolve,{once:true});s.addEventListener("error",reject,{once:true});
    });
    return load("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas")
      .then(()=>load("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf"));
  }

  function injectNav(){
    const nav=document.getElementById("nav");
    if(nav && !nav.querySelector('[data-route="certificates"]')){
      const a=document.createElement("a");
      a.href="#home";a.dataset.openCertificates="1";a.dataset.route="certificates";
      a.innerHTML='<span class="icon">▧</span><span>إصدار شهادات الورش</span>';
      const settings=nav.querySelector('[data-route="settings"]');
      nav.insertBefore(a,settings||null);
    }
  }

  function injectHomeCertificatesSection(){
    if((location.hash||"#home")!=="#home") return;
    const view=document.getElementById("view");
    if(!view || view.querySelector(".cert-home-section")) return;

    const categoryGrid=view.querySelector(".category-grid");
    if(!categoryGrid) return;

    const section=document.createElement("section");
    section.className="section-block cert-home-section";
    section.innerHTML=`
      <div class="section-title">
        <div>
          <h3>الخدمات الرقمية</h3>
        </div>
      </div>
      <article class="category-card cert-home-card" role="button" tabindex="0" aria-label="فتح إصدار الشهادات للورش المنفذة رقميًا">
        <strong>إصدار الشهادات للورش المنفذة رقميًا</strong>
        <small>أنشئي شهادتك الرقمية بعد اختيار الورشة من قائمة الورش المنفذة</small>
        <a class="cert-home-link cert-home-action" href="#home" data-open-certificates="1">إصدار شهادة</a>
      </article>`;
    const open=()=>{ renderPage(true); setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),0); };
    const card=section.querySelector(".cert-home-card");
    card.addEventListener("click",e=>{ e.preventDefault(); open(); });
    card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open();}});
    section.querySelector(".cert-home-action")?.addEventListener("click",e=>{
      e.preventDefault(); e.stopPropagation(); open();
    });
    const categorySection=categoryGrid.closest(".section-block") || categoryGrid.parentElement;
    categorySection.insertAdjacentElement("afterend",section);
  }

  function setActiveNav(){
    document.querySelectorAll("#nav a").forEach(a=>a.classList.toggle("active",a.dataset.route===ROUTE));
  }

  function implementersLabel(w){
    const names=Array.isArray(w.implementers)?w.implementers.filter(Boolean):[];
    if(!names.length) return "";
    return `${names.length>1?"المنفذتان":"المنفذة"}: ${names.map(esc).join("، ")}`;
  }

  function workshopCards(){
    const all=workshops();
    if(!all.length) return '<div class="cert-empty"><h3>لا توجد شهادات متاحة حاليًا</h3><p>ستظهر الورش هنا عند إضافتها إلى بيانات القسم</p></div>';
    return `<div class="cert-grid">${all.map(w=>`<article class="cert-workshop-card" data-workshop-id="${esc(w.id)}">
      <span class="cert-status ${w.available===false?'off':''}">${w.available===false?'غير متاحة':'متاحة للإصدار'}</span>
      <h3>ورشة «${esc(w.title||"بدون عنوان")}»</h3>
      <div class="cert-meta cert-meta-stack">
        <span><b>التاريخ:</b> ${(()=>{const d=normalizeWorkshopDate(w.date);return `${esc(d.day)} ${dateSpan(d.date||"—")}`.trim();})()}</span>
        <span><b>المدة:</b> ${esc(w.duration||"—")}</span>
        ${implementersLabel(w)?`<span><b>${Array.isArray(w.implementers)&&w.implementers.length>1?'منفذات الورشة':'منفذة الورشة'}:</b> ${(w.implementers||[]).map(esc).join('، ')}</span>`:""}
      </div>
      ${w.available===false?'':'<button class="cert-btn primary cert-choose" data-id="'+esc(w.id)+'">إصدار الشهادة</button>'}
    </article>`).join("")}</div>`;
  }

  function pageHTML(){
    return `<div class="certificates-page">
      <section class="page-intro certificates-intro"><div><span class="kicker">منجز</span><h2>${SECTION_TITLE}</h2><p>اختاري الورشة المنفذة، ثم اكتبي اسمك كما ترغبين في ظهوره على الشهادة، وراجعي المعاينة قبل تحميل ملف PDF</p></div></section>
      <section class="surface panel"><div class="panel-head"><h3>الورش المتاحة</h3><span>${getActive().length} متاحة حاليًا</span></div>${workshopCards()}</section>
      <section id="certIssuePanel" class="cert-form" style="display:none">
        <div class="form-section-title">إصدار الشهادة</div>
        <div id="certSelectedWorkshop" class="cert-selected-workshop"></div>
        <input type="hidden" id="certWorkshopId">
        <label>الاسم كما ترغبين في ظهوره في الشهادة<input id="certTeacherName" maxlength="${MAX_NAME}" autocomplete="name" placeholder="اكتبي الاسم كاملًا"></label>
        <div class="cert-help">راجعي كتابة الاسم بعناية قبل اعتماد الشهادة، وسيتم حذف المسافات الزائدة تلقائيًا. لا يتم حفظ الاسم أو الشهادة في ذاكرة الموقع أو قاعدة البيانات</div>
        <div class="cert-actions">
          <button type="button" class="cert-btn primary" id="certPreviewBtn">معاينة الشهادة</button>
          <button type="button" class="cert-btn secondary" id="certEditNameBtn" disabled>تعديل الاسم</button>
          <button type="button" class="cert-btn gold" id="certDownloadBtn" disabled>تحميل الشهادة PDF</button>
          <button type="button" class="cert-btn secondary" id="certBackBtn">رجوع</button>
        </div>
        <div id="certMsg" class="cert-message" aria-live="polite"></div>
      </section>
      <section id="certPreviewWrap" class="cert-preview-wrap">
        <div class="cert-preview-note">هذه معاينة للشهادة، تأكدي من صحة الاسم قبل التحميل</div>
        <div class="certificate-stage"><div id="certificatePaper" class="certificate-paper"></div></div>
      </section>
    </div>`;
  }

  function injectCertificatesAnnouncement(){
    const banner=document.getElementById("manjazTrialBanner");
    if(!banner) return;

    const announcement="تم إطلاق خاصية إصدار الشهادات الرقمية للورش المنفذة عبر بوابة «منجز»";
    const oldNeedles=[
      "نعمل باستمرار على تطوير «منجز»",
      "نعمل باستمرار على تطوير \"منجز\"",
      "ونرحب بملاحظاتكم ومقترحاتكم",
      "للإسهام في تطوير النسخة القادمة"
    ];

    // Preserve the trial badge, but replace the moving announcement itself.
    const candidates=[...banner.querySelectorAll("span,div,p")].filter(el=>{
      const t=(el.textContent||"").trim();
      return t && oldNeedles.some(n=>t.includes(n));
    });

    if(candidates.length){
      // Prefer the deepest matching element so styling/animation remain intact.
      const target=candidates.sort((a,b)=>b.children.length-a.children.length).pop();
      if(target) target.textContent=announcement;
    }else{
      const moving=banner.querySelector(".trial-text,.marquee-text,.ticker-text,[data-trial-text]");
      if(moving) moving.textContent=announcement;
      else{
        // Last-resort: replace the longest non-badge textual node without deleting the "إصدار تجريبي" label.
        const els=[...banner.querySelectorAll("span,div,p")].filter(el=>{
          const t=(el.textContent||"").trim();
          return t && !t.includes("إصدار تجريبي") && !el.children.length;
        }).sort((a,b)=>(b.textContent||"").length-(a.textContent||"").length);
        if(els[0]) els[0].textContent=announcement;
      }
    }
    banner.dataset.certAnnouncement="10.7";
  }

  function certificateTextHTML(w,name){
    const raw=String(w.certificateText||"");
    const token="{{name}}";
    if(!raw.includes(token)) return esc(raw||"تشهد الثانوية الرابعة والتسعون - مسارات بحضور المعلمة للورشة المنفذة");
    const parts=raw.split(token);
    return `${esc(parts[0])}<span class="cert-inline-name">${esc(name)}</span>${esc(parts.slice(1).join(token))}`;
  }


  function implementersBlock(w){
    const names=Array.isArray(w.implementers)?w.implementers.filter(Boolean).slice(0,4):[];
    if(!names.length) return "";
    const cls=`count-${Math.min(names.length,4)}`;
    return `<div class="cert-facilitators-inline ${cls}">
      ${names.map(n=>`<span class="cert-facilitator-inline"><b>منفذة الورشة:</b><span>${esc(n)}</span></span>`).join("")}
    </div>`;
  }

  function renderCertificate(w,name){
    const paper=document.getElementById("certificatePaper");
    if(!paper) return;
    const workshopTitle=esc(w.title||"");
    const workshopDate=normalizeWorkshopDate(w.date);
    const workshopDatePhrase=workshopDate.day
      ? `${esc(workshopDate.day)} الموافق ${dateSpan(workshopDate.date)}`
      : dateSpan(workshopDate.date);
    const durationRaw=String(w.duration||"").trim();
    const durationPhrase=durationRaw==="ساعتان" ? "ساعتين تدريبيتين" : esc(durationRaw);

    paper.className="certificate-paper cert-final";
    paper.style.backgroundImage='url("manjaz-certificate-background.png")';
    paper.innerHTML=`
      <header class="cert-final-header">
        <div class="cert-final-org">
          <strong>وزارة التعليم</strong>
          <span>إدارة تعليم جدة</span>
          <span>الثانوية الرابعة والتسعون - مسارات</span>
        </div>
        <div class="cert-final-ministry"><img src="ministry-logo.png" alt="شعار وزارة التعليم"></div>
        <div class="cert-final-manjaz"><img src="manjaz-logo.png" alt="شعار منجز"></div>
      </header>

      <main class="cert-final-main">
        <div class="cert-final-title">شهادة حضور</div>
        <div class="cert-final-workshop">ورشة «${workshopTitle}»</div>
        <div class="cert-final-testimony">تشهد الثانوية الرابعة والتسعون - مسارات بأن المعلمة</div>
        <div class="cert-final-name">${esc(name)}</div>
        <div class="cert-final-attendance">قد حضرت الورشة التدريبية بعنوان «${workshopTitle}»، والتي نُفذت يوم ${workshopDatePhrase}، بواقع ${durationPhrase}</div>
        <div class="cert-final-wish">متمنين لها دوام التوفيق ومزيدًا من التميز والعطاء</div>
        ${implementersBlock(w)}
      </main>

      <footer class="cert-final-footer">
        <div class="cert-final-principal"><strong>مديرة المدرسة</strong><span>زينب ناصر علي حكمي</span></div>
        <div class="cert-final-stamp"><img src="official-school-stamp.png" alt="الختم الرسمي للمدرسة"></div>
      </footer>`;
  }

  function fileName(w,name){
    const clean=s=>String(s||"").replace(/[\\/:*?"<>|]+/g,"-").replace(/\s+/g," ").trim();
    return `شهادة - ${clean(w.title)} - ${clean(name)}.pdf`;
  }

  async function downloadPDF(w,name){
    const msg=document.getElementById("certMsg"),btn=document.getElementById("certDownloadBtn");
    try{
      btn.disabled=true;msg.className="cert-message info";msg.textContent="جارٍ إنشاء الشهادة...";
      await injectLibraries();
      const node=document.getElementById("certificatePaper");
      const canvas=await window.html2canvas(node,{scale:2,useCORS:true,backgroundColor:"#ffffff",logging:false});
      const img=canvas.toDataURL("image/jpeg",0.96);
      const {jsPDF}=window.jspdf;
      const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
      pdf.addImage(img,"JPEG",0,0,297,210,undefined,"FAST");
      pdf.save(fileName(w,name));
      msg.className="cert-message success";msg.innerHTML='<strong>تم إنشاء الشهادة بنجاح</strong><br>تم إنشاء ملف PDF دون حفظ الاسم أو الشهادة في الموقع';
    }catch(err){
      console.error(err);msg.className="cert-message error";msg.textContent="تعذر إنشاء ملف PDF، تحققي من الاتصال ثم أعيدي المحاولة";
    }finally{btn.disabled=false;}
  }

  function wirePage(){
    const hiddenId=document.getElementById("certWorkshopId"),name=document.getElementById("certTeacherName"),panel=document.getElementById("certIssuePanel"),msg=document.getElementById("certMsg"),preview=document.getElementById("certPreviewWrap"),previewBtn=document.getElementById("certPreviewBtn"),editBtn=document.getElementById("certEditNameBtn"),downloadBtn=document.getElementById("certDownloadBtn"),selected=document.getElementById("certSelectedWorkshop");

    document.querySelectorAll(".cert-choose").forEach(btn=>btn.addEventListener("click",()=>{
      const w=getWorkshop(btn.dataset.id);
      if(!w||w.available===false) return;
      hiddenId.value=w.id;
      const sd=normalizeWorkshopDate(w.date); selected.innerHTML=`<strong>${esc(w.title)}</strong><span>${esc(sd.day)} ${dateSpan(sd.date)} • ${esc(w.duration||"")}</span>${implementersLabel(w)?`<small>${implementersLabel(w)}</small>`:""}`;
      panel.style.display="grid";
      preview.classList.remove("is-visible");
      msg.textContent="";
      name.value="";name.disabled=false;editBtn.disabled=true;downloadBtn.disabled=true;
      panel.scrollIntoView({behavior:"smooth",block:"start"});
      name.focus();
    }));

    document.getElementById("certBackBtn")?.addEventListener("click",()=>{
      panel.style.display="none";preview.classList.remove("is-visible");msg.textContent="";hiddenId.value="";name.value="";
    });

    editBtn?.addEventListener("click",()=>{
      name.disabled=false;name.focus();downloadBtn.disabled=true;msg.className="cert-message info";msg.textContent="عدّلي الاسم ثم اضغطي معاينة الشهادة مرة أخرى";
    });

    previewBtn?.addEventListener("click",()=>{
      const w=getWorkshop(hiddenId.value),n=cleanName(name.value);name.value=n;
      if(!w){msg.className="cert-message error";msg.textContent="اختاري ورشة من البطاقات أعلاه";return;}
      if(!n){msg.className="cert-message error";msg.textContent="اكتبي الاسم كما ترغبين في ظهوره في الشهادة";name.focus();return;}
      if(n.length<3){msg.className="cert-message error";msg.textContent="يرجى كتابة الاسم بشكل كامل";name.focus();return;}
      renderCertificate(w,n);preview.classList.add("is-visible");name.disabled=true;editBtn.disabled=false;downloadBtn.disabled=false;msg.className="cert-message info";msg.textContent="راجعي الاسم في المعاينة قبل تحميل الشهادة";preview.scrollIntoView({behavior:"smooth",block:"start"});
    });

    downloadBtn?.addEventListener("click",()=>{
      const w=getWorkshop(hiddenId.value),n=cleanName(name.value);
      if(!w||!n||!preview.classList.contains("is-visible")){msg.className="cert-message error";msg.textContent="عايني الشهادة أولًا";return;}
      downloadPDF(w,n);
    });
  }

  function renderPage(force=false){
    if(!force && (location.hash||"").slice(1)!==ROUTE) return;
    const view=document.getElementById("view"); if(!view) return;
    setActiveNav();view.innerHTML=pageHTML();wirePage();
  }

  function observeAppRenders(){
    const view=document.getElementById("view");
    if(!view || view.dataset.certObserver==="1") return;
    view.dataset.certObserver="1";
    let timer;
    const observer=new MutationObserver(()=>{
      clearTimeout(timer);
      timer=setTimeout(()=>{
        const route=(location.hash||"#home").slice(1);
        if(route===ROUTE) renderPage();
        else if(route==="home") injectHomeCertificatesSection();
      },40);
    });
    observer.observe(view,{childList:true,subtree:true});
  }

  function boot(){
    injectStyle();injectNav();observeAppRenders();
    if(document.documentElement.dataset.certDirectOpen!=="1"){
      document.documentElement.dataset.certDirectOpen="1";
      document.addEventListener("click",e=>{
        const target=e.target.closest("[data-open-certificates='1']");
        if(!target) return;
        e.preventDefault();
        e.stopPropagation();
        renderPage(true);
        setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),0);
      },true);
      document.addEventListener("touchend",e=>{
        const target=e.target.closest("[data-open-certificates='1']");
        if(!target) return;
        e.preventDefault();
        e.stopPropagation();
        renderPage(true);
        setTimeout(()=>window.scrollTo({top:0,behavior:"smooth"}),0);
      },{capture:true,passive:false});
    }
    setTimeout(injectHomeCertificatesSection,0);
    setTimeout(injectHomeCertificatesSection,250);
    setTimeout(injectHomeCertificatesSection,800);
    setTimeout(injectCertificatesAnnouncement,0);
    setTimeout(injectCertificatesAnnouncement,250);
    setTimeout(injectCertificatesAnnouncement,900);
    if((location.hash||"").slice(1)===ROUTE) setTimeout(renderPage,0);
  }

  window.addEventListener("hashchange",()=>{
    setTimeout(()=>{
      if((location.hash||"").slice(1)===ROUTE) renderPage(); else injectHomeCertificatesSection(); injectCertificatesAnnouncement();
    },0);
  });
  if(document.readyState==="loading"){
    window.addEventListener("DOMContentLoaded",boot,{once:true});
  }else{
    boot();
  }
})();
