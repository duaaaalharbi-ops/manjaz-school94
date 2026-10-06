/* MANJAZ UPDATE GUARDRAILS
   - Surgical change only; do not alter stable UI, routes, storage keys, certificates, or existing functions.
   - Preserve all historical certificate/export records; never clear, replace, or re-key prior data.
   - Maintain backward compatibility with records created by earlier audit versions.
   - Keep workshop/lesson certificate rendering and PDF output untouched.
   - Excel is generated on demand only; no PDF/XLSX files are stored in the database.
*/
/* MANJAZ CERTIFICATE AUDIT 1.0
   Records successful PDF saves for workshop and applied-lesson certificates,
   then exposes a cumulative admin log with Excel export.
*/
(()=>{"use strict";

const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const ENDPOINT=`${SUPABASE_URL}/rest/v1/records`;
const KIND="certificate_issue";
const HEADERS={
  "apikey":SUPABASE_KEY,
  "Authorization":`Bearer ${SUPABASE_KEY}`,
  "Content-Type":"application/json"
};

let activeWorkshopId="";
let activeLessonId="";

const clean=s=>String(s||"").replace(/\s+/g," ").trim();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function stripTitle(text){
  return clean(text)
    .replace(/^ورشة\s*[«"]?/,"")
    .replace(/^درس\s+تطبيقي\s*[«"]?/,"")
    .replace(/[»"]$/,"")
    .replace(/[«»]/g,"");
}

function workshopContext(){
  const name=clean(document.getElementById("certTeacherName")?.value);
  const paper=document.getElementById("certificatePaper");
  const title=stripTitle(paper?.querySelector(".cert-final-workshop")?.textContent||"");
  const attendance=clean(paper?.querySelector(".cert-final-attendance")?.textContent||"");
  const workshopId=clean(document.getElementById("certWorkshopId")?.value||activeWorkshopId);
  let date="";
  const m=attendance.match(/نُفذت\s+يوم\s+(.+?)(?:،\s*بواقع|$)/);
  if(m) date=clean(m[1]);
  return name&&title&&workshopId ? {
    certificateType:"ورشة تدريبية",
    activityId:workshopId,
    beneficiaryName:name,
    activityTitle:title,
    activityDate:date,
    issuedAt:new Date().toISOString()
  } : null;
}

function lessonContext(){
  const dialog=document.getElementById("lessonCertDialog");
  const name=clean(dialog?.querySelector("#lessonCertName")?.value);
  const paper=dialog?.querySelector("#lessonCertificatePaper");
  const title=stripTitle(paper?.querySelector(".cert-final-workshop")?.textContent||"");
  const attendance=clean(paper?.querySelector(".cert-final-attendance")?.textContent||"");
  const lessonId=clean(activeLessonId);
  let date="";
  const m=attendance.match(/بتاريخ\s+(.+?)(?:،\s*لمدة|$)/);
  if(m) date=clean(m[1]);
  return name&&title&&lessonId ? {
    certificateType:"درس تطبيقي",
    activityId:lessonId,
    beneficiaryName:name,
    activityTitle:title,
    activityDate:date,
    issuedAt:new Date().toISOString()
  } : null;
}

async function recordIssue(data){
  if(!data) return;
  const payload={
    kind:KIND,
    data,
    status:"معتمد",
    updated_at:new Date().toISOString()
  };
  try{
    const r=await fetch(ENDPOINT,{
      method:"POST",
      headers:{...HEADERS,"Prefer":"return=representation"},
      body:JSON.stringify(payload)
    });
    if(!r.ok){const t=await r.text().catch(()=> "");throw new Error(`HTTP ${r.status} ${t}`);}
  }catch(err){
    console.error("Certificate audit save failed:",err);
  }
}

function armFromDownloadButton(e){
  const lessonOpen=e.target?.closest?.(".lesson-cert-open,[data-lesson-cert-id]");
  if(lessonOpen?.dataset?.lessonCertId) activeLessonId=clean(lessonOpen.dataset.lessonCertId);

  const workshopOpen=e.target?.closest?.(".cert-choose[data-id]");
  if(workshopOpen?.dataset?.id) activeWorkshopId=clean(workshopOpen.dataset.id);

  const btn=e.target?.closest?.("#certDownloadBtn,#lessonCertDownload");
  if(!btn || btn.disabled) return;

  const data=btn.id==="certDownloadBtn" ? workshopContext() : lessonContext();
  if(!data) return;

  setTimeout(()=>recordIssue(data),0);
}

document.addEventListener("click",armFromDownloadButton,true);

function patchLessonCertificateOpen(){
  const original=window.openAppliedLessonCertificate;
  if(typeof original!=="function" || original.__manjazAuditWrapped) return;
  function wrappedLessonCertificateOpen(x){
    if(x?.id) activeLessonId=clean(x.id);
    return original.apply(this,arguments);
  }
  wrappedLessonCertificateOpen.__manjazAuditWrapped=true;
  window.openAppliedLessonCertificate=wrappedLessonCertificateOpen;
}
patchLessonCertificateOpen();
setInterval(patchLessonCertificateOpen,500);

async function fetchIssues(){
  const p=new URLSearchParams({
    select:"id,kind,data,status,created_at,updated_at",
    kind:`eq.${KIND}`,
    order:"created_at.desc"
  });
  const r=await fetch(`${ENDPOINT}?${p.toString()}`,{headers:HEADERS});
  if(!r.ok) throw new Error(`تعذر قراءة سجل الشهادات (${r.status})`);
  const rows=await r.json();
  return Array.isArray(rows) ? rows.map(row=>({
    id:String(row.id),
    beneficiaryName:clean(row.data?.beneficiaryName),
    certificateType:clean(row.data?.certificateType),
    activityId:clean(row.data?.activityId),
    activityTitle:clean(row.data?.activityTitle),
    activityDate:clean(row.data?.activityDate),
    issuedAt:row.data?.issuedAt || row.created_at || ""
  })) : [];
}

function formatDateTime(iso){
  if(!iso) return "";
  try{
    return new Intl.DateTimeFormat("ar-SA",{
      dateStyle:"medium",
      timeStyle:"short",
      timeZone:"Asia/Riyadh"
    }).format(new Date(iso));
  }catch(_){return iso;}
}

function availableWorkshops(){
  const out=[];
  try{
    const base=Array.isArray(window.MANJAZ_CERTIFICATE_WORKSHOPS)?window.MANJAZ_CERTIFICATE_WORKSHOPS:[];
    const managed=JSON.parse(localStorage.getItem("manjaz_workshops_managed_v1")||"[]");
    const m=Array.isArray(managed)?managed:[];
    const map=new Map(m.map(x=>[String(x.id),x]));
    const merged=[...base.map(x=>map.get(String(x.id))||x),...m.filter(x=>!base.some(b=>String(b.id)===String(x.id)))];
    merged.filter(x=>x&&x.available!==false&&x.availability!=="unavailable"&&x.availability!=="hidden")
      .forEach(x=>{
        const id=clean(x.id),title=clean(x.title);
        if(id&&title) out.push({id,title,date:clean(x.date)});
      });
  }catch(_){}
  return out;
}

function availableLessons(){
  const out=[];
  try{
    const base=Array.isArray(window.MANJAZ_APPLIED_LESSONS)?window.MANJAZ_APPLIED_LESSONS:[];
    const managed=JSON.parse(localStorage.getItem("manjaz_applied_lessons_managed_v1")||"[]");
    const m=Array.isArray(managed)?managed:[];
    const map=new Map(m.map(x=>[String(x.id),x]));
    const merged=[...base.map(x=>map.get(String(x.id))||x),...m.filter(x=>!base.some(b=>String(b.id)===String(x.id)))];
    merged.filter(x=>x&&x.available!==false&&x.availability!=="unavailable"&&x.availability!=="hidden")
      .forEach(x=>{
        const id=clean(x.id),title=clean(x.lessonName||x.title);
        if(id&&title) out.push({id,title,date:clean(x.date)});
      });
  }catch(_){}
  return out;
}

function uniqById(items){
  const map=new Map();
  items.forEach(x=>{
    const id=clean(x.id);
    if(!id) return;
    if(!map.has(id)) map.set(id,{id,title:clean(x.title),date:clean(x.date)});
  });
  return [...map.values()];
}

function databaseSectionHTML(kind,idPrefix,title){
  return `<section id="${idPrefix}Panel" class="surface panel" style="margin-top:18px">
    <div class="panel-head">
      <h3>${title}</h3>
    </div>
    <div class="form-grid" style="margin-top:12px">
      <label class="wide">${kind==="ورشة تدريبية"?"اختيار الورشة":"اختيار الدرس التطبيقي"}
        <select id="${idPrefix}Select">
          <option value="">اختاري من القائمة</option>
        </select>
      </label>
    </div>
    <div class="section-actions" style="margin-top:12px">
      <button type="button" class="btn btn-primary" id="${idPrefix}Excel" disabled>
        ${kind==="ورشة تدريبية"?"تصدير Excel للورشة المحددة":"تصدير Excel للدرس المحدد"}
      </button>
    </div>
  </section>`;
}

function adminPanelHTML(){
  return `
    ${databaseSectionHTML("ورشة تدريبية","workshopAudit","قاعدة بيانات إصدار شهادات الورش")}
    ${databaseSectionHTML("درس تطبيقي","lessonAudit","قاعدة بيانات إصدار شهادات حضور الدروس التطبيقية")}
  `;
}

let lastRows=[];

function activityCatalog(kind){
  const available=kind==="ورشة تدريبية"?availableWorkshops():availableLessons();
  const fromRows=lastRows.filter(x=>x.certificateType===kind&&x.activityId)
    .map(x=>({id:x.activityId,title:x.activityTitle,date:x.activityDate}));
  return uniqById([...available,...fromRows]);
}

function rowsForId(kind,id){
  const selected=activityCatalog(kind).find(x=>clean(x.id)===clean(id));
  const selectedTitle=clean(selected?.title);
  return lastRows.filter(x=>{
    if(x.certificateType!==kind) return false;
    if(clean(x.activityId)===clean(id)) return true;
    if(kind==="درس تطبيقي" && !clean(x.activityId) && selectedTitle && clean(x.activityTitle)===selectedTitle) return true;
    return false;
  });
}

function populateSelector(kind,idPrefix){
  const select=document.getElementById(`${idPrefix}Select`);
  if(!select) return;
  const current=select.value;
  const items=activityCatalog(kind);
  select.innerHTML=`<option value="">اختاري من القائمة</option>`+
    items.map(x=>`<option value="${esc(x.id)}">${esc(x.title)}${x.date?` — ${esc(x.date)}`:""}</option>`).join("");
  if(items.some(x=>x.id===current)) select.value=current;
}

function renderSelected(kind,idPrefix){
  const select=document.getElementById(`${idPrefix}Select`);
  const excel=document.getElementById(`${idPrefix}Excel`);
  if(!select||!excel) return;
  const id=clean(select.value);
  if(!id){ excel.disabled=true; return; }
  excel.disabled=false;
}

function drawRows(rows){
  lastRows=rows;
  populateSelector("ورشة تدريبية","workshopAudit");
  populateSelector("درس تطبيقي","lessonAudit");
  renderSelected("ورشة تدريبية","workshopAudit");
  renderSelected("درس تطبيقي","lessonAudit");
}

async function refreshAdminAudit(){
  try{
    const rows=await fetchIssues();
    drawRows(rows);
  }catch(err){
    console.error(err);
  }
}

function ensureXlsx(){
  return new Promise((resolve,reject)=>{
    if(window.XLSX) return resolve();
    let s=[...document.scripts].find(x=>x.src.includes("xlsx.full.min.js"));
    if(!s){
      s=document.createElement("script");
      s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
      s.async=true;
      document.head.appendChild(s);
    }
    s.addEventListener("load",resolve,{once:true});
    s.addEventListener("error",reject,{once:true});
  });
}

async function exportSelectedExcel(kind,idPrefix){
  const select=document.getElementById(`${idPrefix}Select`);
  const btn=document.getElementById(`${idPrefix}Excel`);
  const id=clean(select?.value);
  if(!id) return;
  if(btn) btn.disabled=true;
  try{
    if(!lastRows.length) lastRows=await fetchIssues();
    const item=activityCatalog(kind).find(x=>x.id===id);
    const rows=rowsForId(kind,id);
    await ensureXlsx();

    const data=rows.map((x,i)=>({
      "م":i+1,
      "اسم المستفيدة":x.beneficiaryName,
      "تاريخ النشاط":x.activityDate||"",
      "تاريخ ووقت إصدار الشهادة":formatDateTime(x.issuedAt),
      "التحقق من الحضور":""
    }));

    const ws=data.length
      ? XLSX.utils.json_to_sheet(data)
      : XLSX.utils.aoa_to_sheet([["م","اسم المستفيدة","تاريخ النشاط","تاريخ ووقت إصدار الشهادة","التحقق من الحضور"]]);

    ws["!cols"]=[{wch:6},{wch:30},{wch:20},{wch:28},{wch:20}];
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,kind==="ورشة تدريبية"?"سجل الورشة":"سجل الدرس");

    const safe=clean(item?.title||id).replace(/[\\/:*?"<>|]+/g,"-").slice(0,80);
    const prefix=kind==="ورشة تدريبية"?"شهادات الورشة":"شهادات الدرس";
    XLSX.writeFile(wb,`${prefix} - ${safe}.xlsx`);
  }catch(err){
    console.error(err);
    alert("تعذر إنشاء ملف Excel، تحققي من الاتصال ثم أعيدي المحاولة.");
  }finally{
    if(btn) btn.disabled=false;
  }
}

function mountAdminAudit(){
  if((location.hash||"").slice(1)!=="admin") return;
  const view=document.getElementById("view");
  if(!view) return;
  if(!document.getElementById("workshopAuditPanel")){
    view.insertAdjacentHTML("beforeend",adminPanelHTML());

    document.getElementById("workshopAuditSelect")?.addEventListener("change",()=>renderSelected("ورشة تدريبية","workshopAudit"));
    document.getElementById("lessonAuditSelect")?.addEventListener("change",()=>renderSelected("درس تطبيقي","lessonAudit"));
    document.getElementById("workshopAuditExcel")?.addEventListener("click",()=>exportSelectedExcel("ورشة تدريبية","workshopAudit"));
    document.getElementById("lessonAuditExcel")?.addEventListener("click",()=>exportSelectedExcel("درس تطبيقي","lessonAudit"));
  }
  refreshAdminAudit();
}

let mountTimer;
function scheduleMount(){
  clearTimeout(mountTimer);
  mountTimer=setTimeout(mountAdminAudit,80);
}

addEventListener("hashchange",scheduleMount);
if(document.readyState==="loading"){
  document.addEventListener("DOMContentLoaded",()=>{
    const view=document.getElementById("view");
    if(view) new MutationObserver(scheduleMount).observe(view,{childList:true,subtree:true});
    scheduleMount();
  },{once:true});
}else{
  const view=document.getElementById("view");
  if(view) new MutationObserver(scheduleMount).observe(view,{childList:true,subtree:true});
  scheduleMount();
}
})();
