/* MANJAZ CLOUD LINKS 1.1 — Google Drive links only + edit/delete */
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
let currentItems=[];

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

async function updateLink(id,kind,title,url,createdAt){
  const p=new URLSearchParams({id:`eq.${id}`,kind:`eq.${kind}`});
  const payload={
    data:{title,url,createdAt:createdAt||new Date().toISOString()},
    status:"معتمد",
    updated_at:new Date().toISOString()
  };
  const r=await fetch(`${ENDPOINT}?${p.toString()}`,{
    method:"PATCH",
    headers:{...HEADERS,"Prefer":"return=representation"},
    body:JSON.stringify(payload)
  });
  if(!r.ok){
    const t=await r.text().catch(()=> "");
    throw new Error(`تعذر تعديل الرابط (${r.status}) ${t}`);
  }
  return true;
}

async function deleteLink(id,kind){
  const p=new URLSearchParams({id:`eq.${id}`,kind:`eq.${kind}`});
  const r=await fetch(`${ENDPOINT}?${p.toString()}`,{
    method:"DELETE",
    headers:{...HEADERS,"Prefer":"return=minimal"}
  });
  if(!r.ok){
    const t=await r.text().catch(()=> "");
    throw new Error(`تعذر حذف الرابط (${r.status}) ${t}`);
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
      <input type="hidden" id="cloudLinkId">
      <div class="form-section-title" id="cloudFormTitle">إضافة منجز الرابط</div>
      <div class="form-grid">
        <label>اسم المنجز *
          <input id="cloudLinkTitle" required>
        </label>
        <label class="wide">رابط Google Drive *
          <input id="cloudLinkUrl" type="url" placeholder="https://drive.google.com/..." required>
        </label>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" id="cloudSubmitBtn">حفظ الرابط</button>
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

function renderCards(items,section){
  currentItems=items;
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
        <button type="button" class="btn btn-ghost cloud-edit" data-id="${esc(x.id)}">تعديل</button>
        <button type="button" class="btn btn-ghost cloud-delete" data-id="${esc(x.id)}">حذف</button>
      </div>`;
    list.appendChild(card);
  });

  list.querySelectorAll(".cloud-edit").forEach(btn=>{
    btn.onclick=()=>{
      const x=currentItems.find(r=>String(r.id)===String(btn.dataset.id));
      if(!x) return;
      const form=document.getElementById("cloudLinkForm");
      document.getElementById("cloudLinkId").value=x.id;
      document.getElementById("cloudLinkTitle").value=x.title||"";
      document.getElementById("cloudLinkUrl").value=x.url||"";
      document.getElementById("cloudFormTitle").textContent="تعديل منجز الرابط";
      document.getElementById("cloudSubmitBtn").textContent="حفظ التعديل";
      document.getElementById("cloudMsg").textContent="";
      form.style.display="block";
      document.getElementById("cloudLinkTitle").focus();
      form.scrollIntoView({behavior:"smooth",block:"start"});
    };
  });

  list.querySelectorAll(".cloud-delete").forEach(btn=>{
    btn.onclick=async()=>{
      const x=currentItems.find(r=>String(r.id)===String(btn.dataset.id));
      if(!x) return;
      if(!confirm(`هل تريدين حذف «${x.title||"هذا الرابط"}»؟`)) return;
      btn.disabled=true;
      try{
        await deleteLink(x.id,section.kind);
        renderCards(await fetchLinks(section.kind),section);
      }catch(err){
        console.error(err);
        alert("تعذر حذف الرابط، أعيدي المحاولة");
      }finally{
        btn.disabled=false;
      }
    };
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
  const id=document.getElementById("cloudLinkId");
  const title=document.getElementById("cloudLinkTitle");
  const url=document.getElementById("cloudLinkUrl");
  const msg=document.getElementById("cloudMsg");
  const formTitle=document.getElementById("cloudFormTitle");
  const submitBtn=document.getElementById("cloudSubmitBtn");

  function resetForm(){
    form.reset();
    id.value="";
    formTitle.textContent="إضافة منجز الرابط";
    submitBtn.textContent="حفظ الرابط";
    msg.textContent="";
  }

  show.onclick=()=>{
    form.style.display="block";
    resetForm();
    title.focus();
  };
  cancel.onclick=()=>{
    resetForm();
    form.style.display="none";
  };

  form.onsubmit=async e=>{
    e.preventDefault();
    const recordId=clean(id.value);
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
    msg.textContent=recordId?"جارٍ حفظ التعديل...":"جارٍ حفظ الرابط...";
    try{
      if(recordId){
        const old=currentItems.find(x=>String(x.id)===String(recordId));
        await updateLink(recordId,section.kind,t,u,old?.createdAt||"");
      }else{
        await addLink(section.kind,t,u);
      }
      resetForm();
      form.style.display="none";
      renderCards(await fetchLinks(section.kind),section);
    }catch(err){
      console.error(err);
      msg.className="error";
      msg.textContent=recordId?"تعذر حفظ التعديل، أعيدي المحاولة":"تعذر حفظ الرابط، أعيدي المحاولة";
    }finally{
      submit.disabled=false;
    }
  };

  try{
    renderCards(await fetchLinks(section.kind),section);
  }catch(err){
    console.error(err);
    msg.className="error";
    msg.textContent="تعذر تحميل الروابط حاليًا";
    renderCards([],section);
  }
}

addEventListener("hashchange",()=>setTimeout(renderCloudPage,0));
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",()=>setTimeout(renderCloudPage,0),{once:true});
}else{
  setTimeout(renderCloudPage,0);
}
})();