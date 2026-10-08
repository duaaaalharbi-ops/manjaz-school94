/* MANJAZ TALENT LINKS 1.0 — cloud-only */
(()=>{"use strict";

const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
const HEADERS={
  "apikey":SUPABASE_KEY,
  "Authorization":`Bearer ${SUPABASE_KEY}`,
  "Content-Type":"application/json"
};
const KIND="talent_work_link";

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const isTalent=()=>((location.hash||"").slice(1)==="talent");
let items=[];

async function fetchItems(){
  const p=new URLSearchParams({
    select:"id,kind,data,status,created_at,updated_at",
    kind:`eq.${KIND}`,
    order:"created_at.desc"
  });
  const r=await fetch(`${ENDPOINT}?${p.toString()}`,{headers:HEADERS,cache:"no-store"});
  if(!r.ok) throw new Error(`تعذر تحميل أعمال الموهبة (${r.status})`);
  const rows=await r.json();
  items=Array.isArray(rows)?rows.map(row=>({
    id:String(row.id),
    title:row.data?.title||"",
    description:row.data?.description||"",
    url:row.data?.url||"",
    createdAt:row.data?.createdAt||row.created_at||""
  })):[];
  return items;
}

async function addItem(title,description,url){
  const payload={
    kind:KIND,
    data:{title,description,url,createdAt:new Date().toISOString()},
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
    throw new Error(`تعذر حفظ العمل (${r.status}) ${t}`);
  }
}

async function updateItem(id,title,description,url,createdAt){
  const p=new URLSearchParams({id:`eq.${id}`,kind:`eq.${KIND}`});
  const payload={
    data:{title,description,url,createdAt:createdAt||new Date().toISOString()},
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
    throw new Error(`تعذر تعديل العمل (${r.status}) ${t}`);
  }
}

async function deleteItem(id){
  const p=new URLSearchParams({id:`eq.${id}`,kind:`eq.${KIND}`});
  const r=await fetch(`${ENDPOINT}?${p.toString()}`,{
    method:"DELETE",
    headers:{...HEADERS,"Prefer":"return=minimal"}
  });
  if(!r.ok){
    const t=await r.text().catch(()=> "");
    throw new Error(`تعذر حذف العمل (${r.status}) ${t}`);
  }
}

function validUrl(v){
  try{
    const u=new URL(v);
    return u.protocol==="https:" || u.protocol==="http:";
  }catch(_){ return false; }
}

function pageShell(){
  return `
    <section class="page-intro">
      <div>
        <span class="kicker">الموهبة</span>
        <h2>الموهبة</h2>
        <p>استعراض أعمال الموهبة وإضافة روابط الأعمال</p>
      </div>
    </section>

    <div class="section-actions">
      <button type="button" class="btn btn-primary" id="talentShowAdd">إضافة رابط عمل</button>
    </div>

    <form id="talentForm" class="surface form-card" style="display:none">
      <input type="hidden" id="talentId">
      <div class="form-section-title" id="talentFormTitle">إضافة عمل</div>
      <div class="form-grid">
        <label>اسم العمل *
          <input id="talentTitle" required>
        </label>
        <label class="wide">وصف مختصر
          <textarea id="talentDescription"></textarea>
        </label>
        <label class="wide">رابط عرض العمل *
          <input id="talentUrl" type="url" placeholder="https://" required>
        </label>
      </div>
      <div class="form-actions">
        <button class="btn btn-primary" type="submit" id="talentSubmit">حفظ</button>
        <button class="btn btn-ghost" type="button" id="talentCancel">إلغاء</button>
      </div>
      <div id="talentMsg"></div>
    </form>

    <div id="talentList" class="achievement-list"></div>
    <div id="talentEmpty" class="surface empty-state" style="display:none">
      <div class="empty-mark">✦</div>
      <h3>لا توجد أعمال مضافة حتى الآن</h3>
      <p>أضيفي أول رابط لعرض أعمال الموهبة</p>
    </div>`;
}

function draw(){
  const list=document.getElementById("talentList");
  const empty=document.getElementById("talentEmpty");
  if(!list||!empty) return;
  list.innerHTML="";
  empty.style.display=items.length?"none":"block";

  items.forEach(x=>{
    const card=document.createElement("article");
    card.className="achievement-card";
    card.innerHTML=`
      <span class="badge">عمل موهبة</span>
      <h3>${esc(x.title||"عمل بدون عنوان")}</h3>
      ${x.description?`<p>${esc(x.description)}</p>`:""}
      <div class="record-actions-grid">
        <a class="details-btn" href="${esc(x.url)}" target="_blank" rel="noopener">عرض العمل</a>
        <button type="button" class="record-edit-btn talent-edit" data-id="${esc(x.id)}">تعديل</button>
        <button type="button" class="record-delete-btn talent-delete" data-id="${esc(x.id)}">حذف</button>
      </div>`;
    list.appendChild(card);
  });

  list.querySelectorAll(".talent-edit").forEach(btn=>btn.onclick=()=>{
    const x=items.find(v=>String(v.id)===String(btn.dataset.id));
    if(!x) return;
    document.getElementById("talentId").value=x.id;
    document.getElementById("talentTitle").value=x.title||"";
    document.getElementById("talentDescription").value=x.description||"";
    document.getElementById("talentUrl").value=x.url||"";
    document.getElementById("talentFormTitle").textContent="تعديل العمل";
    document.getElementById("talentSubmit").textContent="حفظ التعديل";
    document.getElementById("talentForm").style.display="block";
    document.getElementById("talentTitle").focus();
  });

  list.querySelectorAll(".talent-delete").forEach(btn=>btn.onclick=async()=>{
    const x=items.find(v=>String(v.id)===String(btn.dataset.id));
    if(!x) return;
    if(!confirm(`هل تريدين حذف «${x.title||"هذا العمل"}»؟`)) return;
    btn.disabled=true;
    try{
      await deleteItem(x.id);
      await fetchItems();
      draw();
    }catch(err){
      console.error(err);
      alert("تعذر حذف العمل، أعيدي المحاولة");
      btn.disabled=false;
    }
  });
}

async function renderTalent(){
  if(!isTalent()) return;
  const view=document.getElementById("view");
  if(!view) return;
  view.innerHTML=pageShell();

  const form=document.getElementById("talentForm");
  const show=document.getElementById("talentShowAdd");
  const cancel=document.getElementById("talentCancel");
  const id=document.getElementById("talentId");
  const title=document.getElementById("talentTitle");
  const desc=document.getElementById("talentDescription");
  const url=document.getElementById("talentUrl");
  const msg=document.getElementById("talentMsg");
  const formTitle=document.getElementById("talentFormTitle");
  const submit=document.getElementById("talentSubmit");

  function reset(){
    form.reset();
    id.value="";
    formTitle.textContent="إضافة عمل";
    submit.textContent="حفظ";
    msg.textContent="";
  }

  show.onclick=()=>{
    reset();
    form.style.display="block";
    title.focus();
  };
  cancel.onclick=()=>{
    reset();
    form.style.display="none";
  };

  form.onsubmit=async e=>{
    e.preventDefault();
    const recordId=clean(id.value);
    const t=clean(title.value);
    const d=clean(desc.value);
    const u=clean(url.value);
    if(!t){title.focus();return;}
    if(!validUrl(u)){
      msg.className="error";
      msg.textContent="أدخلي رابطًا صحيحًا لعرض العمل";
      url.focus();
      return;
    }
    submit.disabled=true;
    msg.className="";
    msg.textContent=recordId?"جارٍ حفظ التعديل...":"جارٍ حفظ العمل...";
    try{
      if(recordId){
        const old=items.find(x=>String(x.id)===String(recordId));
        await updateItem(recordId,t,d,u,old?.createdAt||"");
      }else{
        await addItem(t,d,u);
      }
      await fetchItems();
      reset();
      form.style.display="none";
      draw();
    }catch(err){
      console.error(err);
      msg.className="error";
      msg.textContent=recordId?"تعذر حفظ التعديل":"تعذر حفظ العمل";
    }finally{
      submit.disabled=false;
    }
  };

  try{
    await fetchItems();
    draw();
  }catch(err){
    console.error(err);
    msg.className="error";
    msg.textContent="تعذر تحميل أعمال الموهبة حاليًا";
    items=[];
    draw();
  }

  let openAdd=false;
  try{openAdd=sessionStorage.getItem("manjaz_home_open_add")==="talent"}catch(_){}
  if(openAdd){
    try{sessionStorage.removeItem("manjaz_home_open_add")}catch(_){}
    show.click();
  }
}

addEventListener("hashchange",()=>setTimeout(renderTalent,0));
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",()=>setTimeout(renderTalent,0),{once:true});
}else{
  setTimeout(renderTalent,0);
}

/* If app.js redraws the view after its cloud sync, restore the talent page only. */
const view=document.getElementById("view");
if(view){
  let timer;
  new MutationObserver(()=>{
    if(!isTalent()) return;
    if(document.getElementById("talentList")) return;
    clearTimeout(timer);
    timer=setTimeout(renderTalent,40);
  }).observe(view,{childList:true,subtree:true});
}
})();