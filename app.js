const STORE = "manjaz_achievements_v2";
const AWARDS_STORE = "manjaz_awards_v1";
const PARTNERS_STORE = "manjaz_partners_v1";

function parseStoredArray(key){
  try{
    const value=JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  }catch{ return []; }
}

function normalizeStatus(value){
  const s=String(value||"");
  if(s==="معتمد" || s.includes("Ù…Ø¹ØªÙ…Ø¯")) return "معتمد";
  if(s==="تحت المراجعة" || s.includes("ØªØ­Øª Ø§Ù„Ù…Ø±Ø§Ø¬Ø¹Ø©")) return "تحت المراجعة";
  return s || "تحت المراجعة";
}

function mergeUniqueRecords(groups){
  const map=new Map();
  groups.flat().forEach((x,index)=>{
    if(!x || typeof x!=="object") return;
    const key=String(x.id || `${x.title||""}|${x.date||x.startDate||""}|${index}`);
    const previous=map.get(key) || {};
    map.set(key,{...previous,...x,status:normalizeStatus(x.status)});
  });
  return Array.from(map.values()).sort((a,b)=>
    String(b.createdAt||b.date||b.startDate||"").localeCompare(String(a.createdAt||a.date||a.startDate||""))
  );
}

function getItems(){
  const groups=[parseStoredArray(STORE)];
  /* استرجاع نسخ المنجزات المحلية الأقدم إن وُجدت، دون حذف النسخة الحالية */
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i)||"";
    if(key!==STORE && /^manjaz_achievements/i.test(key)) groups.push(parseStoredArray(key));
  }
  const items=mergeUniqueRecords(groups);
  /* ترحيل آمن إلى المفتاح الحالي */
  try{ localStorage.setItem(STORE,JSON.stringify(items)); }catch{}
  return items;
}
function saveItems(items){ localStorage.setItem(STORE, JSON.stringify(items)); }
function getAwards(){ try { return JSON.parse(localStorage.getItem(AWARDS_STORE) || "[]"); } catch { return []; } }
function saveAwards(items){ localStorage.setItem(AWARDS_STORE, JSON.stringify(items)); }
function getPartners(){ try { return JSON.parse(localStorage.getItem(PARTNERS_STORE) || "[]"); } catch { return []; } }
function savePartners(items){ localStorage.setItem(PARTNERS_STORE, JSON.stringify(items)); }

const SUPABASE_URL = "https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const SUPABASE_BUCKET = "manjaz-media";

const RECORDS_ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
const SUPABASE_HEADERS={
  "apikey":SUPABASE_PUBLISHABLE_KEY,
  "Authorization":`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
  "Content-Type":"application/json"
};

function recordKindToCollection(kind){
  return kind==="achievement" ? "achievement" : kind==="award" ? "award" : "partner";
}

function collectionToRecordKind(kind){
  return kind==="achievement" ? "achievement" : kind==="award" ? "award" : "partner";
}

function cloudRowToItem(row){
  const data=(row && row.data && typeof row.data==="object") ? row.data : {};
  return {
    ...data,
    id:String(row.id),
    status:row.status || data.status || "تحت المراجعة",
    createdAt:data.createdAt || row.created_at || new Date().toISOString(),
    updatedAt:row.updated_at || data.updatedAt || row.created_at || new Date().toISOString(),
    _cloud:true,
    _kind:row.kind
  };
}

async function fetchCloudRecords(kind){
  const params=new URLSearchParams({
    select:"id,kind,data,status,created_at,updated_at",
    kind:`eq.${collectionToRecordKind(kind)}`,
    order:"created_at.desc"
  });
  const res=await fetch(`${RECORDS_ENDPOINT}?${params.toString()}`,{
    headers:SUPABASE_HEADERS
  });
  if(!res.ok){
    const txt=await res.text().catch(()=> "");
    throw new Error(`تعذر قراءة السجلات السحابية (${res.status}) ${txt}`);
  }
  const rows=await res.json();
  return Array.isArray(rows) ? rows.map(cloudRowToItem) : [];
}

async function insertCloudRecord(kind,item){
  const payload={
    kind:collectionToRecordKind(kind),
    data:{...item},
    status:item.status || "تحت المراجعة",
    updated_at:new Date().toISOString()
  };
  const res=await fetch(RECORDS_ENDPOINT,{
    method:"POST",
    headers:{...SUPABASE_HEADERS,"Prefer":"return=representation"},
    body:JSON.stringify(payload)
  });
  if(!res.ok){
    const txt=await res.text().catch(()=> "");
    throw new Error(`تعذر حفظ السجل في Supabase (${res.status}) ${txt}`);
  }
  const rows=await res.json();
  return Array.isArray(rows) && rows[0] ? cloudRowToItem(rows[0]) : item;
}


function replaceLocalId(kind,oldId,cloudItem){
  const items=getCollection(kind);
  const index=items.findIndex(x=>String(x.id)===String(oldId));
  if(index>=0){
    items[index]={...items[index],...cloudItem,id:String(cloudItem.id)};
    saveCollection(kind,items);
  }
  return String(cloudItem.id);
}

async function updateCloudRecord(kind,item){
  const payload={
    data:{...item},
    status:item.status || "تحت المراجعة",
    updated_at:new Date().toISOString()
  };
  const params=new URLSearchParams({
    id:`eq.${item.id}`,
    kind:`eq.${collectionToRecordKind(kind)}`
  });
  const res=await fetch(`${RECORDS_ENDPOINT}?${params.toString()}`,{
    method:"PATCH",
    headers:{...SUPABASE_HEADERS,"Prefer":"return=representation"},
    body:JSON.stringify(payload)
  });
  if(!res.ok){
    const txt=await res.text().catch(()=> "");
    throw new Error(`تعذر تحديث السجل في Supabase (${res.status}) ${txt}`);
  }
  const rows=await res.json();
  return Array.isArray(rows) && rows[0] ? cloudRowToItem(rows[0]) : item;
}

async function deleteCloudRecord(kind,id){
  const params=new URLSearchParams({
    id:`eq.${id}`,
    kind:`eq.${collectionToRecordKind(kind)}`
  });
  const res=await fetch(`${RECORDS_ENDPOINT}?${params.toString()}`,{
    method:"DELETE",
    headers:{...SUPABASE_HEADERS,"Prefer":"return=representation"}
  });
  if(!res.ok){
    const txt=await res.text().catch(()=> "");
    throw new Error(`تعذر حذف السجل من Supabase (${res.status}) ${txt}`);
  }
  return true;
}

/* مزامنة أولية: ترفع السجلات المحلية القديمة إلى Supabase مرة واحدة، ثم تبقي نسخة محلية احتياطية */
const CLOUD_MIGRATION_FLAG="manjaz_cloud_records_migrated_v1";

async function migrateLocalRecordsToCloud(){
  if(localStorage.getItem(CLOUD_MIGRATION_FLAG)==="1") return;

  const groups=[
    ["achievement",getItems()],
    ["award",getAwards()],
    ["partner",getPartners()]
  ];

  for(const [kind,items] of groups){
    for(const item of items){
      if(!item || !item.id) continue;
      try{
        await insertCloudRecord(kind,item);
      }catch(err){
        console.warn("تعذر ترحيل سجل محلي قديم:",kind,item.id,err);
      }
    }
  }
  localStorage.setItem(CLOUD_MIGRATION_FLAG,"1");
}

async function refreshAllCloudCollections(){
  const [achievements,awards,partners]=await Promise.all([
    fetchCloudRecords("achievement"),
    fetchCloudRecords("award"),
    fetchCloudRecords("partner")
  ]);
  saveItems(achievements);
  saveAwards(awards);
  savePartners(partners);
  return {achievements,awards,partners};
}

async function syncCloudAndRender(){
  try{
    await migrateLocalRecordsToCloud();
    await refreshAllCloudCollections();
  }catch(err){
    console.error("Cloud sync:",err);
  }
  render();
}


function safeFileName(name){
  const ext = (name.match(/\.[A-Za-z0-9]+$/) || [""])[0];
  const base = name.replace(/\.[A-Za-z0-9]+$/,"")
    .replace(/[^\w\u0600-\u06FF-]+/g,"-")
    .replace(/-+/g,"-")
    .replace(/^-|-$/g,"")
    .slice(0,60) || "file";
  return `${base}${ext}`;
}

function getCollection(kind){
  return kind==="achievement" ? getItems() : kind==="award" ? getAwards() : getPartners();
}

function saveCollection(kind,items){
  if(kind==="achievement") saveItems(items);
  else if(kind==="award") saveAwards(items);
  else savePartners(items);
}

function getKindFromParentKey(key){
  return String(key).split(":")[0];
}

function getIdFromParentKey(key){
  return String(key).slice(String(key).indexOf(":")+1);
}

function fileFingerprint(file,kind=""){
  return [kind,file?.name||"",Number(file?.size||0),Number(file?.lastModified||0),file?.type||""].join("|");
}

function persistMediaRows(kind,id,newRows){
  if(!newRows.length) return;
  const items=getCollection(kind);
  const item=items.find(x=>String(x.id)===String(id));
  if(!item) return;

  const existing=Array.isArray(item.media) ? item.media : [];
  const seen=new Set(existing.map(x=>x.clientKey || `${x.path||""}|${x.url||""}`));
  const unique=newRows.filter(row=>{
    const k=row.clientKey || `${row.path||""}|${row.url||""}`;
    if(seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  item.media=[...existing,...unique];

  if(!item.coverUrl){
    const firstImage=item.media.find(x=>x.kind==="image");
    if(firstImage) item.coverUrl=firstImage.url;
  }

  saveCollection(kind,items);
}

async function uploadOneFile(parentKeyValue,kind,file){
  const recordKind=getKindFromParentKey(parentKeyValue);
  const recordId=getIdFromParentKey(parentKeyValue);
  const stamp=`${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const originalName=file.name || "file";
  const ext=(originalName.match(/\.[A-Za-z0-9]+$/)||[""])[0].toLowerCase();
  const storageName=`file${ext}`;
  const path=`${recordKind}/${recordId}/${stamp}-${storageName}`;
  const uploadUrl=`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
  const contentType=ext===".pdf" ? "application/pdf" : (file.type || "application/octet-stream");

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),120000);
  let res;
  try{
    res=await fetch(uploadUrl,{
      method:"POST",
      headers:{
        "apikey":SUPABASE_PUBLISHABLE_KEY,
        "Authorization":`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type":contentType,
        "x-upsert":"false"
      },
      body:file,
      signal:controller.signal
    });
  }catch(err){
    if(err?.name==="AbortError") throw new Error(`انتهت مهلة رفع ${file.name}`);
    throw err;
  }finally{
    clearTimeout(timeout);
  }

  if(!res.ok){
    let detail="";
    try{ detail=await res.text(); }catch{}
    throw new Error(`فشل رفع ${file.name}: ${res.status} ${detail}`);
  }

  return {
    kind,
    name:file.name,
    type:contentType,
    size:Number(file.size||0),
    lastModified:Number(file.lastModified||0),
    clientKey:fileFingerprint(file,kind),
    path,
    url:`${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`,
    createdAt:new Date().toISOString()
  };
}

const activeUploadLocks=new Set();
async function saveSelectedFiles(parentKeyValue, imageFiles=[], docFiles=[], onProgress=null){
  const rawQueue=[
    ...Array.from(imageFiles||[]).map(file=>({kind:"image",file})),
    ...Array.from(docFiles||[]).map(file=>({kind:"document",file}))
  ];
  if(!rawQueue.length) return [];

  /* منع تكرار نفس الملف داخل عملية الرفع نفسها */
  const localSeen=new Set();
  let queue=rawQueue.filter(entry=>{
    const key=fileFingerprint(entry.file,entry.kind);
    if(localSeen.has(key)) return false;
    localSeen.add(key);
    return true;
  });

  const recordKind=getKindFromParentKey(parentKeyValue);
  const recordId=getIdFromParentKey(parentKeyValue);
  const current=getRecord(recordKind,recordId);
  const already=new Set((current?.media||[]).map(x=>x.clientKey).filter(Boolean));
  queue=queue.filter(entry=>!already.has(fileFingerprint(entry.file,entry.kind)));
  if(!queue.length) return [];

  const lockKey=`${recordKind}:${recordId}`;
  if(activeUploadLocks.has(lockKey)) throw new Error("عملية رفع أخرى ما زالت جارية لهذا السجل");
  activeUploadLocks.add(lockKey);

  const uploaded=[];
  const failed=[];
  let completed=0;
  const total=queue.length;
  const report=()=>{ if(typeof onProgress==="function") onProgress(completed,total); };
  report();

  try{
    /* عاملان متوازيان: أسرع من التسلسل مع تجنب ضغط كبير على Safari */
    let cursor=0;
    async function worker(){
      while(true){
        const index=cursor++;
        if(index>=queue.length) return;
        const entry=queue[index];
        try{
          const row=await uploadOneFile(parentKeyValue,entry.kind,entry.file);
          uploaded.push(row);
          persistMediaRows(recordKind,recordId,[row]);
        }catch(err){
          failed.push({name:entry.file?.name || "ملف",error:err});
          console.error("فشل مرفق منفرد:",err);
        }finally{
          completed++;
          report();
        }
      }
    }
    await Promise.all([worker(),worker()]);

    const refreshed=getRecord(recordKind,recordId);
    if(refreshed){
      try{ await updateCloudRecord(recordKind,refreshed); }
      catch(err){ console.error("تعذر مزامنة بيانات المرفقات سحابيًا:",err); }
    }

    if(failed.length){
      const err=new Error(`تعذر رفع ${failed.length} من ${queue.length} مرفق`);
      err.uploaded=uploaded;
      err.failed=failed;
      throw err;
    }
    return uploaded;
  }finally{
    activeUploadLocks.delete(lockKey);
  }
}

async function getMedia(parentKeyValue){
  const kind=getKindFromParentKey(parentKeyValue);
  const id=getIdFromParentKey(parentKeyValue);
  const record=getRecord(kind,id);
  return record && Array.isArray(record.media) ? record.media : [];
}

function parentKey(kind,id){ return `${kind}:${id}`; }
function mediaURL(row){ return row?.url || ""; }


async function deleteCloudMedia(rows=[]){
  /* حذف ملفات Supabase يحتاج سياسة DELETE؛ إذا لم تكن مفعلة لا نمنع حذف السجل */
  const paths=rows.map(x=>x?.path).filter(Boolean);
  for(const path of paths){
    try{
      const url=`${SUPABASE_URL}/storage/v1/object/${SUPABASE_BUCKET}/${encodeURI(path)}`;
      const res=await fetch(url,{
        method:"DELETE",
        headers:{
          "apikey":SUPABASE_PUBLISHABLE_KEY,
          "Authorization":`Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        }
      });
      if(!res.ok) console.warn("تعذر حذف المرفق من التخزين:",path,res.status);
    }catch(err){
      console.warn("تعذر حذف المرفق من التخزين:",path,err);
    }
  }
}


async function deleteOneAttachment(kind,id,path){
  const record=getRecord(kind,id);
  if(!record) throw new Error("السجل غير موجود");
  const rows=Array.isArray(record.media)?record.media:[];
  const target=rows.find(x=>x.path===path);
  if(!target) return;
  const ok=window.confirm(`حذف المرفق «${target.name||"ملف"}»؟`);
  if(!ok) return;
  await deleteCloudMedia([target]);
  record.media=rows.filter(x=>x.path!==path);
  if(record.coverUrl===target.url){
    const next=record.media.find(x=>x.kind==="image");
    record.coverUrl=next ? next.url : "";
  }
  const items=getCollection(kind);
  const idx=items.findIndex(x=>String(x.id)===String(id));
  if(idx>=0) items[idx]=record;
  saveCollection(kind,items);
  await updateCloudRecord(kind,record);
}

async function deleteRecord(kind,id){
  const record=getRecord(kind,id);
  if(!record) return false;

  const typeLabel=kind==="achievement" ? "المنجز" : kind==="award" ? "التكريم" : "الشراكة";
  const ok=window.confirm(`هل أنتِ متأكدة من حذف ${typeLabel} «${record.title || ""}»؟\n\nلا يمكن التراجع عن حذف السجل`);
  if(!ok) return false;

  const rows=Array.isArray(record.media) ? record.media : [];

  try{
    await deleteCloudRecord(kind,id);
  }catch(err){
    console.error("تعذر حذف السجل السحابي:",err);
    alert("تعذر حذف السجل من Supabase. لم يتم تنفيذ الحذف");
    return false;
  }

  const items=getCollection(kind).filter(x=>String(x.id)!==String(id));
  saveCollection(kind,items);

  /* تنظيف المرفقات من Supabase بعد نجاح حذف السجل */
  await deleteCloudMedia(rows);

  const dialog=byId("detailDialog");
  if(dialog){
    try{
      if(typeof dialog.close==="function" && dialog.open) dialog.close();
      else{
        dialog.removeAttribute("open");
        dialog.style.display="none";
      }
    }catch{}
  }

  render();
  return true;
}

function createDeleteButton(kind,id){
  const btn=document.createElement("button");
  btn.type="button";
  btn.className="record-delete-btn";
  btn.textContent=kind==="achievement" ? "حذف المنجز" : kind==="award" ? "حذف التكريم" : "حذف الشراكة";
  btn.addEventListener("click",async e=>{
    e.stopPropagation();
    await deleteRecord(kind,id);
  });
  return btn;
}

async function hydrateCover(el,kind,id){
  if(!el) return;
  try{
    const record=getRecord(kind,id);
    const direct=record?.coverUrl;
    const rows=await getMedia(parentKey(kind,id));
    const image=direct ? {url:direct} : rows.find(r=>r.kind==="image");
    if(image){
      el.innerHTML="";
      const img=document.createElement("img");
      img.src=mediaURL(image);
      img.alt="صورة الغلاف";
      img.loading="lazy";
      el.appendChild(img);
    }
  }catch(err){ console.warn("media cover",err); }
}

function getRecord(kind,id){
  const list = kind==="achievement" ? getItems() : kind==="award" ? getAwards() : getPartners();
  return list.find(x=>String(x.id)===String(id));
}

const placeholders = {
  reports:"التقارير والإحصاءات",
  awards:"التكريمات والحوافز",
  partners:"الشراكات",
  settings:"الإعدادات"
};

function clone(id){ return document.getElementById(id).content.cloneNode(true); }

function setActive(route){
  document.querySelectorAll("#nav a").forEach(a=>{
    a.classList.toggle("active", a.dataset.route === route);
  });
  document.querySelectorAll(".mobile-nav a").forEach(a=>{
    const isActive = a.dataset.mobileRoute === route;
    a.style.opacity = isActive ? "1" : ".72";
  });
}

function injectDetailsButtonStyle(){
  if(document.getElementById("detailsButtonStyle")) return;
  const style=document.createElement("style");
  style.id="detailsButtonStyle";
  style.textContent=`
    .details-btn{
      width:100%;
      margin-top:14px;
      border:1.5px solid #1f8f84;
      background:#ffffff;
      color:#126a62;
      border-radius:10px;
      padding:11px 16px;
      font-family:inherit;
      font-size:15px;
      font-weight:700;
      cursor:pointer;
      transition:background-color .15s ease,color .15s ease,transform .08s ease,border-color .15s ease;
      -webkit-tap-highlight-color:transparent;
    }
    .details-btn:hover,
    .details-btn:focus-visible{
      background:#e7f5f2;
      color:#0b514c;
      border-color:#126a62;
      outline:none;
    }
    .details-btn:active,
    .details-btn.is-pressed{
      background:#126a62;
      color:#ffffff;
      border-color:#126a62;
      transform:scale(.985);
    }
    .record-delete-btn{
      width:100%;
      margin-top:8px;
      border:1px solid #b23a3a;
      background:#fff;
      color:#9f2f2f;
      border-radius:10px;
      padding:10px 14px;
      font-family:inherit;
      font-size:14px;
      font-weight:700;
      cursor:pointer;
      -webkit-tap-highlight-color:transparent;
    }
    .record-delete-btn:hover,.record-delete-btn:focus-visible{
      background:#fff1f1;
      outline:none;
    }
    .record-delete-btn:active{
      background:#9f2f2f;
      color:#fff;
    }
    .detail-danger-zone{
      margin-top:18px;
      padding-top:16px;
      border-top:1px solid rgba(159,47,47,.18);
    }
  `;
  document.head.appendChild(style);
}

function createDetailsButton(kind,id){
  const btn=document.createElement("button");
  btn.type="button";
  btn.className="details-btn";
  btn.textContent="مشاهدة التفاصيل";
  btn.addEventListener("click",e=>{
    e.stopPropagation();
    openDetails(kind,id);
  });
  btn.addEventListener("pointerdown",()=>btn.classList.add("is-pressed"));
  ["pointerup","pointercancel","pointerleave"].forEach(evt=>{
    btn.addEventListener(evt,()=>btn.classList.remove("is-pressed"));
  });
  return btn;
}

function showVersionBadge(){
  if(document.getElementById("manjazVersionBadge")) return;
  const badge=document.createElement("div");
  badge.id="manjazVersionBadge";
  badge.textContent="الإصدار 9.4 • سحابي";
  badge.style.cssText="position:fixed;left:8px;bottom:8px;z-index:99999;background:#0f5f59;color:#fff;padding:4px 8px;border-radius:8px;font:700 11px/1.2 sans-serif;opacity:.82;pointer-events:none";
  document.body.appendChild(badge);
}

function render(){
  const route = (location.hash || "#home").slice(1);
  const view = document.getElementById("view");
  view.innerHTML = "";
  setActive(route);

  if(route==="home"){
    view.appendChild(clone("homeTpl"));
    const items=getItems();
    byId("mTotal").textContent=items.length;
    byId("mApproved").textContent=items.filter(x=>x.status==="معتمد").length;
    byId("mReview").textContent=items.filter(x=>x.status==="تحت المراجعة").length;
  } else if(route==="about"){
    view.appendChild(clone("aboutTpl"));
  } else if(route==="add"){
    view.appendChild(clone("addTpl"));
    wireForm();
  } else if(route==="achievements"){
    view.appendChild(clone("achievementsTpl"));
    wireAchievements();
  } else if(route==="admin"){
    view.appendChild(clone("adminTpl"));
    wireAdmin();
  } else if(route==="awards"){
    view.appendChild(clone("awardsTpl"));
    wireAwards();
  } else if(route==="partners"){
    view.appendChild(clone("partnersTpl"));
    wirePartners();
  } else if(route==="reports"){
    view.appendChild(clone("reportsTpl"));
    wireReports();
  } else {
    view.appendChild(clone("placeholderTpl"));
    byId("placeholderTitle").textContent=placeholders[route] || "قريبًا";
  }
}


const selectedFileState=new WeakMap();
function setupFileSelectionRemovers(root){
  if(!root) return;
  root.querySelectorAll('input[type="file"]').forEach(input=>{
    if(input.dataset.manjazFileReady==="1") return;
    input.dataset.manjazFileReady="1";
    const box=document.createElement("div");
    box.className="selected-file-list";
    box.style.cssText="display:grid;gap:6px;margin-top:8px";
    input.insertAdjacentElement("afterend",box);
    selectedFileState.set(input,[]);

    const draw=()=>{
      const files=selectedFileState.get(input)||[];
      box.innerHTML=files.map((f,i)=>`<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;border:1px solid #d9dee7;border-radius:8px;background:#fff"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(f.name)}</span><button type="button" data-i="${i}" style="border:0;background:transparent;color:#a12828;font-weight:700;cursor:pointer">إزالة</button></div>`).join("");
      box.querySelectorAll("button[data-i]").forEach(btn=>btn.addEventListener("click",()=>{
        const arr=[...(selectedFileState.get(input)||[])];
        arr.splice(Number(btn.dataset.i),1);
        selectedFileState.set(input,arr);
        draw();
      }));
    };

    input.addEventListener("change",()=>{
      const old=selectedFileState.get(input)||[];
      const incoming=Array.from(input.files||[]);
      const merged=[];
      const seen=new Set();
      [...old,...incoming].forEach(f=>{
        const key=fileFingerprint(f);
        if(seen.has(key)) return;
        seen.add(key);
        merged.push(f);
      });
      selectedFileState.set(input,merged);
      /* تفريغ عنصر الإدخال يمنع Safari من الاحتفاظ بملفات حُذفت من القائمة */
      input.value="";
      draw();
    });
    input._manjazRedraw=draw;
  });
}
function selectedFiles(input){
  return input ? [...(selectedFileState.get(input) || [])] : [];
}
function clearSelectedFiles(root){
  if(!root) return;
  root.querySelectorAll('input[type="file"]').forEach(input=>{
    selectedFileState.set(input,[]);
    try{ input.value=""; }catch{}
    if(typeof input._manjazRedraw==="function") input._manjazRedraw();
  });
}

function wireForm(){
  const form=byId("achievementForm");
  const msg=byId("formMsg");
  if(!form) return;
  setupFileSelectionRemovers(form);

  const submitBtn=form.querySelector('button[type="submit"],input[type="submit"]');
  let isSubmitting=false;

  async function submitAchievement(e){
    if(e) e.preventDefault();
    if(isSubmitting) return;

    if(!form.checkValidity()){
      form.reportValidity();
      if(msg){
        msg.className="error";
        msg.textContent="أكملي الحقول المطلوبة ثم اضغطي حفظ وإرسال المنجز";
      }
      return;
    }

    isSubmitting=true;
    form.dataset.busy="1";
    if(submitBtn){
      submitBtn.disabled=true;
      submitBtn.dataset.originalText=submitBtn.textContent;
      submitBtn.textContent="جارٍ حفظ المنجز...";
    }

    const fd=new FormData(form);
    const id=(crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const item={
      id,
      title:fd.get("title"),
      category:fd.get("category"),
      date:fd.get("date"),
      entity:fd.get("entity"),
      team:fd.get("team"),
      audience:fd.get("audience"),
      beneficiaries:fd.get("beneficiaries"),
      type:fd.get("type"),
      goal:fd.get("goal"),
      description:fd.get("description"),
      impact:fd.get("impact"),
      link:fd.get("link"),
      status:"تحت المراجعة",
      createdAt:new Date().toISOString(),
      media:[]
    };

    /* نحفظ بيانات المنجز أولًا دائمًا */
    const items=getItems();
    items.unshift(item);
    saveItems(mergeUniqueRecords([items]));

    let cloudSaveFailed=false;
    let activeId=id;
    try{
      const cloudItem=await insertCloudRecord("achievement",item);
      if(cloudItem && cloudItem.id){
        activeId=replaceLocalId("achievement",id,cloudItem);
        item.id=activeId;
      }
    }catch(err){
      cloudSaveFailed=true;
      console.error("حفظ المنجز سحابيًا:",err);
    }

    if(msg){
      msg.className=cloudSaveFailed ? "warning" : "success";
      msg.textContent=cloudSaveFailed
        ? "تم حفظ نسخة محلية مؤقتًا، لكن تعذر إرسال بيانات المنجز إلى Supabase"
        : "تم حفظ بيانات المنجز سحابيًا، جارٍ رفع المرفقات...";
    }

    let uploadFailed=false;
    try{
      await saveSelectedFiles(
        parentKey("achievement",activeId),
        selectedFiles(form.elements.images),
        selectedFiles(form.elements.documents),
        (done,total)=>{
          if(msg && total){
            msg.className="success";
            msg.textContent=done<total ? `جارٍ رفع المرفقات ${done} من ${total}...` : "اكتمل رفع المرفقات، جارٍ إنهاء الحفظ...";
          }
        }
      );
      const refreshed=getItems().find(x=>String(x.id)===String(activeId));
      if(refreshed && !cloudSaveFailed) await updateCloudRecord("achievement",refreshed);
    }catch(err){
      uploadFailed=true;
      console.error("رفع المرفقات:",err);
    }

    if(msg){
      msg.className=(uploadFailed||cloudSaveFailed) ? "warning" : "success";
      msg.textContent=cloudSaveFailed
        ? "تم حفظ نسخة محلية مؤقتة، لكن تعذر الحفظ السحابي. تحققي من الاتصال ثم أعيدي المحاولة"
        : uploadFailed
          ? "تم حفظ المنجز سحابيًا، لكن تعذر رفع بعض المرفقات. يمكنك إضافتها لاحقًا من التفاصيل"
          : "تم حفظ المنجز ورفع المرفقات وإرساله للمراجعة بنجاح";
    }

    form.reset();
    clearSelectedFiles(form);
    isSubmitting=false;
    delete form.dataset.busy;
    if(submitBtn){
      submitBtn.disabled=false;
      submitBtn.textContent=submitBtn.dataset.originalText || "حفظ وإرسال المنجز";
    }
  }

  form.addEventListener("submit",submitAchievement);

  /* ضمان استجابة زر الحفظ على Safari حتى لو كان القالب يستخدم زرًا غير مضبوط */
  if(submitBtn){
    submitBtn.addEventListener("click",e=>{
      if(submitBtn.type!=="submit") submitAchievement(e);
    });
  }
}
function wireAchievements(){
  const search=byId("searchAchievements");
  const cat=byId("filterCategory");
  const status=byId("filterStatus");
  [search,cat,status].forEach(el=>el.addEventListener("input",draw));

  function draw(){
    const all=getItems();
    byId("aTotal").textContent=all.length;
    byId("aApproved").textContent=all.filter(x=>x.status==="معتمد").length;
    byId("aReview").textContent=all.filter(x=>x.status==="تحت المراجعة").length;

    const q=search.value.trim();
    const items=all.filter(x =>
      (!q || [x.title,x.description,x.team,x.entity,x.impact].join(" ").includes(q)) &&
      (!cat.value || x.category===cat.value) &&
      (!status.value || x.status===status.value)
    );

    const list=byId("achievementList");
    const empty=byId("emptyState");
    list.innerHTML="";
    empty.style.display=items.length ? "none" : "block";

    items.forEach(x=>{
      const card=document.createElement("article");
      card.className="achievement-card";
      card.dataset.kind="achievement";
      card.dataset.id=x.id;
      card.innerHTML=`
        <div class="card-cover"><div class="card-cover-placeholder">لا توجد صورة غلاف بعد</div></div>
        <span class="badge">${esc(x.status)}</span>
        <h3>${esc(x.title)}</h3>
        <div class="meta">
          <span>${esc(x.category)}</span>
          <span>${esc(x.date)}</span>
          <span>المنفذة: ${esc(x.team)}</span>
          <span>المستفيدات: ${esc(x.beneficiaries || "—")}</span>
        </div>
        <p>${esc(x.impact)}</p>
      `;
      card.appendChild(createDetailsButton("achievement",x.id));
      card.appendChild(createDeleteButton("achievement",x.id));
      list.appendChild(card);
      hydrateCover(card.querySelector(".card-cover"),"achievement",x.id);
    });
  }
  draw();
}

function wireAdmin(){
  const a=getItems(), w=getAwards(), p=getPartners();
  const items=[
    ...a.map(x=>({...x,_kind:"منجز",_mediaKind:"achievement"})),
    ...w.map(x=>({...x,_kind:"تكريم",_mediaKind:"award"})),
    ...p.map(x=>({...x,_kind:"شراكة",_mediaKind:"partner"}))
  ];
  byId("dNew").textContent=0;
  byId("dReview").textContent=items.filter(x=>x.status==="تحت المراجعة").length;
  byId("dApproved").textContent=items.filter(x=>x.status==="معتمد").length;
  const list=byId("adminList");
  const empty=byId("adminEmpty");
  const reviewItems=items.filter(x=>x.status==="تحت المراجعة");
  empty.style.display=reviewItems.length ? "none" : "block";

  reviewItems.forEach(x=>{
    const row=document.createElement("div");
    row.className="admin-item";
    row.innerHTML=`
      <div class="admin-thumb"><span></span></div>
      <div>
        <h4>${esc(x.title)}</h4>
        <p>${esc(x._kind)} • ${esc(x.category || x.type || "")} • ${esc(x.team || x.recipient || x.partner || "")} • ${esc(x.date || x.startDate || "")}</p>
      </div>
      <div class="admin-actions">
        <button class="small-btn view-record" data-id="${esc(x.id)}" data-media-kind="${esc(x._mediaKind)}">مشاهدة التفاصيل</button>
        <button class="small-btn approve" data-id="${esc(x.id)}" data-kind="${esc(x._kind)}">اعتماد</button>
        <button class="small-btn admin-delete-record" data-id="${esc(x.id)}" data-media-kind="${esc(x._mediaKind)}">حذف</button>
      </div>
    `;
    list.appendChild(row);
    hydrateCover(row.querySelector(".admin-thumb"),x._mediaKind,x.id);
  });

  list.querySelectorAll(".view-record").forEach(btn=>{
    btn.classList.add("details-btn");
    btn.addEventListener("click",()=>openDetails(btn.dataset.mediaKind,btn.dataset.id));
  });

  list.querySelectorAll(".admin-delete-record").forEach(btn=>{
    btn.addEventListener("click",async ()=>{
      await deleteRecord(btn.dataset.mediaKind,btn.dataset.id);
    });
  });

  list.querySelectorAll(".approve").forEach(btn=>{
    btn.addEventListener("click",async ()=>{
      const kind=btn.dataset.kind, id=btn.dataset.id;
      let updated=null, cloudKind="achievement";
      if(kind==="منجز"){ const all=getItems(); updated=all.find(x=>x.id===id); if(updated)updated.status="معتمد"; saveItems(all); cloudKind="achievement"; }
      if(kind==="تكريم"){ const all=getAwards(); updated=all.find(x=>x.id===id); if(updated)updated.status="معتمد"; saveAwards(all); cloudKind="award"; }
      if(kind==="شراكة"){ const all=getPartners(); updated=all.find(x=>x.id===id); if(updated)updated.status="معتمد"; savePartners(all); cloudKind="partner"; }
      if(updated){
        try{ await updateCloudRecord(cloudKind,updated); }
        catch(err){ console.error("تعذر تحديث حالة الاعتماد سحابيًا:",err); }
      }
      render();
    });
  });
}

function wireAwards(){
  const form=byId("awardForm");
  const show=byId("showAwardForm");
  const cancel=byId("cancelAward");
  const msg=byId("awardMsg");
  show.addEventListener("click",()=>form.style.display="block");
  cancel.addEventListener("click",()=>{form.reset();form.style.display="none";});
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const id=(crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const item={
      id,
      title:fd.get("title"), type:fd.get("type"), grantor:fd.get("grantor"),
      recipient:fd.get("recipient"), date:fd.get("date"),
      beneficiaries:Number(fd.get("beneficiaries")||0),
      reason:fd.get("reason"), impact:fd.get("impact"),
      status:"تحت المراجعة", createdAt:new Date().toISOString()
    };
    const items=getAwards(); items.unshift(item); saveAwards(items);
    try{
      await saveSelectedFiles(parentKey("award",id),form.elements.images?.files,form.elements.documents?.files);
      msg.className="success"; msg.textContent="تم حفظ التكريم ورفع المرفقات إلى الموقع وإرساله للمراجعة بنجاح";
    }catch(err){
      msg.className="success"; msg.textContent="تم حفظ التكريم، لكن تعذر حفظ بعض المرفقات على هذا الجهاز";
    }
    form.reset(); form.style.display="none"; drawAwards();
  });
  drawAwards();

  function drawAwards(){
    const items=getAwards();
    byId("awTotal").textContent=items.length;
    byId("awApproved").textContent=items.filter(x=>x.status==="معتمد").length;
    byId("awReview").textContent=items.filter(x=>x.status==="تحت المراجعة").length;
    const list=byId("awardList"), empty=byId("awardEmpty");
    list.innerHTML=""; empty.style.display=items.length?"none":"block";
    items.forEach(x=>{
      const card=document.createElement("article");
      card.className="achievement-card";
      card.innerHTML=`<div class="card-cover"><div class="card-cover-placeholder">لا توجد صورة غلاف بعد</div></div>
      <span class="badge">${esc(x.status)}</span><h3>${esc(x.title)}</h3>
      <div class="meta"><span>${esc(x.type)}</span><span>${esc(x.grantor)}</span><span>${esc(x.recipient)}</span><span>${esc(x.date)}</span></div>
      <p>${esc(x.reason)}</p>`;
      card.appendChild(createDetailsButton("award",x.id));
      card.appendChild(createDeleteButton("award",x.id));
      list.appendChild(card);
      hydrateCover(card.querySelector(".card-cover"),"award",x.id);
    });
  }
}

function wirePartners(){
  const form=byId("partnerForm");
  const show=byId("showPartnerForm");
  const cancel=byId("cancelPartner");
  const msg=byId("partnerMsg");
  show.addEventListener("click",()=>form.style.display="block");
  cancel.addEventListener("click",()=>{form.reset();form.style.display="none";});
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    const fd=new FormData(form);
    const id=(crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
    const item={
      id,
      title:fd.get("title"), partner:fd.get("partner"), type:fd.get("type"),
      startDate:fd.get("startDate"), endDate:fd.get("endDate"),
      beneficiaries:Number(fd.get("beneficiaries")||0),
      goal:fd.get("goal"), description:fd.get("description"), impact:fd.get("impact"),
      status:"تحت المراجعة", createdAt:new Date().toISOString()
    };
    const items=getPartners(); items.unshift(item); savePartners(items);
    try{
      await saveSelectedFiles(parentKey("partner",id),form.elements.images?.files,form.elements.documents?.files);
      msg.className="success"; msg.textContent="تم حفظ الشراكة ورفع المرفقات إلى الموقع وإرسالها للمراجعة بنجاح";
    }catch(err){
      msg.className="success"; msg.textContent="تم حفظ الشراكة، لكن تعذر حفظ بعض المرفقات على هذا الجهاز";
    }
    form.reset(); form.style.display="none"; drawPartners();
  });
  drawPartners();

  function drawPartners(){
    const items=getPartners();
    byId("ptTotal").textContent=items.length;
    byId("ptApproved").textContent=items.filter(x=>x.status==="معتمد").length;
    byId("ptReview").textContent=items.filter(x=>x.status==="تحت المراجعة").length;
    const list=byId("partnerList"), empty=byId("partnerEmpty");
    list.innerHTML=""; empty.style.display=items.length?"none":"block";
    items.forEach(x=>{
      const card=document.createElement("article");
      card.className="achievement-card";
      card.innerHTML=`<div class="card-cover"><div class="card-cover-placeholder">لا توجد صورة غلاف بعد</div></div>
      <span class="badge">${esc(x.status)}</span><h3>${esc(x.title)}</h3>
      <div class="meta"><span>${esc(x.partner)}</span><span>${esc(x.type)}</span><span>${esc(x.startDate)}</span><span>المستفيدات: ${esc(x.beneficiaries||0)}</span></div>
      <p>${esc(x.impact)}</p>`;
      card.appendChild(createDetailsButton("partner",x.id));
      card.appendChild(createDeleteButton("partner",x.id));
      list.appendChild(card);
      hydrateCover(card.querySelector(".card-cover"),"partner",x.id);
    });
  }
}

function wireReports(){
  const a=getItems(), w=getAwards(), p=getPartners();
  const all=[...a,...w,...p];
  const total=all.length;
  const approved=all.filter(x=>x.status==="معتمد").length;
  const review=all.filter(x=>x.status==="تحت المراجعة").length;
  const beneficiaries=all.reduce((s,x)=>s+Number(x.beneficiaries||0),0);
  byId("rAll").textContent=total;
  byId("rAchievements").textContent=a.length;
  byId("rAwards").textContent=w.length;
  byId("rPartners").textContent=p.length;
  byId("rBeneficiaries").textContent=beneficiaries;
  byId("rApproved").textContent=approved;
  byId("rReview").textContent=review;
  byId("rRate").textContent=total?Math.round((approved/total)*100)+"%":"0%";

  drawBars(byId("typeBars"),[
    ["المنجزات",a.length],["التكريمات",w.length],["الشراكات",p.length]
  ]);

  const cats={};
  a.forEach(x=>cats[x.category]=(cats[x.category]||0)+1);
  drawBars(byId("categoryBars"),Object.entries(cats));

  const months={};
  all.forEach(x=>{
    const d=x.date || x.startDate || x.createdAt?.slice(0,10);
    if(!d)return;
    const m=d.slice(0,7);
    months[m]=(months[m]||0)+1;
  });
  drawBars(byId("monthBars"),Object.entries(months).sort((a,b)=>a[0].localeCompare(b[0])));
}

function drawBars(container, rows){
  container.innerHTML="";
  if(!rows.length){
    container.innerHTML='<div class="empty-inline">لا توجد بيانات كافية بعد</div>';
    return;
  }
  const max=Math.max(...rows.map(r=>r[1]),1);
  rows.forEach(([label,value])=>{
    const row=document.createElement("div");
    row.className="bar-row";
    row.innerHTML=`<div class="bar-label">${esc(label)}</div><div class="bar-track"><div class="bar-fill" style="width:${(value/max)*100}%"></div></div><div class="bar-value">${value}</div>`;
    container.appendChild(row);
  });
}

async function openDetails(kind,id){
  const record=getRecord(kind,id);
  if(!record) return;

  const dialog=byId("detailDialog");
  const content=byId("detailContent");
  if(!dialog || !content) return;

  /* نفتح النافذة أولًا حتى لا يمنع فشل المرفقات مشاهدة التفاصيل */
  content.innerHTML=`<div class="detail-section"><h3>جارٍ تحميل التفاصيل</h3></div>`;
  if(typeof dialog.showModal==="function"){
    if(!dialog.open) dialog.showModal();
  }else{
    dialog.setAttribute("open","");
    dialog.style.display="block";
  }

  const rows=await getMedia(parentKey(kind,id));
  const images=rows.filter(r=>r.kind==="image");
  const docs=rows.filter(r=>r.kind==="document");

  const labels = kind==="achievement"
    ? {
        type:"منجز",
        category:record.category,
        date:record.date,
        owner:record.team,
        ownerLabel:"المنفذة / الفريق",
        sections:[
          ["الهدف",record.goal],
          ["الوصف",record.description],
          ["الأثر / النتيجة",record.impact],
          ["الفئة المستهدفة",record.audience],
          ["الجهة المنفذة",record.entity]
        ]
      }
    : kind==="award"
    ? {
        type:"تكريم",
        category:record.type,
        date:record.date,
        owner:record.recipient,
        ownerLabel:"المكرمة / الفئة",
        sections:[
          ["سبب التكريم",record.reason],
          ["الأثر / القيمة المضافة",record.impact],
          ["الجهة المانحة",record.grantor]
        ]
      }
    : {
        type:"شراكة",
        category:record.type,
        date:record.startDate,
        owner:record.partner,
        ownerLabel:"الجهة الشريكة",
        sections:[
          ["الهدف من الشراكة",record.goal],
          ["وصف التنفيذ",record.description],
          ["الأثر / النتيجة",record.impact],
          ["تاريخ النهاية",record.endDate]
        ]
      };

  const coverImage = record.coverUrl ? {url:record.coverUrl} : images[0];
  const cover=coverImage ? `<img src="${mediaURL(coverImage)}" alt="صورة الغلاف">` : `<div class="card-cover-placeholder">لا توجد صورة غلاف بعد<br><small>يمكن إضافتها من الأسفل</small></div>`;
  const gallery=images.length ? images.map(x=>`<div class="media-item" style="display:grid;gap:6px"><a href="${mediaURL(x)}" target="_blank" rel="noopener"><img src="${mediaURL(x)}" alt="${esc(x.name)}"></a><button type="button" class="delete-attachment" data-path="${esc(x.path||"")}" style="border:1px solid #d7dce5;background:#fff;border-radius:8px;padding:7px;color:#9b2525">حذف المرفق</button></div>`).join("") : `<div class="empty-inline">لا توجد صور مرفقة</div>`;
  const docLinks=docs.length ? docs.map(x=>`<div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center"><a class="file-link" href="${mediaURL(x)}" target="_blank" rel="noopener"><span>${esc(x.name)}</span><strong>فتح / تنزيل</strong></a><button type="button" class="delete-attachment" data-path="${esc(x.path||"")}" style="border:1px solid #d7dce5;background:#fff;border-radius:8px;padding:9px;color:#9b2525">حذف</button></div>`).join("") : `<div class="empty-inline">لا توجد مستندات مرفقة</div>`;
  const external = kind==="achievement" && record.link ? `<div class="detail-section"><h3>رابط خارجي</h3><a class="file-link" href="${esc(record.link)}" target="_blank" rel="noopener"><span>${esc(record.link)}</span><strong>فتح الرابط</strong></a></div>` : "";

  content.innerHTML=`
    <div class="detail-hero">
      <div class="detail-cover">${cover}</div>
      <div class="detail-title">
        <span class="badge">${esc(record.status)}</span>
        <h2>${esc(record.title)}</h2>
        <div class="detail-meta">
          <span>${esc(labels.type)}</span>
          <span>${esc(labels.category||"")}</span>
          <span>${esc(labels.date||"")}</span>
          <span>${esc(labels.ownerLabel)}: ${esc(labels.owner||"")}</span>
          <span>المستفيدات: ${esc(record.beneficiaries||"—")}</span>
        </div>
      </div>
    </div>

    ${labels.sections.filter(x=>x[1]).map(([h,v])=>`<div class="detail-section"><h3>${esc(h)}</h3><p>${esc(v)}</p></div>`).join("")}

    <div class="detail-section">
      <h3>الصور</h3>
      <div class="media-gallery">${gallery}</div>
    </div>

    <div class="detail-section">
      <h3>الملفات والمستندات</h3>
      <div class="file-list">${docLinks}</div>
    </div>

    ${external}

    <div class="add-attachments">
      <h3>إضافة مرفقات لهذا السجل</h3>
      <div class="attachment-grid">
        <label>إضافة صور<input id="detailImages" type="file" accept="image/*" multiple></label>
        <label>إضافة ملفات<input id="detailDocs" type="file" accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" multiple></label>
        <button id="saveDetailAttachments" class="btn btn-primary" type="button">حفظ المرفقات</button>
      </div>
      <div class="attachment-status" id="detailAttachmentStatus">المرفقات الجديدة تُضاف إلى السابقة، وأول صورة تصبح صورة الغلاف تلقائيًا</div>
    </div>

    <div class="detail-danger-zone">
      <button id="deleteCurrentRecord" class="record-delete-btn" type="button">${
        kind==="achievement" ? "حذف المنجز" : kind==="award" ? "حذف التكريم" : "حذف الشراكة"
      }</button>
    </div>
  `;

  content.querySelectorAll(".delete-attachment").forEach(btn=>btn.addEventListener("click",async ()=>{
    try{
      await deleteOneAttachment(kind,id,btn.dataset.path);
      await openDetails(kind,id);
    }catch(err){
      console.error(err);
      alert("تعذر حذف المرفق");
    }
  }));

  setupFileSelectionRemovers(content);

  const deleteCurrent=byId("deleteCurrentRecord");
  if(deleteCurrent){
    deleteCurrent.addEventListener("click",async ()=>{
      await deleteRecord(kind,id);
    });
  }

  const detailSaveBtn=byId("saveDetailAttachments");
  let detailBusy=false;
  detailSaveBtn.addEventListener("click",async ()=>{
    if(detailBusy) return;
    const status=byId("detailAttachmentStatus");
    const imageInput=byId("detailImages"), docInput=byId("detailDocs");
    const images=selectedFiles(imageInput), docs=selectedFiles(docInput);
    if(!images.length && !docs.length){
      status.textContent="اختاري صورة أو ملفًا أولًا";
      return;
    }
    detailBusy=true;
    detailSaveBtn.disabled=true;
    const oldText=detailSaveBtn.textContent;
    detailSaveBtn.textContent="جارٍ الرفع...";
    try{
      await saveSelectedFiles(
        parentKey(kind,id), images, docs,
        (done,total)=>{ status.textContent=done<total ? `جارٍ رفع المرفقات ${done} من ${total}...` : "اكتمل الرفع، جارٍ حفظ البيانات..."; }
      );
      clearSelectedFiles(content);
      status.textContent="تم رفع المرفقات وإضافتها إلى المرفقات السابقة بنجاح";
      setTimeout(()=>openDetails(kind,id),250);
    }catch(err){
      status.textContent="تعذر رفع بعض المرفقات. الملفات التي نجح رفعها محفوظة ولن تُرفع مرة أخرى";
      console.error(err);
    }finally{
      detailBusy=false;
      detailSaveBtn.disabled=false;
      detailSaveBtn.textContent=oldText;
    }
  });
}

function setupDetailDialog(){
  const dialog=byId("detailDialog");
  const close=byId("detailClose");
  if(close && dialog){
    close.addEventListener("click",()=>{
      if(typeof dialog.close==="function") dialog.close();
      else {
        dialog.removeAttribute("open");
        dialog.style.display="none";
      }
    });
  }
  if(dialog) dialog.addEventListener("click",e=>{
    if(e.target===dialog){
      if(typeof dialog.close==="function") dialog.close();
      else {
        dialog.removeAttribute("open");
        dialog.style.display="none";
      }
    }
  });
}

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g,c=>({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  })[c]);
}
function byId(id){ return document.getElementById(id); }

window.addEventListener("hashchange",render);
window.addEventListener("DOMContentLoaded",()=>{
  injectDetailsButtonStyle();
  showVersionBadge();
  setupDetailDialog();
  syncCloudAndRender();
});
