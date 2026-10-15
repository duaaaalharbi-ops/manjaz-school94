/* MANJAZ DAILY RESERVE 2.6
   Public read-only daily reserve + weekly cumulative view.
   Admin-only editing through Supabase Auth session.
   Cloud-first: all operational data lives in Supabase records.
   Candidate engine returns top 3 eligible teachers per absent period.
*/
(()=>{"use strict";

const SUPABASE_URL="https://idkjuqfxcweqekdkcktk.supabase.co";
const SUPABASE_KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const RECORDS=`${SUPABASE_URL}/rest/v1/records`;
const AUTH=`${SUPABASE_URL}/auth/v1`;
const SESSION_KEY="manjaz_admin_auth_session_v1";

const K={
  teacher:"reserve_teacher",
  schedule:"reserve_schedule",
  absence:"reserve_absence",
  assignment:"reserve_assignment",
  settings:"reserve_settings",
  adjustment:"reserve_adjustment"
};

const DAYS=[
  ["sun","الأحد",0],["mon","الاثنين",1],["tue","الثلاثاء",2],["wed","الأربعاء",3],["thu","الخميس",4]
];
const PERIODS=[1,2,3,4,5,6,7];
const DEFAULT_WEIGHTS={week:30,term:10,daily:18,workload:0.35,consecutive:9};
const V6_SOURCE="v6-1448-04-27";
const COUNT_START="2026-10-18";
const EMERGENCY_DAILY_DEMAND=20;
const CONDITIONAL_EXCLUSION_MIN_DEMAND=13; // More than 12 absent periods on the same school day
const PERMANENT_EXCLUDED=new Set(["أفراح الجدعاني","إيمان الجدعاني","حصة المنتشري","عبير المولد","لمياء البالدي","نجوى الغامدي","نورة العنزي","دخنة الشهري"]);
const ADVANCED_RANK=new Set(["دعاء الحربي","سندس الغامدي","عايدة الصاعدي","ريم القحطاني","عوالي السبيعي","بدرية الحربي","حنان المجنوني"]);
const ABSOLUTE_EXCLUDED=new Set(["نورة الهودان"]);
// Additional personnel authorized for manual assignment, not in the official sixth-edition teacher timetable.
const MANUAL_SUPPORT_STAFF=[
  {id:"reserve_support_1",name:"دخيلة المالكي",supportStaff:true,role:"التوجيه الطلابي / المختبر"},
  {id:"reserve_support_2",name:"مها العتيبي",supportStaff:true,role:"التوجيه الطلابي / المختبر"},
  {id:"reserve_support_3",name:"نجلاء هوساوي",supportStaff:true,role:"التوجيه الطلابي / المختبر"}
];
const V6_SEED=[{"name":"أفراح الجدعاني","workload":9,"timetable":{"sun":["","","","","","أول6","ثالث3"],"mon":["أول6","","أول4","","","ثالث3",""],"tue":["","أول5","","","",""],"wed":["أول5","","","أول4","",""],"thu":["","ثالث3","","","",""]}},{"name":"أيمان الجدعاني","workload":20,"timetable":{"sun":["ثاني6","","","","ثاني3","ثاني1","ثاني2"],"mon":["ثاني2","","ثاني6","ثاني1","","","ثاني4"],"tue":["ثاني6","","","ثاني4","ثاني3","ثاني1"],"wed":["ثاني2","ثاني4","","","ثاني3","ثاني6"],"thu":["ثاني3","ثاني1","","ثاني2","ثاني4",""]}},{"name":"بدريه الحربي","workload":11,"timetable":{"sun":["","ثاني4","","","ثاني4|نشاط","","ثاني5"],"mon":["ثاني6","","","ثاني5","ثاني4|نشاط","",""],"tue":["","","","","","ثاني4"],"wed":["","","","ثاني6","ثاني4",""],"thu":["ثاني5","ثاني6","","","",""]}},{"name":"بدريه السلمي","workload":16,"timetable":{"sun":["","ثالث1|نشاط","ثالث2","ثالث3","","","ثالث1"],"mon":["","","ثالث3","","","ثالث1","ثالث2"],"tue":["","ثالث2","ثالث1","","","ثالث3"],"wed":["ثالث1","","","","ثالث3","ثالث2"],"thu":["","ثالث1","","ثالث2","ثالث3",""]}},{"name":"تهاني العتيبي","workload":22,"timetable":{"sun":["أول1","أول2","","ثالث2","ثالث3","ثالث1",""],"mon":["ثالث2","ثالث3","","أول2","ثالث1","أول1",""],"tue":["ثالث1","أول1","","أول2","ثالث3",""],"wed":["ثالث2","ثالث1","","أول1","أول2",""],"thu":["ثالث3","","","أول1","أول2","ثالث2"]}},{"name":"حصة المنتشري","workload":20,"timetable":{"sun":["أول6","ثاني2","ثاني1","ثاني3","","",""],"mon":["","ثاني3","ثاني1","أول6","","ثاني2",""],"tue":["أول6","","ثاني3","ثاني2","ثاني1",""],"wed":["ثاني3","أول6","","ثاني2","ثاني1",""],"thu":["ثاني2","ثاني3","ثاني1","أول6","",""]}},{"name":"حنان المجنوني","workload":13,"timetable":{"sun":["ثالث5","ثالث2","","","","ثالث3","ثالث4"],"mon":["","ثالث1","","","ثالث6","","ثالث3"],"tue":["","ثالث5","","","ثالث2|نشاط","ثالث6"],"wed":["","","ثالث2","","",""],"thu":["ثالث4","","","","ثالث1",""]}},{"name":"خزماء الجبيري","workload":18,"timetable":{"sun":["","أول4","أول6","أول3","أول1","",""],"mon":["أول5","أول2","","","","أول6","أول3"],"tue":["","","أول2","","أول4","أول1"],"wed":["","أول2","أول4","","أول5",""],"thu":["أول3","","أول6","أول5","أول1",""]}},{"name":"خلود الكثيري","workload":18,"timetable":{"sun":["أول5","","أول2","","أول6","أول1",""],"mon":["أول1","أول3","","أول5","","","أول4"],"tue":["","أول3","","أول6","",""],"wed":["","أول4","أول1","أول6","","أول2"],"thu":["","أول3","أول4","","أول5","أول2"]}},{"name":"دعاء الحربي","workload":20,"timetable":{"sun":["","أول6","","ثاني6","ثاني5","","أول5"],"mon":["","أول5","أول6","","ثاني5","","ثاني6"],"tue":["","أول6","أول5","ثاني5","","ثاني6"],"wed":["ثاني5","ثاني6","","أول5","أول6",""],"thu":["ثاني6","ثاني5","","","أول6","أول5"]}},{"name":"رحمة العيسي","workload":4,"timetable":{"sun":["","","","","","","أول4"],"mon":["أول4","","","","","",""],"tue":["أول4","","","","",""],"wed":["","","","","",""],"thu":["","","","","","أول4"]}},{"name":"ريم الحربي","workload":18,"timetable":{"sun":["ثالث4","","ثالث5","","ثالث1","ثالث6",""],"mon":["","","ثالث2","ثالث3","","ثالث4",""],"tue":["ثالث3","ثالث6","","ثالث5","ثالث1",""],"wed":["ثالث3","","ثالث4","","ثالث2",""],"thu":["ثالث1","","ثالث5","ثالث6","ثالث2",""]}},{"name":"ريم القحطاني","workload":16,"timetable":{"sun":["","ثاني3","","ثاني2|نشاط","ثاني1","",""],"mon":["ثاني1","","","ثاني2","ثاني3","",""],"tue":["ثاني2","","ثاني1","","ثاني2|نشاط","ثاني3"],"wed":["","ثاني3","","ثاني1","","ثاني2"],"thu":["","","ثاني2","ثاني1","ثاني3",""]}},{"name":"رية الحربي","workload":13,"timetable":{"sun":["ثالث3|نشاط","","","","ثالث2","","ثالث6"],"mon":["","","","ثالث4","","ثالث1","ثالث5"],"tue":["ثالث4","","","ثالث1","","ثالث2"],"wed":["","","","ثالث3","","ثالث5"],"thu":["","","ثالث6","","","ثالث3"]}},{"name":"سحر الشمراني","workload":17,"timetable":{"sun":["ثاني4","ثاني6","","ثاني5","","ثاني5|نشاط",""],"mon":["","ثاني5","","ثاني4","ثاني6","",""],"tue":["ثاني5","ثاني4","","ثاني6","",""],"wed":["","","ثاني6","","ثاني5","ثاني4"],"thu":["","ثاني4","ثاني6","","ثاني5","ثاني5|نشاط"]}},{"name":"سندس الغامدي","workload":20,"timetable":{"sun":["ثاني1","","","ثاني4","ثاني2","","ثاني3"],"mon":["","ثاني4","ثاني2","","","ثاني1","ثاني3"],"tue":["ثاني4","ثاني3","ثاني2","ثاني1","",""],"wed":["","ثاني2","ثاني3","ثاني4","","ثاني1"],"thu":["","ثاني2","ثاني3","ثاني4","","ثاني1"]}},{"name":"شوق المطيري","workload":8,"timetable":{"sun":["","","","","","أول2",""],"mon":["","","","","أول1","","أول2"],"tue":["","","","","أول1","أول2"],"wed":["أول1","","","","",""],"thu":["","أول2","أول1","","",""]}},{"name":"شيخة المالكي","workload":16,"timetable":{"sun":["ثالث2","ثالث3","","","ثالث6","",""],"mon":["","ثالث2","ثالث6","","ثالث3","ثالث6|نشاط",""],"tue":["","","ثالث3","ثالث2","ثالث6",""],"wed":["","ثالث6","","ثالث2","","ثالث3"],"thu":["","ثالث2","","ثالث3","","ثالث6"]}},{"name":"عايدة الصاعدي","workload":18,"timetable":{"sun":["","","ثالث1","ثالث6","ثالث4","","ثالث2"],"mon":["ثالث3","ثالث5","","ثالث2","ثالث4","","ثالث1"],"tue":["","","","ثالث3","","ثالث5"],"wed":["","ثالث3","ثالث1","ثالث4","ثالث6",""],"thu":["","","ثالث2","","ثالث6","ثالث5"]}},{"name":"عبير المولد","workload":9,"timetable":{"sun":["","","ثالث4","","ثالث5","",""],"mon":["","","","ثالث5","","","ثالث6"],"tue":["","","","ثالث6","","ثالث4"],"wed":["","","","","","ثالث6"],"thu":["","ثالث5","","","","ثالث4"]}},{"name":"علوه الحربي","workload":11,"timetable":{"sun":["","","ثاني2","","","ثاني3","ثاني1|نشاط"],"mon":["ثاني3","","","","ثاني1","","ثاني2"],"tue":["ثاني1|نشاط","","","","",""],"wed":["","ثاني1","","","","ثاني3"],"thu":["","","","","ثاني1","ثاني2"]}},{"name":"علية القاسمي","workload":4,"timetable":{"sun":["","","أول3","","","",""],"mon":["","","","","","أول3",""],"tue":["أول3","","","","",""],"wed":["","","","أول3","",""],"thu":["","","","","",""]}},{"name":"عواطف الحربي","workload":12,"timetable":{"sun":["ثاني3","","ثاني4","","ثاني6","",""],"mon":["","","ثاني3","ثاني6","","ثاني4",""],"tue":["","","ثاني6","ثاني3","",""],"wed":["","","ثاني4","","",""],"thu":["","","ثاني4","ثاني6","","ثاني3"]}},{"name":"عوالي السبيعي","workload":20,"timetable":{"sun":["","أول1","أول5","أول4","","أول3",""],"mon":["أول3","أول4","","أول1","أول2","",""],"tue":["أول2","أول4","","أول3","أول5",""],"wed":["أول2","","أول5","","أول1","أول3"],"thu":["أول5","","أول2","","أول4","أول1"]}},{"name":"غاليه المزمومي","workload":15,"timetable":{"sun":["","ثالث6","","","","ثالث4","ثالث5"],"mon":["","","ثالث5","ثالث6","","",""],"tue":["ثالث5","ثالث4","ثالث6","","",""],"wed":["ثالث4","","","ثالث6","ثالث5","ثالث4|نشاط"],"thu":["ثالث6","ثالث4","","ثالث5","",""]}},{"name":"فاطمة الزهراني","workload":13,"timetable":{"sun":["","","ثاني5","","","ثاني6","ثاني6|نشاط"],"mon":["","أول6","","","","ثاني6","ثاني5"],"tue":["","","أول6","","ثاني6","ثاني5"],"wed":["ثاني6","","أول6","","",""],"thu":["","","ثاني5","","","ثاني6|نشاط"]}},{"name":"فاطمة العماري","workload":16,"timetable":{"sun":["ثالث1","ثالث4","","ثالث5","","",""],"mon":["ثالث5","","ثالث4","ثالث1","","",""],"tue":["","ثالث1","ثالث5","ثالث4","",""],"wed":["ثالث5","ثالث4","ثالث5|نشاط","","ثالث1",""],"thu":["ثالث5","","ثالث1","ثالث4","",""]}},{"name":"فاطمة الغامدي","workload":18,"timetable":{"sun":["","ثاني1","ثاني3","","","","ثاني4"],"mon":["","ثاني2","ثاني4","ثاني3|نشاط","","ثاني3","ثاني1"],"tue":["ثاني3|نشاط","ثاني2","","","ثاني4",""],"wed":["","","ثاني1","ثاني3","ثاني2",""],"thu":["ثاني1","","","ثاني3","ثاني2","ثاني4"]}},{"name":"فاطمة حسن","workload":9,"timetable":{"sun":["","أول3","","","","","أول2"],"mon":["","","أول2","","","","أول1"],"tue":["","","أول1","","","أول3"],"wed":["","أول1","","","أول3",""],"thu":["","","","","","أول2"]}},{"name":"لمياء البالدي","workload":22,"timetable":{"sun":["أول4","","ثالث6","ثالث4","أول3","ثالث5",""],"mon":["ثالث4","ثالث6","","أول4","أول3","ثالث5",""],"tue":["ثالث6","","أول3","أول4","ثالث4",""],"wed":["أول3","","ثالث6","ثالث5","أول4",""],"thu":["أول4","","ثالث4","أول3","ثالث5",""]}},{"name":"ليلى مجرشي","workload":20,"timetable":{"sun":["","","أول4","أول1","أول2","","أول3"],"mon":["","أول1","أول3","","أول4","أول2",""],"tue":["","أول2","أول4","أول1","أول3",""],"wed":["أول4","","أول3","أول2","","أول1"],"thu":["أول1","أول4","","أول2","","أول3"]}},{"name":"منال الجابري","workload":14,"timetable":{"sun":["أول2","أول5","","","","","أول1"],"mon":["أول2","","أول1","أول3","","أول5",""],"tue":["أول1","","","","","أول4"],"wed":["","أول3","أول2","","","أول4"],"thu":["","أول5","","","أول3",""]}},{"name":"نجوى الغامدي","workload":12,"timetable":{"sun":["ثاني5","","","ثاني1","","ثاني2",""],"mon":["","ثاني1","","","ثاني2","",""],"tue":["","ثاني1","ثاني5","","","ثاني2"],"wed":["ثاني1","","ثاني2","","","ثاني5"],"thu":["","","","","ثاني5",""]}},{"name":"نورة الهودان","workload":23,"timetable":{"sun":["ثالث6","ثالث5","ثالث3","ثالث1","","",""],"mon":["ثالث6","ثالث4","ثالث1","","ثالث5","ثالث2",""],"tue":["ثالث2","ثالث3","ثالث4","","ثالث5",""],"wed":["ثالث6","ثالث5","ثالث3","ثالث1","ثالث4",""],"thu":["ثالث2","ثالث6","ثالث3","ثالث1","ثالث4",""]}},{"name":"نورة العنزي","workload":12,"timetable":{"sun":["أول3","","أول1","أول2","","",""],"mon":["","","","","ثالث2","",""],"tue":["","","ثالث2","","أول2","ثالث1"],"wed":["","ثالث2","","","","ثالث1"],"thu":["","أول1","أول3","","","ثالث1"]}},{"name":"هاجر السلمي","workload":9,"timetable":{"sun":["","","","أول5","","أول4",""],"mon":["","","","","","أول4","أول5"],"tue":["أول5","","","","","أول6"],"wed":["أول6","","","","",""],"thu":["أول6","","","أول4","",""]}},{"name":"وحش القحطاني","workload":20,"timetable":{"sun":["","ثاني5","ثاني6","","أول5","ثاني4",""],"mon":["ثاني4","ثاني6","ثاني5","","أول5","",""],"tue":["","ثاني6","ثاني4","أول5","ثاني5",""],"wed":["ثاني4","أول5","","ثاني5","ثاني6",""],"thu":["ثاني4","","أول5","ثاني5","ثاني6",""]}},{"name":"وضحه المحمادي","workload":7,"timetable":{"sun":["","","","أول6","","","أول6"],"mon":["","","أول5","","","",""],"tue":["","","","","أول6","أول5"],"wed":["","","","","","أول5"],"thu":["","أول6","","","",""]}},{"name":"دخنه الشهري","workload":8,"timetable":{"sun":["","","","","","",""],"mon":["ثاني5","","","","أول6","ثاني5","أول6"],"tue":["","","","","",""],"wed":["","ثاني5","ثاني5","أول6","","أول6"],"thu":["","","","","",""]}}];
let state={teachers:[],schedules:[],absences:[],assignments:[],adjustments:[],settings:null,admin:null,currentDate:todayISO(),workspaceCard:"manual"};
let renderBusy=false;

const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const clean=s=>String(s??"").replace(/\s+/g," ").trim();
const route=()=>((location.hash||"#home").slice(1).split("&")[0]);
const isRoute=()=>route()==="daily-reserve";
const byId=id=>document.getElementById(id);
const uid=()=>crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random().toString(36).slice(2)}`;

function todayISO(){
  const d=new Date(),off=d.getTimezoneOffset()*60000;
  return new Date(d.getTime()-off).toISOString().slice(0,10);
}
function parseDate(s){return new Date(`${s}T12:00:00`)}
function dayKey(date){
  const n=parseDate(date).getDay();
  return DAYS.find(x=>x[2]===n)?.[0]||"";
}
function dayName(date){return DAYS.find(x=>x[0]===dayKey(date))?.[1]||"—"}
function addDays(date,n){
  const d=parseDate(date); d.setDate(d.getDate()+n);
  const off=d.getTimezoneOffset()*60000;
  return new Date(d.getTime()-off).toISOString().slice(0,10);
}
function sundayOf(date){
  const d=parseDate(date),day=d.getDay(),delta=-day;
  d.setDate(d.getDate()+delta);
  const off=d.getTimezoneOffset()*60000;
  return new Date(d.getTime()-off).toISOString().slice(0,10);
}
function weekRange(date){
  const start=sundayOf(date);
  return {start,end:addDays(start,4)};
}
function inRange(date,start,end){return date>=start&&date<=end}
function fmtDate(s){
  if(!s)return"—";
  try{return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",{year:"numeric",month:"long",day:"numeric"}).format(parseDate(s))}
  catch(_){return "—"}
}
function fmtDateTimeHijri(s){
  if(!s)return"—";
  try{
    const d=new Date(s);
    const date=new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",{year:"numeric",month:"long",day:"numeric"}).format(d);
    const time=new Intl.DateTimeFormat("ar-SA",{hour:"2-digit",minute:"2-digit"}).format(d);
    return `${date} — ${time}`;
  }catch(_){return"—"}
}
function hijriDateControl(id,date){
  return `<div class="reserve-hijri-date">
    <button class="reserve-mini" type="button" data-hijri-step="-1" data-hijri-target="${esc(id)}">اليوم السابق</button>
    <strong id="${esc(id)}Label">${esc(dayName(date))} — ${esc(fmtDate(date))}</strong>
    <button class="reserve-mini" type="button" data-hijri-step="1" data-hijri-target="${esc(id)}">اليوم التالي</button>
    <input id="${esc(id)}" type="hidden" value="${esc(date)}">
  </div>`;
}
function bindHijriDateControl(id,onChange){
  const input=byId(id); if(!input)return;
  document.querySelectorAll(`[data-hijri-target="${id}"]`).forEach(b=>b.onclick=()=>{
    const next=addDays(input.value||todayISO(),Number(b.dataset.hijriStep||0));
    input.value=next;
    const label=byId(`${id}Label`);
    if(label)label.textContent=`${dayName(next)} — ${fmtDate(next)}`;
    onChange?.(next);
  });
}

function baseHeaders(token){
  return {
    "apikey":SUPABASE_KEY,
    ...(token?{"Authorization":`Bearer ${token}`} : {}),
    "Content-Type":"application/json"
  };
}
// A teacher's private assignment link only updates acknowledgement and the activation topic.
// Other assignment details remain read-only; the database checks the assignment token.
async function reserveTeacherCloudAction(ackToken,action,title=null){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/rpc/manjaz_reserve_teacher_action`,{
    method:"POST",headers:baseHeaders(),cache:"no-store",
    body:JSON.stringify({p_ack_token:ackToken,p_action:action,p_title:title})
  });
  if(!r.ok)throw new Error(`تعذر حفظ إجراء المعلمة (${r.status})`);
  const result=await r.json();
  if(result?.ok!==true)throw new Error(`تعذر حفظ إجراء المعلمة (${result?.error||"غير معروف"})`);
  return result;
}
async function fetchKind(kind){
  const p=new URLSearchParams({
    select:"id,kind,data,status,created_at,updated_at",
    kind:`eq.${kind}`,
    order:"created_at.asc"
  });
  const r=await fetch(`${RECORDS}?${p}`,{headers:baseHeaders(),cache:"no-store"});
  if(!r.ok)throw new Error(`تعذر قراءة البيانات (${r.status})`);
  const rows=await r.json();
  return (Array.isArray(rows)?rows:[]).map(row=>({
    id:String(row.id),...(row.data||{}),
    status:row.status||row.data?.status||"",
    createdAt:row.created_at,updatedAt:row.updated_at
  }));
}
async function insertKind(kind,data,token,status="معتمد"){
  const r=await fetch(RECORDS,{
    method:"POST",
    headers:{...baseHeaders(token),"Prefer":"return=representation"},
    body:JSON.stringify({kind,data,status,updated_at:new Date().toISOString()})
  });
  if(!r.ok){const t=await r.text().catch(()=>"");throw new Error(`تعذر الحفظ (${r.status}) ${t}`)}
  const rows=await r.json(); return rows?.[0]?{id:String(rows[0].id),...(rows[0].data||{})}:data;
}
async function patchKind(kind,id,data,token,status="معتمد"){
  const p=new URLSearchParams({id:`eq.${id}`,kind:`eq.${kind}`});
  const r=await fetch(`${RECORDS}?${p}`,{
    method:"PATCH",
    headers:{...baseHeaders(token),"Prefer":"return=representation"},
    body:JSON.stringify({data,status,updated_at:new Date().toISOString()})
  });
  if(!r.ok){const t=await r.text().catch(()=>"");throw new Error(`تعذر التعديل (${r.status}) ${t}`)}
  const rows=await r.json(); return rows?.[0]?{id:String(rows[0].id),...(rows[0].data||{})}:data;
}
async function deleteKind(kind,id,token){
  const p=new URLSearchParams({id:`eq.${id}`,kind:`eq.${kind}`});
  const r=await fetch(`${RECORDS}?${p}`,{method:"DELETE",headers:baseHeaders(token)});
  if(!r.ok)throw new Error(`تعذر الحذف (${r.status})`);
}

function loadSession(){
  try{
    const x=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");
    return x&&x.access_token?x:null;
  }catch(_){return null}
}
function saveSession(x){try{sessionStorage.setItem(SESSION_KEY,JSON.stringify(x))}catch(_){}}
async function validateSession(){
  const s=loadSession(); if(!s)return null;
  const r=await fetch(`${AUTH}/user`,{headers:baseHeaders(s.access_token),cache:"no-store"});
  if(!r.ok)return null;
  const user=await r.json();
  state.admin={...s,user}; return state.admin;
}
async function login(email,password){
  const r=await fetch(`${AUTH}/token?grant_type=password`,{
    method:"POST",headers:{"apikey":SUPABASE_KEY,"Content-Type":"application/json"},
    body:JSON.stringify({email,password})
  });
  if(!r.ok)throw new Error("بيانات الدخول غير صحيحة");
  const s=await r.json(); saveSession(s); state.admin={...s,user:s.user}; return state.admin;
}
function token(){return state.admin?.access_token||loadSession()?.access_token||""}

async function loadAll(){
  const [teachers,schedules,absences,assignments,settings,adjustments]=await Promise.all([
    fetchKind(K.teacher),fetchKind(K.schedule),fetchKind(K.absence),fetchKind(K.assignment),fetchKind(K.settings),fetchKind(K.adjustment)
  ]);
  // Edition Six is the only authorized teacher source. Preserve the oldest ID
  // for each name, so existing schedules / assignment references are not changed.
  const oldestByName=new Map();
  for(const record of teachers){
    if(record.active===false)continue;
    const official=editionSixName(record.name);
    if(!official)continue; // Never mix in names from another edition.
    const existing=oldestByName.get(official);
    if(!existing||Number(record.id)<Number(existing.id)){
      oldestByName.set(official,{...record,name:official});
    }
  }
  state.teachers=V6_SEED.map(s=>oldestByName.get(s.name)).filter(Boolean);
  const validIds=new Set(state.teachers.map(t=>String(t.id)));
  state.schedules=schedules.filter(s=>validIds.has(String(s.teacherId)));
  state.absences=absences;
  state.assignments=assignments;
  state.adjustments=adjustments;
  state.settings=settings.find(s=>s.sourceVersion===V6_SOURCE)||settings[0]||null;
}
function normName(s){return clean(s).replace(/[أإآ]/g,"ا").replace(/ة/g,"ه").replace(/ى/g,"ي")}
function editionSixName(name){
  const key=normName(name);
  // الاسم المعتمد للعرض: رية الحربي، مع مطابقة الاسم المستورد سابقًا دون تغيير رقم السجل أو الجدول.
  const repaired=key===normName("ريه الجربي")?normName("رية الحربي"):
    key===normName("لمياء البلادي")?normName("لمياء البالدي"):key;
  return V6_SEED.find(s=>normName(s.name)===repaired)?.name||"";
}
function nameSetContains(set,name){const n=normName(name);return [...set].some(v=>normName(v)===n)}
function seedForName(name){return V6_SEED.find(x=>x.name===editionSixName(name))||null}
function teacherFlags(t){
  const n=editionSixName(t.name)||clean(t.name);
  return {
    permanentExcluded:t.permanentExcluded===true||nameSetContains(PERMANENT_EXCLUDED,n),
    advanced:t.advancedRank===true||nameSetContains(ADVANCED_RANK,n),
    absolute:t.absoluteExcluded===true||nameSetContains(ABSOLUTE_EXCLUDED,n)
  };
}
function ceilingFor(t){return teacherFlags(t).advanced?22:20}
function parseScheduleValue(v){
  const s=clean(v),activity=s.includes("|نشاط");
  return {className:clean(s.split("|")[0]),activity};
}
function dateRangeAssignments(start,end){
  const cs=state.settings?.countStart||COUNT_START;
  const effectiveStart=start<cs?cs:start;
  return publishedAssignments().filter(a=>a.date>=effectiveStart&&a.date<=end);
}
function previousWeekRange(date){
  const wr=weekRange(addDays(date,-7)); return wr;
}
function currentWeekAbsenceLoad(teacherId,date){
  const wr=weekRange(date);
  let missed=0;
  state.absences.forEach(a=>{
    if(String(a.teacherId)!==String(teacherId))return;
    if(inRange(a.date,wr.start,wr.end))missed+=(a.periods||[]).length;
    else if(a.date===addDays(wr.start,-3)&&dayKey(a.date)==="thu")missed+=(a.periods||[]).length;
  });
  return missed;
}
function previousWeekReserveCount(teacherId,date){
  const wr=previousWeekRange(date);
  return publishedAssignments().filter(a=>String(a.assignedTeacherId)===String(teacherId)&&inRange(a.date,wr.start,wr.end)).length;
}
function dailyOriginalCount(teacherId,date){
  const s=scheduleOf(teacherId),dk=dayKey(date);
  return (s?.timetable?.[dk]||[]).filter(x=>clean(x)).length;
}
function teacherHasClass(teacherId,className){
  const target=clean(className); if(!target)return false;
  const s=scheduleOf(teacherId); if(!s)return false;
  return DAYS.some(d=>(s.timetable?.[d[0]]||[]).some(v=>parseScheduleValue(v).className===target));
}
function dailyDemand(date){
  // Sum every required period once per absent teacher, even when a record was duplicated.
  const byTeacher=new Map();
  absencesOn(date).forEach(a=>{
    const id=String(a.teacherId||"");
    if(!id)return;
    const periods=(a.periods||[]).filter(p=>p&&Number(p.period)>0).map(p=>Number(p.period));
    const existing=byTeacher.get(id)||new Set();
    periods.forEach(p=>existing.add(p));
    byTeacher.set(id,existing);
  });
  return [...byTeacher.values()].reduce((n,periods)=>n+periods.size,0);
}
function conditionalReserveAllowed(date,plannedDemand=0){
  return Math.max(dailyDemand(date),Number(plannedDemand)||0)>=CONDITIONAL_EXCLUSION_MIN_DEMAND;
}
function sameClassReserveToday(teacherId,date,className,exceptId=""){
  const target=clean(className);
  return assignmentsOn(date).some(a=>String(a.id)!==String(exceptId)&&String(a.assignedTeacherId)===String(teacherId)&&clean(a.className)===target);
}
function adjacentOriginalCount(teacherId,date,period){
  let n=0;
  for(const p of [Number(period)-1,Number(period)+1]){
    if(p<1||p>7)continue;
    if(regularCell(teacherId,date,p))n++;
  }
  return n;
}
function breastfeedingBlocked(t,date,period){
  if(clean(t.name)!=="ريم الحربي")return false;
  const dk=dayKey(date);
  return ((dk==="sun"||dk==="mon")&&Number(period)===7)||(["tue","wed","thu"].includes(dk)&&Number(period)===6);
}
function makeupPending(t,date){
  const missed=currentWeekAbsenceLoad(t.id,date);
  if(!missed)return false;
  const c=assignmentCounts(date).get(String(t.id))||{week:0};
  const effective=Math.max(0,Number(t.workload||0)-missed)+Number(c.week||0);
  return effective<Number(t.workload||0);
}
let editionSixImportPromise=null;
function ensureSeedV6(){
  if(editionSixImportPromise)return editionSixImportPromise;
  editionSixImportPromise=ensureSeedV6Once().finally(()=>{editionSixImportPromise=null});
  return editionSixImportPromise;
}
async function ensureSeedV6Once(){
  await ensureAdmin();
  // Refresh before seeding: another login may have completed cloud import.
  await loadAll();
  if(state.settings?.sourceVersion===V6_SOURCE&&state.teachers.length===V6_SEED.length)return false;
  for(const s of V6_SEED){
    let t=state.teachers.find(x=>editionSixName(x.name)===s.name);
    const flags={
      permanentExcluded:nameSetContains(PERMANENT_EXCLUDED,s.name),
      advancedRank:nameSetContains(ADVANCED_RANK,s.name),
      absoluteExcluded:nameSetContains(ABSOLUTE_EXCLUDED,s.name),
      sourceVersion:V6_SOURCE
    };
    const workload=s.name==="نورة الهودان"?24:Number(s.workload||0);
    if(t){
      await patchKind(K.teacher,t.id,{...plainData(t),name:s.name,workload,...flags,active:true},token());
    }else{
      t=await insertKind(K.teacher,{name:s.name,subject:"",workload,excluded:false,active:true,...flags,createdAt:new Date().toISOString()},token());
    }
    const tid=String(t.id||"");
    if(!tid){throw new Error(`تعذر إنشاء سجل المعلمة: ${s.name}`)}
    const teacherId=String(t.id);
    const sch=state.schedules.find(x=>String(x.teacherId)===teacherId);
    const scheduleData={teacherId,teacherName:s.name,timetable:s.timetable,sourceVersion:V6_SOURCE,updatedAt:new Date().toISOString()};
    if(sch)await patchKind(K.schedule,sch.id,scheduleData,token());
    else await insertKind(K.schedule,scheduleData,token());
  }
  const settingsData={...(state.settings?plainData(state.settings):{}),sourceVersion:V6_SOURCE,countStart:state.settings?.countStart||COUNT_START,termStart:state.settings?.termStart||COUNT_START,emergencyDailyDemand:Number(state.settings?.emergencyDailyDemand||EMERGENCY_DAILY_DEMAND),updatedAt:new Date().toISOString()};
  if(state.settings)await patchKind(K.settings,state.settings.id,settingsData,token());
  else await insertKind(K.settings,settingsData,token());
  await loadAll();
  return true;
}
function scheduleOf(teacherId){
  return state.schedules.find(x=>String(x.teacherId)===String(teacherId))||null;
}
function teacherOf(id){
  return state.teachers.find(x=>String(x.id)===String(id))||
    MANUAL_SUPPORT_STAFF.find(x=>String(x.id)===String(id))||null;
}
function manualAssigneeDirectory(){
  return [...state.teachers,...MANUAL_SUPPORT_STAFF].sort((a,b)=>clean(a.name).localeCompare(clean(b.name),"ar"));
}
function existingSlotAssignment(date,absentId,period){
  return assignmentsOn(date).find(a=>String(a.absentTeacherId)===String(absentId)&&Number(a.period)===Number(period));
}
function weights(){return {...DEFAULT_WEIGHTS,...(state.settings?.weights||{})}}
function termStart(){return state.settings?.termStart||""}

function publishedAssignments(){
  return state.assignments.filter(x=>x.published===true&&x.status!=="ملغي");
}
function assignmentCounts(referenceDate){
  const wr=weekRange(referenceDate),start=termStart()||COUNT_START,countStart=state.settings?.countStart||COUNT_START;
  // Count approved substitutions for their actual date/week. Keep the official
  // countStart/termStart limits for cumulative totals only.
  const pub=publishedAssignments();
  const map=new Map();
  [...state.teachers,...MANUAL_SUPPORT_STAFF].forEach(t=>map.set(String(t.id),{
    daily:0,week:0,term:0,
    days:{sun:0,mon:0,tue:0,wed:0,thu:0},
    dayState:{sun:"",mon:"",tue:"",wed:"",thu:""},
    maxDaily:0
  }));
  const dailyBuckets=new Map();
  pub.forEach(a=>{
    const s=map.get(String(a.assignedTeacherId)); if(!s)return;
    if(a.date<=referenceDate&&(!start||a.date>=start)&&(!countStart||a.date>=countStart))s.term++;
    if(inRange(a.date,wr.start,wr.end)){
      s.week++;
      if(s.days[a.dayKey]!=null){
        s.days[a.dayKey]++;
        const prior=s.dayState[a.dayKey];
        const current=a.ackAt?"ack":"approved";
        s.dayState[a.dayKey]=(prior==="approved"||current==="approved")?"approved":"ack";
      }
      const key=`${a.assignedTeacherId}|${a.date}`;
      dailyBuckets.set(key,(dailyBuckets.get(key)||0)+1);
    }
    if(a.date===referenceDate)s.daily++;
  });
  dailyBuckets.forEach((n,key)=>{
    const id=String(key).split("|")[0],s=map.get(id);
    if(s)s.maxDaily=Math.max(s.maxDaily,n);
  });
  state.adjustments.forEach(a=>{
    const s=map.get(String(a.teacherId)); if(!s)return;
    const delta=Number(a.delta||0); if(!delta)return;
    const adjustmentDate=clean(a.date||a.weekStart);
    if(adjustmentDate<=referenceDate&&(!start||adjustmentDate>=start)&&(!countStart||adjustmentDate>=countStart))
      s.term=Math.max(0,Number(s.term||0)+delta);
    if(clean(a.weekStart)===wr.start){
      s.week=Math.max(0,Number(s.week||0)+delta);
      if(a.date===referenceDate)s.daily=Math.max(0,Number(s.daily||0)+delta);
      const dk=dayKey(a.date||"");
      if(dk&&s.days[dk]!=null)s.days[dk]=Math.max(0,Number(s.days[dk]||0)+delta);
    }
  });
  return map;
}
// Weekly reserve tallies and ranking list only teachers eligible for substitute duty.
// Absent-teacher selectors intentionally remain unfiltered: exempt teachers can be absent.
function reserveSummaryEligible(t){
  const flags=teacherFlags(t);
  return t.active!==false&&t.excluded!==true&&!flags.permanentExcluded&&!flags.absolute;
}
function publicWeeklyRows(referenceDate){
  const counts=assignmentCounts(referenceDate);
  const usedStaff=MANUAL_SUPPORT_STAFF.filter(t=>{
    const c=counts.get(String(t.id));return c&&(Number(c.week||0)>0||Number(c.term||0)>0);
  });
  const eligible=state.teachers.filter(t=>{
    if(reserveSummaryEligible(t))return true;
    if(teacherFlags(t).absolute)return false;
    const c=counts.get(String(t.id));
    return !!c&&Number(c.week||0)>0;
  });
  return [...eligible,...usedStaff]
    .sort((a,b)=>clean(a.name).localeCompare(clean(b.name),"ar"))
    .map(t=>({teacher:t,count:counts.get(String(t.id))||{week:0,term:0,days:{},dayState:{},maxDaily:0}}));
}

function absencesOn(date){return state.absences.filter(x=>x.date===date)}
function assignmentsOn(date){return state.assignments.filter(x=>x.date===date&&x.status!=="ملغي")}
function isAbsent(teacherId,date){return absencesOn(date).some(x=>String(x.teacherId)===String(teacherId))}
function occupiedByReserve(teacherId,date,period,exceptId=""){
  return assignmentsOn(date).some(x=>String(x.assignedTeacherId)===String(teacherId)&&Number(x.period)===Number(period)&&String(x.id)!==String(exceptId));
}
function regularCell(teacherId,date,period){
  const s=scheduleOf(teacherId),dk=dayKey(date);
  return clean(s?.timetable?.[dk]?.[period-1]||"");
}
function consecutivePenalty(teacherId,date,period){
  let n=0;
  for(const p of [period-1,period+1]){
    if(p<1||p>7)continue;
    if(regularCell(teacherId,date,p)||occupiedByReserve(teacherId,date,p))n++;
  }
  return n;
}

function candidateRanking(date,period,absentTeacherId,exceptAssignmentId="",opts={}){
  const counts=assignmentCounts(date);
  const targetClass=clean(opts.className||"");
  const emergency=dailyDemand(date)>Number(state.settings?.emergencyDailyDemand||EMERGENCY_DAILY_DEMAND);
  const usedPrimary=opts.usedPrimary||new Set(),usedAlt1=opts.usedAlt1||new Set();
  const all=[];
  state.teachers.forEach(t=>{
    if(String(t.id)===String(absentTeacherId))return;
    if(t.active===false||t.excluded===true)return;
    const flags=teacherFlags(t);
    if(flags.absolute)return;
    if(flags.permanentExcluded&&!conditionalReserveAllowed(date))return;
    if(isAbsent(t.id,date))return;
    if(breastfeedingBlocked(t,date,period))return;
    if(regularCell(t.id,date,period))return;
    if(occupiedByReserve(t.id,date,period,exceptAssignmentId))return;

    const c=counts.get(String(t.id))||{daily:0,week:0,term:0};
    const missed=currentWeekAbsenceLoad(t.id,date);
    const effectiveLoad=Math.max(0,Number(t.workload||0)-missed)+Number(c.week||0);
    const pending=makeupPending(t,date);
    const ceiling=ceilingFor(t);
    if(!emergency&&!pending&&effectiveLoad>=ceiling)return;

    const ownClass=targetClass?teacherHasClass(t.id,targetClass):false;
    const fatimaSecond=clean(t.name)==="فاطمة حسن"&&/^ثاني/.test(targetClass);
    const dailyOriginal=dailyOriginalCount(t.id,date);
    const adjacentOriginal=adjacentOriginalCount(t.id,date,period);
    const prevWeek=previousWeekReserveCount(t.id,date);
    const sameClassRepeat=targetClass?sameClassReserveToday(t.id,date,targetClass,exceptAssignmentId):false;
    const diversityUsed=usedPrimary.has(String(t.id))||usedAlt1.has(String(t.id));

    all.push({
      teacherId:String(t.id),name:t.name||"",workload:Number(t.workload||0),
      week:Number(c.week||0),term:Number(c.term||0),daily:Number(c.daily||0),
      effectiveLoad,missed,makeupPending:pending,ceiling,ownClass,fatimaSecond,
      dailyOriginal,adjacentOriginal,prevWeek,sameClassRepeat,diversityUsed,
      permanentExcluded:flags.permanentExcluded,emergency
    });
  });

  let pool=all.filter(x=>!x.sameClassRepeat);
  if(!pool.length&&emergency)pool=all.slice();

  // Keep every non-excluded option when there are enough of them;
  // do not discard regular teachers merely because exception teachers
  // have fewer recent substitutions.
  const enough=Math.max(1,Number(opts.limit||3));
  const standard=pool.filter(x=>!x.permanentExcluded);
  if(standard.length>=enough)pool=standard;

  if(!emergency){
    const fresh=pool.filter(x=>x.prevWeek===0);
    if(fresh.length>=enough &&
       (standard.length===0||fresh.filter(x=>!x.permanentExcluded).length>=Math.min(standard.length,enough)))pool=fresh;
  }

  if(!opts.ignoreDiversity){
    const fresh=pool.filter(x=>!x.diversityUsed);
    if(fresh.length>=enough&&
       (standard.length===0||fresh.filter(x=>!x.permanentExcluded).length>=Math.min(standard.length,enough)))pool=fresh;
  }
  pool.sort((a,b)=>
    Number(a.permanentExcluded)-Number(b.permanentExcluded)||
    a.effectiveLoad-b.effectiveLoad||
    Number(b.makeupPending)-Number(a.makeupPending)||
    a.week-b.week||
    Number(b.ownClass)-Number(a.ownClass)||
    Number(b.fatimaSecond)-Number(a.fatimaSecond)||
    a.dailyOriginal-b.dailyOriginal||
    a.adjacentOriginal-b.adjacentOriginal||
    a.term-b.term||
    a.prevWeek-b.prevWeek||
    a.name.localeCompare(b.name,"ar")
  );
  return pool.slice(0,Number(opts.limit||3)).map((x,i)=>({...x,score:i+1}));
}

function injectStyle(){
  if(byId("dailyReserveStyle"))return;
  const s=document.createElement("style");s.id="dailyReserveStyle";
  s.textContent=`
  #dailyReserveRoot{direction:rtl;display:grid;gap:18px}
  .reserve-tabs{display:flex;flex-wrap:wrap;gap:8px}
  .reserve-tab{border:1px solid #d8e1e4;background:#fff;border-radius:10px;padding:9px 13px;font:800 13px inherit;color:#0b3047;cursor:pointer}
  .reserve-tab.active{background:#0f5f59;color:#fff;border-color:#0f5f59}
  .reserve-table-wrap{overflow:auto;border:1px solid #e2e7ea;border-radius:14px;background:#fff}
  .reserve-table{width:100%;border-collapse:collapse;min-width:760px}
  .reserve-table th,.reserve-table td{padding:10px 9px;border-bottom:1px solid #e8ecef;text-align:center;vertical-align:middle}
  .reserve-table th{background:#f3f7f7;color:#0b3047;font-weight:900;white-space:nowrap}
  .reserve-table td:first-child,.reserve-table th:first-child{text-align:right}
  .reserve-status{display:inline-flex;padding:4px 8px;border-radius:999px;background:#e8f4f2;color:#0f5f59;font-weight:800;font-size:12px}
  .reserve-status.pending{background:#fff4db;color:#7c5a00}
  /* Inline actions retain the original six-column public timetable layout. */
  #dailyReserveRoot .reserve-inline-action{display:inline-flex;justify-content:center;align-items:center;gap:5px;margin:5px 4px 0;padding:6px 9px;border:1px solid #b6d5d0;border-radius:9px;background:#f6fbfa;color:#075c55;font:700 12px inherit;cursor:pointer;line-height:1.45;max-width:100%;white-space:normal}
  #dailyReserveRoot .reserve-inline-action:disabled{opacity:.55;cursor:wait}
  #dailyReserveRoot .reserve-row-topic-editor{margin-top:9px;padding:10px;background:#f7fafa;border:1px solid #dce6e8;border-radius:9px;min-width:0}
  #dailyReserveRoot .reserve-row-topic-editor[hidden]{display:none!important}
  #dailyReserveRoot .reserve-row-topic-editor label{display:grid;gap:6px;text-align:right;font-size:12px;font-weight:800}
  #dailyReserveRoot .reserve-row-topic-input{box-sizing:border-box;width:100%;min-width:0;max-width:100%;border:1px solid #c3d1d5;border-radius:8px;padding:9px 8px;font:inherit;font-size:16px}
  #dailyReserveRoot .reserve-inline-topic-title{display:block;overflow-wrap:anywhere;margin-top:5px;color:#234a54}
  #dailyReserveRoot .reserve-inline-feedback{display:block;min-height:0;margin-top:4px;color:#9b352e;font-size:12px;line-height:1.5}
  #dailyReserveRoot .reserve-inline-buttons{display:flex;flex-wrap:wrap;gap:5px}
  .reserve-candidate{display:grid;gap:2px;text-align:right;padding:7px 8px;border:1px solid #e1e7ea;border-radius:9px;background:#fff}
  .reserve-candidate small{color:#687a83}
  .reserve-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
  .reserve-admin-block{padding:16px}
  .reserve-admin-list{display:grid;gap:10px}
  .reserve-teacher-row{border:1px solid #e1e6e9;border-radius:12px;padding:12px;display:grid;gap:9px}
  .reserve-actions{display:flex;flex-wrap:wrap;gap:7px}
  .reserve-mini{border:1px solid #cfdadd;background:#fff;border-radius:9px;padding:7px 10px;font:700 12px inherit;cursor:pointer;color:#0f5f59}
  .reserve-mini.danger{color:#9b2525;border-color:#e5c8c8}
  .schedule-matrix{display:grid;gap:10px}
  .schedule-day{display:grid;grid-template-columns:95px repeat(7,minmax(80px,1fr));gap:6px;align-items:center}
  .schedule-day strong{color:#0b3047}
  .schedule-day input{min-width:0;border:1px solid #d3dde1;border-radius:8px;padding:8px;font:inherit}
  .reserve-score{font-size:11px;color:#687a83}
  .reserve-public-note{font-size:13px;color:#687a83}
  .reserve-highlight{background:#f8fbfb}
  .reserve-ack{border:1px solid #cfe2dd;background:#f8fcfb;border-radius:14px;padding:14px;display:grid;gap:8px}
  .reserve-teacher-action{display:grid;gap:8px;padding:10px;border-radius:10px;background:#eef7f4}
  .reserve-teacher-action .btn,.reserve-activation-box .btn{justify-self:start;max-width:100%;white-space:normal}
  .reserve-activation-box input:disabled{background:#f0f2f3;color:#6b7578;cursor:not-allowed}
  .reserve-activation-box{margin-top:6px;padding-top:12px;border-top:1px solid #d9e8e4;display:grid;gap:8px}
  .reserve-activation-box label{display:grid;gap:6px;font-weight:800;color:#0b3047}
  .reserve-activation-box input{border:1px solid #cfdadd;border-radius:10px;padding:10px 11px;font:inherit;background:#fff}
  .reserve-count-approved{background:#fff0d8!important;color:#9a4d00;font-weight:900}
  .reserve-count-ack{background:#e5f6ec!important;color:#176b3a;font-weight:900}
  .reserve-excellence{display:grid;gap:10px}
  .reserve-rank-badge{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:4px 8px;background:#eef5f4;font-size:12px;font-weight:900}
  .reserve-rank-badge.star{background:#fff4d7;color:#8a5a00}
  .reserve-source-note{font-size:12px;color:#60757c}
  .reserve-card-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
  .reserve-work-card{border:1px solid #d9e3e5;background:#fff;border-radius:14px;padding:14px;text-align:right;cursor:pointer;display:grid;gap:5px;min-height:105px}
  .reserve-work-card strong{color:#0b3047;font-size:15px}
  .reserve-work-card small{color:#64777f;line-height:1.6}
  .reserve-work-card.active{border-color:#0f5f59;box-shadow:0 0 0 2px rgba(15,95,89,.08);background:#f8fcfb}
  .reserve-hijri-date{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;border:1px solid #e0e7e9;border-radius:12px;padding:9px;background:#fafcfc}
  .reserve-hijri-date strong{min-width:190px;text-align:center;color:#0b3047}
  .reserve-multi-select{min-height:150px;width:100%;border:1px solid #cfdadd;border-radius:10px;padding:8px;font:inherit;background:#fff}
  .reserve-warning-box{border:1px solid #f0c987;background:#fff7e9;color:#704500;border-radius:12px;padding:11px;display:grid;gap:5px}
  .reserve-kpi{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
  .reserve-kpi>div{border:1px solid #e0e7e9;border-radius:12px;padding:11px;background:#fff;display:grid;gap:3px}
  .reserve-kpi b{font-size:18px;color:#0b3047}
  .reserve-admin-only{border-right:4px solid #0f5f59;padding-right:10px}
  .reserve-edit-number{width:84px}
  #dailyReserveRoot .reserve-admin-manual-toggle{display:flex;align-items:flex-start;gap:10px;line-height:1.7;border:1px solid #cfdbde;border-radius:11px;padding:12px;margin:12px 0;background:#f8fbfb;cursor:pointer}
  #dailyReserveRoot .reserve-admin-manual-toggle input[type="checkbox"]{flex:0 0 20px;width:20px;min-width:20px;max-width:20px;min-height:20px;height:20px;margin:5px 0 0}
  #dailyReserveRoot .reserve-admin-manual-toggle span{flex:1;min-width:0}
  @media(max-width:980px){.reserve-card-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.reserve-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:760px){
    .reserve-grid{grid-template-columns:1fr}
    .schedule-day{grid-template-columns:80px repeat(7,95px)}
    .schedule-matrix{overflow:auto}
  }
  /* Reserve-only mobile portrait mode; desktop and print styles stay unchanged. */
  #dailyReserveRoot .reserve-schedule-slot{display:block;min-width:0}
  #dailyReserveRoot .reserve-schedule-slot>span{display:none}
  @media screen and (max-width:900px){
    #dailyReserveRoot,#dailyReserveRoot>section,
    #dailyReserveRoot .surface,#dailyReserveRoot .panel,
    #dailyReserveRoot .reserve-admin-block,
    #dailyReserveRoot .reserve-admin-only,
    #dailyReserveRoot .reserve-grid,
    #dailyReserveRoot #reserveAdminBody,
    #dailyReserveRoot #reserveWorkspaceBody,
    #dailyReserveRoot .reserve-table-wrap{
      min-width:0;max-width:100%;box-sizing:border-box;
    }
    #dailyReserveRoot{width:100%;overflow-wrap:anywhere}
    #dailyReserveRoot .reserve-grid{grid-template-columns:minmax(0,1fr);gap:12px}
    #dailyReserveRoot .reserve-card-grid{grid-template-columns:minmax(0,1fr);gap:8px}
    #dailyReserveRoot .reserve-work-card{min-height:0;padding:13px 15px;width:100%}
    #dailyReserveRoot .reserve-work-card small{font-size:12px}
    #dailyReserveRoot .reserve-admin-block{padding:12px}
    #dailyReserveRoot .reserve-admin-only{padding-right:10px}
    #dailyReserveRoot .panel-head{display:flex;flex-wrap:wrap;gap:8px}
    #dailyReserveRoot .panel-head>*{max-width:100%;min-width:0}
    #dailyReserveRoot .reserve-tabs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
    #dailyReserveRoot .reserve-tab{min-width:0;min-height:44px;padding:10px 8px;white-space:normal;line-height:1.5}
    #dailyReserveRoot .form-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
    #dailyReserveRoot .form-grid>label,#dailyReserveRoot .form-grid>.wide{width:100%;min-width:0;max-width:100%;grid-column:1/-1}
    #dailyReserveRoot input:not([type=hidden]),
    #dailyReserveRoot select,
    #dailyReserveRoot textarea{
      box-sizing:border-box;max-width:100%;min-width:0;width:100%;
      font-size:16px;min-height:44px;
    }
    #dailyReserveRoot .reserve-multi-select{min-height:190px;padding:10px}
    #dailyReserveRoot .reserve-admin-manual-toggle input[type="checkbox"]{width:20px;min-width:20px;max-width:20px;min-height:20px;height:20px}
    #dailyReserveRoot .form-actions{display:flex;flex-wrap:wrap;gap:8px}
    #dailyReserveRoot .form-actions>button{
      flex:1 1 100%;width:100%;max-width:100%;min-height:46px;white-space:normal;
    }
    #dailyReserveRoot .reserve-hijri-date{
      display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;
      padding:11px;max-width:100%;
    }
    #dailyReserveRoot .reserve-hijri-date>strong{
      grid-row:1;grid-column:1/-1;min-width:0;width:100%;line-height:1.5;
    }
    #dailyReserveRoot .reserve-hijri-date>button{min-width:0;min-height:44px;white-space:normal}
    #dailyReserveRoot .reserve-kpi{grid-template-columns:repeat(2,minmax(0,1fr))}
    #dailyReserveRoot .reserve-table-wrap{overflow:visible;border:0;background:transparent}
    #dailyReserveRoot .reserve-table,
    #dailyReserveRoot .reserve-table tbody{
      display:block;width:100%;min-width:0;max-width:100%;
    }
    #dailyReserveRoot .reserve-table thead{display:none}
    #dailyReserveRoot .reserve-table tbody tr{
      display:grid;grid-template-columns:minmax(0,1fr);
      gap:0;margin:0 0 12px;padding:10px 12px;
      width:100%;min-width:0;max-width:100%;box-sizing:border-box;
      background:#fff;border:1px solid #dce6e7;border-radius:12px;
    }
    #dailyReserveRoot .reserve-table tbody td:not([colspan]){
      display:grid;grid-template-columns:minmax(92px,36%) minmax(0,1fr);
      gap:8px;align-items:start;min-width:0;max-width:100%;
      padding:10px 0;text-align:right;vertical-align:top;
      border-bottom:1px solid #eef1f2;
      overflow-wrap:anywhere;
    }
    #dailyReserveRoot .reserve-table tbody td:last-child{border-bottom:0}
    #dailyReserveRoot .reserve-table tbody td:not([colspan])::before{
      content:attr(data-reserve-label);color:#58707b;
      font-size:12px;font-weight:800;align-self:start;
    }
    #dailyReserveRoot .reserve-table tbody td.reserve-mobile-select-cell{
      display:flex;flex-direction:column;align-items:stretch;gap:7px;
    }
    #dailyReserveRoot .reserve-table tbody td.reserve-mobile-select-cell::before{
      display:block;content:attr(data-reserve-label);
    }
    #dailyReserveRoot .reserve-table tbody td select{
      display:block;width:100%;max-width:100%;min-width:0;min-height:48px;
      padding:12px 9px;background:#fff;border:1px solid #bdced2;
      border-radius:10px;color:#102d3b;text-align:right;direction:rtl;
    }
    #dailyReserveRoot .reserve-table tbody td[colspan]{
      display:block;text-align:center;white-space:normal;padding:13px 7px;
    }
    #dailyReserveRoot .reserve-table .reserve-candidate{min-width:0;padding:9px;margin-bottom:5px}
    #dailyReserveRoot .reserve-table .reserve-actions{
      display:grid;grid-template-columns:minmax(0,1fr);gap:8px;width:100%;
    }
    #dailyReserveRoot .reserve-table .reserve-actions button,
    #dailyReserveRoot .reserve-table button.reserve-mini{
      display:block;width:100%;min-height:44px;white-space:normal;
    }
    #dailyReserveRoot .reserve-table .reserve-count-approved,
    #dailyReserveRoot .reserve-table .reserve-count-ack{border-radius:7px;padding-right:6px!important}
    #dailyReserveRoot .reserve-admin-list,
    #dailyReserveRoot .reserve-teacher-row{min-width:0;max-width:100%}
    #dailyReserveRoot .reserve-teacher-row{overflow-wrap:anywhere}
    #dailyReserveRoot .reserve-teacher-row .reserve-actions{
      display:grid;grid-template-columns:minmax(0,1fr);gap:8px;
    }
    #dailyReserveRoot .reserve-teacher-row .reserve-actions button{min-height:44px}
    #dailyReserveRoot .schedule-matrix{overflow:visible;max-width:100%;width:100%}
    #dailyReserveRoot .schedule-day{
      display:grid;grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;padding:12px 10px;margin-bottom:10px;
      border:1px solid #dce6e7;border-radius:12px;
      min-width:0;max-width:100%;box-sizing:border-box;
    }
    #dailyReserveRoot .schedule-day>strong{grid-column:1/-1}
    #dailyReserveRoot .reserve-schedule-slot{display:grid;gap:5px;min-width:0}
    #dailyReserveRoot .reserve-schedule-slot>span{display:block;color:#536b74;font-size:12px;font-weight:800}
    #dailyReserveRoot .reserve-schedule-slot>input{width:100%;min-width:0}
    #dailyReserveRoot .reserve-activation-box,
    #dailyReserveRoot .reserve-ack{min-width:0;max-width:100%;box-sizing:border-box}
  }
  @media print{
    .sidebar,.mobile-nav,.reserve-no-print,.manjaz-brand-header,#manjazVersionBadge{display:none!important}
    .content{margin:0!important;padding:0!important}
    #dailyReserveRoot{display:block}
    .reserve-table-wrap{border:0;overflow:visible}
    .reserve-table{min-width:0;font-size:11px}
    .reserve-inline-action,.reserve-row-topic-editor,.reserve-inline-feedback{display:none!important}
  }`;
  document.head.appendChild(s);
}


// Layout-only enhancement: attach readable field captions to each table cell.
// This does not change records, nominations, saves, or existing event handlers.
function decorateReservePortraitTables(root){
  if(!root)return;
  const decorate=()=>{
    root.querySelectorAll(".reserve-table").forEach(table=>{
      const headings=[...table.querySelectorAll("thead tr:first-child th")]
        .map(th=>th.textContent.trim());
      table.querySelectorAll("tbody tr").forEach(tr=>{
        [...tr.children].forEach((cell,i)=>{
          if(cell.tagName!=="TD"||cell.hasAttribute("colspan"))return;
          if(headings[i])cell.setAttribute("data-reserve-label",headings[i]);
          cell.classList.toggle("reserve-mobile-select-cell",!!cell.querySelector("select"));
        });
      });
    });
  };
  decorate();
  if(root.dataset.reservePortraitObserver==="1")return;
  root.dataset.reservePortraitObserver="1";
  new MutationObserver(decorate).observe(root,{childList:true,subtree:true});
}

// One renderer for initial display and for refresh after manual/automatic saves.
function publicDayRowsHTML(date){
  const daily=assignmentsOn(date).filter(x=>x.published===true);
  return `${daily.length?daily.sort((a,b)=>Number(a.period)-Number(b.period)).map(a=>`<tr data-reserve-public-assignment="${esc(a.id)}">
          <td>${esc(a.period)}</td><td>${esc(a.className||"—")}</td><td>${esc(a.absentTeacherName||"—")}</td>
          <td><strong>${esc(a.assignedTeacherName||"—")}</strong></td>
          <td>
            ${a.ackAt?'<span class="reserve-status">تم الاطلاع</span>':`<span class="reserve-status pending">بانتظار الاطلاع</span><button class="reserve-inline-action reserve-row-ack reserve-no-print" type="button" aria-label="تأكيد اطلاع ${esc(a.assignedTeacherName||'المعلمة')} على الحصة ${esc(a.period)}">تأكيد الاطلاع</button>`}
            <small class="reserve-inline-feedback" data-reserve-inline-feedback="ack" role="status" aria-live="polite"></small>
          </td>
          <td>
            ${a.activationTitle?`<div><span class="reserve-status">تم التفعيل</span><small class="reserve-inline-topic-title">${esc(a.activationTitle)}</small></div>`:'<span class="reserve-status pending">لم يتم التفعيل</span>'}
            <button class="reserve-inline-action reserve-row-topic-open reserve-no-print" type="button">${a.activationTitle?'تعديل الموضوع':'إدخال الموضوع'}</button>
            <div class="reserve-row-topic-editor reserve-no-print" hidden>
              <label>عنوان موضوع الحصة<input class="reserve-row-topic-input" type="text" maxlength="160" value="${esc(a.activationTitle||'')}" placeholder="اكتبي موضوع حصة الاحتياط" autocomplete="off"></label>
              <div class="reserve-inline-buttons"><button class="reserve-inline-action reserve-row-topic-save" type="button">حفظ الموضوع</button><button class="reserve-inline-action reserve-row-topic-cancel" type="button">إلغاء</button></div>
            </div>
            <small class="reserve-inline-feedback" data-reserve-inline-feedback="topic" role="status" aria-live="polite"></small>
          </td>
        </tr>`).join(""):`<tr><td colspan="6">لا يوجد جدول احتياط معتمد لهذا اليوم</td></tr>`}`;
}

function publicHTML(){
  const date=state.currentDate,wr=weekRange(date);
  const rows=publicWeeklyRows(date);
  const ackToken=new URLSearchParams(location.search).get("reserve_ack")||"";
  const ack=ackToken?state.assignments.find(x=>x.ackToken===ackToken&&x.published===true):null;
  return `<div id="dailyReserveRoot">
    <section class="page-intro"><div>
      <span class="kicker">منجز</span>
      <h2>الاحتياط اليومي</h2>
      <p>جدول الاحتياط المعتمد والحسبة الأسبوعية التراكمية للمعلمات</p>
    </div></section>

    ${ack?`<section class="reserve-ack reserve-no-print" aria-label="إجراءات معلمة الاحتياط">
      <strong>تكليف الاحتياط — اطلاع المعلمة وعنوان الموضوع</strong>
      <div>${esc(ack.assignedTeacherName)} — الحصة ${esc(ack.period)} — ${esc(ack.className||"")}</div>
      <div>${esc(dayName(ack.date))} ${esc(fmtDate(ack.date))}</div>
      <div class="reserve-teacher-action">
        <strong>١. الاطلاع على التكليف</strong>
        ${ack.ackAt?`<span class="reserve-status">تم الاطلاع ${esc(fmtDateTimeHijri(ack.ackAt))}</span>`:
          `<button class="btn btn-primary" type="button" id="reserveAckBtn">تأكيد الاطلاع على التكليف</button>`}
        <div id="reserveAckMsg" role="status" aria-live="polite"></div>
      </div>
      <div class="reserve-activation-box">
        <strong>٢. موضوع الحصة (عنوان التفعيل)</strong>
        ${!ack.ackAt?'<p class="reserve-public-note">لتفعيل كتابة الموضوع، اضغطي «تأكيد الاطلاع» أولًا.</p>':""}
        ${ack.activationTitle?'<span class="reserve-status">تم تسجيل الموضوع، ويمكن تحديثه</span>':""}
        <label for="reserveActivationTitle">عنوان الموضوع المنفذ خلال حصة الاحتياط
          <input id="reserveActivationTitle" maxlength="160" value="${esc(ack.activationTitle||"")}" placeholder="مثال: مراجعة مهارات الوحدة الثالثة" ${ack.ackAt?"":"disabled"}>
        </label>
        <button class="btn btn-primary" id="reserveActivationSave" type="button" ${ack.ackAt?"":"disabled"}>${ack.activationTitle?"تحديث عنوان الموضوع":"حفظ عنوان الموضوع"}</button>
        ${ack.activationAt?`<small>آخر تحديث: ${esc(fmtDateTimeHijri(ack.activationAt))}</small>`:""}
        <div id="reserveActivationMsg" role="status" aria-live="polite"></div>
      </div>
    </section>`:""}

    <section class="surface panel">
      <div class="panel-head"><h3>جدول الاحتياط اليومي</h3><span>${esc(dayName(date))} — ${esc(fmtDate(date))}</span></div>
      <div class="reserve-no-print" style="display:grid;gap:8px;margin-bottom:12px">
        ${hijriDateControl("reservePublicDate",date)}
        <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" type="button" id="reservePrint">طباعة الجدول</button>
        <button class="btn btn-primary" type="button" id="reservePublish">جدول النشر</button>
        <button class="btn btn-ghost" type="button" id="reserveAdminOpen">دخول الإدارة</button>
        </div>
        <p class="reserve-public-note">يمكن للمعلمة تأكيد الاطلاع وإدخال موضوع الحصة مباشرة من صف تكليفها في الجدول أدناه، دون رابط منفصل. <strong>يُرجى أن تستخدم كل معلمة صفها فقط.</strong></p>
      </div>
      <div class="reserve-table-wrap">
        <table class="reserve-table"><thead><tr><th>الحصة</th><th>الفصل</th><th>المعلمة الغائبة</th><th>معلمة الاحتياط</th><th>حالة الاطلاع</th><th>التفعيل</th></tr></thead>
        <tbody id="reservePublicDayBody">${publicDayRowsHTML(date)}</tbody></table>
      </div>
    </section>

    <section class="surface panel">
      <div class="panel-head"><h3>الحسبة الأسبوعية التراكمية للاحتياط</h3><span>${esc(fmtDate(wr.start))} – ${esc(fmtDate(wr.end))}</span></div>
      <div class="reserve-no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button class="reserve-tab active" type="button" data-week-shift="0">الأسبوع الحالي</button>
        <button class="reserve-tab" type="button" data-week-shift="-7">الأسبوع السابق</button>
      </div>
      <div id="reserveWeeklyHolder">${weeklyTableHTML(rows,date)}</div>
      <div id="reserveExcellenceHolder" style="margin-top:14px">${excellenceTableHTML(date)}</div>
      <p class="reserve-public-note">البرتقالي = معتمد من الإدارة، الأخضر = تم اطلاع المعلمة. الأرقام تتحدث تلقائيًا بعد أي تحديث معتمد.</p>
    </section>

    <section id="reserveAdminMount" class="reserve-no-print"></section>
  </div>`;
}
function weeklyTableHTML(rows,referenceDate){
  return `<div class="reserve-table-wrap"><table class="reserve-table"><thead><tr>
    <th>المعلمة</th>${DAYS.map(d=>`<th>${d[1]}</th>`).join("")}<th>مجموع الأسبوع</th><th>التراكمي للفصل</th>
  </tr></thead><tbody>${rows.length?rows.map(r=>`<tr>
    <td><strong>${esc(r.teacher.name)}</strong></td>
    ${DAYS.map(d=>{
      const n=Number(r.count.days?.[d[0]]||0),st=r.count.dayState?.[d[0]]||"";
      const cls=n?(st==="ack"?"reserve-count-ack":"reserve-count-approved"):"";
      return `<td class="${cls}">${n}</td>`;
    }).join("")}
    <td><strong>${Number(r.count.week||0)}</strong></td><td><strong>${Number(r.count.term||0)}</strong></td>
  </tr>`).join(""):`<tr><td colspan="8">لا توجد بيانات معلمات بعد</td></tr>`}</tbody></table></div>`;
}
function excellenceRows(referenceDate){return excellenceMetrics(referenceDate)}
function excellenceTableHTML(referenceDate){
  const rows=excellenceMetrics(referenceDate);
  return `<div class="reserve-excellence">
    <div class="panel-head"><h3>المتميزات في تسديد الاحتياط</h3><span>أسبوعي وتراكمي</span></div>
    <div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>المركز</th><th>المعلمة</th><th>المسند أسبوعيًا</th><th>المحتسب في التميز</th><th>التراكمي</th></tr></thead>
    <tbody>${rows.length?rows.map(r=>`<tr><td><strong>${r.rank}</strong></td><td>${esc(r.teacher.name)}</td><td>${r.weekCount}</td><td><strong>${r.qualifiedWeek}</strong></td><td>${r.cumulativeQualified}</td></tr>`).join(""):'<tr><td colspan="5">لا توجد بيانات تميز محتسبة لهذا الأسبوع</td></tr>'}</tbody></table></div>
  </div>`;
}

function loginHTML(){
  return `<section class="surface form-card reserve-admin-block">
    <div class="form-section-title">دخول الإدارة</div>
    <form id="reserveLoginForm"><div class="form-grid">
      <label>البريد الإداري<input id="reserveAdminEmail" type="email" required autocomplete="username"></label>
      <label>كلمة المرور<input id="reserveAdminPassword" type="password" required autocomplete="current-password"></label>
    </div><div class="form-actions"><button class="btn btn-primary" type="submit">دخول</button><button class="btn btn-ghost" type="button" id="reserveCloseLogin">إلغاء</button></div>
    <div id="reserveLoginMsg"></div></form>
  </section>`;
}
function adminHTML(){
  return `<section class="surface panel reserve-admin-block">
    <div class="panel-head"><h3>إدارة الاحتياط اليومي</h3><span>${esc(state.admin?.user?.email||"حساب إداري")}</span></div>
    <div class="reserve-tabs">
      <button class="reserve-tab active" data-admin-tab="workspace">إنشاء ومتابعة الاحتياط</button>
      <button class="reserve-tab" data-admin-tab="teachers">المعلمات والجداول</button>
      <button class="reserve-tab" data-admin-tab="settings">الإعدادات</button>
      <button class="reserve-tab" id="reserveLogout">خروج</button>
    </div>
    <div id="reserveAdminBody" style="margin-top:14px"></div>
  </section>`;
}

function dayAdminHTML(){
  const date=state.currentDate,abs=absencesOn(date),assign=assignmentsOn(date);
  return `<div class="reserve-grid">
    <section class="surface form-card">
      <div class="form-section-title">الإنشاء الآلي</div>
      ${hijriDateControl("reserveAdminDate",date)}
      <div class="form-grid" style="margin-top:12px">
        <label>المعلمة الغائبة<select id="reserveAbsentTeacher"><option value="">اختاري المعلمة</option>${state.teachers.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}</select></label>
        <label>سبب الاحتياط<select id="reserveAbsenceReason"><option>غياب</option><option>دورة</option><option>اجتماع</option><option>انتداب</option><option>تكليف خارجي</option><option>أخرى</option></select></label>
      </div>
      <div class="form-actions"><button class="btn btn-primary" id="reserveAddAbsence" type="button">تسجيل الغياب واستخراج الحصص</button></div>
      <div id="reserveDayMsg"></div>
      <div class="reserve-admin-list" style="margin-top:12px">${abs.length?abs.map(a=>`<div class="reserve-teacher-row">
        <strong>${esc(a.teacherName)}</strong><span>${esc(a.reason||"غياب")} — ${(a.periods||[]).map(p=>`ح${p.period}: ${esc(p.className)}${p.activity?" (نشاط)":""}`).join(" — ")||"لا توجد حصص مسجلة"}</span>
        <button class="reserve-mini danger reserve-delete-absence" data-id="${esc(a.id)}">حذف الغياب</button>
      </div>`).join(""):'<div class="empty-inline">لا يوجد غياب مسجل لهذا اليوم</div>'}</div>
      <div class="form-actions" style="margin-top:12px"><button class="btn btn-primary" id="reserveGenerate" type="button">توليد أفضل 3 مرشحات</button></div>
    </section>

    <section class="surface panel">
      <div class="panel-head"><h3>توزيع الاحتياط</h3><span>${assign.length} تكليف</span></div>
      <section class="reserve-admin-warnings"><strong>مساحة تحذيرات الإسناد</strong><div id="reserveAutoWarnings">${reserveWarningsMarkup(currentReserveWarnings(date))}</div></section>
      <div id="reserveAssignmentsAdmin">${adminAssignmentsHTML(assign)}</div>
      <div class="form-actions" style="margin-top:12px"><button class="btn btn-primary" id="reserveApproveAuto" type="button">اعتماد جدول اليوم</button></div>
    </section>
  </div>`;
}
function manualCandidateOptions(a){
  // This dropdown is a deliberate ADMIN OVERRIDE, unlike candidateRanking (top-three engine).
  const all=manualAssigneeDirectory().map(t=>({teacherId:String(t.id),name:t.name}));
  if(a.assignedTeacherId&&!all.some(t=>String(t.teacherId)===String(a.assignedTeacherId))){
    all.unshift({teacherId:String(a.assignedTeacherId),name:a.assignedTeacherName||"المكلفة سابقًا"});
  }
  return all;
}
function adminAssignmentsHTML(items){
  if(!items.length)return '<div class="empty-inline">سجلي الغياب ثم اضغطي توليد أفضل 3 مرشحات</div>';
  return `<div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>الحصة</th><th>الفصل</th><th>سبب الاحتياط</th><th>الغائبة</th><th>أفضل 3 مرشحات</th><th>المكلفة</th><th>التفعيل</th><th>الإجراءات</th></tr></thead>
  <tbody>${items.sort((a,b)=>Number(a.period)-Number(b.period)).map(a=>{
    const all=manualCandidateOptions(a);
    return `<tr data-assignment="${esc(a.id)}">
    <td>${esc(a.period)}</td><td>${esc(a.className||"—")}${a.activity?' <small>(نشاط)</small>':""}</td><td>${esc(a.reason||"غياب")}</td><td>${esc(a.absentTeacherName)}</td>
    <td>${(a.candidates||[]).map((c,i)=>`<div class="reserve-candidate"><strong>${i+1}. ${esc(c.name)}</strong></div>`).join("")||"لا توجد مرشحات"}</td>
    <td><select class="reserve-assignee"><option value="">اختاري المكلفة</option>${all.map(c=>`<option value="${esc(c.teacherId)}" ${String(c.teacherId)===String(a.assignedTeacherId)?"selected":""}>${esc(c.name)}</option>`).join("")}</select><small class="reserve-source-note">تحرير إداري: جميع المعلمات والموجهات ومحضرة المختبر</small></td>
    <td>${a.activationTitle?`<div><span class="reserve-status">تم التفعيل</span><br><small>${esc(a.activationTitle)}</small></div>`:(a.ackAt?'<span class="reserve-status">تم الاطلاع</span>':(a.published?'<span class="reserve-status pending">معتمد</span>':'—'))}</td>
    <td><div class="reserve-actions"><button class="reserve-mini reserve-save-assignee">تحديث وحفظ</button>${a.published?`<button class="reserve-mini reserve-copy-ack" type="button">نسخ رابط المعلمة</button><button class="reserve-mini reserve-open-ack" type="button">فتح نموذج المعلمة</button>`:""}<button class="reserve-mini danger reserve-delete-assignment">حذف</button></div></td>
  </tr>`}).join("")}</tbody></table></div>`;
}


function workspaceHTML(){
  return `<div>
    <div class="reserve-card-grid">
      <button class="reserve-work-card ${state.workspaceCard==="manual"?"active":""}" data-reserve-card="manual" type="button">
        <strong>الإنشاء اليدوي</strong><small>إدخال جميع الغائبات أولًا ثم اختيار معلمات التسديد يدويًا من القوائم المتاحة.</small>
      </button>
      <button class="reserve-work-card ${state.workspaceCard==="auto"?"active":""}" data-reserve-card="auto" type="button">
        <strong>الإنشاء الآلي</strong><small>توليد الاحتياط حسب محرك المفاضلة والاستثناءات ثم التعديل والاعتماد.</small>
      </button>
      <button class="reserve-work-card ${state.workspaceCard==="ranking"?"active":""}" data-reserve-card="ranking" type="button">
        <strong>احتساب المفاضلة</strong><small>تفاصيل الأسبوع الحالي، العدالة، النصاب، العبء، والتصحيح الإداري.</small>
      </button>
      <button class="reserve-work-card ${state.workspaceCard==="excellence"?"active":""}" data-reserve-card="excellence" type="button">
        <strong>التميز في شغل الاحتياط</strong><small>الحصص اليومية والأسبوعية والتراكمية وعناوين التفعيل والتصدير.</small>
      </button>
    </div>
    <div id="reserveWorkspaceBody" style="margin-top:14px"></div>
  </div>`;
}
function renderWorkspaceCard(kind){
  state.workspaceCard=kind||"manual";
  document.querySelectorAll("[data-reserve-card]").forEach(b=>b.classList.toggle("active",b.dataset.reserveCard===state.workspaceCard));
  const body=byId("reserveWorkspaceBody"); if(!body)return;
  if(state.workspaceCard==="auto"){body.innerHTML=dayAdminHTML();bindDayAdmin();return}
  if(state.workspaceCard==="ranking"){body.innerHTML=rankingAdminHTML();bindRankingAdmin();return}
  if(state.workspaceCard==="excellence"){body.innerHTML=excellenceAdminHTML();bindExcellenceAdmin();return}
  body.innerHTML=manualAdminHTML();bindManualAdmin();
}
function bindWorkspace(){
  document.querySelectorAll("[data-reserve-card]").forEach(b=>b.onclick=()=>renderWorkspaceCard(b.dataset.reserveCard));
  renderWorkspaceCard(state.workspaceCard||"manual");
}

function manualPhysicalCandidates(date,period,absentIds=[],allNames=false,exceptAssignmentId="",plannedDemand=0){
  const absent=new Set(absentIds.map(String));
  if(allNames)return manualAssigneeDirectory();
  const teachers=state.teachers.filter(t=>{
    if(absent.has(String(t.id))||isAbsent(t.id,date))return false;
    if(t.active===false||t.excluded===true)return false;
    const f=teacherFlags(t);
    if(f.absolute)return false;
    if(f.permanentExcluded&&!conditionalReserveAllowed(date,plannedDemand))return false;
    if(breastfeedingBlocked(t,date,period))return false;
    if(regularCell(t.id,date,period))return false;
    if(occupiedByReserve(t.id,date,period,exceptAssignmentId))return false;
    return true;
  }).sort((a,b)=>{
    const ca=assignmentCounts(date).get(String(a.id))||{week:0,daily:0};
    const cb=assignmentCounts(date).get(String(b.id))||{week:0,daily:0};
    return Number(teacherFlags(a).permanentExcluded)-Number(teacherFlags(b).permanentExcluded)||
      Number(ca.week||0)-Number(cb.week||0)||Number(a.workload||0)-Number(b.workload||0)||clean(a.name).localeCompare(clean(b.name),"ar");
  });
  // Additional staff have no timetable in edition six. Their availability must be confirmed by administration.
  return [...teachers,...MANUAL_SUPPORT_STAFF.filter(t=>!occupiedByReserve(t.id,date,period,exceptAssignmentId))];
}
function savedReserveWarnings(date){
  return [...new Set(assignmentsOn(date).flatMap(a=>Array.isArray(a.manualOverrideWarnings)?a.manualOverrideWarnings:[]).filter(Boolean))];
}
function reserveWarningsMarkup(warnings){
  if(!warnings.length)return '<p class="reserve-public-note">لا توجد تحذيرات إسناد مسجلة حاليًا.</p>';
  return `<div class="reserve-warning-box" role="status"><strong>تنبيهات الإسناد — للعرض الإداري فقط (لا تظهر في جدول النشر)</strong><ul>${warnings.map(w=>`<li>${esc(w)}</li>`).join("")}</ul></div>`;
}
function showReserveWorkspaceWarnings(id,warnings){
  const el=byId(id);
  if(el)el.innerHTML=reserveWarningsMarkup([...new Set(warnings)]);
}
function currentReserveWarnings(date){
  const cached=state.lastReserveWarnings;
  return cached?.date===date?[...new Set([...savedReserveWarnings(date),...cached.warnings])]:savedReserveWarnings(date);
}
function manualTeacherLinksHTML(date){
  const items=assignmentsOn(date).filter(a=>a.published===true&&a.ackToken&&a.assignedTeacherId)
    .sort((a,b)=>Number(a.period)-Number(b.period)||clean(a.assignedTeacherName).localeCompare(clean(b.assignedTeacherName),"ar"));
  if(!items.length)return '<div class="empty-inline">بعد اعتماد التكليفات، تظهر هنا روابط الاطلاع وعنوان الموضوع للمعلمات.</div>';
  return `<p class="reserve-public-note">انسخي رابط كل معلمة وأرسليه إليها لتؤكد اطلاعها ثم تكتب موضوع الحصة. الروابط للإدارة فقط.</p>
  <div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>معلمة الاحتياط</th><th>الحصة</th><th>الفصل</th><th>حالة الاطلاع</th><th>عنوان الموضوع</th><th>إجراءات</th></tr></thead><tbody>
  ${items.map(a=>`<tr data-manual-action="${esc(a.id)}"><td>${esc(a.assignedTeacherName)}</td><td>${esc(a.period)}</td><td>${esc(a.className||"—")}</td>
  <td>${a.ackAt?"تم الاطلاع":"لم يتم الاطلاع"}</td><td>${a.activationTitle?esc(a.activationTitle):"لم يتم التفعيل"}</td>
  <td><div class="reserve-actions"><button type="button" class="reserve-mini reserve-manual-copy-action">نسخ رابط المعلمة</button>
  <button type="button" class="reserve-mini reserve-manual-open-action">فتح نموذج المعلمة</button></div></td></tr>`).join("")}
  </tbody></table></div>`;
}
function manualAdminHTML(){
  const date=state.currentDate;
  const selected=(state.manualAbsentIds||[]).map(String);
  return `<section class="surface form-card reserve-admin-only">
    <div class="form-section-title">الإنشاء اليدوي</div>
    <p class="reserve-source-note">المرجع الوحيد: جدول الحصص — الإصدار السادس، 27/04/1448هـ (39 معلمة)</p>
    <p class="reserve-public-note">اختاري جميع المعلمات الغائبات أولًا. بعد ذلك يظهر جدول جميع حصصهن، ويجب تسديد كل حصة قبل الحفظ.</p>
    ${hijriDateControl("reserveManualDate",date)}
    <div class="form-grid" style="margin-top:12px">
      <label class="wide">جميع المعلمات الغائبات
        <select id="reserveManualAbsent" class="reserve-multi-select" multiple>
          ${state.teachers.map(t=>`<option value="${esc(t.id)}" ${selected.includes(String(t.id))?"selected":""}>${esc(t.name)}</option>`).join("")}
        </select>
      </label>
    </div>
    <label class="reserve-admin-manual-toggle"><input id="reserveManualAllNames" type="checkbox" ${state.manualAllNames?"checked":""}>
      <span><strong>تحرير يدوي شامل:</strong> إظهار جميع المعلمات (حتى المستثنيات والغائبات) والموجهات الطلابيات ومحضرة المختبر في قوائم التسديد. سيظهر تحذير عند التعارض.</span>
    </label>
    <div class="form-actions"><button class="btn btn-primary" id="reserveManualBuild" type="button">إظهار جدول التسديد الكامل</button></div>
    <div id="reserveManualMsg"></div>
    <section class="reserve-admin-warnings"><strong>مساحة تحذيرات الإسناد</strong><div id="reserveManualWarnings">${reserveWarningsMarkup(currentReserveWarnings(date))}</div></section>
    <div id="reserveManualRows" style="margin-top:12px"></div>
    <section class="surface panel" style="margin-top:16px"><div class="panel-head"><h3>روابط اطلاع المعلمات وموضوع الحصة</h3></div>
      <div id="reserveManualTeacherLinks">${manualTeacherLinksHTML(date)}</div>
    </section>
  </section>`;
}
function manualRowsHTML(absentIds,date){
  const rows=[];
  const recordedIds=new Set(absencesOn(date).map(a=>String(a.teacherId)));
  const plannedDemand=dailyDemand(date)+absentIds.reduce((n,id)=>{
    if(recordedIds.has(String(id)))return n;
    const cells=scheduleOf(id)?.timetable?.[dayKey(date)]||[];
    return n+cells.filter(v=>parseScheduleValue(v).className).length;
  },0);
  absentIds.forEach(id=>{
    const t=teacherOf(id),s=scheduleOf(id),cells=s?.timetable?.[dayKey(date)]||[];
    cells.forEach((v,i)=>{
      const p=parseScheduleValue(v);
      if(!p.className)return;
      const existing=existingSlotAssignment(date,t.id,i+1);
      const candidates=manualPhysicalCandidates(date,i+1,absentIds,state.manualAllNames===true,existing?.id||"",plannedDemand);
      const currentId=String(existing?.assignedTeacherId||"");
      if(currentId&&!candidates.some(c=>String(c.id)===currentId)){
        const current=teacherOf(currentId);
        if(current)candidates.unshift(current);
      }
      rows.push({absent:t,period:i+1,className:p.className,activity:p.activity,candidates,existingId:existing?.id||"",existingTeacherId:currentId});
    });
  });
  state.manualRows=rows;
  if(!rows.length)return '<div class="empty-inline">لا توجد حصص أصلية للغائبات في هذا اليوم.</div>';
  return `<div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>الغائبة</th><th>الحصة</th><th>الفصل</th><th>معلمة التسديد</th></tr></thead><tbody>
    ${rows.map((r,i)=>`<tr data-manual-row="${i}">
      <td>${esc(r.absent?.name||"")}</td><td>${r.period}</td><td>${esc(r.className)}${r.activity?" <small>(نشاط)</small>":""}</td>
      <td><select class="reserve-manual-assignee"><option value="">اختاري معلمة التسديد</option>${r.candidates.map(t=>`<option value="${esc(t.id)}" ${String(t.id)===r.existingTeacherId?"selected":""}>${esc(t.name)}${t.supportStaff?" — التوجيه / المختبر":""}</option>`).join("")}</select></td>
    </tr>`).join("")}
  </tbody></table></div>
  <div class="form-actions" style="margin-top:12px"><button class="btn btn-primary" id="reserveManualSave" type="button">حفظ</button></div>`;
}
function manualConflictMessages(date,selections,absentIds){
  const warnings=[],slotUse=new Map();
  selections.forEach(x=>{
    const t=teacherOf(x.teacherId); if(!t)return;
    const slot=`${x.teacherId}|${x.period}`;
    slotUse.set(slot,(slotUse.get(slot)||0)+1);
    if(isAbsent(t.id,date)||absentIds.map(String).includes(String(t.id)))warnings.push(`${t.name}: مسجلة ضمن الغائبات.`);
    if(occupiedByReserve(t.id,date,x.period,x.existingId||""))warnings.push(`${t.name}: مسندة لاحتياط آخر في الحصة ${x.period}.`);
    if(sameClassReserveToday(t.id,date,x.className,x.existingId||""))warnings.push(`${t.name}: سبق إسنادها لنفس الفصل اليوم.`);
    if(t.supportStaff){
      warnings.push(`${t.name}: من الكادر المساند؛ لا يوجد جدول للحصص ضمن الإصدار السادس للتحقق من تفرغها. يرجى التأكد إداريًا.`);
      return;
    }
    const flags=teacherFlags(t);
    if(t.excluded===true||flags.permanentExcluded||flags.absolute)warnings.push(`${t.name}: ضمن قائمة المستثنيات من التسديد.`);
    if(regularCell(t.id,date,x.period))warnings.push(`${t.name}: لديها حصة أصلية في الحصة ${x.period}.`);
    if(breastfeedingBlocked(t,date,x.period))warnings.push(`${t.name}: الحصة ${x.period} ضمن استثناء ثابت.`);
    const c=assignmentCounts(date).get(String(t.id))||{week:0,daily:0};
    const missed=currentWeekAbsenceLoad(t.id,date),pending=makeupPending(t,date),effective=Math.max(0,Number(t.workload||0)-missed)+Number(c.week||0);
    if(!pending&&effective>=ceilingFor(t))warnings.push(`${t.name}: بلغت الحد الأسبوعي المفضل (${ceilingFor(t)}).`);
    if(adjacentOriginalCount(t.id,date,x.period)>0)warnings.push(`${t.name}: الاحتياط متصل بحصة أصلية مباشرة.`);
    if(previousWeekReserveCount(t.id,date)>0)warnings.push(`${t.name}: لديها احتياط في الأسبوع السابق؛ يفضّل تدوير الإسناد عند توفر بديل.`);
  });
  slotUse.forEach((n,key)=>{
    if(n>1){
      const [id,p]=key.split("|"),t=teacherOf(id);
      warnings.push(`${t?.name||"معلمة"}: تم اختيارها لأكثر من فصل في الحصة ${p}.`);
    }
  });
  return [...new Set(warnings)];
}
async function saveManualAssignments(){
  const msg=byId("reserveManualMsg"),date=byId("reserveManualDate")?.value||state.currentDate;
  const absentIds=(state.manualAbsentIds||[]).map(String),rows=state.manualRows||[];
  if(!absentIds.length||!rows.length){msg.textContent="اختاري جميع الغائبات ثم أظهري جدول التسديد.";return}
  const selections=[];
  let missing=false;
  document.querySelectorAll("[data-manual-row]").forEach(tr=>{
    const i=Number(tr.dataset.manualRow),r=rows[i],teacherId=tr.querySelector(".reserve-manual-assignee")?.value||"";
    if(!teacherId)missing=true;
    selections.push({...r,teacherId,existingId:r.existingId||""});
  });
  if(missing){msg.textContent="يجب تسديد جميع حصص الغائبات قبل الحفظ.";return}
  const warnings=manualConflictMessages(date,selections,absentIds);
  // Administration explicitly allows all rule warnings to be overridden.
  // Never block saving completed substitutions; keep an audit trail.
  msg.textContent="جارٍ حفظ واعتماد الجدول اليدوي...";
  try{
    await ensureAdmin();
    for(const id of absentIds){
      const t=teacherOf(id),s=scheduleOf(id),cells=s?.timetable?.[dayKey(date)]||[];
      const periods=cells.map((v,i)=>{const p=parseScheduleValue(v);return {period:i+1,className:p.className,activity:p.activity}}).filter(x=>x.className);
      let abs=absencesOn(date).find(a=>String(a.teacherId)===String(id));
      if(!abs)await insertKind(K.absence,{date,dayKey:dayKey(date),teacherId:String(id),teacherName:t?.name||"",reason:"غياب",periods,source:"manual",createdAt:new Date().toISOString()},token());
    }
    await loadAll();
    for(const x of selections){
      const t=teacherOf(x.teacherId);
      const existing=assignmentsOn(date).find(a=>String(a.absentTeacherId)===String(x.absent.id)&&Number(a.period)===Number(x.period));
      const data={
        date,dayKey:dayKey(date),period:Number(x.period),className:x.className,activity:x.activity===true,reason:"غياب",
        absentTeacherId:String(x.absent.id),absentTeacherName:x.absent.name,
        candidates:[],assignedTeacherId:String(t.id),assignedTeacherName:t.name,
        published:true,status:"معتمد",manual:true,manualOverride:warnings.length>0,
        manualOverrideWarnings:warnings.slice(0,70),
        ackToken:existing?.ackToken||uid(),ackAt:existing?.assignedTeacherId===String(t.id)?(existing.ackAt||""):"",
        activationTitle:existing?.assignedTeacherId===String(t.id)?(existing.activationTitle||""):"",
        activationAt:existing?.assignedTeacherId===String(t.id)?(existing.activationAt||""):"",
        updatedAt:new Date().toISOString()
      };
      if(existing)await patchKind(K.assignment,existing.id,data,token(),"معتمد");
      else await insertKind(K.assignment,data,token(),"معتمد");
    }
    await loadAll();
    state.currentDate=date;
    refreshReserveStatisticsViews();
    renderWorkspaceCard("manual");
    const done=byId("reserveManualMsg");
    if(done)done.textContent="تم حفظ واعتماد الحصص. النسخة النهائية متاحة من أيقونة «جدول النشر» بالأعلى.";
    state.lastReserveWarnings={date,source:"manual",warnings};
    showReserveWorkspaceWarnings("reserveManualWarnings",warnings);
  }catch(err){console.error(err);msg.textContent="تعذر حفظ الجدول اليدوي."}
}
function bindManualAdmin(){
  bindHijriDateControl("reserveManualDate",next=>{
    state.currentDate=next;state.manualRows=[];byId("reserveManualRows").innerHTML="";
    if(byId("reserveManualTeacherLinks"))byId("reserveManualTeacherLinks").innerHTML=manualTeacherLinksHTML(next);
  });
  byId("reserveManualTeacherLinks")?.addEventListener("click",async event=>{
    const b=event.target.closest(".reserve-manual-copy-action,.reserve-manual-open-action");
    if(!b)return;
    const tr=b.closest("[data-manual-action]");
    const a=state.assignments.find(x=>String(x.id)===String(tr?.dataset.manualAction));
    if(!a?.published||!a.ackToken)return;
    const url=`${location.origin}${location.pathname}?reserve_ack=${encodeURIComponent(a.ackToken)}#daily-reserve`;
    if(b.classList.contains("reserve-manual-open-action")){
      const win=window.open(url,"_blank");if(win)win.opener=null;else window.location.assign(url);
      return;
    }
    try{await navigator.clipboard.writeText(url);b.textContent="تم النسخ"}catch(_){prompt("انسخي رابط المعلمة:",url)}
  });
  byId("reserveManualBuild")?.addEventListener("click",()=>{
    const sel=byId("reserveManualAbsent");
    const ids=[...(sel?.selectedOptions||[])].map(o=>String(o.value));
    const msg=byId("reserveManualMsg");
    if(!ids.length){msg.textContent="اختاري جميع أسماء المعلمات الغائبات أولًا.";return}
    state.manualAbsentIds=ids;
    state.manualAllNames=byId("reserveManualAllNames")?.checked===true;
    const date=byId("reserveManualDate")?.value||state.currentDate;
    byId("reserveManualRows").innerHTML=manualRowsHTML(ids,date);
    msg.textContent=`تم إدخال ${ids.length} غائبات. اختاري معلمة تسديد لكل حصة.`;
    const currentSelections=()=>[...document.querySelectorAll("[data-manual-row]")].flatMap(tr=>{
      const r=state.manualRows?.[Number(tr.dataset.manualRow)];
      const teacherId=tr.querySelector(".reserve-manual-assignee")?.value;
      return r&&teacherId?[{...r,teacherId,existingId:r.existingId||""}]:[];
    });
    byId("reserveManualRows")?.addEventListener("change",()=>{
      const warnings=manualConflictMessages(date,currentSelections(),ids);
      state.lastReserveWarnings={date,source:"manual",warnings};
      showReserveWorkspaceWarnings("reserveManualWarnings",warnings);
    });
    byId("reserveManualSave")?.addEventListener("click",saveManualAssignments);
  });
}

function rankingOverviewRows(referenceDate){
  const counts=assignmentCounts(referenceDate),wrPrev=previousWeekRange(referenceDate);
  const rows=state.teachers.filter(t=>reserveSummaryEligible(t)||
    (!teacherFlags(t).absolute&&Number(counts.get(String(t.id))?.week||0)>0)).map(t=>{
    const c=counts.get(String(t.id))||{daily:0,week:0,term:0};
    const flags=teacherFlags(t),missed=currentWeekAbsenceLoad(t.id,referenceDate);
    const effective=Math.max(0,Number(t.workload||0)-missed)+Number(c.week||0);
    return {
      teacher:t,workload:Number(t.workload||0),dailyOriginal:dailyOriginalCount(t.id,referenceDate),
      daily:Number(c.daily||0),week:Number(c.week||0),prevWeek:previousWeekReserveCount(t.id,referenceDate),
      term:Number(c.term||0),missed,effective,flags,pending:makeupPending(t,referenceDate)
    };
  });
  rows.sort((a,b)=>{
    const ax=a.flags.permanentExcluded||a.flags.absolute?1:0,bx=b.flags.permanentExcluded||b.flags.absolute?1:0;
    return ax-bx||a.effective-b.effective||a.week-b.week||a.prevWeek-b.prevWeek||a.dailyOriginal-b.dailyOriginal||clean(a.teacher.name).localeCompare(clean(b.teacher.name),"ar");
  });
  return rows.map((r,i)=>({...r,rank:i+1}));
}
function rankingAdminHTML(){
  const wr=weekRange(state.currentDate),rows=rankingOverviewRows(state.currentDate);
  return `<section class="surface panel reserve-admin-only">
    <div class="panel-head"><h3>احتساب المفاضلة — الأسبوع الحالي</h3><span>${esc(fmtDate(wr.start))} – ${esc(fmtDate(wr.end))}</span></div>
    <div class="form-actions"><button class="btn btn-primary" id="reserveRankingExport" type="button">تصدير الأسبوع</button></div>
    <div class="reserve-table-wrap"><table class="reserve-table"><thead><tr>
      <th>الترتيب</th><th>المعلمة</th><th>النصاب</th><th>الأصلي اليوم</th><th>احتياط اليوم</th><th>احتياط الأسبوع</th><th>الأسبوع السابق</th><th>التراكمي</th><th>نقص غياب</th><th>الحالة</th><th>تصحيح</th>
    </tr></thead><tbody>${rows.map(r=>`<tr>
      <td><strong>${r.rank}</strong></td><td>${esc(r.teacher.name)}</td><td>${r.workload}</td><td>${r.dailyOriginal}</td><td>${r.daily}</td><td><strong>${r.week}</strong></td><td>${r.prevWeek}</td><td>${r.term}</td><td>${r.missed}</td>
      <td>${r.flags.absolute?"مستثناة":r.flags.permanentExcluded?"تكليف إضافي":r.pending?"تعويض غياب":r.flags.advanced?"رتبة متقدم":"متاحة"}</td>
      <td><button class="reserve-mini reserve-adjust-week" data-teacher="${esc(r.teacher.id)}" type="button">تعديل يدوي</button></td>
    </tr>`).join("")}</tbody></table></div>
    <p class="reserve-public-note">التصحيح اليدوي إداري ويُسجّل كسجل مستقل حتى تبقى البيانات الأصلية محفوظة.</p>
  </section>`;
}
function bindRankingAdmin(){
  byId("reserveRankingExport")?.addEventListener("click",()=>exportExcel("week"));
  document.querySelectorAll(".reserve-adjust-week").forEach(b=>b.onclick=async()=>{
    const t=teacherOf(b.dataset.teacher); if(!t)return;
    const deltaRaw=prompt(`تصحيح احتياط الأسبوع للمعلمة ${t.name}.\\nاكتبي رقمًا موجبًا للإضافة أو سالبًا للخصم:`,`0`);
    if(deltaRaw===null)return;
    const delta=Number(deltaRaw); if(!Number.isFinite(delta)||delta===0)return;
    const note=prompt("سبب التصحيح الإداري:","تصحيح يدوي")||"تصحيح يدوي";
    await insertKind(K.adjustment,{teacherId:String(t.id),teacherName:t.name,date:state.currentDate,weekStart:weekRange(state.currentDate).start,delta,note,createdAt:new Date().toISOString()},token(),"معتمد");
    await loadAll();renderWorkspaceCard("ranking");
  });
}

function excellenceMetrics(referenceDate){
  const wr=weekRange(referenceDate),start=termStart()||COUNT_START;
  const countStart=state.settings?.countStart||COUNT_START;
  const items=publishedAssignments().filter(a=>a.date<=wr.end);
  const byTeacher=new Map();
  const ensure=id=>{
    if(!byTeacher.has(id))byTeacher.set(id,{teacher:teacherOf(id),weekAssignments:[],allAssignments:[],daily:{},titles:[]});
    return byTeacher.get(id);
  };
  items.forEach(a=>{
    const id=String(a.assignedTeacherId),x=ensure(id); if(!x.teacher)return;
    // Cumulative merit never includes dates before the approved counting start.
    if(a.date>=start&&a.date>=countStart)x.allAssignments.push(a);
    if(inRange(a.date,wr.start,wr.end)){
      x.weekAssignments.push(a);
      x.daily[a.date]=(x.daily[a.date]||[]).concat(a);
      if(a.activationTitle)x.titles.push(`${dayName(a.date)}: ${a.activationTitle}`);
    }
  });
  const rows=[];
  byTeacher.forEach(x=>{
    let qualifiedWeek=0,maxDaily=0;
    Object.values(x.daily).forEach(arr=>{
      maxDaily=Math.max(maxDaily,arr.length);
      if(arr.length>=2)qualifiedWeek+=arr.length;
      else if(arr.length===1&&arr[0].activationTitle)qualifiedWeek+=1;
    });
    let cumulativeQualified=0;
    const allByDate={};
    x.allAssignments.forEach(a=>allByDate[a.date]=(allByDate[a.date]||[]).concat(a));
    Object.values(allByDate).forEach(arr=>{
      if(arr.length>=2)cumulativeQualified+=arr.length;
      else if(arr.length===1&&arr[0].activationTitle)cumulativeQualified+=1;
    });
    const tier=maxDaily>=3?3:maxDaily>=2?2:(qualifiedWeek>0?1:0);
    if(tier>0)rows.push({...x,qualifiedWeek,cumulativeQualified,maxDaily,tier,weekCount:x.weekAssignments.length});
  });
  rows.sort((a,b)=>b.tier-a.tier||b.qualifiedWeek-a.qualifiedWeek||b.weekCount-a.weekCount||clean(a.teacher.name).localeCompare(clean(b.teacher.name),"ar"));
  let lastKey="",rank=0;
  return rows.map(r=>{
    const key=`${r.tier}|${r.qualifiedWeek}|${r.weekCount}`;
    if(key!==lastKey)rank++;
    lastKey=key;
    return {...r,rank};
  });
}
function excellenceAdminHTML(){
  const rows=excellenceMetrics(state.currentDate),wr=weekRange(state.currentDate);
  return `<section class="surface panel reserve-admin-only">
    <div class="panel-head"><h3>التميز في شغل حصص الاحتياط</h3><span>${esc(fmtDate(wr.start))} – ${esc(fmtDate(wr.end))}</span></div>
    <div class="form-actions">
      <button class="btn btn-primary reserve-excellence-export" data-scope="week" type="button">تصدير الأسبوع</button>
      <button class="btn btn-ghost reserve-excellence-export" data-scope="cumulative" type="button">تصدير التراكمي</button>
    </div>
    <div class="reserve-table-wrap"><table class="reserve-table"><thead><tr>
      <th>المركز</th><th>المعلمة</th><th>تفصيل يومي</th><th>المسند أسبوعيًا</th><th>المحتسب في التميز</th><th>التراكمي</th><th>عناوين التفعيل</th>
    </tr></thead><tbody>${rows.length?rows.map(r=>`<tr>
      <td><strong>${r.rank}</strong></td><td>${esc(r.teacher.name)}</td>
      <td>${Object.entries(r.daily).sort().map(([d,a])=>`${dayName(d)}: ${a.length}`).join(" — ")||"—"}</td>
      <td>${r.weekCount}</td><td><strong>${r.qualifiedWeek}</strong>${r.maxDaily>=3?' <span class="reserve-rank-badge star">3 في يوم واحد</span>':r.maxDaily>=2?' <span class="reserve-rank-badge">2 في يوم واحد</span>':""}</td>
      <td>${r.cumulativeQualified}</td><td>${r.titles.length?r.titles.map(t=>`<div>${esc(t)}</div>`).join(""):"—"}</td>
    </tr>`).join(""):'<tr><td colspan="7">لا توجد بيانات تميز محتسبة لهذا الأسبوع</td></tr>'}</tbody></table></div>
    <p class="reserve-public-note">الحصتان أو الثلاث فأكثر في اليوم تدخل في التميز مباشرة. الحصة الواحدة لا تدخل إلا بعد تسجيل عنوان التفعيل.</p>
  </section>`;
}
function exportExcellence(scope){
  const refs=scope==="week"?[state.currentDate]:[];
  let rows=[];
  if(scope==="week"){
    rows=excellenceMetrics(state.currentDate).map(r=>[r.rank,r.teacher.name,r.weekCount,r.qualifiedWeek,r.cumulativeQualified,r.maxDaily,r.titles.join(" | ")]);
  }else{
    const allDates=[...new Set(publishedAssignments().map(a=>a.date))].sort();
    const latest=allDates[allDates.length-1]||state.currentDate;
    rows=excellenceMetrics(latest).map(r=>[r.rank,r.teacher.name,r.weekCount,r.qualifiedWeek,r.cumulativeQualified,r.maxDaily,r.titles.join(" | ")]);
  }
  const headers=["المركز","المعلمة","المسند أسبوعيًا","المحتسب في التميز","التراكمي","أعلى عدد يومي","عناوين التفعيل"];
  downloadXls(`تميز_الاحتياط_${scope}`,headers,rows,"التميز");
}
function bindExcellenceAdmin(){
  document.querySelectorAll(".reserve-excellence-export").forEach(b=>b.onclick=()=>exportExcellence(b.dataset.scope));
}

function teachersAdminHTML(){
  return `<div class="reserve-grid">
    <section class="surface form-card">
      <div class="form-section-title">إضافة معلمة</div>
      <form id="reserveTeacherForm"><div class="form-grid">
        <label>اسم المعلمة<input id="rtName" required></label>
        <label>التخصص<input id="rtSubject"></label>
        <label>النصاب الأسبوعي<input id="rtWorkload" type="number" min="0" max="40" value="0"></label>
        <label>الحالة<select id="rtExcluded"><option value="0">متاحة للاحتياط</option><option value="1">مستبعدة مؤقتًا</option></select></label>
      </div><div class="form-actions"><button class="btn btn-primary" type="submit">حفظ المعلمة</button></div><div id="rtMsg"></div></form>
    </section>
    <section class="surface panel">
      <div class="panel-head"><h3>المعلمات</h3><span>${state.teachers.length}</span></div>
      <div class="reserve-admin-list">${state.teachers.map(t=>`<div class="reserve-teacher-row" data-teacher="${esc(t.id)}">
        <strong>${esc(t.name)}</strong><span>النصاب: ${Number(t.workload||0)} ${teacherFlags(t).advanced?'<span class="reserve-rank-badge">رتبة متقدم — حد 22</span>':""} ${teacherFlags(t).permanentExcluded?'<span class="reserve-status pending">مستثناة: تكليف إضافي</span>':""} ${teacherFlags(t).absolute?'<span class="reserve-status pending">مستثناة من الاحتياط</span>':""} ${t.excluded?'<span class="reserve-status pending">مستبعدة مؤقتًا</span>':""}</span>
        <div class="reserve-actions"><button class="reserve-mini reserve-edit-teacher">تعديل البيانات</button><button class="reserve-mini reserve-edit-schedule">الجدول المدرسي</button><button class="reserve-mini danger reserve-delete-teacher">حذف</button></div>
      </div>`).join("")||'<div class="empty-inline">لا توجد معلمات مضافة بعد</div>'}</div>
    </section>
    <section id="reserveTeacherEditor" class="surface panel" style="grid-column:1/-1;display:none"></section>
  </div>`;
}
function scheduleEditorHTML(t){
  const s=scheduleOf(t.id),tt=s?.timetable||{};
  return `<div class="panel-head"><h3>الجدول المدرسي — ${esc(t.name)}</h3><button class="reserve-mini" id="reserveCloseTeacherEditor">إغلاق</button></div>
    <p class="reserve-public-note">اكتبي اسم الفصل/الحصة في الخانة المشغولة، واتركي الخانة فارغة إذا كانت المعلمة متاحة للاحتياط.</p>
    <div class="schedule-matrix">${DAYS.map(d=>{const ps=(d[0]==="sun"||d[0]==="mon")?PERIODS:PERIODS.slice(0,6);return `<div class="schedule-day"><strong>${d[1]}</strong>${ps.map(p=>`<label class="reserve-schedule-slot"><span>الحصة ${p}</span><input aria-label="${d[1]} الحصة ${p}" data-day="${d[0]}" data-period="${p}" placeholder="ح${p}" value="${esc(tt?.[d[0]]?.[p-1]||"")}"></label>`).join("")}</div>`}).join("")}</div>
    <div class="form-actions"><button class="btn btn-primary" id="reserveSaveSchedule" data-teacher="${esc(t.id)}">حفظ الجدول</button></div>`;
}
function settingsHTML(){
  return `<section class="surface form-card">
    <div class="form-section-title">إعدادات وسياسة الاحتياط</div>
    <p class="reserve-public-note">المفاضلة مبرمجة على العدالة وتخفيف العبء، مع أولوية النصاب الأخف، ثم الاحتياط الأسبوعي الأقل، ثم تفضيل فصول المعلمة، ثم عدد حصص اليوم، مع مرونة عند الحاجة.</p>
    <div class="form-grid">
      <label>بداية الفصل للتراكمي<strong>${esc(fmtDate(state.settings?.termStart||COUNT_START))}</strong><input id="rwTermStart" type="hidden" value="${esc(state.settings?.termStart||COUNT_START)}"></label>
      <label>بداية احتساب النظام<strong>${esc(fmtDate(state.settings?.countStart||COUNT_START))}</strong><input id="rwCountStart" type="hidden" value="${esc(state.settings?.countStart||COUNT_START)}"></label>
      <label>حد تفعيل وضع الضرورة اليومي<input id="rwEmergency" type="number" min="1" value="${Number(state.settings?.emergencyDailyDemand||EMERGENCY_DAILY_DEMAND)}"></label>
    </div>
    <div class="reserve-source-note">مصدر الجدول: الإصدار السادس — 27/04/1448هـ | المعلمات والجداول تُهيأ سحابيًا عند أول دخول إداري بعد التحديث.</div>
    <div class="form-actions"><button class="btn btn-primary" id="reserveSaveSettings">حفظ الإعدادات</button></div><div id="reserveSettingsMsg"></div>
  </section>`;
}
function assignmentStatusLabel(a){
  if(a.activationTitle)return "تم التفعيل";
  if(a.ackAt)return "تم الاطلاع";
  if(a.published)return "معتمد";
  return a.status||"مسودة";
}
function adminStatsHTML(){
  const wr=weekRange(state.currentDate);
  return `<div class="reserve-grid">
    <section class="surface panel" style="grid-column:1/-1">
      ${excellenceTableHTML(state.currentDate)}
    </section>
    <section class="surface panel" style="grid-column:1/-1">
      <div class="panel-head"><h3>تصدير سجلات الاحتياط</h3><span>Excel</span></div>
      <p class="reserve-public-note">يتم التصدير من السجلات المعتمدة فقط، ويمكن استخراج أسبوعي أو شهري أو فصلي.</p>
      <div class="form-actions">
        <button class="btn btn-primary reserve-export-xls" data-range="week" type="button">Excel أسبوعي</button>
        <button class="btn btn-ghost reserve-export-xls" data-range="month" type="button">Excel شهري</button>
        <button class="btn btn-ghost reserve-export-xls" data-range="term" type="button">Excel فصلي</button>
      </div>
      <div class="reserve-source-note">الأسبوع الحالي: ${esc(fmtDate(wr.start))} – ${esc(fmtDate(wr.end))} | مصدر الجدول: الإصدار السادس 27/04/1448هـ</div>
    </section>
  </div>`;
}
function exportRange(range){
  const d=parseDate(state.currentDate);
  if(range==="week")return weekRange(state.currentDate);
  if(range==="month"){
    const y=d.getFullYear(),m=d.getMonth();
    const start=new Date(y,m,1,12),end=new Date(y,m+1,0,12);
    const iso=x=>{const off=x.getTimezoneOffset()*60000;return new Date(x.getTime()-off).toISOString().slice(0,10)};
    return {start:iso(start),end:iso(end)};
  }
  return {start:termStart()||COUNT_START,end:state.currentDate};
}
function dailyPublicationRows(date){
  // Sole final publication source shared by manual, automatic and (when integrated)
  // image-assisted manual input. Dedupe by real daily slot, not by input method.
  const slots=new Map();
  for(const a of publishedAssignments().filter(x=>x.date===date)){
    if(!a.assignedTeacherId||!a.assignedTeacherName)continue;
    const key=[date,String(a.absentTeacherId||a.absentTeacherName||""),Number(a.period),clean(a.className||"")].join("|");
    const prior=slots.get(key);
    if(!prior||String(a.updatedAt||a.createdAt||"")>=String(prior.updatedAt||prior.createdAt||""))slots.set(key,a);
  }
  return [...slots.values()].sort((a,b)=>Number(a.period)-Number(b.period||0)||
    clean(a.absentTeacherName||"").localeCompare(clean(b.absentTeacherName||""),"ar"));
}
function dailyPublicationStats(items){
  const absent=new Set(items.map(a=>String(a.absentTeacherId||a.absentTeacherName||"")));
  const assigned=new Map();
  items.forEach(a=>{
    const name=clean(a.assignedTeacherName)||"—";
    assigned.set(name,(assigned.get(name)||0)+1);
  });
  const breakdown=[...assigned.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0],"ar"));
  return {periods:items.length,absentTeachers:absent.size,assignedTeachers:assigned.size,breakdown};
}
function publicationHTML(date){
  const items=dailyPublicationRows(date),stats=dailyPublicationStats(items);
  const summary=stats.breakdown.map(([name,n])=>`<span>${esc(name)}: <b>${n}</b></span>`).join("، ");
  return `<div id="reservePublishSheet" dir="rtl" lang="ar">
    <div class="reserve-publication-date"><b>اليوم:</b> ${esc(dayName(date))} <span><b>التاريخ:</b> ${esc(fmtDate(date))}</span></div>
    <h1>جدول النشر — الاحتياط اليومي</h1>
    <p class="reserve-publication-school">الثانوية الرابعة والتسعون – مسارات</p>
    <table><thead><tr>
      <th>المعلمة الغائبة</th><th>الحصة</th><th>الفصل</th><th>المعلمة المسند لها الاحتياط</th><th>عنوان التفعيل</th><th>حالة الاطلاع</th><th>حالة التفعيل</th><th>التوقيع</th>
    </tr></thead><tbody>${items.length?items.map((a,i)=>{
      const title=clean(a.activationTitle||"");
      const acknowledged=Boolean(clean(a.ackAt||""));
      // فاصل أبيض بين مجموعات الحصص؛ لا يُنشأ قبل أول حصة في الجدول.
      const newGroup=i>0&&Number(items[i-1].period)!==Number(a.period);
      const groupGap=newGroup?'<tr class="reserve-publication-group-gap" aria-hidden="true"><td colspan="8"></td></tr>':"";
      return `${groupGap}<tr class="reserve-publication-period reserve-publication-period-${Number(a.period)}">
      <td>${esc(a.absentTeacherName||"—")}</td><td>${esc(a.period)}</td>
      <td>${esc(a.className||"—")}</td><td>${esc(a.assignedTeacherName||"—")}</td>
      <td class="reserve-publication-title">${title?esc(title):"—"}</td>
      <td><span class="reserve-publication-status ${acknowledged?"reserve-publication-read":"reserve-publication-unread"}">${acknowledged?"تم الاطلاع":"لم يتم الاطلاع"}</span></td>
      <td><span class="reserve-publication-status ${title?"reserve-publication-activated":"reserve-publication-not-activated"}">${title?"تم التفعيل":"لم يتم التفعيل"}</span></td>
      <td class="reserve-publication-signature"></td>
    </tr>`}).join(""):`<tr><td colspan="8">لا توجد حصص احتياط معتمدة لهذا اليوم</td></tr>`}</tbody></table>
    <section class="reserve-publication-summary">
      <h2>إحصائية نهاية الجدول</h2>
      <div class="reserve-publication-totals"><span>إجمالي حصص الاحتياط: <b>${stats.periods}</b></span>
      <span>عدد المعلمات الغائبات: <b>${stats.absentTeachers}</b></span>
      <span>عدد المكلفات بالاحتياط: <b>${stats.assignedTeachers}</b></span></div>
      ${stats.breakdown.length?`<p><b>توزيع حصص الاحتياط على المكلفات:</b> ${summary}</p>`:""}
    </section>
    <div class="reserve-publication-footer">الثانوية الرابعة والتسعون – مسارات | الاحتياط اليومي</div>
  </div>`;
}
function ensureReservePublicationStyles(){
  if(byId("reservePublishPrintStyle"))return;
  const style=document.createElement("style");
  style.id="reservePublishPrintStyle";
  style.textContent=`
    #reservePublishOverlay{position:fixed;inset:0;z-index:2147481000;background:rgba(21,39,47,.68);overflow:auto;padding:16px;box-sizing:border-box;direction:rtl}
    #reservePublishOverlay .reserve-publish-content{max-width:1150px;margin:0 auto 20px;background:#fff;border-radius:12px;box-shadow:0 12px 50px rgba(0,0,0,.18);padding:14px;box-sizing:border-box}
    #reservePublishOverlay .reserve-publish-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px}
    #reservePublishOverlay .reserve-publish-status{color:#36515a;font-size:12px;flex:1;min-width:180px}
    #reservePublishOverlay .reserve-publish-preview-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
    #reservePublishSheet{display:block!important;color:#172c34;background:white;direction:rtl;line-height:1.6;font:12px Tahoma,Arial,sans-serif}
    #reservePublishSheet .reserve-publication-date{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #0f5f59;padding-bottom:7px;font-size:14px;flex-wrap:wrap}
    #reservePublishSheet h1{text-align:center;margin:9px 0 0;font-size:20px;color:#123e50}
    #reservePublishSheet .reserve-publication-school{text-align:center;margin:0 0 12px;color:#576c72;font-size:12px}
    #reservePublishSheet table{width:100%;table-layout:fixed;border-collapse:collapse;text-align:center}
    #reservePublishSheet th,#reservePublishSheet td{border:1px solid #637982;padding:8px 5px;vertical-align:middle;overflow-wrap:anywhere}
    #reservePublishSheet th{background:#edf3f3!important;font-weight:bold;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    /* خلفية بيضاء لجميع صفوف جدول النشر، والتلوين في عمود الحصة فقط */
    #reservePublishSheet tr.reserve-publication-period > td{background-color:#fff!important;color:#172c34!important}
    #reservePublishSheet tr.reserve-publication-period > td:nth-child(2){font-weight:800;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    #reservePublishSheet tr.reserve-publication-period-1 > td:nth-child(2){background-color:#DDF4F0!important}
    #reservePublishSheet tr.reserve-publication-period-2 > td:nth-child(2){background-color:#E6F0FB!important}
    #reservePublishSheet tr.reserve-publication-period-3 > td:nth-child(2){background-color:#FFF2D8!important}
    #reservePublishSheet tr.reserve-publication-period-4 > td:nth-child(2){background-color:#E8F4DA!important}
    #reservePublishSheet tr.reserve-publication-period-5 > td:nth-child(2){background-color:#FAE5ED!important}
    #reservePublishSheet tr.reserve-publication-period-6 > td:nth-child(2){background-color:#EFE7FA!important}
    #reservePublishSheet tr.reserve-publication-period-7 > td:nth-child(2){background-color:#F8E9D7!important}
    /* صف أبيض مستقل للفصل البصري بين مجموعة وأخرى، في المعاينة وPDF */
    #reservePublishSheet tr.reserve-publication-group-gap{height:12px!important;break-after:avoid;page-break-after:avoid}
    #reservePublishSheet tr.reserve-publication-group-gap > td{height:12px!important;min-height:12px!important;border:0!important;background:#fff!important;padding:0!important;line-height:0!important;font-size:0!important}
    #reservePublishSheet tr.reserve-publication-period > td:first-child{border-right-color:#637982!important}
    #reservePublishSheet th:nth-child(1){width:17%}
    #reservePublishSheet th:nth-child(2){width:6%}
    #reservePublishSheet th:nth-child(3){width:9%}
    #reservePublishSheet th:nth-child(4){width:18%}
    #reservePublishSheet th:nth-child(5){width:17%}
    #reservePublishSheet th:nth-child(6){width:12%}
    #reservePublishSheet th:nth-child(7){width:12%}
    #reservePublishSheet th:nth-child(8){width:9%}
    #reservePublishSheet .reserve-publication-status{display:inline-block;padding:3px 4px;border-radius:5px;font-weight:700;line-height:1.35;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
    #reservePublishSheet .reserve-publication-read{background:#d5f4df!important;color:#126536!important;border:1px solid #57ae78!important}
    #reservePublishSheet .reserve-publication-unread{background:#ffe4e5!important;color:#b21d29!important;border:1px solid #d9878c!important}
    #reservePublishSheet .reserve-publication-activated{background:#e3eef8!important;color:#23557a!important;border:1px solid #9dbcd2!important}
    #reservePublishSheet .reserve-publication-not-activated{background:#f1f1f1!important;color:#4e545a!important;border:1px solid #bdc5c8!important}
    #reservePublishSheet .reserve-publication-title{overflow-wrap:anywhere;white-space:normal}
    #reservePublishSheet tr{break-inside:avoid;page-break-inside:avoid}
    #reservePublishSheet .reserve-publication-signature{height:24px}
    #reservePublishSheet .reserve-publication-summary{border:1px solid #637982;margin-top:14px;padding:9px;break-inside:avoid;page-break-inside:avoid}
    #reservePublishSheet h2{margin:0 0 8px;color:#123e50;font-size:14px}
    #reservePublishSheet .reserve-publication-totals{display:flex;gap:12px;flex-wrap:wrap}
    #reservePublishSheet .reserve-publication-summary p{margin:8px 0 0}
    #reservePublishSheet .reserve-publication-footer{text-align:center;border-top:1px solid #9cb3b7;margin-top:14px;padding-top:6px;font-size:10px}
    @media(max-width:700px){
      #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet{min-width:940px}
    }
    @media(max-width:480px){
      #reservePublishOverlay{padding:8px}
      #reservePublishOverlay .reserve-publish-content{padding:8px}
      #reservePublishSheet{font-size:10px}
      #reservePublishSheet th,#reservePublishSheet td{padding:4px 2px}
      #reservePublishSheet h1{font-size:17px}
    }
    @media print{
      @page{size:A4 landscape;margin:10mm}
      body > :not(#reservePublishOverlay):not(#reservePublishPrintStyle){display:none!important}
      html,body{background:#fff!important;color:#172c34!important;margin:0!important;padding:0!important;width:100%!important}
      #reservePublishOverlay{position:static!important;inset:auto!important;padding:0!important;background:#fff!important;overflow:visible!important}
      #reservePublishOverlay .reserve-publish-content{max-width:none!important;margin:0!important;padding:0!important;box-shadow:none!important;border:0!important}
      #reservePublishOverlay .reserve-publish-actions{display:none!important}
      #reservePublishOverlay .reserve-publish-preview-scroll{overflow:visible!important}
      #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet{min-width:0!important}
      #reservePublishSheet{font-size:11px!important;line-height:1.28!important}
      #reservePublishSheet th,#reservePublishSheet td{padding:2px 4px!important;line-height:1.28!important}
      #reservePublishSheet tr.reserve-publication-group-gap{height:8px!important}
      #reservePublishSheet tr.reserve-publication-group-gap > td{height:8px!important;min-height:8px!important;padding:0!important;border:0!important;line-height:0!important}
      #reservePublishSheet .reserve-publication-status{padding:2px 3px!important}
      #reservePublishSheet .reserve-publication-signature{height:17px!important}
      #reservePublishSheet h1{font-size:18px!important;margin:6px 0 0!important}
      #reservePublishSheet .reserve-publication-school{margin:0 0 7px!important}
      #reservePublishSheet .reserve-publication-summary{margin-top:8px!important;padding:7px!important}
      #reservePublishSheet .reserve-publication-footer{margin-top:6px!important;padding-top:3px!important}
    }`;
  document.head.appendChild(style);
}
function openReservePublication(date){
  // Do not combine printed pages with warnings, ranking, or internal audit records.
  byId("reservePublishOverlay")?.remove();
  ensureReservePublicationStyles();
  const overlay=document.createElement("div");
  overlay.id="reservePublishOverlay";
  overlay.setAttribute("role","dialog");
  overlay.setAttribute("aria-modal","true");
  overlay.setAttribute("aria-label","معاينة جدول النشر");
  overlay.innerHTML=`<div class="reserve-publish-content">
    <div class="reserve-publish-actions">
      <button type="button" class="btn btn-primary" id="reservePublishPDF">تنزيل PDF</button>
      <button type="button" class="btn btn-ghost" id="reservePublishPrintCopy">طباعة</button>
      <button type="button" class="btn btn-ghost" id="reservePublishClose">إغلاق</button>
      <span class="reserve-publish-status" id="reservePublishStatus">نسخة موحدة لجميع التكليفات المعتمدة لهذا اليوم، سواء أُنشئت يدويًا أو آليًا.</span>
    </div><div class="reserve-publish-preview-scroll">${publicationHTML(date)}</div></div>`;
  document.body.appendChild(overlay);
  byId("reservePublishClose")?.addEventListener("click",()=>overlay.remove());
  overlay.addEventListener("click",e=>{if(e.target===overlay)overlay.remove()});
  byId("reservePublishPrintCopy")?.addEventListener("click",()=>window.print());
  byId("reservePublishPDF")?.addEventListener("click",()=>downloadReservePublicationPDF(date));
}
let reservePdfLoader=null;
function loadReservePdfEngine(){
  if(window.html2pdf)return Promise.resolve(window.html2pdf);
  if(reservePdfLoader)return reservePdfLoader;
  reservePdfLoader=new Promise((resolve,reject)=>{
    const s=document.createElement("script");
    s.src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
    s.onload=()=>window.html2pdf?resolve(window.html2pdf):reject(new Error("PDF unavailable"));
    s.onerror=()=>reject(new Error("PDF download component failed"));
    document.head.appendChild(s);
  }).catch(err=>{reservePdfLoader=null;throw err});
  return reservePdfLoader;
}
async function downloadReservePublicationPDF(date){
  const msg=byId("reservePublishStatus"),btn=byId("reservePublishPDF"),sheet=byId("reservePublishSheet");
  if(!sheet)return;
  btn.disabled=true;
  msg.textContent="جارٍ إعداد ملف PDF لجدول النشر...";
  try{
    const engine=await loadReservePdfEngine();
    await engine().set({
      margin:[10,9,10,9],filename:`جدول_النشر_${date}.pdf`,
      image:{type:"jpeg",quality:0.98},
      html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",scrollY:0},
      jsPDF:{unit:"mm",format:"a4",orientation:"landscape"},
      pagebreak:{mode:["css","legacy"]}
    }).from(sheet).save();
    msg.textContent="تم إعداد ملف جدول النشر بصيغة PDF.";
  }catch(err){
    console.error("تعذر إنشاء PDF مباشر",err);
    msg.textContent="تعذر التنزيل المباشر. استخدمي «طباعة» ثم «حفظ كملف PDF» من الجهاز.";
  }finally{btn.disabled=false}
}
function xlsEsc(s){return String(s??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}
function downloadXls(fileBase,headers,rows,sheetName="البيانات",extraSheet=""){
  const xml=`<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
  <Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Worksheet ss:Name="${xlsEsc(sheetName)}"><Table>${[headers,...rows].map(r=>`<Row>${r.map(v=>`<Cell><Data ss:Type="String">${xlsEsc(v)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet>
  ${extraSheet}
  </Workbook>`;
  const blob=new Blob([xml],{type:"application/vnd.ms-excel;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  a.download=`${fileBase}.xls`;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
function exportExcel(range){
  const rr=exportRange(range);
  const items=dateRangeAssignments(rr.start,rr.end).slice().sort((a,b)=>a.date.localeCompare(b.date)||Number(a.period)-Number(b.period));
  const headers=["التاريخ الهجري","اليوم","الحصة","الفصل","سبب الاحتياط","المعلمة الغائبة","معلمة الاحتياط","الحالة","عنوان التفعيل"];
  const rows=items.map(a=>[fmtDate(a.date),dayName(a.date),a.period,a.className||"",a.reason||"غياب",a.absentTeacherName||"",a.assignedTeacherName||"",assignmentStatusLabel(a),a.activationTitle||""]);
  const adjs=state.adjustments.filter(a=>clean(a.weekStart)>=rr.start&&clean(a.weekStart)<=rr.end);
  const extra=adjs.length?`<Worksheet ss:Name="التصحيحات"><Table>${[["المعلمة","التاريخ الهجري","التصحيح","السبب"],...adjs.map(a=>[a.teacherName||"",fmtDate(a.date),a.delta,a.note||""])].map(r=>`<Row>${r.map(v=>`<Cell><Data ss:Type="String">${xlsEsc(v)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet>`:"";
  const stamp=fmtDate(rr.start).replace(/[\s\/]+/g,"_");
  downloadXls(`احتياط_${range}_${stamp}`,headers,rows,"الاحتياط",extra);
}
function bindStatsAdmin(){
  document.querySelectorAll(".reserve-export-xls").forEach(b=>b.onclick=()=>exportExcel(b.dataset.range));
}

// Update the daily table, weekly counters and excellence board in place;
// retain the selected week, admin workspace and all existing event listeners.
function refreshReserveStatisticsViews(){
  const dailyBody=byId("reservePublicDayBody");
  if(dailyBody){
    dailyBody.innerHTML=publicDayRowsHTML(state.currentDate);
    decorateReservePortraitTables(byId("dailyReserveRoot"));
    bindPublicDailyActions();
  }
  const shift=Number(document.querySelector("[data-week-shift].active")?.dataset.weekShift||0);
  const reference=addDays(state.currentDate,shift);
  const weekly=byId("reserveWeeklyHolder");
  if(weekly)weekly.innerHTML=weeklyTableHTML(publicWeeklyRows(reference),reference);
  const excellence=byId("reserveExcellenceHolder");
  if(excellence)excellence.innerHTML=excellenceTableHTML(reference);
}

async function refreshAndRenderPublic(){
  await loadAll(); renderPage();
}
function mountAdminShell(){
  const mount=byId("reserveAdminMount"); if(!mount)return;
  mount.innerHTML=state.admin?adminHTML():loginHTML();
  if(state.admin)bindAdminShell(); else bindLogin();
}
function bindPublicDailyActions(){
  const findInlineAssignment=el=>{
    const tr=el.closest("tr[data-reserve-public-assignment]");
    const id=tr?.getAttribute("data-reserve-public-assignment")||"";
    return state.assignments.find(a=>String(a.id)===id&&a.published===true&&a.status!=="ملغي")||null;
  };
  const inlineFeedback=(el,kind,message)=>{
    const node=el.closest("tr")?.querySelector(`[data-reserve-inline-feedback="${kind}"]`);
    if(node)node.textContent=message;
  };
  document.querySelectorAll(".reserve-row-ack").forEach(btn=>btn.addEventListener("click",async()=>{
    const assignment=findInlineAssignment(btn);
    if(!assignment?.ackToken)return inlineFeedback(btn,"ack","لا يوجد تكليف معتمد لهذا الصف.");
    btn.disabled=true;
    inlineFeedback(btn,"ack","جارٍ تسجيل الاطلاع...");
    try{
      await reserveTeacherCloudAction(assignment.ackToken,"ack");
      await refreshAndRenderPublic();
    }catch(err){
      console.error(err);
      inlineFeedback(btn,"ack","تعذر تسجيل الاطلاع؛ أعيدي المحاولة.");
      btn.disabled=false;
    }
  }));
  document.querySelectorAll(".reserve-row-topic-open").forEach(btn=>btn.addEventListener("click",()=>{
    const assignment=findInlineAssignment(btn);
    if(!assignment?.ackToken)return inlineFeedback(btn,"topic","لا يوجد تكليف معتمد لهذا الصف.");
    if(!assignment.ackAt){
      inlineFeedback(btn,"topic","اضغطي «تأكيد الاطلاع» في نفس الصف أولًا.");
      return;
    }
    const editor=btn.closest("td")?.querySelector(".reserve-row-topic-editor");
    if(!editor)return;
    editor.hidden=!editor.hidden;
    inlineFeedback(btn,"topic","");
    if(!editor.hidden)editor.querySelector(".reserve-row-topic-input")?.focus();
  }));
  document.querySelectorAll(".reserve-row-topic-cancel").forEach(btn=>btn.addEventListener("click",()=>{
    const editor=btn.closest(".reserve-row-topic-editor");
    if(editor)editor.hidden=true;
    inlineFeedback(btn,"topic","");
  }));
  document.querySelectorAll(".reserve-row-topic-save").forEach(btn=>btn.addEventListener("click",async()=>{
    const assignment=findInlineAssignment(btn),editor=btn.closest(".reserve-row-topic-editor");
    const input=editor?.querySelector(".reserve-row-topic-input");
    if(!assignment?.ackToken||!assignment.ackAt){
      inlineFeedback(btn,"topic","يجب تأكيد الاطلاع أولًا.");return;
    }
    const title=clean(input?.value||"");
    if(title.length<3||title.length>160){
      inlineFeedback(btn,"topic","اكتبي عنوان موضوع من 3 إلى 160 حرفًا.");input?.focus();return;
    }
    btn.disabled=true;
    inlineFeedback(btn,"topic","جارٍ حفظ الموضوع...");
    try{
      await reserveTeacherCloudAction(assignment.ackToken,"title",title);
      await refreshAndRenderPublic();
    }catch(err){
      console.error(err);
      inlineFeedback(btn,"topic","تعذر حفظ الموضوع؛ أعيدي المحاولة.");
      btn.disabled=false;
    }
  }));
}

function bindPublic(){
  bindHijriDateControl("reservePublicDate",async next=>{state.currentDate=next;renderPage()});
  byId("reservePrint")?.addEventListener("click",()=>window.print());
  byId("reservePublish")?.addEventListener("click",()=>openReservePublication(state.currentDate));
  byId("reserveAdminOpen")?.addEventListener("click",async()=>{
    const s=await validateSession().catch(()=>null);
    if(s){
      state.admin=s;
      try{await ensureSeedV6()}catch(err){console.error("تعذر تهيئة بيانات الإصدار السادس",err)}
    }
    mountAdminShell(); byId("reserveAdminMount")?.scrollIntoView({behavior:"smooth"});
  });
  document.querySelectorAll("[data-week-shift]").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("[data-week-shift]").forEach(x=>x.classList.toggle("active",x===b));
    const ref=addDays(state.currentDate,Number(b.dataset.weekShift||0));
    byId("reserveWeeklyHolder").innerHTML=weeklyTableHTML(publicWeeklyRows(ref),ref);
    if(byId("reserveExcellenceHolder"))byId("reserveExcellenceHolder").innerHTML=excellenceTableHTML(ref);
  });
  // The daily timetable itself contains the actions; no personal links are required.
  // Each operation is restricted to the acknowledgement token of its own published row.
  bindPublicDailyActions();
  const ack=new URLSearchParams(location.search).get("reserve_ack")||"";
  byId("reserveAckBtn")?.addEventListener("click",async()=>{
    const msg=byId("reserveAckMsg"),btn=byId("reserveAckBtn");
    if(!ack||!msg||!btn)return;
    btn.disabled=true;msg.textContent="جارٍ تسجيل الاطلاع...";
    try{
      await reserveTeacherCloudAction(ack,"ack");
      msg.textContent="تم تسجيل الاطلاع. جارٍ تحديث الحالة...";
      await refreshAndRenderPublic();
    }catch(err){
      console.error(err);msg.textContent="تعذر تسجيل الاطلاع. تحققي من الاتصال وأعيدي المحاولة.";
      btn.disabled=false;
    }
  });
  byId("reserveActivationSave")?.addEventListener("click",async()=>{
    const input=byId("reserveActivationTitle"),msg=byId("reserveActivationMsg"),btn=byId("reserveActivationSave");
    if(!ack||!input||!msg||!btn)return;
    const title=clean(input.value);
    if(title.length<3||title.length>160){msg.textContent="اكتبي عنوان موضوع من 3 إلى 160 حرفًا.";input.focus();return;}
    btn.disabled=true;msg.textContent="جارٍ حفظ عنوان الموضوع...";
    try{
      await reserveTeacherCloudAction(ack,"title",title);
      msg.textContent="تم حفظ الموضوع. جارٍ تحديث الحالة...";
      await refreshAndRenderPublic();
    }catch(err){
      console.error(err);msg.textContent="تعذر حفظ عنوان الموضوع. تحققي من الاتصال وأعيدي المحاولة.";
      btn.disabled=false;
    }
  });
}
function bindLogin(){
  byId("reserveCloseLogin")?.addEventListener("click",()=>{byId("reserveAdminMount").innerHTML=""});
  byId("reserveLoginForm")?.addEventListener("submit",async e=>{
    e.preventDefault(); const msg=byId("reserveLoginMsg");
    try{
      await login(clean(byId("reserveAdminEmail").value),byId("reserveAdminPassword").value);
      msg.textContent="جارٍ تهيئة بيانات الجدول الإصدار السادس...";
      await ensureSeedV6();
      mountAdminShell();
    }catch(err){console.error(err);msg.textContent=err.message||"تعذر تسجيل الدخول أو تهيئة البيانات"}
  });
}
function bindAdminShell(){
  document.querySelectorAll("[data-admin-tab]").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("[data-admin-tab]").forEach(x=>x.classList.toggle("active",x===b));
    renderAdminTab(b.dataset.adminTab);
  });
  byId("reserveLogout")?.addEventListener("click",()=>{
    try{sessionStorage.removeItem(SESSION_KEY)}catch(_){}
    state.admin=null; mountAdminShell();
  });
  renderAdminTab("workspace");
}
function renderAdminTab(tab){
  const body=byId("reserveAdminBody"); if(!body)return;
  body.innerHTML=tab==="teachers"?teachersAdminHTML():tab==="settings"?settingsHTML():workspaceHTML();
  if(tab==="teachers")bindTeachersAdmin();
  else if(tab==="settings")bindSettingsAdmin();
  else bindWorkspace();
}

function plainData(x){
  const y={...x}; delete y.id;delete y.createdAt;delete y.updatedAt; return y;
}
async function ensureAdmin(){if(!token())throw new Error("يلزم تسجيل الدخول الإداري")}
async function refreshDayCandidates(date){
  const items=assignmentsOn(date).slice().sort((a,b)=>Number(a.period)-Number(b.period));
  const usedPrimary=new Set(),usedAlt1=new Set();
  for(const a of items){
    const cand=candidateRanking(date,a.period,a.absentTeacherId,a.id,{
      className:a.className,isActivity:a.activity===true,usedPrimary,usedAlt1,limit:3
    });
    if(cand[0]?.teacherId)usedPrimary.add(String(cand[0].teacherId));
    if(cand[1]?.teacherId)usedAlt1.add(String(cand[1].teacherId));
    await patchKind(K.assignment,a.id,{...plainData(a),candidates:cand},token(),a.published?"معتمد":"مسودة");
  }
  await loadAll();
}

function bindDayAdmin(){
  bindHijriDateControl("reserveAdminDate",async next=>{
    state.currentDate=next;
    await loadAll();
    renderWorkspaceCard("auto");
  });
  byId("reserveAddAbsence")?.addEventListener("click",async()=>{
    const msg=byId("reserveDayMsg"),teacherId=byId("reserveAbsentTeacher").value,date=state.currentDate;
    const t=teacherOf(teacherId); if(!t){msg.textContent="اختاري المعلمة الغائبة";return}
    if(!dayKey(date)){msg.textContent="التاريخ المختار ليس من أيام الدوام الأحد–الخميس";return}
    const s=scheduleOf(teacherId),cells=s?.timetable?.[dayKey(date)]||[];
    const periods=cells.map((v,i)=>{const x=parseScheduleValue(v);return {period:i+1,className:x.className,activity:x.activity}}).filter(x=>x.className);
    const reason=clean(byId("reserveAbsenceReason")?.value||"غياب");
    try{
      await ensureAdmin();
      if(absencesOn(date).some(x=>String(x.teacherId)===String(teacherId))){msg.textContent="الغياب/التكليف مسجل مسبقًا لهذه المعلمة";return}
      await insertKind(K.absence,{date,dayKey:dayKey(date),teacherId:String(teacherId),teacherName:t.name,reason,periods,createdAt:new Date().toISOString()},token());
      await loadAll(); renderWorkspaceCard("auto");
    }catch(err){console.error(err);msg.textContent="تعذر حفظ الغياب"}
  });
  document.querySelectorAll(".reserve-delete-absence").forEach(b=>b.onclick=async()=>{
    if(!confirm("حذف تسجيل الغياب؟"))return;
    await deleteKind(K.absence,b.dataset.id,token()); await loadAll(); renderWorkspaceCard("auto");
  });
  byId("reserveGenerate")?.addEventListener("click",async()=>{
    const msg=byId("reserveDayMsg");
    try{
      await ensureAdmin();
      const abs=absencesOn(state.currentDate);
      if(!abs.length){msg.textContent="لا يوجد غياب أو تكليف مسجل لهذا اليوم";return}
      const existing=assignmentsOn(state.currentDate);
      const usedPrimary=new Set(),usedAlt1=new Set();
      existing.forEach(x=>{
        if(x.candidates?.[0]?.teacherId)usedPrimary.add(String(x.candidates[0].teacherId));
        if(x.candidates?.[1]?.teacherId)usedAlt1.add(String(x.candidates[1].teacherId));
      });
      for(const a of abs){
        for(const p of (a.periods||[])){
          if(existing.some(x=>String(x.absentTeacherId)===String(a.teacherId)&&Number(x.period)===Number(p.period)))continue;
          const cand=candidateRanking(state.currentDate,p.period,a.teacherId,"",{
            className:p.className,isActivity:p.activity===true,usedPrimary,usedAlt1,limit:3
          });
          const first=cand[0]||null;
          if(cand[0]?.teacherId)usedPrimary.add(String(cand[0].teacherId));
          if(cand[1]?.teacherId)usedAlt1.add(String(cand[1].teacherId));
          await insertKind(K.assignment,{
            date:state.currentDate,dayKey:dayKey(state.currentDate),period:Number(p.period),className:p.className,activity:p.activity===true,
            reason:a.reason||"غياب",
            absentTeacherId:String(a.teacherId),absentTeacherName:a.teacherName,
            candidates:cand,
            assignedTeacherId:first?.teacherId||"",assignedTeacherName:first?.name||"",
            published:false,status:"مسودة",ackToken:uid(),ackAt:"",
            activationTitle:"",activationAt:"",
            createdAt:new Date().toISOString()
          },token(),"مسودة");
          await loadAll();
        }
      }
      renderWorkspaceCard("auto");
    }catch(err){console.error(err);msg.textContent="تعذر توليد الاحتياط"}
  });
  document.querySelectorAll(".reserve-save-assignee").forEach(b=>b.onclick=async()=>{
    const tr=b.closest("[data-assignment]"),id=tr.dataset.assignment;
    const a=state.assignments.find(x=>String(x.id)===String(id)); if(!a)return;
    const teacherId=tr.querySelector(".reserve-assignee").value;
    const t=teacherOf(teacherId); if(!t)return;
    const changed=String(a.assignedTeacherId)!==String(teacherId);
    const warnings=changed?manualConflictMessages(a.date,[{
      teacherId:String(t.id),period:Number(a.period),className:a.className,
      existingId:String(a.id)
    }],[...new Set(absencesOn(a.date).map(x=>String(x.teacherId)))])
      :(Array.isArray(a.manualOverrideWarnings)?a.manualOverrideWarnings:[]);
    const data={...plainData(a),assignedTeacherId:String(t.id),assignedTeacherName:t.name,
      manualOverride:changed||a.manualOverride===true,manualOverrideWarnings:warnings};
    state.lastReserveWarnings={date:a.date,source:"auto",warnings};
    if(changed){data.ackAt="";data.activationTitle="";data.activationAt="";data.ackToken=uid()}
    await patchKind(K.assignment,id,data,token(),a.published?"معتمد":"مسودة");
    await loadAll();
    await refreshDayCandidates(state.currentDate);
    refreshReserveStatisticsViews();
    renderWorkspaceCard("auto");
  });
  document.querySelectorAll(".reserve-delete-assignment").forEach(b=>b.onclick=async()=>{
    const tr=b.closest("[data-assignment]"); if(!confirm("حذف هذا التكليف؟"))return;
    await deleteKind(K.assignment,tr.dataset.assignment,token()); await loadAll();
    refreshReserveStatisticsViews();renderWorkspaceCard("auto");
  });
  // The teacher link is generated only for the assigned teacher; status badges in the public table are read-only.
  const teacherActionUrl=a=>`${location.origin}${location.pathname}?reserve_ack=${encodeURIComponent(a.ackToken)}#daily-reserve`;
  document.querySelectorAll(".reserve-copy-ack").forEach(b=>b.onclick=async()=>{
    const tr=b.closest("[data-assignment]"),a=state.assignments.find(x=>String(x.id)===String(tr?.dataset.assignment));
    if(!a?.ackToken)return;
    const url=teacherActionUrl(a);
    try{await navigator.clipboard.writeText(url);b.textContent="تم النسخ"}catch(_){prompt("انسخي رابط المعلمة:",url)}
  });
  document.querySelectorAll(".reserve-open-ack").forEach(b=>b.onclick=()=>{
    const tr=b.closest("[data-assignment]"),a=state.assignments.find(x=>String(x.id)===String(tr?.dataset.assignment));
    if(!a?.ackToken)return;
    const url=teacherActionUrl(a);
    const opened=window.open(url,"_blank");
    if(opened)opened.opener=null;
    else window.location.assign(url);
  });
  byId("reserveApproveAuto")?.addEventListener("click",async()=>{
    const msg=byId("reserveDayMsg");
    try{
      const items=assignmentsOn(state.currentDate);
      if(!items.length){msg.textContent="لا توجد تكليفات لاعتمادها";return}
      for(const a of items){
        if(!a.assignedTeacherId)continue;
        await patchKind(K.assignment,a.id,{...plainData(a),published:true,status:"معتمد"},token(),"معتمد");
      }
      await loadAll(); await renderPage(); await validateSession(); mountAdminShell();
    }catch(err){console.error(err);msg.textContent="تعذر اعتماد الجدول"}
  });
}

function bindTeachersAdmin(){
  byId("reserveTeacherForm")?.addEventListener("submit",async e=>{
    e.preventDefault(); const msg=byId("rtMsg");
    try{
      await insertKind(K.teacher,{
        name:clean(byId("rtName").value),subject:clean(byId("rtSubject").value),
        workload:Number(byId("rtWorkload").value||0),excluded:byId("rtExcluded").value==="1",
        active:true,createdAt:new Date().toISOString()
      },token());
      await loadAll(); renderAdminTab("teachers");
    }catch(err){console.error(err);msg.textContent="تعذر حفظ المعلمة"}
  });
  document.querySelectorAll(".reserve-edit-schedule").forEach(b=>b.onclick=()=>{
    const row=b.closest("[data-teacher]"),t=teacherOf(row.dataset.teacher),ed=byId("reserveTeacherEditor");
    ed.innerHTML=scheduleEditorHTML(t);ed.style.display="block";ed.scrollIntoView({behavior:"smooth",block:"start"});
    byId("reserveCloseTeacherEditor").onclick=()=>ed.style.display="none";
    byId("reserveSaveSchedule").onclick=async()=>{
      const timetable={sun:[],mon:[],tue:[],wed:[],thu:[]};
      ed.querySelectorAll("[data-day][data-period]").forEach(i=>{timetable[i.dataset.day][Number(i.dataset.period)-1]=clean(i.value)});
      const existing=scheduleOf(t.id);
      const data={teacherId:String(t.id),teacherName:t.name,timetable,updatedAt:new Date().toISOString()};
      if(existing)await patchKind(K.schedule,existing.id,data,token());else await insertKind(K.schedule,data,token());
      await loadAll();ed.innerHTML=scheduleEditorHTML(t);ed.style.display="block";
      bindTeachersAdmin();
    };
  });
  document.querySelectorAll(".reserve-edit-teacher").forEach(b=>b.onclick=async()=>{
    const t=teacherOf(b.closest("[data-teacher]").dataset.teacher); if(!t)return;
    const name=prompt("اسم المعلمة:",t.name); if(name===null)return;
    const subject=prompt("التخصص:",t.subject||""); if(subject===null)return;
    const workload=prompt("النصاب الأسبوعي:",String(t.workload||0)); if(workload===null)return;
    const excluded=confirm("اضغطي موافق إذا كانت المعلمة مستبعدة مؤقتًا من الاحتياط.");
    await patchKind(K.teacher,t.id,{...plainData(t),name:clean(name),subject:clean(subject),workload:Number(workload||0),excluded},token());
    await loadAll();renderAdminTab("teachers");
  });
  document.querySelectorAll(".reserve-delete-teacher").forEach(b=>b.onclick=async()=>{
    const id=b.closest("[data-teacher]").dataset.teacher,t=teacherOf(id);
    if(!confirm(`حذف المعلمة «${t?.name||""}» من قائمة الاحتياط؟`))return;
    await patchKind(K.teacher,id,{...plainData(t),active:false},token());
    await loadAll();renderAdminTab("teachers");
  });
}

function bindSettingsAdmin(){
  byId("reserveSaveSettings")?.addEventListener("click",async()=>{
    const msg=byId("reserveSettingsMsg");
    const data={
      ...(state.settings?plainData(state.settings):{}),
      sourceVersion:V6_SOURCE,
      termStart:byId("rwTermStart").value||COUNT_START,
      countStart:byId("rwCountStart").value||COUNT_START,
      emergencyDailyDemand:Number(byId("rwEmergency").value||EMERGENCY_DAILY_DEMAND),
      updatedAt:new Date().toISOString()
    };
    try{
      if(state.settings)await patchKind(K.settings,state.settings.id,data,token());
      else await insertKind(K.settings,data,token());
      await loadAll();msg.textContent="تم حفظ الإعدادات";
    }catch(err){console.error(err);msg.textContent="تعذر حفظ الإعدادات"}
  });
}

async function renderPage(){
  if(!isRoute()||renderBusy)return;
  renderBusy=true;
  injectStyle();
  const view=byId("view");
  if(!view){renderBusy=false;return;}
  if(!byId("dailyReserveRoot")&&!byId("dailyReserveLoading")){
    view.innerHTML=`<section id="dailyReserveLoading" class="surface panel"><div class="panel-head"><h3>جارٍ تحميل الاحتياط اليومي</h3></div></section>`;
  }
  try{
    await loadAll();
    if(!isRoute())return;
    view.innerHTML=publicHTML();
    decorateReservePortraitTables(byId("dailyReserveRoot"));
    bindPublic();
    const s=await validateSession().catch(()=>null);
    if(s)state.admin=s;
  }catch(err){
    console.error(err);
    if(isRoute()) view.innerHTML=`<section class="surface empty-state"><h3>تعذر تحميل بيانات الاحتياط حاليًا</h3><p>تحققي من الاتصال ثم أعيدي المحاولة.</p></section>`;
  }finally{
    renderBusy=false;
  }
}

addEventListener("hashchange",()=>setTimeout(renderPage,0));
addEventListener("popstate",()=>setTimeout(renderPage,0));
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(renderPage,0),{once:true});
else setTimeout(renderPage,0);

const view=byId("view");
if(view){
  let timer;
  new MutationObserver(()=>{
    if(!isRoute()||renderBusy)return;
    if(byId("dailyReserveRoot")||byId("dailyReserveLoading"))return;
    clearTimeout(timer);timer=setTimeout(renderPage,80);
  }).observe(view,{childList:true,subtree:true});
}
})();