/* MANJAZ PARTNERS CLOUD 2.0
   Cloud-first storage for "الشراكة المجتمعية".
   - Supabase is the source of truth.
   - No new partner data is written to localStorage.
   - Existing legacy local partner rows are read only for one-time migration, then removed after successful migration.
   - Multiple images/files are cumulative.
   - Each attachment can be deleted or replaced independently.
*/
(()=>{"use strict";

const LEGACY_PARTNERS_KEY="manjaz_partners_v1";
const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const RECORDS_ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
const HEADERS={
  "apikey":SUPABASE_KEY,
  "Authorization":`Bearer ${SUPABASE_KEY}`,
  "Content-Type":"application/json"
};

let partnersCache=[];
let migrationRunning=false;
let activePartnerDetails=null;

const clean=s=>String(s??"").replace(/\s+/g," ").trim();
const safeParse=raw=>{try{const x=JSON.parse(raw||"[]");return Array.isArray(x)?x:[]}catch(_){return []}};

function normalizePartner(x){
  return {
    ...x,
    id:String(x?.id??""),
    title:clean(x?.title),
    partner:clean(x?.partner),
    type:clean(x?.type),
    startDate:clean(x?.startDate),
    endDate:clean(x?.endDate),
    beneficiaries:Number(x?.beneficiaries||0),
    goal:clean(x?.goal),
    description:clean(x?.description),
    impact:clean(x?.impact),
    status:x?.status||"تحت المراجعة",
    media:Array.isArray(x?.media)?x.media:[],
    coverUrl:x?.coverUrl||"",
    createdAt:x?.createdAt||new Date().toISOString()
  };
}

function cloudGetPartners(){ return partnersCache; }
function cloudSavePartners(items){
  partnersCache=Array.isArray(items)?items.map(normalizePartner):[];
}

try{
  window.getPartners=cloudGetPartners;
  window.savePartners=cloudSavePartners;
  getPartners=cloudGetPartners;
  savePartners=cloudSavePartners;
}catch(_){
  window.getPartners=cloudGetPartners;
  window.savePartners=cloudSavePartners;
}

function rowToPartner(row){
  const d=(row?.data&&typeof row.data==="object")?row.data:{};
  return normalizePartner({
    ...d,
    id:String(row.id),
    status:row.status||d.status||"تحت المراجعة",
    createdAt:d.createdAt||row.created_at||new Date().toISOString(),
    updatedAt:row.updated_at||d.updatedAt||row.created_at||new Date().toISOString(),
    _cloud:true,_kind:"partner"
  });
}

function mediaKey(x){ return String(x?.path||x?.clientKey||x?.url||""); }
function mergeMedia(existing=[],incoming=[]){
  const out=[],seen=new Set();
  [...existing,...incoming].forEach(x=>{
    if(!x) return;
    const k=mediaKey(x);
    if(k&&seen.has(k)) return;
    if(k) seen.add(k);
    out.push(x);
  });
  return out;
}

async function fetchPartnersCloud(){
  const p=new URLSearchParams({
    select:"id,kind,data,status,created_at,updated_at",
    kind:"eq.partner",
    order:"created_at.desc"
  });
  const r=await fetch(`${RECORDS_ENDPOINT}?${p.toString()}`,{headers:HEADERS,cache:"no-store"});
  if(!r.ok) throw new Error(`تعذر قراءة الشراكات السحابية (${r.status})`);
  const rows=await r.json();
  partnersCache=Array.isArray(rows)?rows.map(rowToPartner):[];
  return partnersCache;
}

async function fetchPartnerById(id){
  const p=new URLSearchParams({
    select:"id,kind,data,status,created_at,updated_at",
    id:`eq.${id}`,kind:"eq.partner",limit:"1"
  });
  const r=await fetch(`${RECORDS_ENDPOINT}?${p.toString()}`,{headers:HEADERS,cache:"no-store"});
  if(!r.ok) throw new Error(`تعذر قراءة بطاقة الشراكة (${r.status})`);
  const rows=await r.json();
  return Array.isArray(rows)&&rows[0]?rowToPartner(rows[0]):null;
}

async function insertPartnerCloud(item){
  const payload={
    kind:"partner",
    data:{...item},
    status:item.status||"تحت المراجعة",
    updated_at:new Date().toISOString()
  };
  const r=await fetch(RECORDS_ENDPOINT,{
    method:"POST",
    headers:{...HEADERS,"Prefer":"return=representation"},
    body:JSON.stringify(payload)
  });
  if(!r.ok){
    const t=await r.text().catch(()=> "");
    throw new Error(`تعذر حفظ الشراكة سحابيًا (${r.status}) ${t}`);
  }
  const rows=await r.json();
  if(!Array.isArray(rows)||!rows[0]) throw new Error("لم يرجع Supabase السجل المحفوظ");
  return rowToPartner(rows[0]);
}

async function patchPartnerExact(item){
  const payload={
    data:{...item},
    status:item.status||"تحت المراجعة",
    updated_at:new Date().toISOString()
  };
  const p=new URLSearchParams({id:`eq.${item.id}`,kind:"eq.partner"});
  const r=await fetch(`${RECORDS_ENDPOINT}?${p.toString()}`,{
    method:"PATCH",
    headers:{...HEADERS,"Prefer":"return=representation"},
    body:JSON.stringify(payload)
  });
  if(!r.ok){
    const t=await r.text().catch(()=> "");
    throw new Error(`تعذر تحديث الشراكة (${r.status}) ${t}`);
  }
  const rows=await r.json();
  return Array.isArray(rows)&&rows[0]?rowToPartner(rows[0]):normalizePartner(item);
}

/* Keep ordinary edit and attachment-add updates cloud-first and cumulative. */
try{
  const originalUpdateCloudRecord=updateCloudRecord;
  updateCloudRecord=async function(kind,item){
    if(kind!=="partner") return originalUpdateCloudRecord(kind,item);
    const latest=await fetchPartnerById(item.id).catch(()=>null);
    const merged={
      ...(latest||{}),...item,id:item.id,
      media:mergeMedia(latest?.media||[],item?.media||[])
    };
    if(!merged.coverUrl){
      const firstImage=merged.media.find(x=>x?.kind==="image");
      if(firstImage) merged.coverUrl=firstImage.url||"";
    }
    const saved=await originalUpdateCloudRecord(kind,merged);
    const normalized=normalizePartner(saved||merged);
    const i=partnersCache.findIndex(x=>String(x.id)===String(normalized.id));
    if(i>=0) partnersCache[i]=normalized; else partnersCache.unshift(normalized);
    return normalized;
  };
}catch(err){
  console.warn("تعذر تفعيل الدمج التراكمي لمرفقات الشراكة:",err);
}

function partnerSignature(x){
  return [clean(x?.title),clean(x?.partner),clean(x?.type),clean(x?.startDate),clean(x?.goal)].join("|");
}

async function migrateLegacyPartners(){
  if(migrationRunning) return;
  const legacy=safeParse(localStorage.getItem(LEGACY_PARTNERS_KEY));
  if(!legacy.length){
    try{localStorage.removeItem(LEGACY_PARTNERS_KEY)}catch(_){}
    return;
  }
  migrationRunning=true;
  try{
    const remote=await fetchPartnersCloud();
    const known=new Set(remote.map(partnerSignature));
    for(const old of legacy){
      const sig=partnerSignature(old);
      if(!sig||known.has(sig)) continue;
      try{
        const created=await insertPartnerCloud(normalizePartner(old));
        partnersCache.unshift(created);
        known.add(sig);
      }catch(err){
        console.warn("تعذر ترحيل شراكة محلية قديمة:",err);
        return; /* Keep legacy copy if migration is incomplete. */
      }
    }
    try{localStorage.removeItem(LEGACY_PARTNERS_KEY)}catch(_){}
  }finally{ migrationRunning=false; }
}

function getSelectedFiles(input){
  try{ if(typeof selectedFiles==="function") return selectedFiles(input); }catch(_){}
  return input?Array.from(input.files||[]):[];
}

function clearPartnerFiles(form){
  try{ if(typeof clearSelectedFiles==="function"){clearSelectedFiles(form);return;} }catch(_){}
  form?.querySelectorAll('input[type="file"]').forEach(i=>{try{i.value=""}catch(_){}});
}

async function uploadPartnerFiles(cloudItem,form,msg){
  const images=getSelectedFiles(form.elements.images);
  const docs=getSelectedFiles(form.elements.documents);
  if(!images.length&&!docs.length) return;
  await saveSelectedFiles(
    parentKey("partner",cloudItem.id),images,docs,
    (done,total)=>{if(msg) msg.textContent=`جارٍ رفع المرفقات ${done} من ${total}...`;}
  );
}

async function cloudPartnerSubmit(e){
  const form=e.currentTarget;
  if(form.dataset.partnerCloudBusy==="1"){
    e.preventDefault();e.stopImmediatePropagation();return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();
  if(!form.checkValidity()){form.reportValidity();return;}

  /* Read FormData before disabling fields. */
  const fd=new FormData(form);
  const msg=document.getElementById("partnerMsg");
  const controls=[...form.querySelectorAll("input,select,textarea,button")];
  form.dataset.partnerCloudBusy="1";
  controls.forEach(el=>el.disabled=true);

  try{
    const item=normalizePartner({
      title:fd.get("title"),
      partner:fd.get("partner"),
      type:fd.get("type"),
      startDate:fd.get("startDate"),
      endDate:fd.get("endDate"),
      beneficiaries:Number(fd.get("beneficiaries")||0),
      goal:fd.get("goal"),
      description:fd.get("description"),
      impact:fd.get("impact"),
      status:"تحت المراجعة",
      createdAt:new Date().toISOString(),
      media:[]
    });

    const required=[
      ["عنوان الشراكة",item.title],["الجهة الشريكة",item.partner],
      ["نوع الشراكة",item.type],["تاريخ البداية",item.startDate],
      ["الهدف",item.goal],["وصف التنفيذ",item.description],["الأثر",item.impact]
    ];
    const missing=required.filter(([,v])=>!String(v||"").trim()).map(([k])=>k);
    if(missing.length) throw new Error(`بيانات ناقصة: ${missing.join("، ")}`);

    if(msg){msg.className="success";msg.textContent="جارٍ حفظ الشراكة سحابيًا...";}
    const cloudItem=await insertPartnerCloud(item);
    partnersCache=[cloudItem,...partnersCache.filter(x=>String(x.id)!==String(cloudItem.id))];

    await uploadPartnerFiles(cloudItem,form,msg);
    await fetchPartnersCloud();
    clearPartnerFiles(form);

    if(msg){
      msg.className="success";
      msg.innerHTML=`<strong>تم الحفظ بنجاح</strong><br><span>تم حفظ الشراكة والمرفقات سحابيًا</span><br><button type="button" id="partnerCloudSuccessClose" class="btn btn-primary" style="margin-top:10px">إغلاق</button>`;
      msg.querySelector("#partnerCloudSuccessClose")?.addEventListener("click",()=>{
        form.reset();form.style.display="none";
        try{if(typeof render==="function") render();}catch(_){}
      });
    }
  }catch(err){
    console.error("Partner cloud save failed:",err);
    if(msg){
      msg.className="warning";
      msg.textContent="تعذر اكتمال الحفظ السحابي. لم يتم إنشاء نسخة محلية بديلة؛ تحققي من الاتصال ثم أعيدي المحاولة";
    }
    controls.forEach(el=>el.disabled=false);
    delete form.dataset.partnerCloudBusy;
  }
}

function enhancePartnerForm(){
  if((location.hash||"").slice(1)!=="partners") return;
  const form=document.getElementById("partnerForm");
  if(!form||form.dataset.partnersCloudReady==="1") return;
  form.dataset.partnersCloudReady="1";

  const imageInput=form.querySelector('input[name="images"]');
  const docInput=form.querySelector('input[name="documents"]');
  if(imageInput){imageInput.multiple=true;imageInput.accept="image/*";}
  if(docInput){
    docInput.multiple=true;
    docInput.accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx";
    const label=docInput.closest("label");
    if(label&&label.firstChild) label.firstChild.textContent="إضافة الملفات ";
  }
  try{if(typeof setupFileSelectionRemovers==="function")setupFileSelectionRemovers(form)}catch(_){}

  /* Capture phase blocks the old local submit handler. */
  form.addEventListener("submit",cloudPartnerSubmit,true);
  document.getElementById("cancelPartner")?.addEventListener("click",()=>{
    clearPartnerFiles(form);
    delete form.dataset.partnerCloudBusy;
  },true);
}

async function refreshPartnerRoute(){
  try{
    await fetchPartnersCloud();
    if((location.hash||"").slice(1)==="partners"){
      try{if(typeof render==="function")render()}catch(_){}
      setTimeout(()=>{
        enhancePartnerForm();
        bindPartnerDetails();
        enhanceOpenPartnerDetails();
      },40);
    }
  }catch(err){console.error("Partner cloud refresh failed:",err);}
}

async function deletePartnerAttachmentExact(path){
  if(!activePartnerDetails||!path) return false;
  const latest=await fetchPartnerById(activePartnerDetails.id);
  if(!latest) throw new Error("تعذر العثور على بطاقة الشراكة");
  const target=(latest.media||[]).find(x=>String(x?.path||"")===String(path));
  if(!target) return true;

  const ok=confirm(`حذف المرفق «${target.name||"ملف"}» فقط؟`);
  if(!ok) return false;

  const nextMedia=(latest.media||[]).filter(x=>String(x?.path||"")!==String(path));
  const updated={...latest,media:nextMedia};
  if(latest.coverUrl===target.url){
    const nextImage=nextMedia.find(x=>x?.kind==="image");
    updated.coverUrl=nextImage?.url||"";
  }
  const saved=await patchPartnerExact(updated);

  try{if(typeof deleteCloudMedia==="function")await deleteCloudMedia([target])}catch(err){
    console.warn("تعذر حذف الملف الفعلي بعد إزالة ربطه:",err);
  }

  const i=partnersCache.findIndex(x=>String(x.id)===String(saved.id));
  if(i>=0)partnersCache[i]=saved;
  activePartnerDetails=saved;
  return true;
}

async function replacePartnerAttachment(path,file){
  if(!activePartnerDetails||!path||!file) return;
  const latest=await fetchPartnerById(activePartnerDetails.id);
  if(!latest) throw new Error("تعذر العثور على بطاقة الشراكة");
  const old=(latest.media||[]).find(x=>String(x?.path||"")===String(path));
  if(!old) throw new Error("المرفق غير موجود");

  const kind=old.kind==="image"?"image":"document";
  const newRow=await uploadOneFile(parentKey("partner",latest.id),kind,file);

  const nextMedia=(latest.media||[]).map(x=>String(x?.path||"")===String(path)?newRow:x);
  const updated={...latest,media:nextMedia};
  if(latest.coverUrl===old.url) updated.coverUrl=newRow.url||"";

  let saved;
  try{
    saved=await patchPartnerExact(updated);
  }catch(err){
    try{if(typeof deleteCloudMedia==="function")await deleteCloudMedia([newRow])}catch(_){}
    throw err;
  }

  try{if(typeof deleteCloudMedia==="function")await deleteCloudMedia([old])}catch(err){
    console.warn("تعذر حذف الملف القديم بعد الاستبدال:",err);
  }

  const i=partnersCache.findIndex(x=>String(x.id)===String(saved.id));
  if(i>=0)partnersCache[i]=saved;
  activePartnerDetails=saved;
}

async function reopenPartnerDetails(){
  if(!activePartnerDetails) return;
  await fetchPartnersCloud();
  const fresh=partnersCache.find(x=>String(x.id)===String(activePartnerDetails.id));
  if(fresh)activePartnerDetails=fresh;
  if(typeof openDetails==="function"){
    await openDetails("partner",activePartnerDetails.id);
    setTimeout(enhanceOpenPartnerDetails,40);
  }
}

function enhanceOpenPartnerDetails(){
  if((location.hash||"").slice(1)!=="partners"||!activePartnerDetails) return;
  const content=document.getElementById("detailContent");
  if(!content) return;

  content.querySelectorAll(".delete-attachment").forEach(btn=>{
    if(btn.dataset.partnerEnhanced==="1") return;
    btn.dataset.partnerEnhanced="1";

    const replace=document.createElement("button");
    replace.type="button";
    replace.className="partner-replace-attachment";
    replace.textContent="استبدال";
    replace.style.cssText="border:1px solid #d7dce5;background:#fff;border-radius:8px;padding:8px;color:#0f5f59;margin-inline-start:6px";

    const input=document.createElement("input");
    input.type="file";
    input.style.display="none";

    const record=(activePartnerDetails.media||[]).find(x=>String(x?.path||"")===String(btn.dataset.path||""));
    input.accept=record?.kind==="image"?"image/*":".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

    replace.addEventListener("click",()=>input.click());
    input.addEventListener("change",async()=>{
      const file=input.files?.[0];
      if(!file)return;
      replace.disabled=true;
      const old=replace.textContent;
      replace.textContent="جارٍ الاستبدال...";
      try{
        await replacePartnerAttachment(btn.dataset.path,file);
        await reopenPartnerDetails();
      }catch(err){
        console.error(err);
        alert("تعذر استبدال المرفق. بقي المرفق السابق دون تغيير");
        replace.disabled=false;replace.textContent=old;
      }
    });

    btn.insertAdjacentElement("afterend",replace);
    replace.insertAdjacentElement("afterend",input);
  });

  const status=document.getElementById("detailAttachmentStatus");
  if(status)status.textContent="يمكن إضافة صور وملفات جديدة بشكل تراكمي، أو حذف/استبدال أي مرفق منفرد دون التأثير على بقية المرفقات";
}

function bindPartnerDetails(){
  if(document.documentElement.dataset.partnerCloudDetailsReady==="1") return;
  document.documentElement.dataset.partnerCloudDetailsReady="1";

  /* Identify the partner card before the app opens its detail dialog. */
  document.addEventListener("click",e=>{
    if((location.hash||"").slice(1)!=="partners") return;
    const btn=e.target.closest("#partnerList .details-btn");
    if(!btn)return;
    const card=btn.closest(".achievement-card");
    const cards=[...document.querySelectorAll("#partnerList .achievement-card")];
    const index=cards.indexOf(card);
    activePartnerDetails=index>=0?partnersCache[index]:null;
    if(activePartnerDetails){
      let tries=0;
      const t=setInterval(()=>{
        tries++;
        enhanceOpenPartnerDetails();
        if(document.getElementById("detailContent")?.querySelector(".partner-replace-attachment")||tries>30)clearInterval(t);
      },50);
    }
  },true);

  /* Exact per-attachment delete: stop app.js handler so a deleted media row is not merged back. */
  document.addEventListener("click",async e=>{
    if((location.hash||"").slice(1)!=="partners"||!activePartnerDetails)return;
    const btn=e.target.closest("#detailContent .delete-attachment");
    if(!btn)return;
    e.preventDefault();e.stopImmediatePropagation();
    btn.disabled=true;
    const old=btn.textContent;btn.textContent="جارٍ الحذف...";
    try{
      const deleted=await deletePartnerAttachmentExact(btn.dataset.path);
      if(!deleted){btn.disabled=false;btn.textContent=old;return;}
      await reopenPartnerDetails();
    }catch(err){
      console.error(err);
      alert("تعذر حذف المرفق. لم يتم حذف أي مرفق آخر");
      btn.disabled=false;btn.textContent=old;
    }
  },true);
}

function scheduleEnhance(){
  setTimeout(()=>{
    enhancePartnerForm();
    bindPartnerDetails();
    enhanceOpenPartnerDetails();
  },45);
}

addEventListener("hashchange",()=>{
  if((location.hash||"").slice(1)==="partners"){
    refreshPartnerRoute();
    scheduleEnhance();
  }
});

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",async()=>{
    await migrateLegacyPartners();
    await refreshPartnerRoute();
    scheduleEnhance();
  },{once:true});
}else{
  (async()=>{
    await migrateLegacyPartners();
    await refreshPartnerRoute();
    scheduleEnhance();
  })();
}

const view=document.getElementById("view");
if(view){
  let t;
  new MutationObserver(()=>{
    if((location.hash||"").slice(1)!=="partners")return;
    clearTimeout(t);
    t=setTimeout(()=>{
      enhancePartnerForm();
      bindPartnerDetails();
      enhanceOpenPartnerDetails();
    },40);
  }).observe(view,{childList:true,subtree:true});
}
})();