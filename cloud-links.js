/* MANJAZ CLOUD LINKS 1.0 — Google Drive links only */
(()=>{"use strict";

const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
const HEADERS={
  "apikey":SUPABASE_KEY,
  "Authorization":`Bearer ${SUPABASE_KEY}`,
  "Content-Type":"application/json"
};

const SECTIONS={
  "cloud-activity":{
    title:"الحوسبة السحابية | منجزات النشاط",
    kind:"cloud_activity",
    empty:"لا توجد روابط منجزات نشاط مضافة حتى الآن"
  },
  "cloud-portfolios":{
    title:"الحوسبة السحابية | ملفات الإنجاز",
    kind:"cloud_portfolios",
    empty:"لا توجد روابط ملفات إنجاز مضافة حتى الآن"
  }
};

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const currentRoute=()=>(location.hash||"#home").slice(1);

function validDriveUrl(value){
  try{
    const u=new URL(value);
    return u.protocol==="https:" && (
      u.hostname==="drive.google.com" ||
      u.hostname==="docs.google.com"
    );
  }catch(_){ return false; }
}

async function fetchLinks(kind){
  const p=new URLSearchParams({
    select:"id,kind,data,status,created_at,updated_at",
    kind:`eq.${kind}`,
    order:"created_at.desc"
  });
  const r=await fetch(`${ENDPOINT}?${p.toString()}`,{headers:HEADERS});
  if(!r.ok) throw new Error(`تعذر قراءة الروابط (${r.status})`);
  const rows=await r.json();
  return Array.isArray(rows)?rows.map(row=>({
    id:String(row.id),
    title:row.data?.title||"",
    url:row.data?.url||"",
    createdAt:row.created_at||""
  })):[];
}

async function addLink(kind,title,url){
  const payload={
    kind,
    data:{title,url,createdAt:new Date().toISOString()},
    status:"معتمد",
    updated_at:new Date().toISOString()
  };
  const r=await fetch(ENDPOINT,{
    method:"POST",
    headers:{...HEADERS,"Prefer":"return=representation"},
    body:JSON.stringify(payload)
  });
  if(!r.ok){
    const t=await r.text().catch(()=> "");
    throw new Error(`تعذر حفظ الرابط (${r.status}) ${t}`);
  }
  return true;
}

function pageShell(section){
  return `
    <section class="page-intro">
      <div>
        <span class="kicker">الحوسبة السحابية</span>
        <h2>${esc(section.title)}</h2>
        <p>روابط Google Drive المعتمدة للقسم</p>
      </div>
    </section>

    <div class="section-actions">
      <button type="button" class="btn btn-primary" id="cloudShowAdd">إضافة منجز الرابط</button>
    </div>

    <form id="cloudLinkForm" class="surface form-card" style="display:none">
      <div class="form-section-title">إضافة منجز الرابط</div>
      <div class="form-grid">
        <label>اسم المنجز *
          <input id="cloudLinkTitle" required>
        </label>
        <label class="wide">رابط Google Drive *
          <input id="cloudLinkUrl" type="url" placeholder="https://drive.google.com/..." required>
        </label>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit">حفظ الرابط</button>
        <button class="btn btn-ghost" type="button" id="cloudCancelAdd">إلغاء</button>
      </div>
      <div id="cloudMsg"></div>
    </form>

    <div id="cloudLinksList" class="achievement-list"></div>
    <div id="cloudLinksEmpty" class="surface empty-state" style="display:none">
      <div class="empty-mark">☁</div>
      <h3>${esc(section.empty)}</h3>
    </div>`;
}

function renderCards(items){
  const list=document.getElementById("cloudLinksList");
  const empty=document.getElementById("cloudLinksEmpty");
  if(!list||!empty) return;
  list.innerHTML="";
  empty.style.display=items.length?"none":"block";
  items.forEach(x=>{
    const card=document.createElement("article");
    card.className="achievement-card";
    card.innerHTML=`
      <span class="badge">Google Drive</span>
      <h3>${esc(x.title||"رابط بدون عنوان")}</h3>
      <div class="form-actions">
        <a class="btn btn-primary" href="${esc(x.url)}" target="_blank" rel="noopener">فتح الرابط</a>
      </div>`;
    list.appendChild(card);
  });
}

async function renderCloudPage(){
  const route=currentRoute(),section=SECTIONS[route];
  if(!section) return;
  const view=document.getElementById("view");
  if(!view) return;

  view.innerHTML=pageShell(section);

  const form=document.getElementById("cloudLinkForm");
  const show=document.getElementById("cloudShowAdd");
  const cancel=document.getElementById("cloudCancelAdd");
  const title=document.getElementById("cloudLinkTitle");
  const url=document.getElementById("cloudLinkUrl");
  const msg=document.getElementById("cloudMsg");

  show.onclick=()=>{
    form.style.display="block";
    form.reset();
    msg.textContent="";
    title.focus();
  };
  cancel.onclick=()=>{
    form.reset();
    form.style.display="none";
    msg.textContent="";
  };

  form.onsubmit=async e=>{
    e.preventDefault();
    const t=clean(title.value),u=clean(url.value);
    if(!t){title.focus();return;}
    if(!validDriveUrl(u)){
      msg.className="error";
      msg.textContent="أدخلي رابط Google Drive صحيحًا";
      url.focus();
      return;
    }
    const submit=form.querySelector('button[type="submit"]');
    submit.disabled=true;
    msg.className="";
    msg.textContent="جارٍ حفظ الرابط...";
    try{
      await addLink(section.kind,t,u);
      form.reset();
      form.style.display="none";
      msg.className="success";
      msg.textContent="تم حفظ الرابط بنجاح";
      renderCards(await fetchLinks(section.kind));
    }catch(err){
      console.error(err);
      msg.className="error";
      msg.textContent="تعذر حفظ الرابط، أعيدي المحاولة";
    }finally{
      submit.disabled=false;
    }
  };

  try{
    renderCards(await fetchLinks(section.kind));
  }catch(err){
    console.error(err);
    msg.className="error";
    msg.textContent="تعذر تحميل الروابط حاليًا";
    renderCards([]);
  }
}

addEventListener("hashchange",()=>setTimeout(renderCloudPage,0));
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",()=>setTimeout(renderCloudPage,0),{once:true});
}else{
  setTimeout(renderCloudPage,0);
}
})();