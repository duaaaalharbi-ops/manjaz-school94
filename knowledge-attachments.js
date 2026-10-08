/* MANJAZ KNOWLEDGE ATTACHMENTS 2.0
   Knowledge-production section only:
   - external cards show Preview / Edit / Delete
   - first attached image is the card preview
   - attachment controls live only inside Add / Edit
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

function isImage(x){
  return String(x?.mime||"").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(String(x?.name||""));
}

function firstImage(parentId){
  return attachmentsFor(parentId).find(isImage)||null;
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

function injectStyle(){
  if(document.getElementById("knowledgeAttachmentsV2Style")) return;
  const style=document.createElement("style");
  style.id="knowledgeAttachmentsV2Style";
  style.textContent=`
    #communityList .community-card .knowledge-card-cover{height:190px;margin:-1px -1px 14px;border-radius:15px 15px 10px 10px;overflow:hidden;background:#eef2f5;display:flex;align-items:center;justify-content:center}
    #communityList .community-card .knowledge-card-cover img{width:100%;height:100%;object-fit:cover;display:block}
    #communityList .community-card .knowledge-cover-empty{color:#7b8794;font-weight:700}
    #communityList .community-card .knowledge-record-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:14px}
    #communityList .community-card .knowledge-record-actions .btn{margin:0;min-width:0}
    .knowledge-editor-attachments{grid-column:1/-1;border-top:1px solid #e1e6eb;padding-top:14px;margin-top:4px;display:grid;gap:10px}
    .knowledge-editor-list{display:grid;gap:8px}
    .knowledge-editor-upload{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center}
    .knowledge-detail-gallery{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
    .knowledge-detail-gallery img{width:100%;height:150px;object-fit:cover;border-radius:10px;display:block}
    @media(max-width:620px){#communityList .community-card .knowledge-record-actions{grid-template-columns:1fr}.knowledge-editor-upload{grid-template-columns:1fr}}
  `;
  document.head.appendChild(style);
}

function editorHTML(parentId){
  const rows=attachmentsFor(parentId);
  return `<section class="knowledge-editor-attachments" data-parent-id="${esc(parentId)}">
    <strong>مرفقات الإنتاج المعرفي</strong>
    <div class="knowledge-editor-list">${rows.length?rows.map(attachmentRow).join(""):'<div class="empty-inline">لا توجد مرفقات حتى الآن</div>'}</div>
    <div class="knowledge-editor-upload">
      <input class="knowledge-file-input" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx">
      <button type="button" class="btn btn-primary knowledge-upload-btn">إضافة مرفق</button>
    </div>
    <div class="knowledge-attachment-msg"></div>
  </section>`;
}

function bindEditor(section){
  if(!section||section.dataset.ready==="1") return;
  section.dataset.ready="1";
  const parentId=section.dataset.parentId;
  const input=section.querySelector(".knowledge-file-input");
  const upload=section.querySelector(".knowledge-upload-btn");
  const msg=section.querySelector(".knowledge-attachment-msg");
  upload.onclick=async()=>{
    const files=Array.from(input.files||[]);
    if(!files.length){msg.textContent="اختاري مرفقًا واحدًا على الأقل";return;}
    upload.disabled=true;input.disabled=true;
    try{
      for(let i=0;i<files.length;i++){
        msg.textContent=`جارٍ رفع ${i+1} من ${files.length}...`;
        await uploadFile(parentId,files[i]);
      }
      msg.textContent="تمت إضافة المرفقات";
      input.value="";
      refreshEditor(section);
      enhanceCards();
    }catch(err){console.error(err);msg.textContent="تعذر رفع بعض المرفقات"}
    finally{upload.disabled=false;input.disabled=false}
  };
  section.addEventListener("click",async e=>{
    const btn=e.target.closest(".knowledge-delete-attachment");
    if(!btn)return;
    const record=allAttachments.find(x=>String(x.id)===String(btn.dataset.id));
    if(!record)return;
    btn.disabled=true;
    try{await deleteAttachment(record);refreshEditor(section);enhanceCards()}
    catch(err){console.error(err);alert("تعذر حذف المرفق")}
  });
}

function refreshEditor(section){
  const holder=document.createElement("div");
  holder.innerHTML=editorHTML(section.dataset.parentId);
  const fresh=holder.firstElementChild;
  section.replaceWith(fresh);
  bindEditor(fresh);
}

function knowledgeRecords(){
  try{return JSON.parse(localStorage.getItem("manjaz_public_section_submissions_v1")||"[]").filter(x=>x&&x.kind==="knowledge"&&!x._deletedBase)}catch(_){return[]}
}

function enhanceAddForm(){
  const form=document.getElementById("communityForm");
  if(!form||form.dataset.knowledgeAttachments==="1")return;
  form.dataset.knowledgeAttachments="1";
  const grid=form.querySelector(".form-grid");
  if(!grid)return;
  const wrap=document.createElement("label");
  wrap.className="wide";
  wrap.innerHTML=`إضافة المرفقات<input class="knowledge-add-files" type="file" multiple accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx"><small>ستظهر أول صورة تلقائيًا في معاينة البطاقة</small>`;
  grid.appendChild(wrap);
  form.addEventListener("submit",()=>{
    const files=Array.from(form.querySelector(".knowledge-add-files")?.files||[]);
    if(!files.length)return;
    const before=new Set(knowledgeRecords().map(x=>String(x.id)));
    setTimeout(async()=>{
      const created=knowledgeRecords().filter(x=>!before.has(String(x.id))).sort((a,b)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")))[0];
      if(!created)return;
      try{for(const file of files)await uploadFile(created.id,file);setTimeout(enhanceCards,80)}
      catch(err){console.error(err);alert("تم حفظ الإنتاج المعرفي، لكن تعذر رفع بعض المرفقات")}
    },40);
  },true);
}

let activeParentId="";

function enhanceEditOverlay(){
  const overlay=document.getElementById("communityEditOverlay");
  const form=overlay?.querySelector("#communityEditForm");
  if(!form||!overlay.classList.contains("open")||!activeParentId)return;
  let section=form.querySelector(".knowledge-editor-attachments");
  if(!section){form.querySelector(".form-grid")?.insertAdjacentHTML("beforeend",editorHTML(activeParentId));section=form.querySelector(".knowledge-editor-attachments")}
  bindEditor(section);
}

function enhanceDetailOverlay(){
  const overlay=document.getElementById("communityDetail");
  const panel=overlay?.querySelector(".panel");
  if(!panel||overlay.style.display==="none"||!activeParentId)return;
  const current=overlay.querySelector(".knowledge-detail-attachments");
  if(current?.dataset.parentId===String(activeParentId))return;
  current?.remove();
  const rows=attachmentsFor(activeParentId),images=rows.filter(isImage),docs=rows.filter(x=>!isImage(x));
  panel.insertAdjacentHTML("beforeend",`<section class="knowledge-detail-attachments" data-parent-id="${esc(activeParentId)}" style="display:grid;gap:12px;margin-top:18px">
    <h3>المرفقات</h3>
    ${images.length?`<div class="knowledge-detail-gallery">${images.map(x=>`<a href="${esc(x.url)}" target="_blank" rel="noopener"><img src="${esc(x.url)}" alt="${esc(x.name)}"></a>`).join("")}</div>`:""}
    ${docs.length?`<div style="display:grid;gap:8px">${docs.map(x=>`<a class="file-link" href="${esc(x.url)}" target="_blank" rel="noopener"><span>${esc(x.name)}</span><strong>فتح المرفق</strong></a>`).join("")}</div>`:""}
    ${rows.length?"":'<div class="empty-inline">لا توجد مرفقات</div>'}
  </section>`);
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
    const parentId=card.dataset.id;
    if(!parentId) return;
    card.querySelector(".knowledge-attachments-block")?.remove();
    let cover=card.querySelector(".knowledge-card-cover");
    if(!cover){cover=document.createElement("div");cover.className="knowledge-card-cover";card.prepend(cover)}
    const image=firstImage(parentId);
    cover.innerHTML=image?`<img src="${esc(image.url)}" alt="معاينة الإنتاج المعرفي">`:'<span class="knowledge-cover-empty">لا توجد صورة مرفقة</span>';

    const view=card.querySelector(".c-view"),edit=card.querySelector(".c-edit"),del=card.querySelector(".c-delete");
    if(view)view.textContent="استعراض";
    if(edit)edit.textContent="تعديل";
    if(del)del.textContent="حذف";
    let actions=card.querySelector(".knowledge-record-actions");
    if(!actions){actions=document.createElement("div");actions.className="knowledge-record-actions";card.appendChild(actions)}
    [view,edit,del].filter(Boolean).forEach(btn=>{if(btn.parentElement!==actions)actions.appendChild(btn)});
    [...card.querySelectorAll(":scope > .form-actions,:scope > .community-manage-actions")].forEach(x=>{if(!x.children.length)x.remove()});
    if(view&&view.dataset.knowledgeHook!=="1"){view.dataset.knowledgeHook="1";view.addEventListener("click",()=>{activeParentId=parentId;setTimeout(enhanceDetailOverlay,0)})}
    if(edit&&edit.dataset.knowledgeHook!=="1"){edit.dataset.knowledgeHook="1";edit.addEventListener("click",()=>{activeParentId=parentId;setTimeout(enhanceEditOverlay,0)})}
  });
  enhanceAddForm();
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
  timer=setTimeout(()=>{enhanceCards();enhanceEditOverlay();enhanceDetailOverlay()},70);
  }).observe(view,{childList:true,subtree:true});
}
injectStyle();
})();
