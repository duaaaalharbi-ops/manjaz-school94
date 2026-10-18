/* MANJAZ TASK 14 — Admin-only Excel exports + public private certificate requests.
 * Standalone request storage, authorized edits, and unchanged reserve/certificate engines.
 */
(()=>{"use strict";
const VERSION="14.0";
const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const SESSION_KEY="manjaz_admin_auth_session_v1";
const OWN_KEY="manjaz_certificate_own_requests_v14";
const REQUESTS_TABLE="manjaz_certificate_requests";
const ROUTES=new Set(["admin","admin-permissions"]);
const CERT_TYPES=[
  ["execution_teacher","شهادات التنفيذ - فئة معلمات"],
  ["thanks_student","شهادات الشكر - فئة طالبات"],
  ["thanks_teacher","شهادات الشكر - فئة معلمات"],
  ["parents","شهادات أولياء الأمور"],
  ["execution_staff","شهادات الهيكل الإداري – تنفيذ"],
  ["thanks_staff","شهادات الهيكل الإداري – شكر"]
];
const CERT_HEADERS=["الاسم كما سيظهر في الشهادة","العنوان كما سيظهر في الشهادة","وصف مختصر كما سيظهر في الشهادة","التاريخ كما سيظهر في الشهادة","المدة إن وجدت كما ستظهر في الشهادة","البريد الإلكتروني","الحالة","معاينة","إصدار"];
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
  if(["execution_teacher","thanks_student","thanks_teacher","parents","execution_staff","thanks_staff"].includes(val))return val;
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
  const withLinks=headers.length>2&&headers.at(-2)==="معاينة"&&headers.at(-1)==="إصدار";
  const widths=headers.map((h,i)=>withLinks&&i>=headers.length-2?18:Math.min(47,Math.max(17,h.length*1.22,rows.reduce((m,r)=>Math.max(m,String(r[i]??"").length*.8),0))));
  const links=[];
  const cells=all.map((row,ri)=>`<row r="${ri+1}" ht="${ri===0?33:25}" customHeight="1">${headers.map((h,ci)=>{
    let v=String(row[ci]??"");
    const isLink=withLinks&&ri>0&&ci>=headers.length-2&&/^https:\/\//.test(v);
    if(isLink){
      links.push({ref:`${column(ci)}${ri+1}`,url:v,rid:`rId${links.length+1}`});
      v=ci===headers.length-2?"معاينة":"إصدار";
    }
    return `<c r="${column(ci)}${ri+1}" t="inlineStr" s="${ri===0?1:isLink?2:0}"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
  }).join("")}</row>`).join("");
  const range=`A1:${column(headers.length-1)}${all.length}`;
  const worksheet=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="${range}"/><sheetViews><sheetView workbookViewId="0" rightToLeft="1"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols><sheetData>${cells}</sheetData>${links.length?`<hyperlinks>${links.map(l=>`<hyperlink ref="${l.ref}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="${l.rid}" tooltip="رابط إداري يتطلب تسجيل الدخول"/>`).join("")}</hyperlinks>`:""}<autoFilter ref="${range}"/></worksheet>`;
  const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Arial"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Arial"/></font><font><u/><sz val="11"/><color rgb="FF0563C1"/><name val="Arial"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF0B5767"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="3"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf></cellXfs></styleSheet>`;
  return packZip([
    ["[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`],
    ["_rels/.rels",`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
    ["xl/workbook.xml",`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets><sheet name="${xml(sheetName.slice(0,31))}" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels",`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ["xl/styles.xml",styles],["xl/worksheets/sheet1.xml",worksheet],
    ... (links.length?[["xl/worksheets/_rels/sheet1.xml.rels",`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${links.map(l=>`<Relationship Id="${l.rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${xml(l.url)}" TargetMode="External"/>`).join("")}</Relationships>`]]:[])
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
 
 .mj13-admin-link{width:100%;display:flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border-radius:9px;border:1px solid #b9cfd2;background:#f7faf9;color:#0b4d56;text-decoration:none;font-size:13px;font-weight:800;box-sizing:border-box}
 .mj14-types{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0;direction:rtl}
 .mj14-type{border:1px solid #ccdfe0;background:#fff;border-radius:11px;min-height:76px;padding:11px 9px;display:flex;align-items:center;justify-content:center;text-align:center;font-size:13px;font-weight:bold;color:#173b4a;cursor:pointer}
 .mj14-type[aria-pressed="true"]{background:#eef6f4;border:2px solid #0f5f59;color:#0b5554}
 .mj14-request-form{display:grid;gap:10px;margin-top:10px;border-top:1px solid #e6eded;padding-top:14px}
 .mj14-request-form input,.mj14-request-form textarea{width:100%;box-sizing:border-box;border:1px solid #bfd5d8;background:#fff;color:#183742;font:inherit;padding:10px;border-radius:8px;min-height:42px}
 .mj14-request-form textarea{min-height:87px;resize:vertical}
 .mj14-request-form :is(input,textarea):disabled{background:#f3f6f6;opacity:1;color:#4b6169}
 .mj14-form-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
 .mj14-form-actions button{display:flex;justify-content:center;align-items:center;gap:7px}
 .mj14-my-items{margin-top:8px;display:grid;gap:5px}
 .mj14-my-items button{background:#f7fafa;border:1px solid #e1eaea;color:#255961;text-align:right;border-radius:6px;padding:8px;font:inherit;font-size:12px;cursor:pointer;width:100%}
 .mj14-note{font-size:12px!important;color:#5e727c!important;line-height:1.7!important}
 .mj14-add{background:#fff!important;border:1px solid #0f5f59!important;color:#0f5f59!important}
 @media(max-width:520px){.mj14-types{grid-template-columns:1fr 1fr}.mj14-type{font-size:12px;min-height:72px}}
`;document.head.append(s);
}
const mj14Own=()=>{try{const v=JSON.parse(localStorage.getItem(OWN_KEY)||"[]");return Array.isArray(v)?v.filter(r=>CERT_TYPES.some(([k])=>k===r.category)&&r.id&&r.editToken):[]}catch(_){return []}};
let mj14Category="",mj14EditingId="";
function mj14Store(record){
  const items=mj14Own().filter(x=>x.id!==record.id);
  items.unshift(record);
  try{localStorage.setItem(OWN_KEY,JSON.stringify(items.slice(0,70)))}catch(_){throw Error("تعذر حفظ رمز التعديل على الجهاز. تأكدي من توفر مساحة التخزين قبل متابعة الطلب.")}
}
function mj14Token(){
  if(!window.crypto?.getRandomValues)throw Error("المتصفح لا يدعم حفظ الطلب بأمان.");
  const b=new Uint8Array(32);crypto.getRandomValues(b);
  return [...b].map(n=>n.toString(16).padStart(2,"0")).join("");
}
function mj14Saved(){return mj14Own().find(x=>x.category===mj14Category&&x.id===mj14EditingId)||null;}
function mj14DateLabel(iso){return readableHijri(iso);}
function mj14FormMarkup(record=null,editing=false){
 const x=record?.fields||{},readonly=!!record&&!editing;
 const val=k=>html(x[k]||"");const lock=readonly?"disabled":"";
 return `<form class="mj14-request-form" id="mj14CertificateRequestForm">
  <p class="mj14-note">${record?editing?"يمكنك تعديل الطلب الذي حفظته على هذا الجهاز، ثم الضغط على حفظ التعديل.":"هذا طلب محفوظ. اضغطي «تعديل» لتغيير بياناته.":"أدخلي بيانات الشهادة ثم احفظي الطلب. لا يلزم تسجيل الدخول."}</p>
  <label>الاسم كما سيظهر في الشهادة *<input name="name" maxlength="160" minlength="2" required ${lock} value="${val('name')}"></label>
  <label>العنوان كما سيظهر في الشهادة *<input name="title" maxlength="220" minlength="2" required ${lock} value="${val('title')}"></label>
  <label>الوصف المختصر كما سيظهر في الشهادة *<textarea name="description" maxlength="1200" minlength="2" required ${lock}>${val('description')}</textarea></label>
  <label>التاريخ الهجري كما سيظهر في الشهادة *<input name="date" type="date" required ${lock} value="${val('date')}"></label>
  <label>المدة كما ستظهر في الشهادة (إن وجدت)<input name="duration" maxlength="150" ${lock} value="${val('duration')}"></label>
  <div class="mj14-form-actions">
    <button class="btn btn-primary" type="submit" ${readonly?'disabled':''}>▣ ${editing?'حفظ التعديل':'حفظ الطلب'}</button>
    <button type="button" class="btn btn-ghost" data-mj14-edit="1" ${!record||editing?'disabled':''}>✎ تعديل</button>
  </div>
  <button type="button" class="mj14-add btn btn-ghost" data-mj14-new="1">+ طلب جديد في هذا القسم</button>
  <div class="mj13-status" id="mj14FormStatus" role="status" aria-live="polite"></div>
 </form>`;
}
function mj14CategoryMarkup(){
 const selections=mj14Own().filter(x=>x.category===mj14Category);
 const rec=mj14Saved();
 return `<div><h4 style="margin:8px 0;color:#0b3047">${html(CERT_TYPES.find(([k])=>k===mj14Category)?.[1]||"")}</h4>
   ${mj14FormMarkup(rec,false)}
   ${selections.length?`<div class="mj14-my-items"><strong style="font-size:12px;color:#355d66">طلباتي المحفوظة على هذا الجهاز</strong>
    ${selections.map((x,i)=>`<button type="button" data-mj14-load="${html(x.id)}">✎ ${html(x.fields?.name||"طلب")}: ${html(x.fields?.title||"")} ${i===0?'(الأحدث)':''}</button>`).join("")}</div>`:""}
 </div>`;
}
function mj14SelectCategory(key){
 if(!CERT_TYPES.some(([id])=>id===key))return;
 mj14Category=key;
 mj14EditingId="";
 document.querySelectorAll('#mj14CertificateSections [data-mj14-category]').forEach(b=>b.setAttribute("aria-pressed",b.dataset.mj14Category===key?"true":"false"));
 const host=document.getElementById("mj14CertificateRequestWorkspace");if(host)host.innerHTML=mj14CategoryMarkup();
 window.ManjazHijriPicker?.refresh?.();
}
function cardMarkup(){
  const current=currentHijri();const year=current?.year||1448;
  return `<section id="mj13ExportCards" class="mj13-cards" aria-label="تصديرات الإدارة وطلبات الشهادات - التحديث الرابع عشر" data-mj13-version="${VERSION}">
  <article class="mj13-card"><h3>الاحتياط اليومي</h3><p>استخراج Excel بالتكليفات لكل شهر هجري، بما فيها حالة الاعتماد والتحذيرات.</p>
   <label>الشهر الهجري<select id="mj13ReserveMonth" aria-label="اختيار شهر الاحتياط">${Array.from({length:12},(_,i)=>`${year}-${String(i+1).padStart(2,"0")}`).reverse().map(key=>`<option value="${key}" ${key===monthKey(current)?"selected":""}>${monthLabel(key)}</option>`).join("")}</select></label>
   <a class="mj13-admin-link" href="#admin-permissions" aria-label="الدخول إلى الصلاحيات الإدارية لتصدير الاحتياط">&#128274; الصلاحيات الإدارية</a>
   <button type="button" class="btn btn-primary" id="mj13ReserveDownload">استخراج Excel للشهر</button>
   <div class="mj13-status" id="mj13ReserveStatus" role="status" aria-live="polite"></div>
  </article>
  <article class="mj13-card"><h3>طلبات الشهادات</h3><p>تقديم الطلبات وتعديلها متاح للجميع؛ استخراج الطلبات Excel متاح للحساب الإداري فقط.</p>
   <p class="mj14-note">تُقدَّم الطلبات وتُراجع معاينة الشهادة كاملةً من القسم الثاني «طلبات إصدار الشهادات الجديدة» في صفحة الإدارة.</p>
   <a class="mj13-admin-link" href="#admin">الانتقال إلى طلبات إصدار الشهادات الجديدة</a>
   <div style="border-top:1px solid #e4ebed;margin-top:9px;padding-top:12px;display:grid;gap:10px">
    <label>فئة الشهادات للتصدير الإداري<select id="mj13CertType" aria-label="اختيار فئة طلبات الشهادات">${CERT_TYPES.map(([k,v])=>`<option value="${k}">${html(v)}</option>`).join("")}</select></label>
    <a class="mj13-admin-link" href="#admin-permissions" aria-label="الدخول إلى الصلاحيات الإدارية لتصدير الطلبات">&#128274; الصلاحيات الإدارية</a>
    <button type="button" class="btn btn-primary" id="mj13CertificateDownload">استخراج Excel للفئة</button>
   </div>
   <div class="mj13-status" id="mj13CertStatus" role="status" aria-live="polite"></div>
  </article></section>`;
}
async function mj14Submit(form){
 const message=form.querySelector('#mj14FormStatus'),button=form.querySelector('[type=submit]');
 if(!form.reportValidity())return;
 const values=Object.fromEntries([...new FormData(form).entries()].map(([k,v])=>[k,String(v).trim()]));
 if(!/^\d{4}-\d{2}-\d{2}$/.test(values.date||"")){message.textContent="اختاري التاريخ الهجري من التقويم.";return;}
 if(!values.name||!values.title||!values.description){message.textContent="يجب تعبئة الحقول الإلزامية.";return;}
 const rec=mj14Saved(),token=rec?.editToken||mj14Token();
 const data={p_category:mj14Category,p_name:values.name,p_title:values.title,p_description:values.description,
   p_date_iso:values.date,p_date_display:mj14DateLabel(values.date),p_duration:values.duration||"",
   p_edit_token:token,p_request_id:rec?.id||null};
 button.disabled=true;message.textContent=rec?"جارٍ حفظ التعديل...":"جارٍ تسجيل الطلب...";
 try{
   const response=await fetch(`${SUPABASE_URL}/rest/v1/rpc/manjaz_certificate_request_save`,{
     method:"POST",headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${SUPABASE_KEY}`,"Content-Type":"application/json"},body:JSON.stringify(data)});
   if(!response.ok){const e=await response.text().catch(()=>"");throw new Error(`تعذر حفظ الطلب (${response.status}). ${response.status===404?'يرجى التحقق من تهيئة خدمة الطلبات.':''}`)}
   const result=await response.json();const row=Array.isArray(result)?result[0]:result;
   if(!row?.request_id)throw new Error("تعذر التحقق من نجاح الحفظ في قاعدة البيانات.");
   const updated={id:String(row.request_id),category:mj14Category,editToken:token,fields:values,updatedAt:String(row.saved_at||new Date().toISOString())};
   mj14Store(updated);mj14EditingId=updated.id;
   document.getElementById('mj14CertificateRequestWorkspace').innerHTML=mj14CategoryMarkup();
   document.getElementById('mj14FormStatus').textContent=rec?"تم حفظ التعديل بنجاح.":"تم إرسال الطلب وحفظه. يمكنك تعديله من هذا الجهاز.";
 }catch(err){message.textContent=err.message||"تعذر حفظ الطلب؛ لم يتم تأكيد العملية.";console.error('MJ14 public certificate request',err)}
 finally{if(button.isConnected)button.disabled=false;}
}
function mj14Bind(root){
 root.addEventListener('click',event=>{
  const cat=event.target.closest('[data-mj14-category]');if(cat){mj14SelectCategory(cat.dataset.mj14Category);return;}
  const own=event.target.closest('[data-mj14-load]');if(own){mj14EditingId=own.dataset.mj14Load;const host=document.getElementById('mj14CertificateRequestWorkspace');if(host)host.innerHTML=mj14CategoryMarkup();window.ManjazHijriPicker?.refresh?.();return;}
  const edit=event.target.closest('[data-mj14-edit]');if(edit){const r=mj14Saved();if(r){document.getElementById('mj14CertificateRequestForm').outerHTML=mj14FormMarkup(r,true);window.ManjazHijriPicker?.refresh?.();}return;}
  const fresh=event.target.closest('[data-mj14-new]');if(fresh){mj14EditingId='';const host=document.getElementById('mj14CertificateRequestWorkspace');if(host)host.innerHTML=mj14CategoryMarkup();window.ManjazHijriPicker?.refresh?.();return;}
 });
 root.addEventListener('submit',event=>{if(event.target.id!=='mj14CertificateRequestForm')return;event.preventDefault();mj14Submit(event.target);});
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
async function adminCertificateRows(token){
 const all=[];
 for(let offset=0;offset<100000;offset+=500){
   const query=new URLSearchParams({select:"id,category,name,title,short_description,display_date,duration,recipient_email,status,created_at,updated_at",order:"created_at.asc",limit:"500",offset:String(offset)});
   const r=await fetch(`${SUPABASE_URL}/rest/v1/${REQUESTS_TABLE}?${query}`,{headers:{apikey:SUPABASE_KEY,Authorization:`Bearer ${token}`},cache:"no-store"});
   if(!r.ok)throw Error(`تعذر استخراج طلبات الشهادات (${r.status}). تأكدي من صلاحية الحساب الإداري.`);
   const batch=await r.json();if(!Array.isArray(batch))throw Error("استجابة السجلات غير صحيحة.");
   all.push(...batch);if(batch.length<500)break;
 }
 return all;
}
async function exportCertificates(){
 const button=document.getElementById("mj13CertificateDownload"),msg=document.getElementById("mj13CertStatus"),sel=document.getElementById("mj13CertType");
 if(!button||!sel)return;
 const cat=sel.value,name=CERT_TYPES.find(([id])=>id===cat)?.[1]||"شهادات";
 button.disabled=true;msg.textContent="جارٍ مراجعة طلبات الشهادات...";
 try{
  const token=await adminToken();
  const [records,legacy]=await Promise.all([
   adminCertificateRows(token),
   cloudRows(["certificate_request","admin_certificate_request","certificate_request_execution","certificate_request_thanks","certificate_request_parent"],token)
  ]);
  const rows=[
   ...records.filter(r=>r.category===cat&&r.status!=="ملغي").map(r=>{
     const base=`https://duaaaalharbi-ops.github.io/manjaz-school94/?cert_request_id=${encodeURIComponent(r.id)}&cert_action=`;
     return [r.name||"",r.title||"",r.short_description||"",r.display_date||"",r.duration||"",r.recipient_email||"",r.status||"مستلم",base+"preview#admin",base+"issue#admin"];
   }),
   ...legacy.filter(r=>r.status!=="ملغي"&&certificateCategory(r)===cat).map(r=>[...certificateRow(r),"","من السجلات السابقة","",""])
  ];
  download(makeXlsx(CERT_HEADERS,rows,"طلبات الشهادات"),`منجز_طلبات_${name}.xlsx`);
  msg.textContent=rows.length?`تم استخراج ${rows.length} طلبًا من الفئة المختارة.`:"لا توجد طلبات مسجلة لهذه الفئة؛ تم تنزيل نموذج Excel فارغ قابل للتعبئة.";
 }catch(err){msg.textContent=err.message||"تعذر التصدير، ولم يُنشأ ملف ناقص.";console.error("MJ14 admin cert export",err)}
 finally{button.disabled=false;}
}
function bind(root){
  root.querySelector("#mj13ReserveDownload")?.addEventListener("click",exportReserve);
  root.querySelector("#mj13CertificateDownload")?.addEventListener("click",exportCertificates);
  mj14Bind(root);
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
  obs.observe(view,{childList:true,subtree:false});
  mount();addEventListener("hashchange",()=>queueMicrotask(mount));
}
/* Shared, existing RTL Office Open XML Excel engine for weekly/monthly/cumulative exports. */
window.ManjazAdminExcelKitV43=Object.freeze({makeXlsx,download,reserveRow,RESERVE_HEADERS});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
