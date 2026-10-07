/* MANJAZ APPLIED LESSONS CLOUD 1.0
   Surgical data-layer update only.
   - Keeps the existing lesson UI and certificate code untouched.
   - Preserves lesson IDs so historical certificate_issue / Excel records stay linked.
   - Migrates legacy local lessons once, then uses Supabase as the shared source.
   - Does not read, write, delete, or re-key certificate_issue records.
*/
(()=>{"use strict";

const STORE="manjaz_applied_lessons_managed_v1";
const LEGACY_STORE="manjaz_public_section_submissions_v1";
const MIGRATION_FLAG="manjaz_applied_lessons_cloud_migrated_v1";
const CLOUD_KIND="applied_lesson";
const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
const HEADERS={
  "apikey":SUPABASE_KEY,
  "Authorization":`Bearer ${SUPABASE_KEY}`,
  "Content-Type":"application/json"
};

let ready=false;
let syncing=false;
let cloudRows=[];
let lastLocalSignature="";
let pullTimer=null;
let localPollTimer=null;
const pendingDeleteIds=new Set();

const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const safeParse=(raw,fallback=[])=>{try{const x=JSON.parse(raw);return x??fallback}catch(_){return fallback}};
const lessonId=x=>clean(x?.id);
const normalize=x=>({
  ...x,
  id:lessonId(x),
  lessonName:clean(x?.lessonName||x?.title),
  title:clean(x?.title||x?.lessonName),
  subject:clean(x?.subject),
  grade:clean(x?.grade),
  date:clean(x?.date),
  teacher:clean(x?.teacher),
  strategies:clean(x?.strategies),
  link:clean(x?.link||x?.url||x?.achievementUrl),
  status:x?.status||"معتمد",
  available:x?.available!==false,
  availability:x?.availability||"available"
});

function readLocal(){
  const x=safeParse(localStorage.getItem(STORE)||"[]",[]);
  return Array.isArray(x)?x.map(normalize).filter(x=>x.id):[];
}
function writeLocal(items){
  const normalized=dedupe(items.map(normalize).filter(x=>x.id));
  localStorage.setItem(STORE,JSON.stringify(normalized));
  lastLocalSignature=signature(normalized);
}
function legacyApprovedLessons(){
  const all=safeParse(localStorage.getItem(LEGACY_STORE)||"[]",[]);
  if(!Array.isArray(all)) return [];
  return all.filter(x=>x&&x.kind==="lessons"&&x.status==="معتمد"&&!x._deletedBase)
    .map(normalize).filter(x=>x.id);
}
function dedupe(items){
  const map=new Map();
  items.forEach(x=>{const id=lessonId(x);if(id)map.set(id,{...(map.get(id)||{}),...x,id});});
  return [...map.values()];
}
function signature(items){
  return JSON.stringify(dedupe(items).map(x=>({
    id:x.id,lessonName:x.lessonName,title:x.title,subject:x.subject,grade:x.grade,date:x.date,
    teacher:x.teacher,strategies:x.strategies,link:x.link,status:x.status,
    available:x.available,availability:x.availability
  })).sort((a,b)=>a.id.localeCompare(b.id)));
}
function cloudLessons(){
  return dedupe(cloudRows.map(r=>normalize(r.data))).filter(x=>x.id);
}
function publishCloudCache(){
  window.MANJAZ_CLOUD_APPLIED_LESSONS=cloudLessons().map(x=>({...x}));
}

async function fetchCloud(){
  const p=new URLSearchParams({
    select:"id,kind,data,status,created_at,updated_at",
    kind:`eq.${CLOUD_KIND}`,
    order:"created_at.asc"
  });
  const r=await fetch(`${ENDPOINT}?${p.toString()}`,{headers:HEADERS,cache:"no-store"});
  if(!r.ok) throw new Error(`تعذر قراءة الدروس المشتركة (${r.status})`);
  const rows=await r.json();
  cloudRows=Array.isArray(rows)?rows.filter(x=>lessonId(x?.data)):[];
  publishCloudCache();
  return cloudRows;
}
async function createCloudLesson(x){
  const lesson=normalize(x);
  const payload={kind:CLOUD_KIND,data:lesson,status:"معتمد",updated_at:new Date().toISOString()};
  const r=await fetch(ENDPOINT,{method:"POST",headers:{...HEADERS,"Prefer":"return=representation"},body:JSON.stringify(payload)});
  if(!r.ok) throw new Error(`تعذر حفظ الدرس المشترك (${r.status})`);
  const rows=await r.json().catch(()=>[]);
  if(Array.isArray(rows)&&rows[0]) cloudRows.push(rows[0]);
}
async function patchCloudLesson(rowId,x){
  const p=new URLSearchParams({id:`eq.${rowId}`,kind:`eq.${CLOUD_KIND}`});
  const payload={data:normalize(x),status:"معتمد",updated_at:new Date().toISOString()};
  const r=await fetch(`${ENDPOINT}?${p.toString()}`,{method:"PATCH",headers:{...HEADERS,"Prefer":"return=representation"},body:JSON.stringify(payload)});
  if(!r.ok) throw new Error(`تعذر تحديث الدرس المشترك (${r.status})`);
}
async function deleteCloudRow(rowId){
  const p=new URLSearchParams({id:`eq.${rowId}`,kind:`eq.${CLOUD_KIND}`});
  const r=await fetch(`${ENDPOINT}?${p.toString()}`,{method:"DELETE",headers:{...HEADERS,"Prefer":"return=minimal"}});
  if(!r.ok) throw new Error(`تعذر حذف الدرس المشترك (${r.status})`);
}

async function migrateOnce(){
  const local=dedupe([...readLocal(),...legacyApprovedLessons()]);
  const cloud=cloudLessons();
  const cloudIds=new Set(cloud.map(x=>x.id));
  for(const x of local){
    if(!cloudIds.has(x.id)){
      await createCloudLesson(x);
      cloudIds.add(x.id);
    }
  }
  localStorage.setItem(MIGRATION_FLAG,"1");
  await fetchCloud();
  writeLocal(dedupe([...local,...cloudLessons()]));
}

async function cloudAuthoritativePull(){
  await fetchCloud();
  const cloud=cloudLessons();
  writeLocal(cloud);
  if((location.hash||"").slice(1)==="lessons") window.wireAppliedLessons?.();
}

async function syncLocalToCloud(){
  if(!ready||syncing) return;
  const local=readLocal();
  const sig=signature(local);
  if(sig===lastLocalSignature) return;
  syncing=true;
  try{
    const remoteByLesson=new Map();
    cloudRows.forEach(row=>{
      const id=lessonId(row?.data);
      if(id&&!remoteByLesson.has(id)) remoteByLesson.set(id,row);
    });
    const localById=new Map(local.map(x=>[x.id,x]));

    for(const [id,x] of localById){
      const row=remoteByLesson.get(id);
      if(row){
        if(signature([normalize(row.data)])!==signature([x])) await patchCloudLesson(row.id,x);
      }else{
        await createCloudLesson(x);
      }
    }
    for(const [id,row] of remoteByLesson){
      if(!localById.has(id)&&pendingDeleteIds.has(id)){
        await deleteCloudRow(row.id);
        pendingDeleteIds.delete(id);
      }
    }
    await fetchCloud();
    writeLocal(cloudLessons());
    if((location.hash||"").slice(1)==="lessons") window.wireAppliedLessons?.();
  }catch(err){
    console.error("Applied lessons cloud sync failed:",err);
  }finally{
    syncing=false;
  }
}

async function start(){
  try{
    await fetchCloud();
    if(localStorage.getItem(MIGRATION_FLAG)!=="1"){
      await migrateOnce();
    }else{
      writeLocal(cloudLessons());
    }
    ready=true;
    lastLocalSignature=signature(readLocal());
    if((location.hash||"").slice(1)==="lessons") window.wireAppliedLessons?.();

    localPollTimer=setInterval(syncLocalToCloud,700);
    pullTimer=setInterval(async()=>{
      if(syncing) return;
      try{await cloudAuthoritativePull()}catch(err){console.error("Applied lessons cloud refresh failed:",err)}
    },20000);
  }catch(err){
    console.error("Applied lessons cloud unavailable; local fallback kept:",err);
    ready=false;
    if((location.hash||"").slice(1)==="lessons") window.wireAppliedLessons?.();
  }
}


// Only an explicit click on the existing lesson delete control may delete the shared record.
// An empty/cleared localStorage must never be interpreted as permission to wipe cloud data.
document.addEventListener("click",e=>{
  const btn=e.target?.closest?.(".applied-lesson-card .cert-mini-action.danger.delete");
  const card=btn?.closest?.("[data-lesson-id]");
  const id=clean(card?.getAttribute?.("data-lesson-id"));
  if(!id) return;
  pendingDeleteIds.add(id);
  setTimeout(()=>{if(readLocal().some(x=>x.id===id)) pendingDeleteIds.delete(id)},1500);
},true);

addEventListener("hashchange",()=>{
  if((location.hash||"").slice(1)==="lessons"&&ready){
    setTimeout(()=>cloudAuthoritativePull().catch(err=>console.error("Applied lessons cloud refresh failed:",err)),0);
  }
});
addEventListener("focus",()=>{
  if(ready&&!syncing) cloudAuthoritativePull().catch(()=>{});
});

if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",start,{once:true});
else start();
})();
