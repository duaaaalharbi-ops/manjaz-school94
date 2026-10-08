/* MANJAZ ADMIN PERMISSIONS 1.0
   - Visible section on home.
   - Supabase Auth login gate.
   - Password recovery.
   - Two tools only: execution certificate + thanks certificate.
   - Certificate issue records saved to Supabase.
   - Does not alter workshop/lesson certificates.
*/
(()=>{"use strict";

const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const RECORDS_ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
const AUTH_ENDPOINT=`${SUPABASE_URL}/auth/v1`;
const SESSION_KEY="manjaz_admin_auth_session_v1";
const EXEC_KIND="admin_execution_certificate_issue";
const THANKS_KIND="admin_thanks_certificate_issue";

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const route=()=>((location.hash||"").slice(1));
const isAdminRoute=()=>route()==="admin-permissions";

function authHeaders(token){
  return {
    "apikey":SUPABASE_KEY,
    "Authorization":`Bearer ${token||SUPABASE_KEY}`,
    "Content-Type":"application/json"
  };
}

function loadSession(){
  try{
    const raw=sessionStorage.getItem(SESSION_KEY);
    const s=raw?JSON.parse(raw):null;
    if(!s?.access_token) return null;
    return s;
  }catch(_){return null}
}
function saveSession(s){
  try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(s||{}))}catch(_){}
}
function clearSession(){
  try{sessionStorage.removeItem(SESSION_KEY)}catch(_){}
}
function normalizeSession(x){
  if(!x?.access_token) return null;
  const now=Math.floor(Date.now()/1000);
  return {
    access_token:x.access_token,
    refresh_token:x.refresh_token||"",
    expires_at:x.expires_at || (now+Number(x.expires_in||3600)),
    user:x.user||{}
  };
}

async function refreshSession(s){
  if(!s?.refresh_token) return null;
  const r=await fetch(`${AUTH_ENDPOINT}/token?grant_type=refresh_token`,{
    method:"POST",
    headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({refresh_token:s.refresh_token})
  });
  if(!r.ok) return null;
  const next=normalizeSession(await r.json());
  if(next) saveSession(next);
  return next;
}

async function validSession(){
  let s=loadSession();
  if(!s) return null;
  const now=Math.floor(Date.now()/1000);
  if(Number(s.expires_at||0) <= now+30){
    s=await refreshSession(s);
    if(!s){clearSession();return null;}
  }
  try{
    const r=await fetch(`${AUTH_ENDPOINT}/user`,{headers:authHeaders(s.access_token),cache:"no-store"});
    if(!r.ok){clearSession();return null;}
    const user=await r.json();
    s.user=user;
    saveSession(s);
    return s;
  }catch(_){
    return null;
  }
}

async function signIn(email,password){
  const r=await fetch(`${AUTH_ENDPOINT}/token?grant_type=password`,{
    method:"POST",
    headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({email,password})
  });
  if(!r.ok){
    const data=await r.json().catch(()=>({}));
    throw new Error(data?.msg||data?.error_description||"بيانات الدخول غير صحيحة");
  }
  const s=normalizeSession(await r.json());
  if(!s) throw new Error("تعذر إنشاء جلسة الدخول");
  saveSession(s);
  return s;
}

async function signOut(){
  const s=loadSession();
  try{
    if(s?.access_token){
      await fetch(`${AUTH_ENDPOINT}/logout`,{method:"POST",headers:authHeaders(s.access_token)});
    }
  }catch(_){}
  clearSession();
}

async function sendRecovery(email){
  const redirectTo=`${location.origin}${location.pathname}?admin_recovery=1`;
  const r=await fetch(`${AUTH_ENDPOINT}/recover`,{
    method:"POST",
    headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({email,redirect_to:redirectTo})
  });
  if(!r.ok){
    const data=await r.json().catch(()=>({}));
    throw new Error(data?.msg||data?.error_description||"تعذر إرسال رابط الاستعادة");
  }
}

function recoveryTokenFromLocation(){
  const hash=location.hash.startsWith("#")?location.hash.slice(1):location.hash;
  const p=new URLSearchParams(hash);
  if(p.get("type")==="recovery" && p.get("access_token")){
    return p.get("access_token");
  }
  return "";
}

function captureRecoveryRedirect(){
  const token=recoveryTokenFromLocation();
  if(!token) return false;
  try{sessionStorage.setItem("manjaz_admin_recovery_token",token)}catch(_){}
  history.replaceState(null,"",`${location.pathname}?admin_recovery=1#admin-permissions`);
  return true;
}

async function updateRecoveredPassword(token,password){
  const r=await fetch(`${AUTH_ENDPOINT}/user`,{
    method:"PUT",
    headers:authHeaders(token),
    body:JSON.stringify({password})
  });
  if(!r.ok){
    const data=await r.json().catch(()=>({}));
    throw new Error(data?.msg||data?.error_description||"تعذر تحديث كلمة المرور");
  }
  try{sessionStorage.removeItem("manjaz_admin_recovery_token")}catch(_){}
  history.replaceState(null,"",`${location.pathname}#admin-permissions`);
}

function injectStyle(){
  if(document.getElementById("adminPermissionsStyle")) return;
  const s=document.createElement("style");
  s.id="adminPermissionsStyle";
  s.textContent=`
    #adminPermissionsRoot{direction:rtl}
    .admin-auth-wrap{max-width:560px;margin:34px auto}
    .admin-auth-card{padding:24px}
    .admin-auth-card h3{margin:0 0 8px}
    .admin-auth-card p{margin:0 0 18px;line-height:1.8}
    .admin-auth-link{border:0;background:transparent;text-decoration:underline;cursor:pointer;padding:8px 0}
    .admin-tools-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin-top:18px}
    .admin-tool-card{padding:20px}
    .admin-tool-card h3{margin:0 0 8px}
    .admin-tool-card p{margin:0 0 16px;line-height:1.8}
    .admin-user-bar{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:12px 0 18px}
    .admin-cert-workspace{margin-top:18px}
    .admin-cert-preview{margin-top:18px;display:none}
    .admin-cert-preview.is-visible{display:block}
    .admin-cert-message{margin-top:10px;font-weight:700}
    .admin-cert-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    @media(max-width:760px){.admin-tools-grid{grid-template-columns:1fr}}
  `;
  document.head.appendChild(s);
}

function pageIntro(){
  return `<section class="page-intro">
    <div>
      <span class="kicker">صلاحيات إدارية</span>
      <h2>صلاحيات إدارية</h2>
      <p>أدوات إصدار الشهادات الإدارية المخصصة للمدير</p>
    </div>
  </section>`;
}

function loginHTML(){
  return `${pageIntro()}
    <div class="admin-auth-wrap">
      <form id="adminLoginForm" class="surface form-card admin-auth-card">
        <h3>تسجيل الدخول</h3>
        <p>أدخلي بيانات الحساب الإداري للوصول إلى أدوات إصدار الشهادات.</p>
        <div class="form-grid">
          <label class="wide">اسم المستخدم
            <input id="adminUsername" type="email" autocomplete="username" placeholder="البريد الإلكتروني الإداري" required>
          </label>
          <label class="wide">كلمة المرور
            <input id="adminPassword" type="password" autocomplete="current-password" required>
          </label>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">دخول</button>
        </div>
        <button type="button" class="admin-auth-link" id="forgotPassword">نسيت كلمة المرور؟</button>
        <div id="adminAuthMsg"></div>
      </form>
    </div>`;
}

function recoveryHTML(){
  return `${pageIntro()}
    <div class="admin-auth-wrap">
      <form id="adminResetForm" class="surface form-card admin-auth-card">
        <h3>تعيين كلمة مرور جديدة</h3>
        <p>أدخلي كلمة المرور الجديدة للحساب الإداري.</p>
        <div class="form-grid">
          <label class="wide">كلمة المرور الجديدة
            <input id="newAdminPassword" type="password" minlength="8" autocomplete="new-password" required>
          </label>
          <label class="wide">تأكيد كلمة المرور
            <input id="confirmAdminPassword" type="password" minlength="8" autocomplete="new-password" required>
          </label>
        </div>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">حفظ كلمة المرور الجديدة</button>
        </div>
        <div id="adminResetMsg"></div>
      </form>
    </div>`;
}

function toolsHTML(session){
  const email=esc(session?.user?.email||"الحساب الإداري");
  return `${pageIntro()}
    <div class="surface panel admin-user-bar">
      <div><strong>الحساب الإداري:</strong> ${email}</div>
      <button class="btn btn-ghost" type="button" id="adminLogout">تسجيل الخروج</button>
    </div>
    <div class="admin-tools-grid">
      <article class="surface admin-tool-card">
        <span class="badge">شهادة تنفيذ</span>
        <h3>توليد شهادة تنفيذ</h3>
        <p>إصدار شهادة تنفيذ موحدة للورش والدروس والبرامج والمبادرات وغيرها.</p>
        <button class="btn btn-primary" type="button" id="openExecutionTool">فتح الأداة</button>
      </article>
      <article class="surface admin-tool-card">
        <span class="badge">شكر وتقدير</span>
        <h3>توليد شهادة شكر وتقدير</h3>
        <p>إصدار شهادة شكر وتقدير رسمية وفق البيانات المدخلة.</p>
        <button class="btn btn-primary" type="button" id="openThanksTool">فتح الأداة</button>
      </article>
    </div>
    <section id="adminCertWorkspace" class="admin-cert-workspace"></section>`;
}

function executionFormHTML(){
  return `<form id="adminCertificateForm" class="surface form-card">
    <div class="form-section-title">بيانات شهادة التنفيذ</div>
    <div class="form-grid">
      <label>اسم المنفذة *
        <input name="name" required>
      </label>
      <label>عنوان التنفيذ *
        <input name="title" required>
      </label>
      <label>نوع التنفيذ *
        <select name="type" id="executionType" required>
          <option value="">اختاري النوع</option>
          <option>ورشة تدريبية</option>
          <option>درس تطبيقي</option>
          <option>برنامج</option>
          <option>مبادرة</option>
          <option>لقاء</option>
          <option>دورة</option>
          <option>فعالية</option>
          <option>أخرى</option>
        </select>
      </label>
      <label id="customExecutionTypeWrap" style="display:none">نوع التنفيذ الآخر *
        <input name="customType" id="customExecutionType">
      </label>
      <label>تاريخ التنفيذ *
        <input name="date" type="date" required>
      </label>
      <label>المدة / بواقع *
        <input name="duration" placeholder="مثال: ساعتين تدريبيتين" required>
      </label>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit">إصدار الشهادة</button>
      <button class="btn btn-ghost" type="button" id="cancelAdminCert">إلغاء</button>
    </div>
    <div id="adminCertificateMsg" class="admin-cert-message"></div>
  </form>
  ${previewHTML()}`;
}

function thanksFormHTML(){
  return `<form id="adminCertificateForm" class="surface form-card">
    <div class="form-section-title">بيانات شهادة الشكر والتقدير</div>
    <div class="form-grid">
      <label>اسم المستفيدة *
        <input name="name" required>
      </label>
      <label class="wide">سبب الشكر والتقدير *
        <textarea name="reason" required></textarea>
      </label>
      <label class="wide">المناسبة / العمل *
        <input name="occasion" required>
      </label>
      <label>التاريخ *
        <input name="date" type="date" required>
      </label>
    </div>
    <div class="form-actions">
      <button class="btn btn-primary" type="submit">إصدار الشهادة</button>
      <button class="btn btn-ghost" type="button" id="cancelAdminCert">إلغاء</button>
    </div>
    <div id="adminCertificateMsg" class="admin-cert-message"></div>
  </form>
  ${previewHTML()}`;
}

function previewHTML(){
  return `<div id="adminCertificatePreview" class="admin-cert-preview">
    <div class="certificate-stage">
      <div id="adminCertificatePaper" class="certificate-paper"></div>
    </div>
    <div class="admin-cert-actions">
      <button class="btn btn-primary" type="button" id="adminCertificateDownload">تحميل الشهادة PDF</button>
    </div>
  </div>`;
}

function arabicDate(raw){
  if(!raw) return "";
  try{
    return new Intl.DateTimeFormat("ar-SA",{year:"numeric",month:"long",day:"numeric",calendar:"gregory"})
      .format(new Date(`${raw}T12:00:00`));
  }catch(_){return raw}
}

function renderCertificate(type,d){
  const paper=document.getElementById("adminCertificatePaper");
  if(!paper) return;
  paper.className="certificate-paper cert-final";
  paper.style.backgroundImage='url("manjaz-certificate-background.png")';

  let certTitle="",activityTitle="",testimony="",body="",wish="";
  if(type==="execution"){
    certTitle="شهادة تنفيذ";
    activityTitle=`${esc(d.type)} «${esc(d.title)}»`;
    testimony="تشهد الثانوية الرابعة والتسعون - مسارات بأن المعلمة";
    body=`قد نفذت ${esc(d.type)} بعنوان «${esc(d.title)}» بتاريخ ${esc(arabicDate(d.date))}، بواقع ${esc(d.duration)}`;
    wish="متمنين لها دوام التوفيق ومزيدًا من التميز والعطاء";
  }else{
    certTitle="شهادة شكر وتقدير";
    activityTitle=esc(d.occasion);
    testimony="تتقدم الثانوية الرابعة والتسعون - مسارات بخالص الشكر والتقدير إلى المعلمة";
    body=`تقديرًا لجهودها المتميزة في ${esc(d.reason)} ضمن ${esc(d.occasion)} بتاريخ ${esc(arabicDate(d.date))}`;
    wish="سائلين الله لها دوام التوفيق ومزيدًا من التميز والعطاء";
  }

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
      <div class="cert-final-title">${certTitle}</div>
      <div class="cert-final-workshop">${activityTitle}</div>
      <div class="cert-final-testimony">${testimony}</div>
      <div class="cert-final-name">${esc(d.name)}</div>
      <div class="cert-final-attendance">${body}</div>
      <div class="cert-final-wish">${wish}</div>
    </main>

    <footer class="cert-final-footer">
      <div class="cert-final-principal"><strong>مديرة المدرسة</strong><span>زينب ناصر علي حكمي</span></div>
      <div class="cert-final-stamp"><img src="official-school-stamp.png" alt="الختم الرسمي للمدرسة"></div>
    </footer>`;
}

async function saveIssue(type,data,session){
  const kind=type==="execution"?EXEC_KIND:THANKS_KIND;
  const payload={
    kind,
    data:{
      ...data,
      certificateType:type==="execution"?"شهادة تنفيذ":"شهادة شكر وتقدير",
      issuedAt:new Date().toISOString(),
      issuedBy:session?.user?.email||""
    },
    status:"معتمد",
    updated_at:new Date().toISOString()
  };
  const r=await fetch(RECORDS_ENDPOINT,{
    method:"POST",
    headers:{...authHeaders(session.access_token),"Prefer":"return=representation"},
    body:JSON.stringify(payload)
  });
  if(!r.ok){
    const t=await r.text().catch(()=> "");
    throw new Error(`تعذر حفظ سجل إصدار الشهادة (${r.status}) ${t}`);
  }
  const rows=await r.json();
  return Array.isArray(rows)&&rows[0]?rows[0]:null;
}

function loadScript(src,key){
  return new Promise((resolve,reject)=>{
    if(window[key]) return resolve();
    const s=document.createElement("script");
    s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
  });
}
async function injectLibraries(){
  await loadScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas");
  await loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf");
}
async function waitAssets(root){
  try{if(document.fonts?.ready) await document.fonts.ready}catch(_){}
  await Promise.all([...root.querySelectorAll("img")].map(img=>new Promise(resolve=>{
    if(img.complete&&img.naturalWidth>0) return resolve();
    img.addEventListener("load",resolve,{once:true});
    img.addEventListener("error",resolve,{once:true});
  })));
  await new Promise(resolve=>{
    const bg=new Image();
    bg.onload=bg.onerror=resolve;
    bg.src="manjaz-certificate-background.png";
    if(bg.complete) resolve();
  });
}
async function downloadPDF(type,d){
  const paper=document.getElementById("adminCertificatePaper");
  const msg=document.getElementById("adminCertificateMsg");
  const btn=document.getElementById("adminCertificateDownload");
  if(!paper||!btn) return;
  try{
    btn.disabled=true;
    if(msg) msg.textContent="جارٍ تجهيز الشهادة بصيغة PDF عالية الجودة...";
    await injectLibraries();
    await waitAssets(paper);
    await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
    const rect=paper.getBoundingClientRect();
    const scale=Math.max(3,Math.min(12,4200/Math.max(rect.width,rect.height,1)));
    const canvas=await window.html2canvas(paper,{
      scale,useCORS:true,allowTaint:false,backgroundColor:"#ffffff",logging:false,
      scrollX:-window.scrollX,scrollY:-window.scrollY,
      windowWidth:document.documentElement.clientWidth,
      windowHeight:document.documentElement.clientHeight
    });
    const img=canvas.toDataURL("image/png");
    const {jsPDF}=window.jspdf;
    const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
    const pageW=297,pageH=210,ratio=Math.min(pageW/canvas.width,pageH/canvas.height);
    const imgW=canvas.width*ratio,imgH=canvas.height*ratio;
    pdf.addImage(img,"PNG",(pageW-imgW)/2,(pageH-imgH)/2,imgW,imgH,undefined,"NONE");
    const safe=s=>String(s||"").replace(/[\\/:*?"<>|]+/g,"-").replace(/\s+/g," ").trim();
    pdf.save(`${type==="execution"?"شهادة تنفيذ":"شهادة شكر وتقدير"} - ${safe(d.name)}.pdf`);
    if(msg) msg.textContent="تم تحميل الشهادة بنجاح";
  }catch(err){
    console.error(err);
    if(msg) msg.textContent="تعذر إنشاء PDF، أعيدي المحاولة";
  }finally{btn.disabled=false}
}

async function mountTool(type,session){
  const workspace=document.getElementById("adminCertWorkspace");
  if(!workspace) return;
  workspace.innerHTML=type==="execution"?executionFormHTML():thanksFormHTML();
  workspace.scrollIntoView({behavior:"smooth",block:"start"});

  if(type==="execution"){
    const select=document.getElementById("executionType");
    const wrap=document.getElementById("customExecutionTypeWrap");
    const input=document.getElementById("customExecutionType");
    select.onchange=()=>{
      const custom=select.value==="أخرى";
      wrap.style.display=custom?"block":"none";
      input.required=custom;
      if(!custom) input.value="";
    };
  }

  document.getElementById("cancelAdminCert").onclick=()=>{workspace.innerHTML=""};

  const form=document.getElementById("adminCertificateForm");
  form.onsubmit=async e=>{
    e.preventDefault();
    if(!form.checkValidity()){form.reportValidity();return;}
    const fd=new FormData(form),data={};
    for(const [k,v] of fd.entries()) data[k]=clean(v);
    if(type==="execution" && data.type==="أخرى"){
      data.type=clean(data.customType);
      delete data.customType;
      if(!data.type) return;
    }
    const submit=form.querySelector('button[type="submit"]');
    const msg=document.getElementById("adminCertificateMsg");
    submit.disabled=true;
    msg.textContent="جارٍ حفظ سجل الإصدار سحابيًا...";
    try{
      await saveIssue(type,data,session);
      renderCertificate(type,data);
      document.getElementById("adminCertificatePreview").classList.add("is-visible");
      document.getElementById("adminCertificateDownload").onclick=()=>downloadPDF(type,data);
      msg.textContent="تم حفظ سجل الإصدار في Supabase وإنشاء الشهادة";
      document.getElementById("adminCertificatePreview").scrollIntoView({behavior:"smooth",block:"start"});
    }catch(err){
      console.error(err);
      msg.textContent="تعذر حفظ سجل الإصدار السحابي؛ لم يتم إصدار الشهادة";
    }finally{submit.disabled=false}
  };
}

async function mountLogin(root){
  root.innerHTML=loginHTML();
  const form=document.getElementById("adminLoginForm");
  const msg=document.getElementById("adminAuthMsg");
  form.onsubmit=async e=>{
    e.preventDefault();
    const username=clean(document.getElementById("adminUsername").value);
    const password=document.getElementById("adminPassword").value;
    const btn=form.querySelector('button[type="submit"]');
    btn.disabled=true;msg.textContent="جارٍ التحقق...";
    try{
      await signIn(username,password);
      await renderAdminPermissions();
    }catch(err){
      console.error(err);
      msg.className="error";
      msg.textContent="اسم المستخدم أو كلمة المرور غير صحيحة";
    }finally{btn.disabled=false}
  };

  document.getElementById("forgotPassword").onclick=async()=>{
    const current=clean(document.getElementById("adminUsername").value);
    const email=clean(prompt("أدخلي البريد الإلكتروني المرتبط بالحساب الإداري:",current||""));
    if(!email) return;
    msg.textContent="جارٍ إرسال رابط الاستعادة...";
    try{
      await sendRecovery(email);
      msg.className="success";
      msg.textContent="تم إرسال رابط استعادة كلمة المرور إلى البريد الإلكتروني";
    }catch(err){
      console.error(err);
      msg.className="error";
      msg.textContent="تعذر إرسال رابط الاستعادة";
    }
  };
}

async function mountRecovery(root){
  root.innerHTML=recoveryHTML();
  const form=document.getElementById("adminResetForm");
  const msg=document.getElementById("adminResetMsg");
  let token="";
  try{token=sessionStorage.getItem("manjaz_admin_recovery_token")||""}catch(_){}
  form.onsubmit=async e=>{
    e.preventDefault();
    const p1=document.getElementById("newAdminPassword").value;
    const p2=document.getElementById("confirmAdminPassword").value;
    if(p1!==p2){msg.className="error";msg.textContent="كلمتا المرور غير متطابقتين";return;}
    if(p1.length<8){msg.className="error";msg.textContent="كلمة المرور يجب ألا تقل عن 8 أحرف";return;}
    const btn=form.querySelector('button[type="submit"]');
    btn.disabled=true;msg.textContent="جارٍ تحديث كلمة المرور...";
    try{
      await updateRecoveredPassword(token,p1);
      msg.className="success";
      msg.textContent="تم تحديث كلمة المرور. يمكنك الآن تسجيل الدخول";
      setTimeout(()=>renderAdminPermissions(),600);
    }catch(err){
      console.error(err);
      msg.className="error";
      msg.textContent="تعذر تحديث كلمة المرور أو انتهت صلاحية رابط الاستعادة";
    }finally{btn.disabled=false}
  };
}

async function renderAdminPermissions(){
  if(!isAdminRoute()) return;
  injectStyle();
  const view=document.getElementById("view");
  if(!view) return;

  let recoveryToken="";
  try{recoveryToken=sessionStorage.getItem("manjaz_admin_recovery_token")||""}catch(_){}
  if(recoveryToken){
    const root=document.createElement("div");
    root.id="adminPermissionsRoot";
    view.innerHTML="";
    view.appendChild(root);
    await mountRecovery(root);
    return;
  }

  const s=await validSession();
  const root=document.createElement("div");
  root.id="adminPermissionsRoot";
  view.innerHTML="";
  view.appendChild(root);

  if(!s){
    await mountLogin(root);
    return;
  }

  root.innerHTML=toolsHTML(s);
  document.getElementById("adminLogout").onclick=async()=>{
    await signOut();
    renderAdminPermissions();
  };
  document.getElementById("openExecutionTool").onclick=()=>mountTool("execution",s);
  document.getElementById("openThanksTool").onclick=()=>mountTool("thanks",s);
}

captureRecoveryRedirect();

addEventListener("hashchange",()=>setTimeout(renderAdminPermissions,0));
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",()=>setTimeout(renderAdminPermissions,0),{once:true});
}else setTimeout(renderAdminPermissions,0);

const view=document.getElementById("view");
if(view){
  let timer;
  new MutationObserver(()=>{
    if(!isAdminRoute()) return;
    if(document.getElementById("adminPermissionsRoot")) return;
    clearTimeout(timer);
    timer=setTimeout(renderAdminPermissions,40);
  }).observe(view,{childList:true,subtree:true});
}
})();