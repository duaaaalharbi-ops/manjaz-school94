/* Manjaz 43: compact admin exports from the authoritative reserve and duty databases. */
(()=>{"use strict";
const BASE="https://idkjuqfxcweqekdkcktk.supabase.co";
const KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const ADMIN="munjz.s94@hotmail.com";
const SESSION="manjaz_admin_auth_session_v1";
const HIJRI=new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura",{
 timeZone:"Asia/Riyadh",calendar:"islamic-umalqura",year:"numeric",month:"numeric"
});
const HIJRI_DISPLAY=new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",{
 timeZone:"Asia/Riyadh",calendar:"islamic-umalqura",day:"numeric",month:"long",year:"numeric"
});
const DAY=new Intl.DateTimeFormat("ar-SA",{timeZone:"Asia/Riyadh",weekday:"long"});
const today=()=>{
 const parts=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
 const part=k=>parts.find(x=>x.type===k)?.value||"";
 return part("year")+"-"+part("month")+"-"+part("day");
};
const validDate=v=>/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(String(v||""))&&!Number.isNaN(new Date(v+"T12:00:00Z").getTime());
const day=v=>new Date(v+"T12:00:00+03:00");
const hijriKey=v=>{
 if(!validDate(v))return "";
 const pts=HIJRI.formatToParts(day(v));
 const num=k=>Number(pts.find(p=>p.type===k)?.value||0);
 return num("year")+"-"+String(num("month")).padStart(2,"0");
};
const readableHijri=v=>validDate(v)?HIJRI_DISPLAY.format(day(v)):"";
const weekday=v=>validDate(v)?DAY.format(day(v)):"";
function addDays(v,n){
 const d=new Date(v+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+n);
 return d.toISOString().slice(0,10);
}
function weekRange(v){
 const d=new Date(v+"T12:00:00Z");const start=addDays(v,-d.getUTCDay());
 return [start,addDays(start,4)]; // الأسبوع الدراسي: الأحد إلى الخميس
}
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const types={reserve:"الاحتياط",duty:"المناوبة"};
function periodLabel(period,dateValue){
 if(period==="cumulative")return "التراكمي – كامل السجل المحفوظ";
 if(!validDate(dateValue))return "التاريخ غير صحيح";
 if(period==="week"){
  const [a,b]=weekRange(dateValue);
  return "الأسبوع: "+a+" إلى "+b;
 }
 return "الشهر الهجري: "+new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",{
  calendar:"islamic-umalqura",year:"numeric",month:"long",timeZone:"Asia/Riyadh"
 }).format(day(dateValue));
}
function inPeriod(v,period,reference){
 if(!validDate(v))return false;
 if(period==="cumulative")return true;
 if(period==="week"){
  const [a,b]=weekRange(reference);
  return v>=a&&v<=b;
 }
 return hijriKey(v)===hijriKey(reference);
}
async function token(){
 let s=null;try{s=JSON.parse(sessionStorage.getItem(SESSION)||"null")}catch(_){}
 if(!s?.access_token)throw Error("سجّلي الدخول في بطاقة الصلاحيات الإدارية أولًا.");
 if(Number(s.expires_at||0)&&Number(s.expires_at)<Date.now()/1000+45){
  if(!s.refresh_token)throw Error("انتهت الجلسة الإدارية. أعيدي تسجيل الدخول.");
  const r=await fetch(BASE+"/auth/v1/token?grant_type=refresh_token",{
   method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},
   body:JSON.stringify({refresh_token:s.refresh_token}),cache:"no-store"
  });
  if(!r.ok)throw Error("انتهت الجلسة الإدارية. أعيدي تسجيل الدخول.");
  const x=await r.json();
  s={...s,...x,expires_at:Math.floor(Date.now()/1000)+Number(x.expires_in||3600)};
  sessionStorage.setItem(SESSION,JSON.stringify(s));
 }
 const verify=await fetch(BASE+"/auth/v1/user",{
  headers:{apikey:KEY,Authorization:"Bearer "+s.access_token},cache:"no-store"
 });
 if(!verify.ok)throw Error("تعذر التحقق من صلاحية الإدارة.");
 const u=await verify.json();
 if(String(u.email||"").toLowerCase()!==ADMIN)throw Error("التصدير متاح لحساب إدارة منجز فقط.");
 return s.access_token;
}
async function tableRows(table,select,auth,filter="",order=""){
 const rows=[];
 for(let offset=0;offset<100000;offset+=500){
  const q=new URLSearchParams({select,limit:"500",offset:String(offset)});
  if(order)q.set("order",order);
  let suffix="";if(filter)suffix="&"+filter;
  const r=await fetch(BASE+"/rest/v1/"+table+"?"+q.toString()+suffix,{
   headers:{apikey:KEY,Authorization:"Bearer "+auth},cache:"no-store"
  });
  if(!r.ok){
   const reason=await r.json().catch(()=>({}));
   throw Error("تعذر قراءة قاعدة بيانات "+table+" ("+r.status+"): "+String(reason.message||"راجعي الصلاحيات"));
  }
  const batch=await r.json();
  if(!Array.isArray(batch))throw Error("لم تُرجع قاعدة البيانات قائمة سجلات.");
  rows.push(...batch);
  if(batch.length<500)break;
 }
 return rows;
}
const reserveHeaders=[
 "التاريخ الميلادي","التاريخ الهجري","اليوم","الحصة","الفصل",
 "المعلمة الغائبة","المعلمة المسددة","سبب الاحتياط","طريقة الإسناد",
 "حالة التكليف","حالة النشر","تأكيد الاطلاع","عنوان التفعيل",
 "عدد تكليفات المعلمة في الفترة","الملاحظات الإدارية","معرف التكليف"
];
const dutyHeaders=[
 "التاريخ الميلادي","التاريخ الهجري","اليوم","فترة المناوبة","الترتيب",
 "اسم المنفذة","الفئة الوظيفية","حالة النشر","تأكيد الاطلاع",
 "عدد مناوبات المنفذة في الفترة","معرف المنفذة"
];
function sorted(items,key,secondary){
 return items.sort((a,b)=>String(key(a)).localeCompare(String(key(b)))||
  (secondary?secondary(a,b):0));
}
async function reserveReport(period,reference,auth){
 const records=await tableRows("records","id,kind,status,data,created_at",auth,"kind=eq.reserve_assignment","created_at.asc");
 const filtered=records.filter(r=>{
  const d=r.data||{};
  return r.status!=="ملغي"&&d.status!=="ملغي"&&inPeriod(String(d.date||""),period,reference);
 });
 const counts=new Map();
 for(const r of filtered){
  const d=r.data||{},id=String(d.assignedTeacherId||d.assignedTeacherName||"");
  if(id)counts.set(id,(counts.get(id)||0)+1);
 }
 sorted(filtered,r=>String(r.data?.date||""),(a,b)=>Number(a.data?.period||0)-Number(b.data?.period||0));
 const rows=filtered.map(r=>{
  const d=r.data||{},id=String(d.assignedTeacherId||d.assignedTeacherName||"");
  const warnings=Array.isArray(d.manualOverrideWarnings)?d.manualOverrideWarnings.join(" | "):"";
  return [d.date||"",readableHijri(d.date),weekday(d.date),d.period||"",d.className||"",
   d.absentTeacherName||"",d.assignedTeacherName||"",d.reason||"",
   d.manual===true?"يدوي":"آلي",d.status||r.status||"مسودة",
   d.published===true?"منشور":"غير منشور",
   d.ackAt?"تم الاطلاع":"لم يؤكد",
   d.activationTitle||"",id?counts.get(id):0,warnings,String(r.id)];
 });
 return {headers:reserveHeaders,rows,total:filtered.length,people:counts.size};
}
async function dutyReport(period,reference,auth){
 const [assignments,people,days,links]=await Promise.all([
  tableRows("mj_duty_assignments","duty_date,slot,position,person_id",auth,"","duty_date.asc,position.asc"),
  tableRows("mj_duty_people","id,full_name,role",auth),
  tableRows("mj_duty_day","duty_date,published_at",auth),
  tableRows("mj_duty_links","duty_date,person_id,viewed_at",auth)
 ]);
 const map=new Map(people.map(x=>[String(x.id),x]));
 const published=new Map(days.map(x=>[x.duty_date,x.published_at]));
 const viewed=new Map(links.map(x=>[x.duty_date+"|"+x.person_id,x.viewed_at]));
 const filtered=assignments.filter(a=>inPeriod(a.duty_date,period,reference));
 const counts=new Map();
 filtered.forEach(a=>counts.set(String(a.person_id),(counts.get(String(a.person_id))||0)+1));
 const names={morning:"الصباح",break:"الفسحة",end:"نهاية الدوام"};
 const roles={teacher:"معلمة",admin:"إدارية",staff:"إدارية",administrator:"إدارية"};
 sorted(filtered,x=>x.duty_date,(a,b)=>String(a.slot).localeCompare(String(b.slot))||a.position-b.position);
 const rows=filtered.map(a=>{
  const person=map.get(String(a.person_id))||{};
  const viewKey=a.duty_date+"|"+a.person_id;
  return [a.duty_date,readableHijri(a.duty_date),weekday(a.duty_date),
   names[a.slot]||a.slot,a.position,person.full_name||"اسم غير متاح",
   roles[person.role]||person.role||"غير محدد",
   published.get(a.duty_date)?"منشور":"غير منشور",
   viewed.get(viewKey)?"تم الاطلاع":"لم يؤكد",
   counts.get(String(a.person_id))||0,String(a.person_id)];
 });
 return {headers:dutyHeaders,rows,total:filtered.length,people:counts.size};
}
function mount(host,kind){
 if(!host||!types[kind])return;
 host.innerHTML=
  '<div class="mj43-inline-report" data-mj43-kind="'+kind+'">'+
  '<div class="mj43-report-title"><strong>تصدير كشوف '+types[kind]+'</strong>'+
  '<a href="#'+(kind==="reserve"?"daily-reserve":"daily-duty")+'">استعراض القسم الأصلي</a></div>'+
  '<div class="mj43-report-controls">'+
   '<label>نوع الكشف<select class="mj43-report-period" aria-label="نوع الكشف">'+
    '<option value="week">كشف أسبوعي</option><option value="month">كشف شهري (هجري)</option>'+
    '<option value="cumulative">كشف تراكمي</option></select></label>'+
   '<label class="mj43-report-reference">التاريخ المرجعي<input class="mj43-report-date" type="date" required value="'+today()+'"></label>'+
   '<button type="button" class="mj43-report-export">تصدير Excel</button>'+
  '</div>'+
  '<p class="mj43-report-range" aria-live="polite"></p>'+
  '<div class="mj43-report-message" role="status" aria-live="polite"></div>'+
  '</div>';
 const root=host.querySelector(".mj43-inline-report");
 const select=root.querySelector(".mj43-report-period"),dateInput=root.querySelector(".mj43-report-date");
 const dateWrap=root.querySelector(".mj43-report-reference"),label=root.querySelector(".mj43-report-range");
 const msg=root.querySelector(".mj43-report-message"),button=root.querySelector(".mj43-report-export");
 function refresh(){dateWrap.hidden=select.value==="cumulative";label.textContent=periodLabel(select.value,dateInput.value);}
 select.addEventListener("change",refresh);dateInput.addEventListener("change",refresh);refresh();
 button.addEventListener("click",async()=>{
  if(button.disabled)return;
  const mode=select.value,ref=dateInput.value;
  if(mode!=="cumulative"&&!validDate(ref)){msg.textContent="اختاري تاريخًا صحيحًا للكشف.";return}
  button.disabled=true;button.textContent="جارٍ تجهيز Excel...";
  msg.textContent="جارٍ قراءة البيانات مباشرة من قسم "+types[kind]+" والتحقق من اكتمالها...";
  try{
   const auth=await token();
   const report=kind==="reserve"?await reserveReport(mode,ref,auth):await dutyReport(mode,ref,auth);
   if(!root.isConnected)return;
   if(!report.total){msg.textContent="لا توجد تكليفات محفوظة في الفترة المحددة. لم يُنشأ ملف فارغ.";return}
   const kit=window.ManjazAdminExcelKitV43;
   if(!kit?.makeXlsx||!kit?.download)throw Error("تعذر تحميل محرك Excel. حدّثي الصفحة ثم أعيدي المحاولة.");
   const suffix=mode==="week"?"أسبوعي_"+weekRange(ref)[0]:
    mode==="month"?"شهري_"+hijriKey(ref):"تراكمي";
   const title=kind==="reserve"?"الاحتياط":"المناوبة";
   const blob=kit.makeXlsx(report.headers,report.rows,title);
   kit.download(blob,"منجز_"+title+"_"+suffix+".xlsx");
   msg.textContent="تم إعداد "+report.total+" تكليفًا لـ "+report.people+
    " من الكادر، بصيغة Excel قابلة للفرز والتصفية. حالة النشر والاطلاع مأخوذة من قاعدة البيانات.";
  }catch(e){console.error("Manjaz admin Excel export",e);msg.textContent="تعذر التصدير: "+(e?.message||e)+". لم يُنشأ ملف غير مكتمل."}
  finally{if(button.isConnected){button.disabled=false;button.textContent="تصدير Excel"}}
 });
}
const style=document.createElement("style");style.id="mj43AdminExcelStyle";
style.textContent=
 "#mj34PowerNavigation .mj43-inline-report{margin-top:12px;padding:12px;border:1px solid #d0e2e1;border-radius:12px;background:#fafdfc;direction:rtl}"+
 "#mj34PowerNavigation .mj43-report-title{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap;color:#13434d}"+
 "#mj34PowerNavigation .mj43-report-title a{font-size:12px;color:#0b6668;text-decoration:underline}"+
 "#mj34PowerNavigation .mj43-report-controls{display:grid;grid-template-columns:minmax(145px,1fr) minmax(160px,1fr) auto;gap:10px;align-items:end;margin-top:12px}"+
 "#mj34PowerNavigation .mj43-report-controls label{display:grid;gap:6px;font-size:13px;font-weight:700;min-width:0}"+
 "#mj34PowerNavigation .mj43-report-controls select,#mj34PowerNavigation .mj43-report-controls input{box-sizing:border-box;width:100%;min-height:42px;border:1px solid #b7d3d1;border-radius:9px;background:white;color:#173d43;padding:8px;font:inherit}"+
 "#mj34PowerNavigation .mj43-report-controls button{min-height:42px;background:#0b5e68;border:none;color:white;border-radius:9px;padding:9px 14px;font:700 13px Tahoma,Arial,sans-serif;cursor:pointer}"+
 "#mj34PowerNavigation .mj43-report-controls button:disabled{opacity:.55;cursor:wait}"+
 "#mj34PowerNavigation .mj43-report-reference[hidden]{display:none!important}"+
 "#mj34PowerNavigation .mj43-report-range{font-size:12px;color:#55767b;margin:9px 0 2px}"+
 "#mj34PowerNavigation .mj43-report-message{font-size:13px;color:#115e63;min-height:17px;line-height:1.6}"+
 "@media(max-width:760px){#mj34PowerNavigation .mj43-report-controls{grid-template-columns:minmax(0,1fr)}"+
 "#mj34PowerNavigation .mj43-report-controls button{width:100%}}";
document.head.appendChild(style);
window.ManjazAdminExcelExportsV43=Object.freeze({mount,version:"43.0"});
})();