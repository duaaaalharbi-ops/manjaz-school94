/* MANJAZ TASK 13 — Independent administration Excel exports.
 * No write requests, candidate-engine changes, or certificate-issuance changes.
 * OOXML .xlsx is generated locally, with no third-party script dependency.
 */
(()=>{"use strict";
const VERSION="13.0";
const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const SESSION_KEY="manjaz_admin_auth_session_v1";
const ROUTES=new Set(["admin","admin-permissions"]);
const CERT_TYPES=[
  ["execution_teacher","شهادات التنفيذ - فئة معلمات"],
  ["thanks_student","شهادات الشكر - فئة طالبات"],
  ["thanks_teacher","شهادات الشكر - فئة معلمات"],
  ["parents","شهادات أولياء الأمور"]
];
const CERT_HEADERS=["الاسم كما سيظهر في الشهادة","العنوان كما سيظهر في الشهادة","وصف مختصر كما سيظهر في الشهادة","التاريخ كما سيظهر في الشهادة","المدة إن وجدت كما ستظهر في الشهادة"];
const RESERVE_HEADERS=["التاريخ الهجري","اليوم","الحصة","الفصل","المعلمة الغائبة","المعلمة المسددة","سبب الاحتياط","نوع الإسناد","حالة التكليف","تأكيد الاطلاع","تفعيل الموضوع","عنوان التفعيل","تجاوز القيود","القيود المتجاوزة","معرّف السجل"];
const HIJRI_MONTHS=["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
const HIJRI_FORMATTER=new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura",{calendar:"islamic-umalqura",timeZone:"Asia/Riyadh",year:"numeric",month:"numeric",day:"numeric"});
const HIJRI_DISPLAY=new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",{calendar:"islamic-umalqura",timeZone:"Asia/Riyadh",day:"numeric",month:"long",year:"numeric"});
const WEEKDAY=new Intl.DateTimeFormat("ar-SA",{timeZone:"Asia/Riyadh",weekday:"long"});
const html=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const xml=s=>String(s??"").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const safeName=s=>String(s).replace(/[\\/:*?"<>|]/g,"_").slice(0,90);
const route=()=>location.hash.split("&")[0].replace(/^#/,"")||"home";
function hijriParts(date){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(String(date||"")))return null;
  const parsed=new Date(`${date}T12:00:00+03:00`);
  if(Number.isNaN(parsed.valueOf()))return null;
  const parts=HIJRI_FORMATTER.formatToParts(parsed);
  const part=key=>Number(parts.find(p=>p.type===key)?.value||0);
  return {year:part("year"),month:part("month"),day:part("day"),parsed};
}
function readableHijri(date){const p=hijriParts(date);return p?HIJRI_DISPLAY.format(p.parsed):String(date||"");}
function currentHijri(){
  const d=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const v=k=>d.find(x=>x.type===k)?.value;
  return hijriParts(`${v("year")}-${v("month")}-${v("day")}`);
}
function monthLabel(key){const [year,month]=key.split("-").map(Number);return `${HIJRI_MONTHS[month-1]} ${year}هـ`;}
function monthKey(ym){return ym?`${ym.year}-${String(ym.month).padStart(2,"0")}`:"";}
function certificateCategory(record){
  const x=record.data||{};
  const val=String(x.requestType||x.certificateCategory||x.category||x.certificateType||x.type||"").toLowerCase();
  const person=String(x.audience||x.recipientType||x.recipientCategory||x.role||x.targetGroup||"").toLowerCase();
  const kind=String(record.kind||"").toLowerCase();
  if(["execution_teacher","thanks_student","thanks_teacher","parents"].includes(val))return val;
  if(/ولي|أولياء|parent|guardian/.test(`${val} ${person} ${kind}`))return "parents";
  if(/تنفيذ|execution/.test(`${val} ${kind}`))return "execution_teacher";
  if(/شكر|thanks|thank/.test(`${val} ${kind}`)){
    if(/طالبة|طالبات|student/.test(person+" "+val))return "thanks_student";
    if(/معلم|teacher/.test(person+" "+val))return "thanks_teacher";
  }
  return "";
}
function first(x,...keys){for(const k of keys){const v=x[k];if(v!==undefined&&v!==null&&String(v).trim())return String(v).trim();}return "";}
async function adminToken(){
  let s;try{s=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null")}catch(_){s=null}
  if(!s?.access_token)throw new Error("يلزم تسجيل الدخول أولًا من قسم «صلاحيات إدارية» أو إدارة الاحتياط اليومي.");
  if(Number(s.expires_at||0)&&Number(s.expires_at)<Date.now()/1000+40&&s.refresh_token){
    const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
      method:"POST",headers:{apikey:SUPABASE_KEY,"Content-Type":"application/json"},
      body:JSON.stringify({refresh_token:s.refresh_token})
    });
    if(!r.ok)throw new Error("انتهت الجلسة الإدارية؛ سجّلي الدخول من جديد.");
    const n=await r.json();s={...s,...n,expires_at:Math.floor(Date.now()/1000)+Number(n.expires_in||3600)};
    sessionStorage.setItem(SESSION_KEY,JSON.stringify(s));
  }
  const r=await fetch(`${SUPABASE_URL}/auth/v1/user`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${s.access_token}`},cache:"no-store"});
  if(!r.ok)throw new Error("انتهت صلاحية الدخول الإداري؛ سجّلي الدخول من جديد.");
  return s.access_token;
}
async function cloudRows(kinds,token){
  const all=[];
  for(const kind of kinds){
    for(let offset=0;offset<100000;offset+=500){
      const query=new URLSearchParams({select:"id,kind,status,data,created_at,updated_at",kind:`eq.${kind}`,order:"created_at.asc",limit:"500",offset:String(offset)});
      const r=await fetch(`${SUPABASE_URL}/rest/v1/records?${query}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`},cache:"no-store"});
      if(!r.ok)throw new Error(`تعذر قراءة سجلات ${kind} (${r.status}). لم يُنشأ ملف ناقص.`);
      const page=await r.json();
      if(!Array.isArray(page))throw new Error("استجابة سجلات البيانات غير صحيحة.");
      all.push(...page);
      if(page.length<500)break;
    }
  }
  return all;
}
/* Self-contained, ZIP-STORED, UTF-8 Office Open XML workbook generator. */
const utf8=s=>new TextEncoder().encode(s);
const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
function crc32(a){let c=0xFFFFFFFF;for(const v of a)c=crcTable[(c^v)&255]^(c>>>8);return (c^0xFFFFFFFF)>>>0;}
function h16(view,off,n){view.setUint16(off,n,true)}
function h32(view,off,n){view.setUint32(off,n>>>0,true)}
function joinBytes(chunks){const result=new Uint8Array(chunks.reduce((s,b)=>s+b.length,0));let off=0;for(const b of chunks){result.set(b,off);off+=b.length;}return result;}
function packZip(entries){
  const local=[],central=[];let offset=0;
  entries.forEach(([file,text])=>{
    const name=utf8(file),content=utf8(text),crc=crc32(content);
    const head=new Uint8Array(30+name.length),h=new DataView(head.buffer);
    h32(h,0,0x04034b50);h16(h,4,20);h16(h,6,0x800);h16(h,8,0);
    h32(h,14,crc);h32(h,18,content.length);h32(h,22,content.length);h16(h,26,name.length);head.set(name,30);
    local.push(head,content);
    const cd=new Uint8Array(46+name.length),v=new DataView(cd.buffer);
    h32(v,0,0x02014b50);h16(v,4,20);h16(v,6,20);h16(v,8,0x800);h16(v,10,0);
    h32(v,16,crc);h32(v,20,content.length);h32(v,24,content.length);h16(v,28,name.length);h32(v,42,offset);cd.set(name,46);
    central.push(cd);offset+=head.length+content.length;
  });
  const centralDir=joinBytes(central),end=new Uint8Array(22),view=new DataView(end.buffer);
  h32(view,0,0x06054b50);h16(view,8,entries.length);h16(view,10,entries.length);
  h32(view,12,centralDir.length);h32(view,16,offset);
  return new Blob([...local,centralDir,end],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
}
function column(n){let s="";for(let k=n+1;k>0;k=Math.floor((k-1)/26))s=String.fromCharCode(65+(k-1)%26)+s;return s;}
function makeXlsx(headers,rows,sheetName){
  const all=[headers,...(rows.length?rows:[Array(headers.length).fill("")])];
  const widths=headers.map((h,i)=>Math.min(47,Math.max(17,h.length*1.22,rows.reduce((m,r)=>Math.max(m,String(r[i]??"").length*.8),0))));
  const cells=all.map((row,ri)=>`<row r="${ri+1}" ht="${ri===0?33:25}" customHeight="1">${headers.map((h,ci)=>{
    const v=String(row[ci]??"");return `<c r="${column(ci)}${ri+1}" t="inlineStr" s="${ri===0?1:0}"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  }).join("")}</row>`).join("");
  const range=`A1:${column(headers.length-1)}${all.length}`;
  const worksheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${range}"/><sheetViews><sheetView workbookViewId="0" rightToLeft="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${cells}</sheetData><autoFilter ref="${range}"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Arial"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B5767"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf></cellXfs></styleSheet>`;
  return packZip([
    ["[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels",`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="${xml(sheetName.slice(0,31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml",styles],["xl/worksheets/sheet1.xml",worksheet]
  ]);
}
function download(blob,filename){
  const url=URL.createObjectURL(blob);const anchor=document.createElement("a");
  anchor.href=url;anchor.download=safeName(filename);anchor.style.display="none";document.body.appendChild(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),25000);
}
function certificateRow(r){
  const d=r.data||{};
  return [
    first(d,"name","recipientName","beneficiaryName","teacherName","studentName","parentName","recipient"),
    first(d,"title","activityTitle","occasion","subject"),
    first(d,"shortDescription","description","reason","impact","summary","text"),
    (()=>{const value=first(d,"dateDisplay","printedDate","dateLabel","dateText","date","activityDate","certificateDate","startDate");return hijriParts(value)?readableHijri(value):value;})(),
    first(d,"durationLabel","duration","periodLabel","trainingHours","hours")
  ];
}
function reserveRow(r){
  const a=r.data||{},hp=hijriParts(a.date),warnings=Array.isArray(a.manualOverrideWarnings)?a.manualOverrideWarnings:[];
  return [hp?readableHijri(a.date):"",hp?WEEKDAY.format(hp.parsed):"",String(a.period||""),a.className||"",a.absentTeacherName||"",a.assignedTeacherName||"",a.reason||"",a.manual===true?"يدوي":"آلي",a.published===true?"معتمد":(a.status||"مسودة"),a.ackAt?"تم الاطلاع":"لم يؤكد",a.activationTitle?"تم التفعيل":"لم يُفعّل",a.activationTitle||"",a.manualOverride===true?"نعم":"لا",warnings.join(" | "),String(r.id||"")];
}
function style(){
 if(document.getElementById("mj13Css"))return;
 const s=document.createElement("style");s.id="mj13Css";s.textContent=`
 .mj13-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,310px),1fr));gap:16px;margin:18px 0 22px;direction:rtl}
 .mj13-card{border:1px solid #d5e5e7;background:#fff;border-radius:15px;padding:18px;box-shadow:0 4px 16px rgba(8,53,71,.05);display:flex;flex-direction:column;gap:11px;min-width:0}
 .mj13-card h3{margin:0;color:#0b3047;font-size:19px;line-height:1.55}.mj13-card p{margin:0;color:#53717c;line-height:1.65;font-size:13px}
 .mj13-card label{font-weight:700;color:#0b3047;display:grid;gap:8px;font-size:13px}
 .mj13-card select{width:100%;max-width:100%;padding:11px;border-radius:8px;border:1px solid #bfd5d8;background:white;color:#0b3047;font:inherit}
 .mj13-card button{width:100%;min-height:44px;white-space:normal}.mj13-card button:disabled{opacity:.6;cursor:wait}
 .mj13-status{font-size:12px;min-height:18px;color:#0a6567;line-height:1.5;white-space:normal}
 `;document.head.append(s);
}
function cardMarkup(){
  const current=currentHijri();
  const year=current?.year||1448;
  return `<section id="mj13ExportCards" class="mj13-cards" aria-label="تصديرات الإدارة - التحديث الثالث عشر" data-mj13-version="${VERSION}">
  <article class="mj13-card"><h3>الاحتياط اليومي</h3><p>استخراج ملف Excel بالتكليفات المحفوظة لكل شهر هجري، بما فيها حالة الاعتماد والتحذيرات.</p><label>الشهر الهجري<select id="mj13ReserveMonth" aria-label="اختيار شهر الاحتياط">${Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,"0")}`).reverse().map(key=>`<option value="${key}" ${key===monthKey(current)?"selected":""}>${monthLabel(key)}</option>`).join("")}</select></label><button type="button" class="btn btn-primary" id="mj13ReserveDownload">استخراج Excel للشهر</button><div class="mj13-status" id="mj13ReserveStatus" role="status" aria-live="polite"></div></article>
  <article class="mj13-card"><h3>طلبات الشهادات</h3><p>ملف Excel لكل فئة، بأعمدة بيانات الشهادة الخمسة كما ستظهر عند الإصدار.</p><label>فئة الشهادات<select id="mj13CertType" aria-label="اختيار فئة طلبات الشهادات">${CERT_TYPES.map(([k,v])=>`<option value="${k}">${html(v)}</option>`).join("")}</select></label><button type="button" class="btn btn-primary" id="mj13CertificateDownload">استخراج Excel للفئة</button><div class="mj13-status" id="mj13CertStatus" role="status" aria-live="polite"></div></article>
  </section>`;
}
async function exportReserve(){
  const button=document.getElementById("mj13ReserveDownload"),msg=document.getElementById("mj13ReserveStatus"),select=document.getElementById("mj13ReserveMonth");
  if(!button||!select)return;
  button.disabled=true;msg.textContent="جارٍ تحميل تكليفات الشهر...";
  try{
    const token=await adminToken(),records=await cloudRows(["reserve_assignment"],token);
    const months=new Set(records.map(r=>monthKey(hijriParts(r.data?.date))).filter(Boolean));
    // New historical months from actual records are offered to select, without
    // removing the 12 months for the current Hijri year.
    populateReserveMonths(months);
    const key=select.value;
    const rows=records.filter(r=>monthKey(hijriParts(r.data?.date))===key&&r.status!=="ملغي")
      .sort((a,b)=>String(a.data?.date||"").localeCompare(String(b.data?.date||""))||Number(a.data?.period||0)-Number(b.data?.period||0)).map(reserveRow);
    download(makeXlsx(RESERVE_HEADERS,rows,"الاحتياط اليومي"),`منجز_الاحتياط_اليومي_${key}.xlsx`);
    msg.textContent=rows.length?`تم تجهيز ${rows.length} تكليفًا من ${monthLabel(key)}.`:`لا توجد تكليفات محفوظة في ${monthLabel(key)}؛ تم استخراج نموذج بعناوين الأعمدة.`;
  }catch(err){msg.textContent=err.message||"تعذر التصدير، ولم يُنشأ ملف ناقص.";console.error("MJ13 export reserve",err)}
  finally{button.disabled=false;}
}
function populateReserveMonths(extras){
  const sel=document.getElementById("mj13ReserveMonth");if(!sel)return;
  const selected=sel.value;
  const current=currentHijri();
  const keys=new Set(Array.from({length:12},(_,i)=>`${current?.year||1448}-${String(i+1).padStart(2,"0")}`));
  for(const k of extras)keys.add(k);
  sel.innerHTML=[...keys].sort((a,b)=>b.localeCompare(a)).map(k=>`<option value="${html(k)}">${html(monthLabel(k))}</option>`).join("");
  if(keys.has(selected))sel.value=selected;
}
async function exportCertificates(){
  const button=document.getElementById("mj13CertificateDownload"),msg=document.getElementById("mj13CertStatus"),sel=document.getElementById("mj13CertType");
  if(!button||!sel)return;
  const cat=sel.value,name=CERT_TYPES.find(([id])=>id===cat)?.[1]||"شهادات";
  button.disabled=true;msg.textContent="جارٍ مراجعة الطلبات المسجلة...";
  try{
    const token=await adminToken();
    const records=await cloudRows(["certificate_request","admin_certificate_request","certificate_request_execution","certificate_request_thanks","certificate_request_parent"],token);
    const rows=records.filter(r=>r.status!=="ملغي"&&certificateCategory(r)===cat).map(certificateRow);
    download(makeXlsx(CERT_HEADERS,rows,"طلبات الشهادات"),`منجز_طلبات_${name}.xlsx`);
    msg.textContent=rows.length?`تم استخراج ${rows.length} طلبًا من الفئة المختارة.`:"لا توجد طلبات مسجلة لهذه الفئة؛ تم تنزيل نموذج Excel فارغ قابل للتعبئة.";
  }catch(err){msg.textContent=err.message||"تعذر التصدير، ولم يُنشأ ملف ناقص.";console.error("MJ13 export cert",err)}
  finally{button.disabled=false;}
}
function bind(root){
  root.querySelector("#mj13ReserveDownload")?.addEventListener("click",exportReserve);
  root.querySelector("#mj13CertificateDownload")?.addEventListener("click",exportCertificates);
  // Populate historical Hijri months while preserving the existing selection.
  (async()=>{try{const token=await adminToken();const records=await cloudRows(["reserve_assignment"],token);if(root.isConnected)populateReserveMonths(new Set(records.map(r=>monthKey(hijriParts(r.data?.date))).filter(Boolean)));}catch(_){/* no admin session: current Hijri year remains selectable */}})();
}
function mount(){
  if(!ROUTES.has(route()))return;
  const view=document.getElementById("view");if(!view)return;
  if(view.querySelector("#mj13ExportCards"))return;
  let reference=null;
  if(route()==="admin")reference=view.querySelector("#adminList")?.closest("section");
  else if(view.querySelector("#adminPermissionsRoot #openExecutionTool"))reference=view.querySelector("#adminCertWorkspace");
  if(!reference)return;
  style();const container=document.createElement("div");container.innerHTML=cardMarkup();
  const cards=container.firstElementChild;
  if(route()==="admin")reference.parentElement?.insertBefore(cards,reference);
  else reference.parentElement?.insertBefore(cards,reference.nextSibling);
  bind(cards);
}
function boot(){
  const view=document.getElementById("view");if(!view)return;
  let running=false;
  const obs=new MutationObserver(()=>{if(running)return;running=true;try{mount()}finally{running=false;}});
  obs.observe(view,{childList:true,subtree:true});
  mount();addEventListener("hashchange",()=>queueMicrotask(mount));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
