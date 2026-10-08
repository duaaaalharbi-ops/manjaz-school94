/* MANJAZ KNOWLEDGE ATTACHMENTS 1.0
   Adds cumulative Supabase attachments to "نماذج الإنتاج المعرفي" cards only.
   Does not modify the existing knowledge records or their current storage.
*/
(()=>{"use strict";

const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const RECORDS_ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
const BUCKET="manjaz-media";
const KIND="knowledge_attachment";

const HEADERS={
  "apikey":SUPABASE_KEY,
  "Authorization":`Bearer ${SUPABASE_KEY}`,
  "Content-Type":"application/json"
};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const clean=s=>String(s||"").trim();
const isKnowledge=()=>((location.hash||"").slice(1)==="knowledge");

let allAttachments=[];
let loadingPromise=null;

function safeName(name){
  const raw=String(name||"file").replace(/[^\p{L}\p{N}._-]+/gu,"-").replace(/-+/g,"-");
  return raw.slice(0,120)||"file";
}

async function fetchAllAttachments(){
  if(loadingPromise) return loadingPromise;
  loadingPromise=(async()=>{
    const p=new URLSearchParams({
      select:"id,kind,data,status,created_at,updated_at",
      kind:`eq.${KIND}`,
      order:"created_at.asc"
    });
    const r=await fetch(`${RECORDS_ENDPOINT}?${p.toString()}`,{headers:HEADERS,cache:"no-store"});
    if(!r.ok) throw new Error(`تعذر تحميل مرفقات الإنتاج المعرفي (${r.status})`);
    const rows=await r.json();
    allAttachments=(Array.isArray(rows)?rows:[]).map(row=>({
      id:String(row.id),
      parentId:String(row.data?.parentId||""),
      name:row.data?.name||"ملف",
      path:row.data?.path||"",
      url:row.data?.url||"",
      mime:row.data?.mime||"",
      size:Number(row.data?.size||0),
      createdAt:row.data?.createdAt||row.created_at||""
    }));
    return allAttachments;
  })().finally(()=>{loadingPromise=null});
  return loadingPromise;
}

function attachmentsFor(parentId){
  return allAttachments.filter(x=>String(x.parentId)===String(parentId));
}

async function uploadFile(parentId,file){
  const stamp=`${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  const name=safeName(file.name);
  const path=`knowledge/${encodeURIComponent(String(parentId))}/${stamp}-${name}`;
  const storageUrl=`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const r=await fetch(storageUrl,{
    method:"POST",
    headers:{
      "apikey":SUPABASE_KEY,
      "Authorization":`Bearer ${SUPABASE_KEY}`,
      "Content-Type":file.type||"application/octet-stream",
      "x-upsert":"false"
    },
    body:file
  });
  if(!r.ok){
    const t=await r.text().catch(()=> "");
    throw new Error(`فشل رفع ${file.name}: ${r.status} ${t}`);
  }
  const publicUrl=`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  const payload={
    kind:KIND,
    data:{
      parentId:String(parentId),
      name:file.name||name,
      path,
      url:publicUrl,
      mime:file.type||"application/octet-stream",
      size:Number(file.size||0),
      createdAt:new Date().toISOString()
    },
    status:"معتمد",
    updated_at:new Date().toISOString()
  };
  const rr=await fetch(RECORDS_ENDPOINT,{
    method:"POST",
    headers:{...HEADERS,"Prefer":"return=representation"},
    body:JSON.stringify(payload)
  });
  if(!rr.ok){
    const t=await rr.text().catch(()=> "");
    try{await deleteStoragePath(path)}catch(_){}
    throw new Error(`تعذر حفظ سجل المرفق (${rr.status}) ${t}`);
  }
  const rows=await rr.json();
  const row=Array.isArray(rows)&&rows[0]?rows[0]:null;
  if(row){
    allAttachments.push({
      id:String(row.id),
      parentId:String(parentId),
      name:file.name||name,
      path,
      url:publicUrl,
      mime:file.type||"application/octet-stream",
      size:Number(file.size||0),
      createdAt:payload.data.createdAt
    });
  }
}

async function deleteStoragePath(path){
  if(!path) return;
  const url=`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;
  const r=await fetch(url,{
    method:"DELETE",
    headers:{
      "apikey":SUPABASE_KEY,
      "Authorization":`Bearer ${SUPABASE_KEY}`
    }
  });
  if(!r.ok) console.warn("تعذر حذف الملف الفعلي من التخزين:",path,r.status);
}

async function deleteAttachment(record){
  if(!record?.id) return;
  const ok=confirm(`حذف المرفق «${record.name||"ملف"}» فقط؟`);
  if(!ok) return;

  const p=new URLSearchParams({id:`eq.${record.id}`,kind:`eq.${KIND}`});
  const r=await fetch(`${RECORDS_ENDPOINT}?${p.toString()}`,{
    method:"DELETE",
    headers:{...HEADERS,"Prefer":"return=minimal"}
  });
  if(!r.ok){
    const t=await r.text().catch(()=> "");
    throw new Error(`تعذر حذف سجل المرفق (${r.status}) ${t}`);
  }

  // حذف الرابط من السجل تم أولًا. فشل حذف الملف الفعلي لا يعيد ربطه بالبطاقة.
  try{await deleteStoragePath(record.path)}catch(_){}
  allAttachments=allAttachments.filter(x=>String(x.id)!==String(record.id));
}

function attachmentRow(x){
  return `<div class="knowledge-attachment-row" data-attachment-id="${esc(x.id)}" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center">
    <a class="file-link" href="${esc(x.url)}" target="_blank" rel="noopener">
      <span>${esc(x.name)}</span><strong>فتح المرفق</strong>
    </a>
    <button type="button" class="btn btn-ghost knowledge-delete-attachment" data-id="${esc(x.id)}">حذف</button>
  </div>`;
}

function blockHTML(parentId){
  const rows=attachmentsFor(parentId);
  return `<div class="knowledge-attachments-block" data-parent-id="${esc(parentId)}" style="margin-top:14px;padding-top:12px;border-top:1px solid #e1e6eb">
    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <strong>مرفقات الإنتاج</strong>
      <span class="badge">${rows.length} مرفق</span>
    </div>
    <div class="knowledge-attachments-list" style="display:grid;gap:8px">
      ${rows.length?rows.map(attachmentRow).join(""):'<div class="empty-inline">لا توجد مرفقات حتى الآن</div>'}
    </div>
    <div style="display:grid;gap:8px;margin-top:12px">
      <input class="knowledge-file-input" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx">
      <button type="button" class="btn btn-primary knowledge-upload-btn">إضافة المرفقات</button>
      <div class="knowledge-attachment-msg"></div>
    </div>
  </div>`;
}

function bindBlock(block){
  if(!block||block.dataset.ready==="1") return;
  block.dataset.ready="1";
  const parentId=block.dataset.parentId;
  const input=block.querySelector(".knowledge-file-input");
  const upload=block.querySelector(".knowledge-upload-btn");
  const msg=block.querySelector(".knowledge-attachment-msg");

  upload.onclick=async()=>{
    const files=Array.from(input.files||[]);
    if(!files.length){msg.textContent="اختاري مرفقًا واحدًا على الأقل";return;}
    upload.disabled=true;
    input.disabled=true;
    let done=0;
    msg.textContent=`جارٍ رفع 0 من ${files.length}...`;
    try{
      for(const file of files){
        await uploadFile(parentId,file);
        done++;
        msg.textContent=`جارٍ رفع ${done} من ${files.length}...`;
      }
      input.value="";
      msg.textContent="تمت إضافة المرفقات إلى البطاقة";
      renderBlock(block);
    }catch(err){
      console.error(err);
      msg.textContent="تعذر رفع بعض المرفقات، ولم يتم حذف المرفقات السابقة";
      renderBlock(block);
    }finally{
      upload.disabled=false;
      input.disabled=false;
    }
  };

  block.addEventListener("click",async e=>{
    const btn=e.target.closest(".knowledge-delete-attachment");
    if(!btn) return;
    const record=allAttachments.find(x=>String(x.id)===String(btn.dataset.id));
    if(!record) return;
    btn.disabled=true;
    const old=btn.textContent;
    btn.textContent="جارٍ الحذف...";
    try{
      await deleteAttachment(record);
      renderBlock(block);
    }catch(err){
      console.error(err);
      alert("تعذر حذف المرفق. لم يتم حذف أي مرفق آخر");
      btn.disabled=false;
      btn.textContent=old;
    }
  });
}

function renderBlock(block){
  if(!block) return;
  const parentId=block.dataset.parentId;
  const wrapper=document.createElement("div");
  wrapper.innerHTML=blockHTML(parentId);
  const fresh=wrapper.firstElementChild;
  block.replaceWith(fresh);
  bindBlock(fresh);
}

async function enhanceCards(){
  if(!isKnowledge()) return;
  const cards=[...document.querySelectorAll("#communityList .community-card")];
  if(!cards.length) return;

  try{await fetchAllAttachments()}catch(err){
    console.error(err);
    return;
  }

  cards.forEach(card=>{
    if(card.querySelector(".knowledge-attachments-block")) return;
    const parentId=card.dataset.id;
    if(!parentId) return;
    card.insertAdjacentHTML("beforeend",blockHTML(parentId));
    bindBlock(card.querySelector(".knowledge-attachments-block"));
  });
}

function schedule(){
  if(!isKnowledge()) return;
  setTimeout(enhanceCards,60);
}

addEventListener("hashchange",schedule);
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",schedule,{once:true});
}else schedule();

const view=document.getElementById("view");
if(view){
  let timer;
  new MutationObserver(()=>{
    if(!isKnowledge()) return;
    clearTimeout(timer);
    timer=setTimeout(enhanceCards,70);
  }).observe(view,{childList:true,subtree:true});
}
})();