/* MANJAZ AWARDS CLOUD 1.0
   Cloud-first storage for "التكريمات وشهادات الشكر".
   - Supabase is the source of truth.
   - No new award data is written to localStorage.
   - Existing legacy local awards are migrated once when possible, then the legacy local copy is removed.
   - Existing UI, edit/delete/details actions, and card identity remain unchanged.
   - Supports multiple images + multiple files on the same award card.
*/
(()=>{"use strict";

const LEGACY_AWARDS_KEY="manjaz_awards_v1";
const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const RECORDS_ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
const HEADERS={
  "apikey":SUPABASE_KEY,
  "Authorization":`Bearer ${SUPABASE_KEY}`,
  "Content-Type":"application/json"
};

let awardsCache=[];
let migrationRunning=false;

const clean=s=>String(s??"").replace(/\s+/g," ").trim();
const safeParse=raw=>{try{const x=JSON.parse(raw||"[]");return Array.isArray(x)?x:[]}catch(_){return []}};

function normalizeAward(x){
  return {
    ...x,
    id:String(x?.id??""),
    title:clean(x?.title),
    type:clean(x?.type),
    grantor:clean(x?.grantor),
    recipient:clean(x?.recipient),
    date:clean(x?.date),
    beneficiaries:Number(x?.beneficiaries||0),
    summary:clean(x?.summary),
    reason:clean(x?.reason),
    impact:clean(x?.impact),
    status:x?.status||"تحت المراجعة",
    media:Array.isArray(x?.media)?x.media:[],
    coverUrl:x?.coverUrl||"",
    createdAt:x?.createdAt||new Date().toISOString()
  };
}

function cloudGetAwards(){
  return awardsCache;
}
function cloudSaveAwards(items){
  awardsCache=Array.isArray(items)?items.map(normalizeAward):[];
}

function mediaKey(x){
  return String(x?.path || x?.clientKey || x?.url || "");
}
function mergeMedia(existing=[],incoming=[]){
  const out=[];
  const seen=new Set();
  [...existing,...incoming].forEach(x=>{
    if(!x) return;
    const k=mediaKey(x);
    if(k && seen.has(k)) return;
    if(k) seen.add(k);
    out.push(x);
  });
  return out;
}
async function fetchAwardById(id){
  const p=new URLSearchParams({
    select:"id,kind,data,status,created_at,updated_at",
    id:`eq.${id}`,
    kind:"eq.award",
    limit:"1"
  });
  const r=await fetch(`${RECORDS_ENDPOINT}?${p.toString()}`,{headers:HEADERS,cache:"no-store"});
  if(!r.ok) throw new Error(`تعذر قراءة بطاقة التكريم (${r.status})`);
  const rows=await r.json();
  return Array.isArray(rows)&&rows[0] ? rowToAward(rows[0]) : null;
}

/* Replace only the award collection's persistence layer.
   Other Manjaz sections keep their existing behavior. */
try{
  window.getAwards=cloudGetAwards;
  window.saveAwards=cloudSaveAwards;
  getAwards=cloudGetAwards;
  saveAwards=cloudSaveAwards;
}catch(_){
  window.getAwards=cloudGetAwards;
  window.saveAwards=cloudSaveAwards;
}

function rowToAward(row){
  const d=(row?.data&&typeof row.data==="object")?row.data:{};
  return normalizeAward({
    ...d,
    id:String(row.id),
    status:row.status||d.status||"تحت المراجعة",
    createdAt:d.createdAt||row.created_at||new Date().toISOString(),
    updatedAt:row.updated_at||d.updatedAt||row.created_at||new Date().toISOString(),
    _cloud:true,
    _kind:"award"
  });
}

async function fetchAwardsCloud(){
  const p=new URLSearchParams({
    select:"id,kind,data,status,created_at,updated_at",
    kind:"eq.award",
    order:"created_at.desc"
  });
  const r=await fetch(`${RECORDS_ENDPOINT}?${p.toString()}`,{headers:HEADERS,cache:"no-store"});
  if(!r.ok) throw new Error(`تعذر قراءة التكريمات السحابية (${r.status})`);
  const rows=await r.json();
  awardsCache=Array.isArray(rows)?rows.map(rowToAward):[];
  return awardsCache;
}

async function insertAwardCloud(item){
  const payload={
    kind:"award",
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
    throw new Error(`تعذر حفظ التكريم سحابيًا (${r.status}) ${t}`);
  }
  const rows=await r.json();
  if(!Array.isArray(rows)||!rows[0]) throw new Error("لم يرجع Supabase السجل المحفوظ");
  return rowToAward(rows[0]);
}

try{
  const originalUpdateCloudRecord=updateCloudRecord;
  updateCloudRecord=async function(kind,item){
    if(kind!=="award") return originalUpdateCloudRecord(kind,item);

    const latest=await fetchAwardById(item.id).catch(()=>null);
    const merged={
      ...(latest||{}),
      ...item,
      id:item.id,
      media:mergeMedia(latest?.media||[],item?.media||[])
    };
    if(!merged.coverUrl){
      const firstImage=merged.media.find(x=>x?.kind==="image");
      if(firstImage) merged.coverUrl=firstImage.url||"";
    }

    const saved=await originalUpdateCloudRecord(kind,merged);
    const normalized=normalizeAward(saved||merged);
    const i=awardsCache.findIndex(x=>String(x.id)===String(normalized.id));
    if(i>=0) awardsCache[i]=normalized;
    else awardsCache.unshift(normalized);
    return normalized;
  };
}catch(err){
  console.warn("تعذر تفعيل الدمج التراكمي لمرفقات التكريم:",err);
}

function awardSignature(x){
  return [
    clean(x?.title),
    clean(x?.type),
    clean(x?.grantor),
    clean(x?.recipient),
    clean(x?.date),
    clean(x?.reason)
  ].join("|");
}

async function migrateLegacyAwards(){
  if(migrationRunning) return;
  const legacy=safeParse(localStorage.getItem(LEGACY_AWARDS_KEY));
  if(!legacy.length){
    try{localStorage.removeItem(LEGACY_AWARDS_KEY)}catch(_){}
    return;
  }
  migrationRunning=true;
  try{
    const remote=await fetchAwardsCloud();
    const known=new Set(remote.map(awardSignature));
    for(const old of legacy){
      const sig=awardSignature(old);
      if(!sig || known.has(sig)) continue;
      try{
        const created=await insertAwardCloud(normalizeAward(old));
        awardsCache.unshift(created);
        known.add(sig);
      }catch(err){
        console.warn("تعذر ترحيل تكريم محلي قديم:",err);
        return; // keep legacy copy if any row could not be migrated
      }
    }
    try{localStorage.removeItem(LEGACY_AWARDS_KEY)}catch(_){}
  }finally{
    migrationRunning=false;
  }
}

function getSelectedFiles(input){
  try{
    if(typeof selectedFiles==="function") return selectedFiles(input);
  }catch(_){}
  return input ? Array.from(input.files||[]) : [];
}

function clearAwardFiles(form){
  try{
    if(typeof clearSelectedFiles==="function"){ clearSelectedFiles(form); return; }
  }catch(_){}
  form?.querySelectorAll('input[type="file"]').forEach(i=>{try{i.value=""}catch(_){}});
}

async function uploadAwardFiles(cloudItem,form,msg){
  const images=getSelectedFiles(form.elements.images);
  const docs=getSelectedFiles(form.elements.documents);
  if(!images.length&&!docs.length) return;

  if(typeof saveSelectedFiles!=="function" || typeof parentKey!=="function"){
    throw new Error("تعذر تشغيل رفع المرفقات");
  }

  await saveSelectedFiles(
    parentKey("award",cloudItem.id),
    images,
    docs,
    (done,total)=>{
      if(msg) msg.textContent=`جارٍ رفع المرفقات ${done} من ${total}...`;
    }
  );
}

async function cloudAwardSubmit(e){
  const form=e.currentTarget;
  if(form.dataset.awardCloudBusy==="1"){
    e.preventDefault();e.stopImmediatePropagation();return;
  }
  e.preventDefault();
  e.stopImmediatePropagation();

  if(!form.checkValidity()){
    form.reportValidity();
    return;
  }

  const msg=document.getElementById("awardMsg");
  const controls=[...form.querySelectorAll("input,select,textarea,button")];
  form.dataset.awardCloudBusy="1";
  controls.forEach(el=>el.disabled=true);

  try{
    const fd=new FormData(form);
    const item=normalizeAward({
      title:fd.get("title"),
      type:fd.get("type"),
      grantor:fd.get("grantor"),
      recipient:fd.get("recipient"),
      date:fd.get("date"),
      beneficiaries:Number(fd.get("beneficiaries")||0),
      summary:fd.get("summary"),
      reason:fd.get("reason"),
      impact:fd.get("impact"),
      status:"تحت المراجعة",
      createdAt:new Date().toISOString(),
      media:[]
    });

    if(msg){
      msg.className="success";
      msg.textContent="جارٍ حفظ التكريم سحابيًا...";
    }

    /* Save the record to Supabase FIRST. No local award write occurs. */
    const cloudItem=await insertAwardCloud(item);
    awardsCache=[cloudItem,...awardsCache.filter(x=>String(x.id)!==String(cloudItem.id))];

    /* Multiple images and multiple files stay attached to the same cloud row. */
    await uploadAwardFiles(cloudItem,form,msg);

    await fetchAwardsCloud();
    clearAwardFiles(form);

    if(msg){
      msg.className="success";
      msg.innerHTML=`<strong>تم الحفظ بنجاح</strong><br><span>تم حفظ التكريم والمرفقات في التخزين السحابي ويمكنك الآن تحديث الصفحة دون فقد البيانات</span><br><button type="button" id="awardCloudSuccessClose" class="btn btn-primary" style="margin-top:10px">إغلاق</button>`;
      msg.querySelector("#awardCloudSuccessClose")?.addEventListener("click",()=>{
        form.reset();
        form.style.display="none";
        try{ if(typeof render==="function") render(); }catch(_){}
      });
    }
  }catch(err){
    console.error("Award cloud save failed:",err);
    if(msg){
      msg.className="warning";
      msg.textContent="تعذر اكتمال الحفظ السحابي. لم يتم اعتماد نسخة محلية بديلة؛ تحققي من الاتصال ثم أعيدي المحاولة";
    }
    controls.forEach(el=>el.disabled=false);
    delete form.dataset.awardCloudBusy;
    return;
  }

  /* Keep the form locked after success until the explicit Close button is used. */
}

function enhanceAwardForm(){
  if((location.hash||"").slice(1)!=="awards") return;
  const form=document.getElementById("awardForm");
  if(!form || form.dataset.awardsCloudReady==="1") return;

  form.dataset.awardsCloudReady="1";

  if(!form.querySelector('[name="summary"]')){
    const reason=form.querySelector('[name="reason"]')?.closest("label");
    if(reason){
      const label=document.createElement("label");
      label.className="wide";
      label.innerHTML='موجز التكريم / شهادة الشكر<textarea name="summary" placeholder="اكتبي موجزًا واضحًا يظهر كاملًا في البطاقة"></textarea>';
      reason.insertAdjacentElement("beforebegin",label);
    }
  }

  const imageInput=form.querySelector('input[name="images"]');
  const docInput=form.querySelector('input[name="documents"]');
  if(imageInput){
    imageInput.multiple=true;
    imageInput.accept="image/*";
  }
  if(docInput){
    docInput.multiple=true;
    docInput.accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx";
    const label=docInput.closest("label");
    if(label&&label.firstChild) label.firstChild.textContent="إضافة الملفات ";
  }

  try{
    if(typeof setupFileSelectionRemovers==="function") setupFileSelectionRemovers(form);
  }catch(err){ console.warn("award file selector:",err); }

  /* Capture phase runs before the old local submit handler and blocks it. */
  form.addEventListener("submit",cloudAwardSubmit,true);

  document.getElementById("cancelAward")?.addEventListener("click",()=>{
    clearAwardFiles(form);
    delete form.dataset.awardCloudBusy;
  },true);
}

async function refreshAwardRoute(){
  try{
    await fetchAwardsCloud();
    if((location.hash||"").slice(1)==="awards"){
      try{ if(typeof render==="function") render(); }catch(_){}
      setTimeout(()=>{enhanceAwardForm();enhanceAwardCards();bindAwardDetailsEnhancer();},30);
    }
  }catch(err){
    console.error("Award cloud refresh failed:",err);
  }
}

function enhanceAwardCards(){
  if((location.hash||"").slice(1)!=="awards") return;
  const cards=[...document.querySelectorAll("#awardList .achievement-card")];
  cards.forEach((card,index)=>{
    const item=awardsCache[index];
    if(!item) return;
    const p=card.querySelector("p");
    if(!p) return;
    p.textContent=item.summary || item.reason || "";
    p.style.display="block";
    p.style.webkitLineClamp="unset";
    p.style.maxHeight="none";
    p.style.overflow="visible";
    p.style.whiteSpace="normal";
  });
}

let activeAwardDetails=null;

function awardFullDetailsHtml(item){
  const rows=[
    ["العنوان",item.title],
    ["النوع",item.type],
    ["الجهة المانحة",item.grantor],
    ["المكرَّمة / الفئة",item.recipient],
    ["التاريخ",item.date],
    ["عدد المستفيدات",item.beneficiaries || "—"],
    ["موجز التكريم / شهادة الشكر",item.summary],
    ["سبب التكريم",item.reason],
    ["الأثر / القيمة المضافة",item.impact]
  ].filter(([,value])=>String(value??"").trim()!=="");

  return `<div class="detail-section award-full-details" dir="rtl">
    <h3>تفاصيل التكريم / شهادة الشكر</h3>
    <div style="display:grid;gap:12px">
      ${rows.map(([label,value])=>`<div>
        <strong style="display:block;margin-bottom:4px">${esc(label)}</strong>
        <p style="margin:0;white-space:pre-wrap;overflow:visible;max-height:none;-webkit-line-clamp:unset">${esc(value)}</p>
      </div>`).join("")}
    </div>
  </div>`;
}

function injectActiveAwardDetails(){
  if(!activeAwardDetails) return;
  const content=document.getElementById("detailContent");
  if(!content) return;
  if(content.querySelector(".award-full-details")) return;

  const hero=content.querySelector(".detail-hero");
  const mediaSection=[...content.querySelectorAll(".detail-section")].find(x=>{
    const h=x.querySelector("h3")?.textContent?.trim();
    return h==="الصور" || h==="الملفات والمستندات";
  });

  const holder=document.createElement("div");
  holder.innerHTML=awardFullDetailsHtml(activeAwardDetails);
  const block=holder.firstElementChild;
  if(hero) hero.insertAdjacentElement("afterend",block);
  else if(mediaSection) mediaSection.insertAdjacentElement("beforebegin",block);
  else content.prepend(block);
}

function enhanceAwardAttachmentMessage(){
  if((location.hash||"").slice(1)!=="awards") return;
  const status=document.getElementById("detailAttachmentStatus");
  if(status) status.textContent="الصور والملفات الجديدة تُضاف تراكميًا إلى نفس البطاقة ولا تستبدل المرفقات السابقة";
}

function bindAwardDetailsEnhancer(){
  const list=document.getElementById("awardList");
  if(!list || list.dataset.awardDetailsReady==="1") return;
  list.dataset.awardDetailsReady="1";

  list.addEventListener("click",e=>{
    const btn=e.target.closest(".details-btn");
    if(!btn) return;
    const card=btn.closest(".achievement-card");
    const cards=[...list.querySelectorAll(".achievement-card")];
    const index=cards.indexOf(card);
    activeAwardDetails=index>=0 ? awardsCache[index] : null;
    if(!activeAwardDetails) return;

    let attempts=0;
    const timer=setInterval(()=>{
      attempts++;
      injectActiveAwardDetails();
      const content=document.getElementById("detailContent");
      if(content?.querySelector(".award-full-details")) enhanceAwardAttachmentMessage();
      if(content?.querySelector(".award-full-details") || attempts>30) clearInterval(timer);
    },50);
  },true);
}

function scheduleEnhance(){
  setTimeout(()=>{enhanceAwardForm();enhanceAwardCards();bindAwardDetailsEnhancer();},40);
}

addEventListener("hashchange",()=>{
  if((location.hash||"").slice(1)==="awards"){
    refreshAwardRoute();
    scheduleEnhance();
  }
});

if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",async()=>{
    await migrateLegacyAwards();
    await refreshAwardRoute();
    scheduleEnhance();
  },{once:true});
}else{
  (async()=>{
    await migrateLegacyAwards();
    await refreshAwardRoute();
    scheduleEnhance();
  })();
}

/* App rerenders #view after its own cloud refresh; remount only the award form hook. */
const view=document.getElementById("view");
if(view){
  let t;
  new MutationObserver(()=>{
    clearTimeout(t);
    t=setTimeout(()=>{enhanceAwardForm();enhanceAwardCards();bindAwardDetailsEnhancer();},35);
  }).observe(view,{childList:true,subtree:true});
}
})();