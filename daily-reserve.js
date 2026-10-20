/* MANJAZ DAILY RESERVE 2.6
   Public read-only daily reserve + weekly cumulative view.
   Admin-only editing through Supabase Auth session.
   Cloud-first: all operational data lives in Supabase records.
   Candidate engine shows a single smart nomination per period with editable staff selection.
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
  adjustment:"reserve_adjustment",
  monthlyCertificate:"reserve_monthly_certificate"
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
const ADVANCED_RANK=new Set(["دعاء الحربي","سندس الغامدي","عايدة الصاعدي","ريم القحطاني","عوالي السبيعي","بدرية الحربي","حنان المجنوني"]); // Legacy ranking and manual reports: unchanged
const ABSOLUTE_EXCLUDED=new Set(["نورة الهودان"]);
// Approved rank and exclusion rules apply exclusively to automatic nomination.
const AUTO_ADVANCED_RANK=new Set(["دعاء الحربي","عوالي السبيعي","حصة المنتشري","عايدة الصاعدي","عواطف الحربي","ريم القحطاني","بدرية الحربي","حنان المجنوني"]);
const AUTO_GLOBAL_EXCLUDED=new Set(["دخنة الشهري","نورة الهودان"]);
const AUTO_OFF_EXCLUDED=new Set(["أفراح الجدعاني","إيمان الجدعاني","أيمان الجدعاني","حصة المنتشري","عبير المولد","لمياء البلادي","لمياء البالدي","نجوى الغامدي","نورة العنزي","عايدة الصاعدي","عواطف الحربي","بدرية الحربي"]);
// Additional personnel authorized for manual assignment, not in the official sixth-edition teacher timetable.
const MANUAL_SUPPORT_STAFF=[
  {id:"reserve_support_1",name:"دخيلة المالكي",supportStaff:true,role:"التوجيه الطلابي / المختبر"},
  {id:"reserve_support_2",name:"مها العتيبي",supportStaff:true,role:"التوجيه الطلابي / المختبر"},
  {id:"reserve_support_3",name:"نجلاء هوساوي",supportStaff:true,role:"التوجيه الطلابي / المختبر"}
];
const V6_SEED=[{"name":"أفراح الجدعاني","workload":9,"timetable":{"sun":["","","","","","أول6","ثالث3"],"mon":["أول6","","أول4","","","ثالث3",""],"tue":["","أول5","","","",""],"wed":["أول5","","","أول4","",""],"thu":["","ثالث3","","","",""]}},{"name":"أيمان الجدعاني","workload":20,"timetable":{"sun":["ثاني6","","","","ثاني3","ثاني1","ثاني2"],"mon":["ثاني2","","ثاني6","ثاني1","","","ثاني4"],"tue":["ثاني6","","","ثاني4","ثاني3","ثاني1"],"wed":["ثاني2","ثاني4","","","ثاني3","ثاني6"],"thu":["ثاني3","ثاني1","","ثاني2","ثاني4",""]}},{"name":"بدريه الحربي","workload":11,"timetable":{"sun":["","ثاني4","","","ثاني4|نشاط","","ثاني5"],"mon":["ثاني6","","","","ثاني4|نشاط","",""],"tue":["","","ثاني5","","","ثاني4"],"wed":["","","","ثاني6","ثاني4",""],"thu":["ثاني5","ثاني6","","","",""]}},{"name":"بدريه السلمي","workload":16,"timetable":{"sun":["","ثالث1|نشاط","ثالث2","ثالث3","","","ثالث1"],"mon":["ثالث1","","ثالث3","","","","ثالث2"],"tue":["","ثالث2","ثالث1","","","ثالث3"],"wed":["ثالث1","","","","ثالث3","ثالث2"],"thu":["","ثالث1","","ثالث2","ثالث3",""]}},{"name":"تهاني العتيبي","workload":22,"timetable":{"sun":["أول1","أول2","","ثالث2","ثالث3","ثالث1",""],"mon":["ثالث2","ثالث3","","أول2","ثالث1","أول1",""],"tue":["ثالث1","أول1","","أول2","ثالث3",""],"wed":["ثالث2","ثالث1","","أول1","أول2",""],"thu":["ثالث3","","","أول1","أول2","ثالث2"]}},{"name":"حصة المنتشري","workload":20,"timetable":{"sun":["أول6","","ثاني1","ثاني3","ثاني2","",""],"mon":["","ثاني3","ثاني1","أول6","","ثاني2",""],"tue":["أول6","","ثاني3","ثاني2","ثاني1",""],"wed":["ثاني3","أول6","","ثاني2","ثاني1",""],"thu":["ثاني2","ثاني3","ثاني1","أول6","",""]}},{"name":"حنان المجنوني","workload":13,"timetable":{"sun":["ثالث5","ثالث2","","","","ثالث3","ثالث4"],"mon":["","ثالث1","","","ثالث6","","ثالث3"],"tue":["","ثالث5","","","ثالث2|نشاط","ثالث6"],"wed":["","","ثالث2","","",""],"thu":["ثالث4","","","","ثالث1",""]}},{"name":"خزماء الجبيري","workload":18,"timetable":{"sun":["","أول4","أول6","أول3","أول1","",""],"mon":["أول5","أول2","","","","أول6","أول3"],"tue":["","","أول2","","أول4","أول1"],"wed":["","أول2","أول4","","أول5",""],"thu":["أول3","","أول6","أول5","أول1",""]}},{"name":"خلود الكثيري","workload":18,"timetable":{"sun":["أول5","","أول2","","أول6","أول1",""],"mon":["أول1","أول3","","أول5","","","أول4"],"tue":["","أول3","","أول6","",""],"wed":["","أول4","أول1","","","أول2"],"thu":["أول2","أول3","أول4","","أول5","أول6"]}},{"name":"دعاء الحربي","workload":20,"timetable":{"sun":["","أول6","","ثاني6","ثاني5","","أول5"],"mon":["","أول5","أول6","","ثاني5","","ثاني6"],"tue":["","أول6","أول5","ثاني5","","ثاني6"],"wed":["ثاني5","ثاني6","","أول5","أول6",""],"thu":["ثاني6","ثاني5","","","أول6","أول5"]}},{"name":"رحمة العيسي","workload":4,"timetable":{"sun":["","","","","","","أول4"],"mon":["أول4","","","","","",""],"tue":["أول4","","","","",""],"wed":["","","","","",""],"thu":["","","","","","أول4"]}},{"name":"ريم الحربي","workload":18,"timetable":{"sun":["ثالث4","","ثالث5","","ثالث1","ثالث6",""],"mon":["","","ثالث2","ثالث3","","ثالث4",""],"tue":["ثالث3","ثالث6","","ثالث5","ثالث1",""],"wed":["ثالث3","","ثالث4","","ثالث2",""],"thu":["ثالث1","","ثالث5","ثالث6","ثالث2",""]}},{"name":"ريم القحطاني","workload":17,"timetable":{"sun":["ثاني2","ثاني3","","ثاني2|نشاط","ثاني1","",""],"mon":["ثاني1","","","ثاني2","ثاني3","",""],"tue":["ثاني2","ثاني1","","","ثاني2|نشاط","ثاني3"],"wed":["","ثاني3","","ثاني1","","ثاني2"],"thu":["","","ثاني2","ثاني1","ثاني3",""]}},{"name":"رية الحربي","workload":13,"timetable":{"sun":["ثالث3|نشاط","","","","ثالث2","","ثالث6"],"mon":["","","","ثالث4","","ثالث1","ثالث5"],"tue":["ثالث4","","","ثالث1","","ثالث2"],"wed":["","","","ثالث3","","ثالث5"],"thu":["","","ثالث6","","","ثالث3"]}},{"name":"سحر الشمراني","workload":17,"timetable":{"sun":["ثاني4","ثاني6","","ثاني5","","ثاني5|نشاط",""],"mon":["","ثاني5","","ثاني4","ثاني6","",""],"tue":["ثاني5","ثاني4","","ثاني6","",""],"wed":["","","ثاني6","","ثاني5","ثاني4"],"thu":["","ثاني4","ثاني6","","ثاني5","ثاني5|نشاط"]}},{"name":"سندس الغامدي","workload":20,"timetable":{"sun":["ثاني1","ثاني2","","ثاني4","","","ثاني3"],"mon":["","ثاني4","ثاني2","","","ثاني1","ثاني3"],"tue":["ثاني4","ثاني3","ثاني2","ثاني1","",""],"wed":["","ثاني2","ثاني3","ثاني4","","ثاني1"],"thu":["","ثاني2","ثاني3","ثاني4","","ثاني1"]}},{"name":"شوق المطيري","workload":8,"timetable":{"sun":["","","","","","أول2",""],"mon":["","","","","أول1","","أول2"],"tue":["","","","","أول1","أول2"],"wed":["أول1","","","","",""],"thu":["","أول2","أول1","","",""]}},{"name":"شيخة المالكي","workload":16,"timetable":{"sun":["ثالث2","ثالث3","","","ثالث6","",""],"mon":["","ثالث2","ثالث6","","ثالث3","ثالث6|نشاط",""],"tue":["","","ثالث3","ثالث2","ثالث6",""],"wed":["","ثالث6","","ثالث2","","ثالث3"],"thu":["","ثالث2","","ثالث3","","ثالث6"]}},{"name":"عايدة الصاعدي","workload":18,"timetable":{"sun":["","","ثالث1","ثالث6","ثالث4","","ثالث2"],"mon":["ثالث3","ثالث5","","ثالث2","ثالث4","","ثالث1"],"tue":["","","","ثالث3","","ثالث5"],"wed":["","ثالث3","ثالث1","ثالث4","ثالث6",""],"thu":["","","ثالث2","","ثالث6","ثالث5"]}},{"name":"عبير المولد","workload":9,"timetable":{"sun":["","","ثالث4","","ثالث5","",""],"mon":["","","","ثالث5","","","ثالث6"],"tue":["","","","ثالث6","","ثالث4"],"wed":["","","","","","ثالث6"],"thu":["","ثالث5","","","","ثالث4"]}},{"name":"علوه الحربي","workload":11,"timetable":{"sun":["","","ثاني2","","","ثاني3","ثاني1|نشاط"],"mon":["ثاني3","","","","ثاني1","","ثاني2"],"tue":["ثاني1|نشاط","","","","",""],"wed":["","ثاني1","","","","ثاني3"],"thu":["","","","","ثاني1","ثاني2"]}},{"name":"علية القاسمي","workload":4,"timetable":{"sun":["","","أول3","","","",""],"mon":["","","","","","أول3",""],"tue":["أول3","","","","",""],"wed":["","","","أول3","",""],"thu":["","","","","",""]}},{"name":"عواطف الحربي","workload":12,"timetable":{"sun":["ثاني3","","ثاني4","","ثاني6","",""],"mon":["","","ثاني3","ثاني6","","ثاني4",""],"tue":["","","ثاني6","ثاني3","",""],"wed":["","","ثاني4","","",""],"thu":["","","ثاني4","ثاني6","","ثاني3"]}},{"name":"عوالي السبيعي","workload":20,"timetable":{"sun":["","أول1","أول5","أول4","","أول3",""],"mon":["أول3","أول4","","أول1","أول2","",""],"tue":["أول2","أول4","","أول3","أول5",""],"wed":["أول2","","أول5","","أول1","أول3"],"thu":["أول5","","أول2","","أول4","أول1"]}},{"name":"غاليه المزمومي","workload":16,"timetable":{"sun":["","ثالث6","","","","ثالث4","ثالث5"],"mon":["","","ثالث5","ثالث6","","","ثالث4"],"tue":["ثالث5","ثالث4","ثالث6","","",""],"wed":["ثالث4","","","ثالث6","ثالث5","ثالث4|نشاط"],"thu":["ثالث6","ثالث4","","ثالث5","",""]}},{"name":"فاطمة الزهراني","workload":13,"timetable":{"sun":["","","ثاني5","","","ثاني6","ثاني6|نشاط"],"mon":["","أول6","","","","ثاني6","ثاني5"],"tue":["","","أول6","","ثاني6","ثاني5"],"wed":["ثاني6","","أول6","","",""],"thu":["","","ثاني5","","","ثاني6|نشاط"]}},{"name":"فاطمة العماري","workload":16,"timetable":{"sun":["ثالث1","ثالث4","","ثالث5","","",""],"mon":["ثالث5","","ثالث4","ثالث1","","",""],"tue":["","ثالث1","ثالث5","ثالث4","",""],"wed":["ثالث5","ثالث4","ثالث5|نشاط","","ثالث1",""],"thu":["ثالث5","","ثالث1","ثالث4","",""]}},{"name":"فاطمة الغامدي","workload":18,"timetable":{"sun":["","ثاني1","ثاني3","","","","ثاني4"],"mon":["","ثاني2","ثاني4","ثاني3|نشاط","","ثاني3","ثاني1"],"tue":["ثاني3|نشاط","ثاني2","","","ثاني4",""],"wed":["","","ثاني1","ثاني3","ثاني2",""],"thu":["ثاني1","","","ثاني3","ثاني2","ثاني4"]}},{"name":"فاطمة حسن","workload":9,"timetable":{"sun":["","أول3","","","","","أول2"],"mon":["","","أول2","","","","أول1"],"tue":["","","أول1","","","أول3"],"wed":["","أول1","","","أول3",""],"thu":["","","","","","أول2"]}},{"name":"لمياء البالدي","workload":22,"timetable":{"sun":["أول4","","ثالث6","ثالث4","أول3","ثالث5",""],"mon":["ثالث4","ثالث6","","أول4","أول3","ثالث5",""],"tue":["ثالث6","","أول3","أول4","ثالث4",""],"wed":["أول3","","ثالث6","ثالث5","أول4",""],"thu":["أول4","","ثالث4","أول3","ثالث5",""]}},{"name":"ليلى مجرشي","workload":20,"timetable":{"sun":["","","أول4","أول1","أول2","","أول3"],"mon":["","أول1","أول3","","أول4","أول2",""],"tue":["","أول2","أول4","أول1","أول3",""],"wed":["أول4","","أول3","أول2","","أول1"],"thu":["أول1","أول4","","أول2","","أول3"]}},{"name":"منال الجابري","workload":15,"timetable":{"sun":["أول2","أول5","","","أول4","","أول1"],"mon":["أول2","","أول1","أول3","","أول5",""],"tue":["أول1","","","","","أول4"],"wed":["","أول3","أول2","","","أول4"],"thu":["","أول5","","","أول3",""]}},{"name":"نجوى الغامدي","workload":12,"timetable":{"sun":["ثاني5","","","ثاني1","","ثاني2",""],"mon":["","ثاني1","","ثاني5","ثاني2","",""],"tue":["","ثاني5","ثاني1","","","ثاني2"],"wed":["ثاني1","","ثاني2","","","ثاني5"],"thu":["","","","","",""]}},{"name":"نورة الهودان","workload":24,"timetable":{"sun":["ثالث6","ثالث5","ثالث3","ثالث1","","ثالث2",""],"mon":["ثالث6","ثالث4","ثالث1","","ثالث5","ثالث2",""],"tue":["ثالث2","ثالث3","ثالث4","","ثالث5",""],"wed":["ثالث6","ثالث5","ثالث3","ثالث1","ثالث4",""],"thu":["ثالث2","ثالث6","ثالث3","ثالث1","ثالث4",""]}},{"name":"نورة العنزي","workload":12,"timetable":{"sun":["أول3","","أول1","أول2","","",""],"mon":["","","","","ثالث2","",""],"tue":["","","ثالث2","","أول2","ثالث1"],"wed":["","ثالث2","","","","ثالث1"],"thu":["","أول1","أول3","","","ثالث1"]}},{"name":"هاجر السلمي","workload":9,"timetable":{"sun":["","","","أول5","","أول4",""],"mon":["","","","","","أول4","أول5"],"tue":["أول5","","","","","أول6"],"wed":["أول6","","","","",""],"thu":["أول6","","","أول4","",""]}},{"name":"وحش القحطاني","workload":20,"timetable":{"sun":["","ثاني5","ثاني6","","أول5","ثاني4",""],"mon":["ثاني4","ثاني6","ثاني5","","أول5","",""],"tue":["","ثاني6","ثاني4","أول5","ثاني5",""],"wed":["ثاني4","أول5","","ثاني5","ثاني6",""],"thu":["ثاني4","","أول5","ثاني5","ثاني6",""]}},{"name":"وضحه المحمادي","workload":8,"timetable":{"sun":["","","","أول6","","أول5","أول6"],"mon":["","","أول5","","","",""],"tue":["","","","","أول6","أول5"],"wed":["","","","","","أول5"],"thu":["","أول6","","","",""]}},{"name":"دخنه الشهري","workload":8,"timetable":{"sun":["","","","","","",""],"mon":["ثاني5","","","","أول6","ثاني5","أول6"],"tue":["","","","","",""],"wed":["","ثاني5","ثاني5","أول6","","أول6"],"thu":["","","","","",""]}}];
let state={teachers:[],schedules:[],absences:[],assignments:[],adjustments:[],monthlyCertificates:[],monthlyCertificateKey:"",settings:null,admin:null,currentDate:todayISO(),workspaceCard:"manual",autoAllNames:true,autoAbsentIds:[],publicOpenCards:[]};
let renderBusy=false;
// Contacts are fetched exclusively after an authenticated administrative login;
// phone numbers are never embedded in public JavaScript or public records.
state.reserveContactBook=new Map();
state.reserveNotificationStates=new Map();
state.reserveNotifyQueueActive=false;
state.reserveNotifyQueueIndex=0;


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
// Use the same Saudi Umm al-Qura calendar as the date labels shown in the UI.
const reserveHijriMonthFormatter=new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura",{
  calendar:"islamic-umalqura",timeZone:"Asia/Riyadh",year:"numeric",month:"numeric"
});
function reserveHijriMonthKey(date){
  const parts=reserveHijriMonthFormatter.formatToParts(parseDate(date));
  const year=parts.find(p=>p.type==="year")?.value;
  const month=parts.find(p=>p.type==="month")?.value;
  if(!year||!month)throw new Error("تعذر تحديد الشهر الهجري");
  return `${year}-${String(Number(month)).padStart(2,"0")}`;
}
const reserveHijriMonthRangeCache=new Map();
function reserveHijriMonthRange(date){
  if(reserveHijriMonthRangeCache.has(date))return reserveHijriMonthRangeCache.get(date);
  const key=reserveHijriMonthKey(date);
  let start=date,end=date;
  // A Hijri month has 29 or 30 days; 32 bounds guard bad input.
  for(let i=0;i<32;i++){
    const prev=addDays(start,-1);
    if(reserveHijriMonthKey(prev)!==key)break;
    start=prev;
  }
  for(let i=0;i<32;i++){
    const next=addDays(end,1);
    if(reserveHijriMonthKey(next)!==key)break;
    end=next;
  }
  const result={start,end,key};
  if(reserveHijriMonthRangeCache.size>120)reserveHijriMonthRangeCache.clear();
  reserveHijriMonthRangeCache.set(date,result);
  return result;
}
function reserveHijriMonthTitle(date){
  return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",{
    calendar:"islamic-umalqura",timeZone:"Asia/Riyadh",year:"numeric",month:"long"
  }).format(parseDate(date));
}

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
    <label class="reserve-date-picker-label">اختيار التاريخ
      <input id="${esc(id)}" type="date" class="reserve-date-picker" value="${esc(date)}" aria-label="اختيار تاريخ الاحتياط">
    </label>
  </div>`;
}
function bindHijriDateControl(id,onChange){
  const input=byId(id);if(!input)return;
  const selectDate=(next)=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(next))return;
    input.value=next;
    const label=byId(`${id}Label`);
    if(label)label.textContent=`${dayName(next)} — ${fmtDate(next)}`;
    onChange?.(next);
  };
  document.querySelectorAll(`[data-hijri-target="${id}"]`).forEach(b=>b.onclick=()=>{
    selectDate(addDays(state.currentDate,Number(b.dataset.hijriStep||0)));
  });
  input.addEventListener("change",()=>selectDate(input.value));
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

const RESERVE_CONTACTS_ENDPOINT=`${SUPABASE_URL}/rest/v1/reserve_teacher_contacts`;
const RESERVE_NOTICE_ENDPOINT=`${SUPABASE_URL}/rest/v1/reserve_teacher_notification_state`;
function reserveNormalizePhone(value){
  let digits=String(value||"").replace(/[^0-9]/g,"");
  if(/^05[0-9]{8}$/.test(digits))digits=`966${digits.slice(1)}`;
  if(/^5[0-9]{8}$/.test(digits))digits=`966${digits}`;
  if(!/^9665[0-9]{8}$/.test(digits))throw new Error("أدخلي رقم جوال سعوديًا صحيحًا يبدأ بـ 05 أو 9665.");
  return digits;
}
async function reservePrivateQuery(url,opts={}){
  if(!token())throw new Error("يلزم الدخول الإداري لعرض بيانات التواصل.");
  const res=await fetch(url,{...opts,cache:"no-store",headers:{...baseHeaders(token()),...(opts.headers||{})}});
  if(!res.ok)throw new Error(`تعذر الوصول إلى بيانات التواصل المحمية (${res.status})`);
  return await res.json();
}
async function reserveLoadContacts(){
  const rows=await reservePrivateQuery(`${RESERVE_CONTACTS_ENDPOINT}?select=teacher_name,full_name,phone&order=teacher_name.asc`);
  state.reserveContactBook=new Map(rows.map(r=>[r.teacher_name,r]));
}
async function reserveLoadNotificationStates(date){
  const p=new URLSearchParams({select:"day_date,teacher_name,prepared_at,marked_sent_at",day_date:`eq.${date}`});
  const rows=await reservePrivateQuery(`${RESERVE_NOTICE_ENDPOINT}?${p}`);
  return new Map(rows.map(r=>[r.teacher_name,r]));
}
async function reserveStoreContacts(rows){
  const names=new Set(manualAssigneeDirectory().map(t=>t.name));
  const values=rows.map(row=>({
    teacher_name:row.teacher_name,full_name:row.full_name||row.teacher_name,
    phone:reserveNormalizePhone(row.phone)
  }));
  if(!values.length||values.some(r=>!names.has(r.teacher_name)))throw new Error("اسم المعلمة غير موجود بجدول الكادر المعتمد.");
  await reservePrivateQuery(`${RESERVE_CONTACTS_ENDPOINT}?on_conflict=teacher_name`,{
    method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},
    body:JSON.stringify(values)
  });
  await reserveLoadContacts();
}
async function reserveStoreNotificationSent(date,name){
  const rows=await reservePrivateQuery(`${RESERVE_NOTICE_ENDPOINT}?on_conflict=day_date,teacher_name`,{
    method:"POST",headers:{Prefer:"resolution=merge-duplicates,return=representation"},
    body:JSON.stringify([{day_date:date,teacher_name:name,prepared_at:new Date().toISOString(),marked_sent_at:new Date().toISOString()}])
  });
  if(!rows.length)throw new Error("لم يتأكد حفظ حالة الإرسال.");
  state.reserveNotificationStates.set(name,rows[0]);
}
function reserveResolveContactName(fullName){
  const normalized=normName(fullName),parts=normalized.split(" ").filter(Boolean);
  if(parts.length<2)return "";
  const prefix=parts[0],family=parts[parts.length-1];
  const matched=manualAssigneeDirectory().filter(t=>{
    const p=normName(t.name).split(" ");
    return p[0]===prefix&&(p[p.length-1]===family||p[p.length-1]===`ال${family}`||`ال${p[p.length-1]}`===family);
  });
  // Known alternative spelling of the surname in the approved timetable.
  if(!matched.length&&prefix==="لمياء"&&family==="البلادي")return "لمياء البالدي";
  return matched.length===1?matched[0].name:"";
}
function reservePublishedTeacherGroups(date){
  const byName=new Map();
  dailyPublicationRows(date).filter(a=>a.published===true&&a.ackToken&&a.assignedTeacherId).forEach(a=>{
    const key=String(a.assignedTeacherId);
    if(!byName.has(key))byName.set(key,{id:key,name:a.assignedTeacherName||teacherOf(key)?.name||"",date,assignments:[]});
    byName.get(key).assignments.push(a);
  });
  return [...byName.values()].map(g=>({...g,assignments:g.assignments.sort((a,b)=>Number(a.period)-Number(b.period))}))
    .sort((a,b)=>clean(a.name).localeCompare(clean(b.name),"ar"));
}
function reserveTeacherBundleUrl(group){
  if(!group?.assignments?.length)return "";
  const tokens=[...new Set(group.assignments.map(a=>a.ackToken).filter(Boolean))];
  const u=new URL(location.pathname,location.origin);
  u.searchParams.set("reserve_ack",tokens.join(","));
  u.searchParams.set("reserve_date",group.date);
  u.hash="daily-reserve";
  return u.toString();
}
function reserveTeacherOfficialMessage(group){
  const lines=group.assignments.map(a=>`الحصة ${a.period} — ${a.className||"غير محدد"}`);
  return `السلام عليكم ورحمة الله وبركاته،\n\nالمعلمة الفاضلة/ ${group.name}\n\nتُفيدكم إدارة الثانوية الرابعة والتسعون – مسارات باعتماد تكليفاتكم بحصص الاحتياط ليوم ${dayName(group.date)} الموافق ${fmtDate(group.date)}.\n\n${lines.join("\n")}\n\nيرجى الاطلاع على جميع الحصص المسندة إليكم، وتأكيد الاطلاع وتسجيل عنوان موضوع تفعيل كل حصة في الخانات المخصصة، علمًا بأن تأكيد الاطلاع وتفعيل موضوع الحصة من معايير المفاضلة في تسديد حصص الاحتياط.\n\nرابط الاطلاع وتفعيل الحصص:\n${reserveTeacherBundleUrl(group)}\n\nشاكرين لكم تعاونكم والتزامكم.\n\nإدارة الثانوية الرابعة والتسعون – مسارات`;
}
async function reserveCopyText(text){
  try{await navigator.clipboard.writeText(text);return true;}
  catch(_){prompt("انسخي النص:",text);return false;}
}
function reserveOpenWhatsapp(group){
  const phone=state.reserveContactBook.get(group.name)?.phone;
  if(!phone){alert("لا يوجد رقم جوال مسجل لهذه المعلمة. أضيفيه في إدارة أرقام الجوالات.");return false;}
  const normalized=reserveNormalizePhone(phone);
  const url=`https://api.whatsapp.com/send?phone=${normalized}&text=${encodeURIComponent(reserveTeacherOfficialMessage(group))}`;
  const opened=window.open(url,"_blank","noopener,noreferrer");
  if(!opened){
    // Do not navigate away and lose the queue; provide a fallback link instead.
    const next=byId("reserveNotifyMsg");
    if(next)next.innerHTML=`منع المتصفح فتح واتساب. <a href="${esc(url)}" target="_blank" rel="noopener noreferrer">اضغطي هنا لفتح المحادثة</a>.`;
  }
  return true; // Prepared/opened only: never interpreted as WhatsApp delivery confirmation.
}
function reserveBundleFromQuery(){
  const raw=new URLSearchParams(location.search).get("reserve_ack")||"";
  const tokens=raw.split(",").map(x=>x.trim()).filter(Boolean);
  if(tokens.length<2||tokens.length>30||new Set(tokens).size!==tokens.length)return [];
  const records=tokens.map(t=>publishedAssignments().find(a=>a.ackToken===t&&a.assignedTeacherId));
  if(records.some(x=>!x))return [];
  const first=records[0];
  if(records.some(x=>String(x.assignedTeacherId)!==String(first.assignedTeacherId)||x.date!==first.date))return [];
  return records.sort((a,b)=>Number(a.period)-Number(b.period));
}
function reserveBundleHTML(assignments){
  if(!assignments.length)return "";
  const first=assignments[0];
  return `<section class="reserve-ack reserve-no-print" id="reserveTeacherBundle" aria-label="تكليفات معلمة الاحتياط">
    <h3>نموذج حصص الاحتياط للمعلمة: ${esc(first.assignedTeacherName)}</h3>
    <p>${esc(dayName(first.date))} — ${esc(fmtDate(first.date))} | ${assignments.length} حصص | يؤكد الاطلاع والتفعيل لكل حصة على حدة</p>
    ${assignments.map(a=>`<article class="reserve-bundle-course" data-reserve-bundle-course="${esc(a.ackToken)}">
      <strong>الحصة ${esc(a.period)} — ${esc(a.className||"—")}</strong>
      <div>حالة الاطلاع: ${a.ackAt?`<span class="reserve-status">تم الاطلاع ${esc(fmtDateTimeHijri(a.ackAt))}</span>`:'<span class="reserve-status pending">لم يتم الاطلاع</span>'}</div>
      <div class="reserve-actions"><button type="button" class="reserve-mini" data-reserve-bundle-action="ack" ${a.ackAt?'disabled':''}>${a.ackAt?'تم تأكيد الاطلاع':'تأكيد الاطلاع لهذه الحصة'}</button></div>
      <label>عنوان موضوع تفعيل هذه الحصة
      <input data-reserve-bundle-topic type="text" maxlength="160" value="${esc(a.activationTitle||"")}" placeholder="عنوان الموضوع المنفذ" ${a.ackAt?'':'disabled'}></label>
      <div class="reserve-actions"><button type="button" class="reserve-mini" data-reserve-bundle-action="title" ${a.ackAt?'':'disabled'}>${a.activationTitle?'تحديث موضوع الحصة':'حفظ موضوع الحصة'}</button></div>
      <div class="reserve-bundle-feedback" role="status" aria-live="polite"></div>
    </article>`).join("")}
  </section>`;
}
function bindReserveBundleActions(){
  byId("dailyReserveRoot")?.addEventListener("click",async event=>{
    const button=event.target.closest("#reserveTeacherBundle [data-reserve-bundle-action]");
    if(!button)return;
    const card=button.closest("[data-reserve-bundle-course]");
    const ackToken=card?.dataset.reserveBundleCourse,action=button.dataset.reserveBundleAction;
    const msg=card?.querySelector(".reserve-bundle-feedback");
    if(!ackToken||!msg)return;
    const title=clean(card.querySelector("[data-reserve-bundle-topic]")?.value||"");
    if(action==="title"&&(title.length<3||title.length>160)){msg.textContent="اكتبي عنوانًا من 3 إلى 160 حرفًا.";return;}
    button.disabled=true;msg.textContent="جارٍ الحفظ...";
    try{
      await reserveTeacherCloudAction(ackToken,action,action==="title"?title:null);
      await loadAll();
      const now=reserveBundleFromQuery();
      const old=byId("reserveTeacherBundle");
      if(old&&now.length)old.outerHTML=reserveBundleHTML(now);
      refreshReserveStatisticsViews();
    }catch(error){console.error(error);msg.textContent="تعذر الحفظ. حاولي مرة أخرى.";button.disabled=false;}
  });
}
function reserveNotificationPanelHTML(){
  return `<details class="reserve-admin-fold reserve-admin-only" aria-label="إشعارات المعلمات" id="reserveNotifyPanel">
    <summary><strong>إشعارات المعلمات عبر واتساب</strong><span id="reserveNotifyCounter"></span></summary>
    <div class="reserve-fold-body">
    <p class="reserve-public-note">رسالة رسمية واحدة ورابط واحد لكل معلمة، مهما تعددت حصصها في اليوم. يتم الإرسال يدويًا بعد فتح واتساب؛ لا تعني فتح المحادثة تسليم الرسالة.</p>
    <div class="reserve-actions">
      <button class="reserve-mini" id="reserveNotifyAll" type="button">إرسال إشعارات الجميع (بالتتابع)</button>
      <button class="reserve-mini" id="reserveNotifyRefresh" type="button">تحديث القائمة</button>
    </div>
    <div id="reserveNotifyMsg" aria-live="polite"></div>
    <div id="reserveNotifyContent">جارٍ تحميل أرقام المعلمات المحمية...</div>
    <details class="reserve-phonebook-admin" id="reservePhonebookDetails"><summary>إدارة أرقام الجوالات (للإدارة فقط)</summary>
      <p class="reserve-public-note">الأرقام تحفظ في قاعدة بيانات خاصة محمية، ولا تضاف إلى الملفات العامة. ارفعي CSV بالأعمدة name,phone لاستيرادها دفعة واحدة أو اختاري تعديل رقم بجانب اسم المعلمة.</p>
      <input id="reservePhoneCsv" type="file" accept=".csv,text/csv" aria-label="استيراد أرقام المعلمات من CSV">
      <div id="reservePhonebookStatus" role="status"></div>
      <div id="reservePhonebookList"></div>
    </details>
    </div>
  </details>`;
}
function reserveNotificationRowsHTML(groups){
  if(!groups.length)return '<div class="empty-inline">لا توجد معلمات مكلفات بحصص احتياط معتمدة لهذا اليوم.</div>';
  return `<div class="reserve-admin-list">${groups.map(g=>{
    const phone=state.reserveContactBook.get(g.name)?.phone||"";
    const record=state.reserveNotificationStates.get(g.name);
    const marked=!!record?.marked_sent_at;
    return `<div class="reserve-teacher-row" data-reserve-recipient="${esc(g.id)}">
      <strong>${esc(g.name)}</strong><span>${g.assignments.length} ${g.assignments.length===1?'حصة':'حصص'} | ${marked?'أُرسلت وفق تأكيد الإدارة':'لم يؤكد الإرسال'} | ${phone?'الرقم مسجل':'رقم الجوال غير مسجل'}</span>
      <div class="reserve-actions">
        <button class="reserve-mini" data-notify-action="open">إرسال إشعار</button>
        <button class="reserve-mini" data-notify-action="copy">نسخ رابط النموذج</button>
        <button class="reserve-mini" data-notify-action="preview">فتح النموذج</button>
        <button class="reserve-mini" data-notify-action="mark" ${marked?'disabled':''}>${marked?'تم تأكيد الإرسال':'تأكيد أنني أرسلت'}</button>
        <button class="reserve-mini" data-notify-action="edit">تعديل الرقم</button>
      </div>
    </div>`;}).join("")}</div>`;
}
// Task 9: a single source of truth for the ORIGINAL four WhatsApp queue actions.
const RESERVE_NOTIFICATION_QUEUE_ACTIONS=[
  ["send","فتح واتساب للمعلمة"],
  ["mark","أرسلت الرسالة داخل واتساب"],
  ["skip","تخطي إلى التالية"],
  ["close","إغلاق قائمة الإرسال"]
];
function reserveQueueButtonsHTML(group,active,proxy=false){
  return `<div class="reserve-actions">${RESERVE_NOTIFICATION_QUEUE_ACTIONS.map(([action,label])=>{
    const disabled=!active||(action!=="close"&&!group);
    const extra=group&&(action==="send"||action==="mark")?` data-recipient-id="${esc(group.id)}"`:"";
    const attribute=proxy?"data-reserve-notify-proxy":"data-notify-queue";
    return `<button class="reserve-mini" type="button" ${attribute}="${action}"${extra}${disabled?' disabled':''}>${label}</button>`;
  }).join("")}</div>`;
}
function reserveQueueCurrentGroup(groups){
  const remaining=groups.filter(g=>!state.reserveNotificationStates.get(g.name)?.marked_sent_at);
  const idx=Math.max(0,Math.min(state.reserveNotifyQueueIndex,remaining.length-1));
  return {remaining,index:idx,group:remaining[idx]||null};
}
function reserveNotificationQueueHTML(groups){
  const active=state.reserveNotifyQueueActive===true;
  const {remaining,index,group}=reserveQueueCurrentGroup(groups);
  const detail=!active?'ابدئي من «إرسال إشعارات الجميع (بالتتابع)» لتفعيل الأدوات الأربع.'
    :!group?'اكتمل تأكيد إرسال إشعارات جميع المكلفات لهذا اليوم.'
    :`إرسال إشعارات الجميع: ${index+1} من ${remaining.length} متبقية — ${esc(group.name)} (${group.assignments.length} حصص)`;
  return `<section class="reserve-admin-warnings reserve-notify-queue" aria-label="الأدوات الأربع لإرسال الإشعارات"><strong>${detail}</strong>
    ${reserveQueueButtonsHTML(group,active)}</section>`;
}
// Display the same four operations within BOTH creation cards; invoke the
// central notification queue rather than duplicating WhatsApp sending logic.
function reserveWorkspaceNotificationHTML(){
  const groups=reservePublishedTeacherGroups(state.currentDate);
  const active=state.reserveNotifyQueueActive===true;
  const {group,remaining,index}=reserveQueueCurrentGroup(groups);
  const detail=active?(group?`${index+1} من ${remaining.length} — ${esc(group.name)}`:"لا توجد إشعارات متبقية")
    :"ابدئي الإرسال الجماعي لتمكين الأدوات الأربع";
  return `<section class="reserve-share-box reserve-admin-only reserve-workspace-notification" aria-label="إشعارات المعلمات بالتتابع">
    <strong>إشعارات المعلمات بالتتابع – الأدوات الأربع</strong>
    <div class="reserve-actions">
      <button type="button" class="reserve-mini" data-reserve-notify-proxy="start">إرسال إشعارات الجميع (بالتتابع)</button>
      <button type="button" class="reserve-mini" data-reserve-notify-proxy="refresh">تحديث القائمة</button>
    </div>
    <p class="reserve-public-note">${detail}</p>
    ${reserveQueueButtonsHTML(group,active,true)}
  </section>`;
}
function reserveRenderNotificationPanel(){
  const content=byId("reserveNotifyContent");if(!content)return;
  const groups=reservePublishedTeacherGroups(state.currentDate);
  const total=groups.length,marked=groups.filter(g=>state.reserveNotificationStates.get(g.name)?.marked_sent_at).length;
  const counter=byId("reserveNotifyCounter");if(counter)counter.textContent=`${marked} / ${total} تأكيد إرسال`;
  content.innerHTML=reserveNotificationQueueHTML(groups)+reserveNotificationRowsHTML(groups);
  const workspaceNotice=byId("reserveWorkspaceNotify");
  if(workspaceNotice)workspaceNotice.innerHTML=reserveWorkspaceNotificationHTML();
  const phoneList=byId("reservePhonebookList");
  if(phoneList)phoneList.innerHTML=`<p class="reserve-public-note">${state.reserveContactBook.size} رقمًا محفوظًا من ${manualAssigneeDirectory().length} اسمًا معتمدًا.</p>`;
}
async function reserveHydrateNotificationPanel(){
  const panel=byId("reserveNotifyPanel");if(!panel)return;
  const date=state.currentDate,sequence=state.reserveNoticeHydrateSeq=(state.reserveNoticeHydrateSeq||0)+1;
  const stillCurrent=()=>state.admin&&state.currentDate===date&&byId("reserveNotifyPanel")===panel&&sequence===state.reserveNoticeHydrateSeq;
  try{
    const [,statuses]=await Promise.all([reserveLoadContacts(),reserveLoadNotificationStates(date)]);
    if(!stillCurrent())return;
    state.reserveNotificationStates=statuses;
    reserveRenderNotificationPanel();
  }catch(error){
    if(!stillCurrent())return;
    console.error(error);
    const el=byId("reserveNotifyContent");
    if(el)el.textContent="تعذر تحميل بيانات الجوالات المحمية. تأكدي من صلاحيات الدخول الإداري واتصال Supabase.";
  }
}
function reserveParsePhoneCsv(raw){
  const lines=String(raw).replace(/^\uFEFF/,"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(lines.length<2)throw new Error("ملف CSV فارغ أو غير مكتمل.");
  const headers=lines.shift().split(",").map(x=>x.replace(/^"|"$/g,"").trim().toLowerCase());
  const nameIndex=headers.findIndex(x=>["name","الاسم","اسم المعلمة"].includes(x));
  const phoneIndex=headers.findIndex(x=>["phone","الجوال","رقم الجوال"].includes(x));
  if(nameIndex<0||phoneIndex<0)throw new Error("الملف يحتاج إلى عمودي name وphone.");
  const rows=[],skipped=[];
  for(const line of lines){
    const values=line.split(",").map(x=>x.replace(/^"|"$/g,"").trim());
    const full_name=values[nameIndex],teacher_name=reserveResolveContactName(full_name);
    if(!teacher_name){skipped.push(full_name);continue;}
    rows.push({teacher_name,full_name,phone:reserveNormalizePhone(values[phoneIndex])});
  }
  if(new Set(rows.map(r=>r.teacher_name)).size!==rows.length)throw new Error("تكررت بعض الأسماء في ملف الجوالات.");
  return {rows,skipped};
}
function bindReserveNotificationPanel(){
  const panel=byId("reserveNotifyPanel");if(!panel)return;
  panel.addEventListener("click",async event=>{
    const button=event.target.closest("[data-notify-action],[data-notify-queue],#reserveNotifyAll,#reserveNotifyRefresh");
    if(!button)return;
    const msg=byId("reserveNotifyMsg");
    const groups=reservePublishedTeacherGroups(state.currentDate);
    if(button.id==="reserveNotifyAll"){
      state.reserveNotifyQueueActive=true;state.reserveNotifyQueueIndex=0;reserveRenderNotificationPanel();return;
    }
    if(button.id==="reserveNotifyRefresh"){
      await reserveHydrateNotificationPanel();return;
    }
    const qa=button.dataset.notifyQueue;
    if(qa==="close"){state.reserveNotifyQueueActive=false;reserveRenderNotificationPanel();return;}
    if(qa==="skip"){
      const available=groups.filter(g=>!state.reserveNotificationStates.get(g.name)?.marked_sent_at);
      state.reserveNotifyQueueIndex=(state.reserveNotifyQueueIndex+1)%Math.max(1,available.length);
      reserveRenderNotificationPanel();return;
    }
    const id=button.closest("[data-reserve-recipient]")?.dataset.reserveRecipient||button.dataset.recipientId;
    const group=groups.find(g=>g.id===id);
    if(!group)return;
    const action=qa==="send"?"open":qa==="mark"?"mark":button.dataset.notifyAction;
    if(action==="open"){
      try{if(reserveOpenWhatsapp(group)&&msg)msg.textContent=`تم تجهيز رسالة ${group.name}. أكّدي الإرسال فقط بعد إرسالها فعليًا داخل واتساب.`;}
      catch(error){if(msg)msg.textContent=error.message;}
      return;
    }
    if(action==="copy"){await reserveCopyText(reserveTeacherBundleUrl(group));return;}
    if(action==="preview"){
      const opened=window.open(reserveTeacherBundleUrl(group),"_blank","noopener,noreferrer");
      if(!opened&&msg)msg.textContent="اسمحي بفتح النوافذ لمعاينة النموذج.";
      return;
    }
    if(action==="edit"){
      const previous=state.reserveContactBook.get(group.name)?.phone||"";
      const entered=prompt(`رقم جوال ${group.name}:`,previous);
      if(entered===null)return;
      try{await reserveStoreContacts([{teacher_name:group.name,phone:entered}]);reserveRenderNotificationPanel();if(msg)msg.textContent="تم حفظ رقم الجوال في قاعدة البيانات المحمية.";}
      catch(error){if(msg)msg.textContent=error.message;}
      return;
    }
    if(action==="mark"){
      if(!confirm(`هل أرسلتِ الرسالة بالفعل من واتساب إلى ${group.name}؟`))return;
      button.disabled=true;
      try{await reserveStoreNotificationSent(state.currentDate,group.name);
        state.reserveNotifyQueueIndex=0;
        reserveRenderNotificationPanel();if(msg)msg.textContent=`سُجّل تأكيد الإدارة بإرسال إشعار ${group.name}، دون ادعاء وصوله.`;
      }catch(error){button.disabled=false;if(msg)msg.textContent=error.message;}
    }
  });
  byId("reservePhoneCsv")?.addEventListener("change",async event=>{
    const file=event.target.files?.[0];if(!file)return;
    const status=byId("reservePhonebookStatus");
    try{
      const result=reserveParsePhoneCsv(await file.text());
      if(!result.rows.length)throw new Error("لم تُطابق أي أسماء مع قائمة المعلمات.");
      if(!confirm(`استيراد ${result.rows.length} رقمًا إلى قاعدة بيانات المعلمات المحمية؟${result.skipped.length?` أسماء غير مطابقة: ${result.skipped.length}`:""}`))return;
      await reserveStoreContacts(result.rows);reserveRenderNotificationPanel();
      status.textContent=`تم حفظ ${result.rows.length} رقمًا بنجاح في قاعدة البيانات. ${result.skipped.length?`تعذر مطابقة ${result.skipped.length} أسماء.`:""}`;
    }catch(error){console.error(error);status.textContent=error.message||"تعذر استيراد الملف.";}
    finally{event.target.value="";}
  });
  reserveHydrateNotificationPanel();
}

// Read-only link: the original published reserve assignments and manual topics are never altered.
async function fetchApprovedReserveTopics(){
  try{
    const url=SUPABASE_URL+"/rest/v1/manjaz_reserve_auto_topics?select=assignment_id,topic,approved_at&limit=5000";
    const response=await fetch(url,{headers:baseHeaders(),cache:"no-store"});
    if(!response.ok)throw new Error("HTTP "+response.status);
    const data=await response.json();
    return Array.isArray(data)?data:[];
  }catch(error){
    console.warn("تعذر تحميل عناوين التفعيل المعتمدة؛ تبقى الموضوعات اليدوية متاحة.",error);
    return [];
  }
}
async function loadAll(){
  const [teachers,schedules,absences,assignments,settings,adjustments,monthlyCertificates,approvedTopics]=await Promise.all([
    fetchKind(K.teacher),fetchKind(K.schedule),fetchKind(K.absence),fetchKind(K.assignment),fetchKind(K.settings),fetchKind(K.adjustment),fetchKind(K.monthlyCertificate),fetchApprovedReserveTopics()
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
  const approvedTopicMap=new Map(approvedTopics.map(row=>[String(row.assignment_id),row]));
  state.assignments=assignments.map(assignment=>{
    const matched=approvedTopicMap.get(String(assignment.id));
    if(!matched||clean(assignment.activationTitle)||!clean(matched.topic))return assignment;
    return {...assignment,activationTitle:matched.topic,
      activationAt:assignment.activationAt||matched.approved_at,manjazAutoSource:true};
  });
  state.adjustments=adjustments;
  state.monthlyCertificates=monthlyCertificates;
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
// The eight rank-advanced teachers explicitly approved for automatic reserve duty.
function parseScheduleValue(v){
  const s=clean(v),activity=s.includes("|نشاط");
  return {className:clean(s.split("|")[0]),activity};
}
function dateRangeAssignments(start,end){
  const cs=state.settings?.countStart||COUNT_START;
  const effectiveStart=start<cs?cs:start;
  return publicationAssignmentsUntil(end,effectiveStart);
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
  return publicationAssignmentsUntil(wr.end,wr.start).filter(a=>String(a.assignedTeacherId)===String(teacherId)).length;
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
function adjacentOriginalCount(teacherId,date,period){
  // الاتصال بين احتياط وحصة أصلية مسموح، ولا يخصم من المفاضلة.
  return 0;
}
function breastfeedingBlocked(t,date,period){
  if(!["ريم الحربي","نورة الهودان"].includes(clean(t.name)))return false;
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
  // Only used for selecting the assignee; absent-teacher selection stays tied
  // to the approved teacher timetable; existing assignment exceptions are unchanged.
  const seen=new Set();
  return [...state.teachers,...MANUAL_SUPPORT_STAFF].filter(t=>{
    const key=normName(t.name);
    if(!key||t.active===false||seen.has(key))return false;
    seen.add(key);return true;
  }).sort((a,b)=>clean(a.name).localeCompare(clean(b.name),"ar"));
}
function reserveAbsentDirectory(){
  const seen=new Set();
  return state.teachers.filter(t=>{
    const key=normName(t.name);
    if(!key||t.active===false||seen.has(key))return false;
    seen.add(key);return true;
  }).sort((a,b)=>clean(a.name).localeCompare(clean(b.name),"ar"));
}
function existingSlotAssignment(date,absentId,period){
  return assignmentsOn(date).filter(a=>String(a.absentTeacherId)===String(absentId)&&Number(a.period)===Number(period))
    .sort((a,b)=>String(b.updatedAt||b.createdAt||"").localeCompare(String(a.updatedAt||a.createdAt||"")))[0]||null;
}
function weights(){return {...DEFAULT_WEIGHTS,...(state.settings?.weights||{})}}
function termStart(){return state.settings?.termStart||""}

function publishedAssignments(){
  return state.assignments.filter(x=>x.published===true&&x.status!=="ملغي");
}
// Every summary and merit board reads the same canonical daily publication rows.
// This is a read-only projection; duplicate raw cloud records remain untouched.
function publicationAssignmentsUntil(endDate,startDate=""){
  const days=[...new Set(publishedAssignments().map(a=>a.date))]
    .filter(d=>d&&d<=endDate&&(!startDate||d>=startDate)).sort();
  return days.flatMap(date=>dailyPublicationRows(date));
}
function assignmentCounts(referenceDate){
  const wr=weekRange(referenceDate),mr=reserveHijriMonthRange(referenceDate);
  const start=termStart()||COUNT_START,countStart=state.settings?.countStart||COUNT_START;
  // Cumulative counts are calculated through the selected date, never using
  // published future days. Week starts Sunday; month uses Umm al-Qura dates.
  const pub=publicationAssignmentsUntil(referenceDate);
  const map=new Map();
  [...state.teachers,...MANUAL_SUPPORT_STAFF].forEach(t=>map.set(String(t.id),{
    daily:0,week:0,month:0,term:0,
    days:{sun:0,mon:0,tue:0,wed:0,thu:0},
    dayState:{sun:"",mon:"",tue:"",wed:"",thu:""},maxDaily:0
  }));
  const dailyBuckets=new Map();
  pub.forEach(a=>{
    const s=map.get(String(a.assignedTeacherId));if(!s)return;
    if(a.date<=referenceDate&&(!start||a.date>=start)&&(!countStart||a.date>=countStart))s.term++;
    if(inRange(a.date,mr.start,mr.end))s.month++;
    if(inRange(a.date,wr.start,wr.end)){
      s.week++;
      const dk=dayKey(a.date);
      if(s.days[dk]!=null){
        s.days[dk]++;
        const prior=s.dayState[dk];
        const current=a.ackAt?"ack":"approved";
        s.dayState[dk]=(prior==="approved"||current==="approved")?"approved":"ack";
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
  // Administrative corrections use the same week and Hijri month on both cards.
  state.adjustments.forEach(a=>{
    const s=map.get(String(a.teacherId));if(!s)return;
    const delta=Number(a.delta||0);if(!delta)return;
    const adjustmentDate=clean(a.date||a.weekStart);
    if(!/^\d{4}-\d{2}-\d{2}$/.test(adjustmentDate))return;
    if(adjustmentDate<=referenceDate&&(!start||adjustmentDate>=start)&&(!countStart||adjustmentDate>=countStart))
      s.term=Math.max(0,Number(s.term||0)+delta);
    if(inRange(adjustmentDate,mr.start,mr.end))
      s.month=Math.max(0,Number(s.month||0)+delta);
    if(clean(a.weekStart)===wr.start){
      s.week=Math.max(0,Number(s.week||0)+delta);
      if(adjustmentDate===referenceDate)s.daily=Math.max(0,Number(s.daily||0)+delta);
      const dk=dayKey(adjustmentDate);
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
  // Statistics card alone includes every teacher from the approved timetable,
  // plus the three authorized support staff even if their counts are zero.
  // This does not alter candidate ranking or weekly excellence eligibility.
  const counts=assignmentCounts(referenceDate);
  const current=new Map(state.teachers.map(t=>[normName(t.name),t]));
  const official=V6_SEED.map(t=>current.get(normName(t.name))||{
    id:`reserve_statistics_only_${normName(t.name)}`,name:t.name,workload:t.workload,statisticsOnly:true
  });
  const names=new Set();
  return [...official,...MANUAL_SUPPORT_STAFF].filter(t=>{
    const key=normName(t.name);
    if(!key||names.has(key))return false;
    names.add(key);return true;
  }).sort((a,b)=>clean(a.name).localeCompare(clean(b.name),"ar"))
    .map(t=>({teacher:t,count:counts.get(String(t.id))||{daily:0,week:0,month:0,term:0,days:{},dayState:{},maxDaily:0}}));
}
function absencesOn(date){return state.absences.filter(x=>x.date===date)}
function assignmentsOn(date){return state.assignments.filter(x=>x.date===date&&x.status!=="ملغي")}
function reserveDailyAssignedCount(teacherId,date,exceptAssignmentId=""){
  return assignmentsOn(date).filter(a=>String(a.id)!==String(exceptAssignmentId)&&
    String(a.assignedTeacherId)===String(teacherId)).length;
}
// Automatic reserve: weekly rank caps count original + manual + automatic duties.
function reserveAutoIsSupport(t){
  return !!t&&(t.supportStaff===true||
    MANUAL_SUPPORT_STAFF.some(s=>String(s.id)===String(t.id))||
    /مرشد|إرشاد|ارشاد|توجيه طلاب|محضر.*مختبر|مختبر/.test([t.role,t.jobTitle,t.position].map(clean).join(" ")));
}
function reserveAutoCeiling(t){
  return nameSetContains(AUTO_ADVANCED_RANK,editionSixName(t?.name)||clean(t?.name))?22:24;
}
function reserveAutoWeeklyCount(teacherId,date,exceptId=""){
  const wr=weekRange(date);
  return state.assignments.filter(a=>a.status!=="ملغي"&&a.assignedTeacherId&&
    String(a.assignedTeacherId)===String(teacherId)&&String(a.id)!==String(exceptId)&&
    a.date>=wr.start&&a.date<=wr.end).length;
}
function reserveAutoDailyCap(date){
  const day=dayKey(date);
  return day==="sun"||day==="mon"?5:["tue","wed","thu"].includes(day)?4:0;
}
function reserveAutoDailyAllowance(teacherId,date){
  const t=teacherOf(teacherId);
  return Math.max(0,reserveAutoDailyCap(date)-(reserveAutoIsSupport(t)?0:dailyOriginalCount(teacherId,date)));
}
function reserveAutoWeeklyAllowance(teacherId){
  const t=teacherOf(teacherId);
  if(!t)return 0;
  if(reserveAutoIsSupport(t))return 3;
  const remaining=Math.max(0,reserveAutoCeiling(t)-Number(t.workload));
  return normName(t.name)===normName("رية الحربي")?Math.min(2,remaining):remaining;
}
function reserveAutoPreviousSchoolDate(date){return addDays(date,dayKey(date)==="sun"?-3:-1);}
function reserveAutoIneligibility(teacherId,date,className="",exceptId="",fullCadre=state.autoAllNames!==false,skipWeekly=false){
  const t=teacherOf(teacherId);
  if(!t||t.active===false)return "المعلمة غير نشطة ضمن سجل الكادر.";
  const name=normName(t.name),support=reserveAutoIsSupport(t);
  if(nameSetContains(AUTO_GLOBAL_EXCLUDED,name))return "المعلمة مستبعدة دائمًا من الترشيح الآلي.";
  if(!fullCadre&&(support||t.excluded===true||teacherFlags(t).permanentExcluded||
    nameSetContains(AUTO_OFF_EXCLUDED,name)))return "المعلمة مستثناة عند عدم تفعيل الكادر الكامل.";
  if(name===normName("رية الحربي")&&!normName(className).startsWith("اول"))
    return "رية الحربي تُرشح للصف الأول الثانوي فقط.";
  if(!support&&(!Number.isFinite(Number(t.workload))||Number(t.workload)<0))
    return "النصاب الأصلي الأسبوعي غير موثق.";
  if(!skipWeekly&&reserveAutoWeeklyCount(teacherId,date,exceptId)>=reserveAutoWeeklyAllowance(teacherId))
    return name===normName("رية الحربي")?"رية الحربي: لا تتجاوز حصتا احتياط أسبوعيًا.":
      support?"الكادر المساند: ثلاث حصص احتياط أسبوعيًا.":
      "اكتمل سقف الرتبة الأسبوعي للأصلية والاحتياط.";
  return "";
}
function assertAutoAssignmentIntegrity(teacherId,date,period,exceptAssignmentId="",className="",fullCadre=state.autoAllNames!==false,skipWeekly=false){
  const t=teacherOf(teacherId);
  const reason=reserveAutoIneligibility(teacherId,date,className,exceptAssignmentId,fullCadre,skipWeekly);
  if(reason)throw new Error(reason);
  if(isAbsent(teacherId,date))throw new Error("المعلمة غائبة يوم التكليف.");
  if(breastfeedingBlocked(t,date,period))throw new Error("قيد ساعة الرضاعة يمنع هذه الحصة.");
  if(!reserveAutoIsSupport(t)){
    if(!scheduleOf(teacherId))throw new Error("الجدول الأصلي غير متاح.");
    if(regularCell(teacherId,date,period))throw new Error("تعارض مع حصة أصلية أو نشاط.");
  }
  if(occupiedByReserve(teacherId,date,period,exceptAssignmentId))
    throw new Error("المعلمة مكلفة باحتياط آخر في الفترة نفسها.");
  if(reserveDailyAssignedCount(teacherId,date,exceptAssignmentId)>=reserveAutoDailyAllowance(teacherId,date))
    throw new Error("تجاوز الحد اليومي للحصص الأصلية والاحتياط.");
}
function assertAutoReserveFullCoverage(date){
  const expected=new Set(),covered=new Set();
  for(const absent of absencesOn(date)){
    for(const p of (absent.periods||[])){
      if(!clean(p.className))continue;
      expected.add([String(absent.teacherId),Number(p.period),clean(p.className)].join("|"));
    }
  }
  for(const a of assignmentsOn(date)){
    if(!a.assignedTeacherId)continue;
    covered.add([String(a.absentTeacherId),Number(a.period),clean(a.className)].join("|"));
  }
  for(const key of expected)if(!covered.has(key))
    throw new Error("توجد حصص غياب غير مسندة؛ يجب استكمال جميع حصص اليوم قبل الاعتماد.");
}
function assertAutoReservePlannedCapacity(date,selected){
  // Preserve manual assignments and all other weekdays; replace today's auto
  // rows with the final proposed set to avoid double counting during approval.
  const weekly=new Map(),daily=new Map(),slots=new Set(),wr=weekRange(date);
  for(const a of state.assignments){
    if(a.status==="ملغي"||!a.assignedTeacherId)continue;
    if(a.date===date&&a.manual!==true)continue;
    const id=String(a.assignedTeacherId);
    if(a.date===date)daily.set(id,(daily.get(id)||0)+1);
    if(a.date>=wr.start&&a.date<=wr.end)weekly.set(id,(weekly.get(id)||0)+1);
  }
  for(const entry of selected){
    const a=state.assignments.find(x=>String(x.id)===String(entry.id));
    const id=String(entry.teacherId||"");
    if(!id||!a)throw new Error("يجب إسناد معلمة لكل حصة قبل الاعتماد.");
    const t=teacherOf(id),mode=a.fullCadreEnabled===true;
    const reason=reserveAutoIneligibility(id,date,a.className,a.id,mode,true);
    if(reason)throw new Error(reason);
    if(isAbsent(id,date)||breastfeedingBlocked(t,date,a.period))
      throw new Error("تعذر التكليف بسبب الغياب أو قيد ساعة الرضاعة.");
    if(!reserveAutoIsSupport(t)&&(!scheduleOf(id)||regularCell(id,date,a.period)))
      throw new Error("تعارض مع الحصص الأصلية أو النشاط.");
    if(assignmentsOn(date).some(x=>x.manual===true&&String(x.assignedTeacherId)===id&&Number(x.period)===Number(a.period)))
      throw new Error("احتياط يدوي وآلي متزامنان للمعلمة نفسها.");
    const key=id+"|"+Number(a.period);
    if(slots.has(key))throw new Error("لا يجوز احتياطان متزامنان للمعلمة نفسها.");
    slots.add(key);
    const dc=(daily.get(id)||0)+1,wc=(weekly.get(id)||0)+1;
    if(dc>reserveAutoDailyAllowance(id,date))throw new Error("تجاوز السقف اليومي ٥/٤.");
    if(wc>reserveAutoWeeklyAllowance(id))throw new Error("تجاوز السقف الأسبوعي ٢٢/٢٤ أو قيد احتياط فردي.");
    daily.set(id,dc);weekly.set(id,wc);
  }
}
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

// Five-stage full-cadre and protected below-20 normal-mode nomination.
function candidateRanking(date,period,absentTeacherId,exceptAssignmentId="",opts={}){
  const fullCadre=state.autoAllNames!==false,targetClass=clean(opts.className||"");
  const usedPrimary=opts.usedPrimary||new Set(),wr=weekRange(date);
  const specialNames=["أفراح الجدعاني","نجوى الغامدي","عايدة الصاعدي","بدرية الحربي","عواطف الحربي","عبير المولد"];
  const candidates=[],seen=new Set();
  for(const t of [...state.teachers,...MANUAL_SUPPORT_STAFF]){
    const id=String(t.id),name=normName(t.name);
    if(t.active===false||seen.has(name)||id===String(absentTeacherId))continue;
    seen.add(name);
    if(reserveAutoIneligibility(id,date,targetClass,exceptAssignmentId,fullCadre))continue;
    if(isAbsent(id,date)||breastfeedingBlocked(t,date,period))continue;
    const support=reserveAutoIsSupport(t);
    if(!support&&(!scheduleOf(id)||regularCell(id,date,period)))continue;
    if(occupiedByReserve(id,date,period,exceptAssignmentId))continue;
    if(reserveDailyAssignedCount(id,date,exceptAssignmentId)>=reserveAutoDailyAllowance(id,date))continue;
    const original=Number(t.workload||0),reserved=reserveAutoWeeklyCount(id,date,exceptAssignmentId);
    const duty=t.excluded===true||teacherFlags(t).permanentExcluded||
      t.additionallyAssigned===true||t.hasAdditionalDuty===true;
    const prev=state.absences.some(a=>String(a.teacherId)===id&&a.date===reserveAutoPreviousSchoolDate(date));
    const absentWeek=state.absences.some(a=>String(a.teacherId)===id&&a.date>=wr.start&&a.date<=wr.end);
    const matchDay=!!targetClass&&!support&&(scheduleOf(id)?.timetable?.[dayKey(date)]||[])
      .some(v=>parseScheduleValue(v).className===targetClass);
    const matchWeek=!!targetClass&&!support&&teacherHasClass(id,targetClass);
    const specialIndex=specialNames.findIndex(n=>normName(n)===name);
    const phase=support?5:specialIndex>=0?3:
      original<20&&!duty?1:original===20&&(prev||absentWeek)?2:4;
    candidates.push({teacherId:id,name:t.name,workload:original,week:reserved,under20:original+reserved<20,
      phase,specialIndex,duty,prev,absentWeek,matchDay,matchWeek,used:usedPrimary.has(id),supportStaff:support});
  }
  candidates.sort((a,b)=>{
    if(fullCadre)return a.phase-b.phase||
      (a.phase===3?a.specialIndex-b.specialIndex:0)||
      (a.phase===2?Number(b.prev)-Number(a.prev):0)||
      (a.phase===4?Number(b.under20)-Number(a.under20):0)||
      (a.phase===4?Number(a.duty)-Number(b.duty):0)||
      a.workload-b.workload||Number(a.used)-Number(b.used);
    return Number(b.under20)-Number(a.under20)||
      Number(a.duty)-Number(b.duty)||
      Number(b.matchDay)-Number(a.matchDay)||
      Number(b.matchWeek)-Number(a.matchWeek)||
      a.workload-b.workload||
      Number(b.prev)-Number(a.prev)||
      Number(b.absentWeek)-Number(a.absentWeek)||
      Number(a.used)-Number(b.used);
  });
  return candidates.slice(0,Math.max(1,Number(opts.limit||200))).map((x,i)=>({...x,score:i+1}));
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
  .reserve-public-card-stack{display:grid;gap:12px}
  .reserve-public-card{border:1px solid #dbe5e7;border-radius:15px;background:#fff;overflow:hidden;min-width:0;box-shadow:0 3px 12px rgba(11,48,71,.035)}
  .reserve-public-card>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:70px;padding:16px 18px;user-select:none}
  .reserve-public-card>summary::-webkit-details-marker{display:none}
  .reserve-public-card>summary::after{content:"⌄";margin-right:auto;color:#0f5f59;font-size:26px;font-weight:700;line-height:1}
  .reserve-public-card[open]>summary::after{content:"⌃"}
  .reserve-public-card>summary strong{color:#0b3047;font-size:17px}
  .reserve-public-card>summary span{font-size:12px;color:#627980}
  .reserve-public-card>summary:focus-visible{outline:3px solid #0f5f59;outline-offset:-3px}
  .reserve-public-card[open]>summary{border-bottom:1px solid #e3e9eb;background:#f8fbfb}
  .reserve-public-card-content{padding:15px;min-width:0}
  @media(max-width:760px){.reserve-public-card>summary{display:grid;grid-template-columns:1fr auto}.reserve-public-card>summary strong{font-size:15px}.reserve-public-card>summary span{grid-row:2}.reserve-public-card>summary::after{grid-column:2;grid-row:1/3}}
  @media print{.reserve-public-card-content{display:block!important}.reserve-public-card{break-inside:avoid}.reserve-public-card:not([open]) .reserve-public-card-content{display:block!important}}
  .reserve-excellence{display:grid;gap:10px}
  .reserve-bundle-course{display:grid;gap:9px;margin:12px 0;padding:15px;background:#f6fbfa;border:1px solid #bcdad6;border-radius:12px}
  .reserve-bundle-course>strong{color:#104e5b;font-size:15px}
  .reserve-bundle-course label{display:grid;gap:7px;font-weight:800;color:#284954}
  .reserve-bundle-course input{max-width:100%;box-sizing:border-box;padding:10px;border:1px solid #bed3d5;border-radius:8px;font:inherit}
  .reserve-bundle-feedback{color:#185c60;font-weight:700;min-height:18px}
  #reserveNotifyPanel{margin-top:0}
  #dailyReserveRoot .reserve-admin-stack{display:grid;gap:12px;margin-top:15px;min-width:0}
  #dailyReserveRoot .reserve-admin-fold,#dailyReserveRoot .reserve-work-fold{
    background:#fff;border:1px solid #d7e4e5;border-radius:14px;overflow:hidden;min-width:0;
    box-shadow:0 3px 12px rgba(11,48,71,.04);padding:0
  }
  #dailyReserveRoot .reserve-admin-fold>summary,#dailyReserveRoot .reserve-work-fold>summary{
    display:flex;gap:12px;align-items:center;flex-wrap:wrap;min-height:62px;
    cursor:pointer;list-style:none;padding:14px 16px;color:#0b3047
  }
  #dailyReserveRoot .reserve-admin-fold>summary::-webkit-details-marker,
  #dailyReserveRoot .reserve-work-fold>summary::-webkit-details-marker{display:none}
  #dailyReserveRoot .reserve-admin-fold>summary::after,
  #dailyReserveRoot .reserve-work-fold>summary::after{content:"⌄";margin-right:auto;color:#0f5f59;font-size:25px}
  #dailyReserveRoot .reserve-admin-fold[open]>summary::after,
  #dailyReserveRoot .reserve-work-fold[open]>summary::after{content:"⌃"}
  #dailyReserveRoot .reserve-admin-fold>summary strong,#dailyReserveRoot .reserve-work-fold>summary strong{font-size:16px}
  #dailyReserveRoot .reserve-admin-fold>summary span{color:#60757c;font-size:12px;overflow-wrap:anywhere}
  #dailyReserveRoot .reserve-work-fold>summary small{display:block;flex-basis:100%;color:#64777f;font-size:12px}
  #dailyReserveRoot .reserve-admin-fold[open]>summary,#dailyReserveRoot .reserve-work-fold[open]>summary{background:#f7fbfa;border-bottom:1px solid #e2eaeb}
  #dailyReserveRoot .reserve-fold-body,#dailyReserveRoot .reserve-work-content{padding:14px 16px;min-width:0}
  #dailyReserveRoot .reserve-work-accordions{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}
  #dailyReserveRoot .reserve-work-content>.surface,#dailyReserveRoot .reserve-work-content>.reserve-grid{margin:0}
  #dailyReserveRoot .reserve-workspace-sharing,#dailyReserveRoot #reserveWorkspaceNotify{display:none!important}
  #dailyReserveRoot .reserve-admin-sync{font-size:12px;color:#24675e;background:#eef7f4;padding:11px;border:1px solid #cfe2dc;border-radius:9px}
  #dailyReserveRoot .reserve-admin-sync[data-state="busy"]{color:#805b24;background:#fff8e9;border-color:#ecddb7}
  #dailyReserveRoot .reserve-admin-sync[data-state="error"]{color:#a23d36;background:#fff3f0;border-color:#f2d2c9}
  #dailyReserveRoot .reserve-delete-notice{padding:13px 15px;border:1px solid #d7e4e5;border-radius:11px;background:#f6fbfa;color:#19565e;font-weight:800;line-height:1.8}
  #dailyReserveRoot .reserve-delete-notice[hidden]{display:none!important}
  #dailyReserveRoot .reserve-delete-notice[data-state="busy"]{background:#fff9ed;color:#77551d;border-color:#efd9aa}
  #dailyReserveRoot .reserve-delete-notice[data-state="success"]{background:#edf8f2;color:#236344;border-color:#b9dec9}
  #dailyReserveRoot .reserve-delete-notice[data-state="error"]{background:#fff2ef;color:#994539;border-color:#efc3bb}
  #dailyReserveRoot #reserveManualMsg:not(:empty),#dailyReserveRoot #reserveDayMsg:not(:empty){display:block;margin-top:10px;padding:11px 12px;border:1px solid #d1dfdc;border-radius:9px;background:#f7fbfa;line-height:1.7;font-weight:700}
  #dailyReserveRoot #reserveManualMsg[data-deletion-state="busy"],#dailyReserveRoot #reserveDayMsg[data-deletion-state="busy"]{background:#fff9ed;color:#77551d;border-color:#efd9aa}
  #dailyReserveRoot #reserveManualMsg[data-deletion-state="success"],#dailyReserveRoot #reserveDayMsg[data-deletion-state="success"]{background:#edf8f2;color:#236344;border-color:#b9dec9}
  #dailyReserveRoot #reserveManualMsg[data-deletion-state="error"],#dailyReserveRoot #reserveDayMsg[data-deletion-state="error"]{background:#fff2ef;color:#994539;border-color:#efc3bb}
  #dailyReserveRoot .reserve-admin-fold .reserve-actions{margin-top:10px}
  #dailyReserveRoot .reserve-admin-fold .reserve-fold-body>small{color:#60757c}
  #dailyReserveRoot .reserve-admin-fold>summary:focus-visible,#dailyReserveRoot .reserve-work-fold>summary:focus-visible{outline:3px solid #80bab0;outline-offset:-3px}
  @media(max-width:760px){#dailyReserveRoot .reserve-admin-fold>summary,#dailyReserveRoot .reserve-work-fold>summary{padding:13px;min-height:58px}
  #dailyReserveRoot .reserve-admin-fold>summary strong,#dailyReserveRoot .reserve-work-fold>summary strong{font-size:14px}
  #dailyReserveRoot .reserve-admin-fold .reserve-fold-body,#dailyReserveRoot .reserve-work-fold .reserve-work-content{padding:12px}}
  .reserve-notify-queue{border:1px solid #9ecfc7;background:#f0f9f7;padding:12px;border-radius:10px;margin:12px 0}
  .reserve-phonebook-admin{margin-top:18px;border-top:1px solid #dce6e5;padding-top:12px}
  .reserve-phonebook-admin summary{cursor:pointer;font-weight:900;color:#0c5262;margin-bottom:10px}
  #reserveNotifyPanel .reserve-teacher-row{display:grid;gap:7px}
  #reserveNotifyPanel .reserve-teacher-row .reserve-actions{display:flex;gap:7px;flex-wrap:wrap}
  #reserveNotifyPanel .reserve-mini{min-height:35px}
  /* Merit styling: highlight the full heading row on desktop, never a vertical rank column. */
  .reserve-excellence .reserve-table thead tr{background:linear-gradient(100deg,#0b4854 0%,#0d5e66 55%,#177e75 100%)}
  .reserve-excellence .reserve-table thead th{background:transparent;color:#fff;border-bottom:1px solid #70bbb3;border-inline-end:1px solid rgba(255,255,255,.16);padding-top:13px;padding-bottom:13px}
  .reserve-excellence .reserve-table thead th:last-child{border-inline-end:0}
  /* On phones 'المركز' is a horizontal labelled row inside each teacher's card. */
  @media(max-width:760px){
    #dailyReserveRoot .reserve-excellence .reserve-table tbody td:first-child{background:linear-gradient(105deg,#e4f4f2,#eff9f7);color:#0c5360;border:1px solid #b8d9d5;border-radius:9px;padding:11px 12px;margin-bottom:5px}
    #dailyReserveRoot .reserve-excellence .reserve-table tbody td:first-child::before{color:#0d6270}
  }
  .reserve-pdf-sheet{direction:rtl;font-family:Tahoma,Arial,sans-serif;background:#fff;color:#173745;padding:20px;box-sizing:border-box}
  .reserve-pdf-sheet h2{font-size:20px;margin:0 0 5px;color:#0b3047}
  .reserve-pdf-sheet .reserve-pdf-meta{margin-bottom:15px;color:#516b73;font-size:12px}
  .reserve-pdf-sheet table{width:100%;border-collapse:collapse;font-size:11px;table-layout:auto}
  .reserve-pdf-sheet thead{display:table-header-group}
  .reserve-pdf-sheet tr{break-inside:avoid}
  .reserve-pdf-sheet th,.reserve-pdf-sheet td{border:1px solid #c8d6d9;padding:7px 6px;text-align:center;overflow-wrap:anywhere}
  .reserve-pdf-sheet th{background:#ecf5f3;color:#0b3047}
  .reserve-pdf-sheet .reserve-pdf-footer{font-size:11px;margin-top:12px;border-top:1px solid #cbd9dc;padding-top:9px}
  .reserve-share-box{margin:10px 0 14px;padding:12px;border:1px solid #c8dcd6;border-radius:12px;background:#f7fbfa}
  .reserve-share-box .reserve-actions{margin-top:9px}
  .reserve-share-box small{display:block;color:#60757c;margin-top:6px}
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
  .reserve-date-picker-label{display:inline-flex;align-items:center;gap:7px;font-size:12px;color:#516b73}
  .reserve-date-picker{width:135px;max-width:100%;border:1px solid #d0dcdf;border-radius:8px;padding:6px;background:#fff;color:#123943;font:inherit}
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
  const daily=dailyPublicationRows(date);
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
  const groupedAck=reserveBundleFromQuery();
  const ack=!groupedAck.length&&ackToken?state.assignments.find(x=>x.ackToken===ackToken&&x.published===true):null;
  return `<div id="dailyReserveRoot">
    <section class="page-intro"><div>
      <span class="kicker">منجز</span>
      <h2>الاحتياط اليومي</h2>
      <p>جدول الاحتياط المعتمد والحسبة الأسبوعية التراكمية للمعلمات</p>
    </div></section>

    ${groupedAck.length?reserveBundleHTML(groupedAck):""}
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

    <section class="surface panel reserve-main-toolbar reserve-no-print">
      <div class="panel-head"><h3>عرض الاحتياط</h3><span>${esc(dayName(date))} — ${esc(fmtDate(date))}</span></div>
      ${hijriDateControl("reservePublicDate",date)}
      <div class="form-actions" style="margin-top:10px">
        <button class="btn btn-ghost" type="button" id="reservePrint">طباعة الجدول</button>
        <button class="btn btn-primary" type="button" id="reservePublish">جدول النشر</button>
        <button class="btn btn-ghost" type="button" id="reserveAdminOpen">دخول الإدارة</button>
      </div>
    </section>

    <div class="reserve-public-card-stack">
      <details id="reservePublicCardDaily" class="reserve-public-card" data-reserve-public-card="daily" ${state.publicOpenCards?.includes("daily")?"open":""}>
        <summary><strong>جدول حصص الاحتياط اليومي</strong><span>عرض التكليفات والاطلاع والموضوع</span></summary>
        <div class="reserve-public-card-content">
          <p class="reserve-public-note">يمكن تأكيد الاطلاع وتسجيل موضوع الحصة من الجدول، أو من رابط النموذج الشخصي الذي ترسله الإدارة.</p>
          <div class="reserve-table-wrap">
            <table class="reserve-table"><thead><tr><th>الحصة</th><th>الفصل</th><th>المعلمة الغائبة</th><th>معلمة الاحتياط</th><th>حالة الاطلاع</th><th>التفعيل</th></tr></thead>
            <tbody id="reservePublicDayBody">${publicDayRowsHTML(date)}</tbody></table>
          </div>
        </div>
      </details>

      <details id="reservePublicCardStatistics" class="reserve-public-card" data-reserve-public-card="stats" ${state.publicOpenCards?.includes("stats")?"open":""}>
        <summary><strong>إحصائيات حصص الاحتياط</strong><span>يومي وأسبوعي وشهري هجري وتراكمي</span></summary>
        <div class="reserve-public-card-content">
          <div class="panel-head"><h3>الإحصائيات اليومية والأسبوعية والشهرية</h3><span>${esc(fmtDate(wr.start))} – ${esc(fmtDate(wr.end))}</span></div>
          <p class="reserve-public-note" id="reserveStatPeriodLabel">الاحتساب حتى: ${esc(fmtDate(date))} | الأسبوع: ${esc(fmtDate(wr.start))} – ${esc(fmtDate(wr.end))} | الشهر الهجري: ${esc(reserveHijriMonthTitle(date))}</p>
          <div class="reserve-no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0">
            <button class="reserve-tab ${state.statsWeekShift===-7?"":"active"}" type="button" data-week-shift="0">الأسبوع الحالي</button>
            <button class="reserve-tab ${state.statsWeekShift===-7?"active":""}" type="button" data-week-shift="-7">الأسبوع السابق</button>
          </div>
          <div id="reserveWeeklyHolder">${weeklyTableHTML(rows,date)}</div>
          <p class="reserve-public-note">الأرقام من الحصص المعتمدة في جدول النشر، دون تكرار الحصص.</p>
        </div>
      </details>

      <details id="reservePublicCardExcellence" class="reserve-public-card" data-reserve-public-card="excellence" ${state.publicOpenCards?.includes("excellence")?"open":""}>
        <summary><strong>لوحة التميز في تسديد الاحتياط</strong><span>ترتيب أسبوعي يبدأ من جديد كل أحد</span></summary>
        <div class="reserve-public-card-content">
          <p class="reserve-public-note">الأكثر حصصًا في الأسبوع أولًا، ثم من أكملت الاطلاع والموضوع. عند تطابق المعايير يُمنح المركز نفسه.</p>
          <div id="reserveExcellenceHolder">${excellenceTableHTML(date)}</div>
        </div>
      </details>
    </div>
    <section id="reserveAdminMount" class="reserve-no-print"></section>
  </div>`;
}
function weeklyTableHTML(rows,referenceDate){
  return `<div class="reserve-table-wrap"><table class="reserve-table"><thead><tr>
    <th>المعلمة</th>${DAYS.map(d=>`<th>${d[1]}</th>`).join("")}<th>حصص اليوم</th><th>تراكمي الأسبوع</th><th>تراكمي الشهر الهجري</th><th>التراكمي للفصل</th>
  </tr></thead><tbody>${rows.length?rows.map(r=>`<tr>
    <td><strong>${esc(r.teacher.name)}</strong></td>
    ${DAYS.map(d=>{
      const n=Number(r.count.days?.[d[0]]||0),st=r.count.dayState?.[d[0]]||"";
      const cls=n?(st==="ack"?"reserve-count-ack":"reserve-count-approved"):"";
      return `<td class="${cls}">${n}</td>`;
    }).join("")}
    <td><strong>${Number(r.count.daily||0)}</strong></td>
    <td><strong>${Number(r.count.week||0)}</strong></td>
    <td><strong>${Number(r.count.month||0)}</strong></td>
    <td><strong>${Number(r.count.term||0)}</strong></td>
  </tr>`).join(""):`<tr><td colspan="10">لا توجد بيانات معلمات بعد</td></tr>`}</tbody></table></div>`;
}
function excellenceRows(referenceDate){return excellenceMetrics(referenceDate)}
function excellenceTableHTML(referenceDate){
  const rows=excellenceMetrics(referenceDate);
  return `<div class="reserve-excellence">
    <div class="panel-head"><h3>المتميزات في تسديد الاحتياط</h3><span>الأسبوع: ${esc(fmtDate(weekRange(referenceDate).start))} – ${esc(fmtDate(weekRange(referenceDate).end))} | الشهر الهجري: ${esc(reserveHijriMonthTitle(referenceDate))}</span></div>
    <div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>المركز</th><th>المعلمة</th><th>حصص الأسبوع</th><th>تراكمي الشهر الهجري</th><th>تم الاطلاع</th><th>تم تفعيل الموضوع</th><th>التراكمي للفصل</th></tr></thead>
    <tbody>${rows.length?rows.map(r=>`<tr><td><strong>${r.rank}</strong></td><td>${esc(r.teacher.name)}</td><td><strong>${r.weekCount}</strong></td><td>${r.monthCount}</td><td>${r.weekAcknowledged}</td><td>${r.weekActivated}</td><td>${r.cumulativeQualified}</td></tr>`).join(""):'<tr><td colspan="7">لا توجد بيانات تميز لهذا الأسبوع</td></tr>'}</tbody></table></div>
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
// Two scoped reserve deep links. No login credentials or personal assignment tokens are shared.
function reserveDeepLink(type,date){
  const url=new URL(location.pathname,location.origin);
  url.searchParams.set(type==="publish"?"reserve_publish":"reserve_view",type==="publish"?date:"daily");
  if(type!=="publish")url.searchParams.set("reserve_date",date);
  url.hash="daily-reserve";
  return url.toString();
}
function reserveShareMessage(date){
  // One official message for both Copy and WhatsApp actions; links follow the selected date.
  return `السلام عليكم ورحمة الله وبركاته،\n\nالمعلمات الكريمات،\n\nتُفيدكم إدارة الثانوية الرابعة والتسعون – مسارات باعتماد جدول حصص الاحتياط ليوم ${dayName(date)} الموافق ${fmtDate(date)}.\n\nيرجى الاطلاع على التكليفات المسندة، وتأكيد الاطلاع وتسجيل عنوان موضوع تفعيل الحصة في الخانات المخصصة، علمًا بأن تأكيد الاطلاع وتفعيل موضوع الحصة من معايير المفاضلة في تسديد حصص الاحتياط.\n\nرابط جدول الاحتياط اليومي لتأكيد الاطلاع وتفعيل الحصص:\n${reserveDeepLink("daily",date)}\n\nرابط جدول النشر المعتمد:\n${reserveDeepLink("publish",date)}\n\nشاكرين لكم تعاونكم والتزامكم.\n\nإدارة الثانوية الرابعة والتسعون – مسارات`;
}
function bindReserveSharing(){
  // The admin body is replaced on each login/date rebuild, avoiding duplicate listeners.
  byId("reserveAdminBody")?.addEventListener("click",event=>{
    const button=event.target.closest("button[data-reserve-share-proxy],button[data-reserve-notify-proxy]");
    if(!button||button.disabled)return;
    if(button.dataset.reserveNotifyProxy){
      const operation=button.dataset.reserveNotifyProxy;
      if(operation==="start"){byId("reserveNotifyAll")?.click();return;}
      if(operation==="refresh"){byId("reserveNotifyRefresh")?.click();return;}
      if(!RESERVE_NOTIFICATION_QUEUE_ACTIONS.some(x=>x[0]===operation))return;
      // Delegate to the original handler; no duplicate recipient selection or
      // delivery-confirmation logic is introduced.
      byId("reserveNotifyContent")?.querySelector(`.reserve-notify-queue button[data-notify-queue="${operation}"]`)?.click();
      return;
    }
    const target=button.dataset.reserveShareProxy;
    if(!["reserveCopyShare","reserveWhatsAppShare","reservePreviewDailyLink","reservePreviewPublishLink"].includes(target))return;
    byId(target)?.click();
  });
  byId("reserveCopyShare")?.addEventListener("click",async()=>{
    const msg=reserveShareMessage(state.currentDate);
    try{await navigator.clipboard.writeText(msg);byId("reserveShareMsg").textContent="تم نسخ الرسالة الرسمية مع الرابطين."}
    catch(_){prompt("انسخي رسالة الاحتياط:",msg)}
  });
  byId("reserveWhatsAppShare")?.addEventListener("click",()=>{
    const url=`https://api.whatsapp.com/send?text=${encodeURIComponent(reserveShareMessage(state.currentDate))}`;
    const tab=window.open(url,"_blank","noopener,noreferrer");
    if(!tab)location.assign(url);
  });
  byId("reservePreviewDailyLink")?.addEventListener("click",()=>window.open(reserveDeepLink("daily",state.currentDate),"_blank","noopener,noreferrer"));
  byId("reservePreviewPublishLink")?.addEventListener("click",()=>window.open(reserveDeepLink("publish",state.currentDate),"_blank","noopener,noreferrer"));
}
function adminHTML(){
  return `<div class="reserve-admin-stack reserve-admin-block" id="reserveAdminPanel">
    <details class="reserve-admin-fold" id="reserveManagementCard">
      <summary><strong>إدارة الاحتياط اليومي</strong><span>${esc(state.admin?.user?.email||"حساب إداري")}</span></summary>
      <div class="reserve-fold-body">
        <div class="reserve-tabs">
          <button class="reserve-tab active" data-admin-tab="workspace">إنشاء ومتابعة الاحتياط</button>
          <button class="reserve-tab" data-admin-tab="teachers">المعلمات والجداول</button>
          <button class="reserve-tab" data-admin-tab="settings">الإعدادات</button>
          <button class="reserve-tab" id="reserveLogout">خروج</button>
        </div>
        <div id="reserveAdminAuxBody"></div>
      </div>
    </details>
    <details class="reserve-admin-fold" id="reserveShareCard" aria-label="مشاركة رابط قسم الاحتياط">
      <summary><strong>مشاركة جدول الاحتياط اليومي وجدول النشر</strong></summary>
      <div class="reserve-fold-body">
        <small>الروابط خاصة بقسم الاحتياط في «منجز» فقط. مشاركة واتساب تفتح رسالة جاهزة لا تُرسل تلقائيًا.</small>
        <div class="reserve-actions">
          <button class="reserve-mini" id="reserveCopyShare" type="button">نسخ الرسالة الرسمية والرابطين</button>
          <button class="reserve-mini" id="reserveWhatsAppShare" type="button">مشاركة عبر واتساب</button>
          <button class="reserve-mini" id="reservePreviewDailyLink" type="button">اختبار رابط الجدول اليومي</button>
          <button class="reserve-mini" id="reservePreviewPublishLink" type="button">اختبار رابط جدول النشر</button>
        </div>
        <div id="reserveShareMsg" role="status" aria-live="polite"></div>
      </div>
    </details>
    ${reserveNotificationPanelHTML()}
    <div id="reserveDeleteNotice" class="reserve-delete-notice" role="status" aria-live="polite" hidden></div>
    <div id="reserveAdminBody"></div>
    <div class="reserve-admin-sync" id="reserveAdminSyncStatus" role="status" aria-live="polite">البيانات جاهزة — يتم التحديث بعد الحفظ والحذف والتوليد.</div>
  </div>`;
}

// Task 8: same four existing sharing actions, visible in both editing modes.
// Delegate to the ORIGINAL admin controls so the message, dates and WhatsApp
// behavior have one implementation and do not diverge.
function reserveWorkspaceSharingHTML(){
  const actions=[
    ["reserveCopyShare","نسخ الرسالة الرسمية والرابطين"],
    ["reserveWhatsAppShare","مشاركة عبر واتساب"],
    ["reservePreviewDailyLink","اختبار رابط الجدول اليومي"],
    ["reservePreviewPublishLink","اختبار رابط جدول النشر"]
  ];
  return `<section class="reserve-share-box reserve-workspace-sharing reserve-admin-only" aria-label="أدوات مشاركة روابط الاحتياط">
    <strong>مشاركة روابط الاحتياط</strong>
    <div class="reserve-actions">${actions.map(([target,label])=>`<button class="reserve-mini" type="button" data-reserve-share-proxy="${target}">${label}</button>`).join("")}</div>
  </section>`;
}
function dayAdminHTML(){
  const date=state.currentDate,abs=absencesOn(date),assign=assignmentsOn(date);
  // After a verified table deletion, do not silently reselect retained shared absences.
  // Otherwise, show saved automatic-mode absences only, not the manual-mode choices.
  const selectedAutoIds=state.autoAbsentIds?.length?state.autoAbsentIds:
    state.autoAbsentSelectionResetDate===date?[]:abs.filter(a=>a.source==="auto").map(a=>a.teacherId);
  const autoSelected=new Set(selectedAutoIds.map(String));
  return `<div class="reserve-grid">
    <section class="surface form-card">
      <div class="form-section-title">الإنشاء الآلي</div>
      <p class="reserve-public-note"><strong>ضوابط التوليد:</strong> خمس حصص أصلية واحتياط للأحد والاثنين، وأربع للثلاثاء إلى الخميس؛ والسقف الأسبوعي ٢٢ للمتقدم و٢٤ للممارس. عند إيقاف الكادر الكامل تُقدَّم المرشحات دون مجموع ٢٠، وعند تفعيله تُطبق المراحل الخمس المعتمدة. <strong>دخنة الشهري ونورة الهودان مستبعدتان من الترشيح الآلي في الوضعين.</strong> لا يُعتمد الجدول قبل إسناد جميع الحصص.</p>
      ${reserveWorkspaceSharingHTML()}
      <div id="reserveWorkspaceNotify">${reserveWorkspaceNotificationHTML()}</div>
      ${hijriDateControl("reserveAdminDate",date)}
      <div class="form-grid" style="margin-top:12px">
        <label class="wide">جميع المعلمات الغائبات (اختيار متعدد)
          <select id="reserveAbsentTeacher" class="reserve-multi-select" multiple>${reserveAbsentDirectory().map(t=>`<option value="${esc(t.id)}" ${autoSelected.has(String(t.id))?"selected":""}>${esc(t.name)}</option>`).join("")}</select>
        </label>
        <label>سبب الاحتياط<select id="reserveAbsenceReason"><option>غياب</option><option>دورة</option><option>اجتماع</option><option>انتداب</option><option>تكليف خارجي</option><option>أخرى</option></select></label>
      </div>
      <div class="form-actions"><button class="btn btn-primary" id="reserveAddAbsence" type="button">تسجيل جميع الغائبات واستخراج حصصهن</button></div>

      <label class="reserve-admin-manual-toggle"><input type="checkbox" id="reserveAutoAllNames" ${state.autoAllNames!==false?"checked":""}>
        <span><strong>تفعيل الكادر الكامل:</strong> تطبيق مراحل المفاضلة الخمس وإدخال الكادر المساند أخيرًا، مع الالتزام بالحدود اليومية والأسبوعية والقيود الفردية.</span>
      </label>
      <div id="reserveDayMsg" role="status" aria-live="polite"></div>
      <div class="reserve-admin-list" style="margin-top:12px">${abs.length?abs.map(a=>`<div class="reserve-teacher-row">
        <strong>${esc(a.teacherName)}</strong><span>${esc(a.reason||"غياب")} — ${(a.periods||[]).map(p=>`ح${p.period}: ${esc(p.className)}${p.activity?" (نشاط)":""}`).join(" — ")||"لا توجد حصص مسجلة"}</span>
        <button class="reserve-mini danger reserve-delete-absence" data-id="${esc(a.id)}">حذف الغياب</button>
      </div>`).join(""):'<div class="empty-inline">لا يوجد غياب مسجل لهذا اليوم</div>'}</div>
      <div class="form-actions" style="margin-top:12px"><button class="btn btn-primary" id="reserveGenerate" type="button">توليد آلي للمعلمات المحددات</button></div>
    </section>

    <section class="surface panel">
      <div class="panel-head"><h3>توزيع الاحتياط</h3><span>${assign.length} تكليف</span></div>
      <section class="reserve-admin-warnings"><strong>مساحة تحذيرات الإسناد</strong><div id="reserveAutoWarnings">${reserveWarningsMarkup(currentReserveWarnings(date))}</div></section>
      <div id="reserveAssignmentsAdmin">${adminAssignmentsHTML(assign)}</div>
      <div class="form-actions" style="margin-top:12px">
        <button class="btn btn-primary" id="reserveApproveAuto" type="button">حفظ واعتماد جدول اليوم</button>
        <button class="reserve-mini danger" id="reserveDeleteAutoTable" type="button" aria-label="حذف جدول الإنشاء الآلي لهذا اليوم" title="حذف الجدول الآلي للتاريخ المختار">🗑 حذف الجدول</button>
      </div>
    </section>
  </div>`;
}
function manualCandidateOptions(a){
  const mode=a.fullCadreEnabled===true;
  const all=[...state.teachers,...MANUAL_SUPPORT_STAFF].filter(t=>
    !reserveAutoIneligibility(t.id,a.date,a.className,a.id,mode)&&
    !isAbsent(t.id,a.date)&&!breastfeedingBlocked(t,a.date,a.period)&&
    (reserveAutoIsSupport(t)||(scheduleOf(t.id)&&!regularCell(t.id,a.date,a.period)))&&
    !occupiedByReserve(t.id,a.date,a.period,a.id)&&
    reserveDailyAssignedCount(t.id,a.date,a.id)<reserveAutoDailyAllowance(t.id,a.date)
  ).map(t=>({teacherId:String(t.id),name:t.name}));
  if(a.assignedTeacherId&&!all.some(t=>t.teacherId===String(a.assignedTeacherId)))
    all.unshift({teacherId:String(a.assignedTeacherId),name:a.assignedTeacherName||"المكلفة سابقًا"});
  return all;
}
function adminAssignmentsHTML(items){
  if(!items.length)return '<div class="empty-inline">اختاري الغائبات ثم اضغطي «توليد آلي» لإنشاء التكليفات دفعة واحدة.</div>';
  return `<div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>الحصة</th><th>الفصل</th><th>سبب الاحتياط</th><th>الغائبة</th><th>المرشحة آليًا</th><th>المكلفة (يمكن تغييرها)</th><th>التفعيل</th><th>الإجراءات</th></tr></thead>
  <tbody>${items.sort((a,b)=>Number(a.period)-Number(b.period)).map(a=>{
    const all=manualCandidateOptions(a);
    return `<tr data-assignment="${esc(a.id)}">
    <td>${esc(a.period)}</td><td>${esc(a.className||"—")}${a.activity?' <small>(نشاط)</small>':""}</td><td>${esc(a.reason||"غياب")}</td><td>${esc(a.absentTeacherName)}</td>
    <td>${a.candidates?.[0]?`<div class="reserve-candidate"><strong>${esc(a.candidates[0].name)}</strong></div>`:"لا توجد مرشحة مؤهلة؛ تحتاج معالجة إدارية"}</td>
    <td><select class="reserve-assignee"><option value="">اختاري المكلفة</option>${all.map(c=>`<option value="${esc(c.teacherId)}" ${String(c.teacherId)===String(a.assignedTeacherId)?"selected":""}>${esc(c.name)}</option>`).join("")}</select><button type="button" class="reserve-mini reserve-auto-unlock" aria-label="تعديل المعلمة المسددة">✎ تعديل</button><small class="reserve-source-note">تحرير إداري: جميع المعلمات والموجهات ومحضرة المختبر</small></td>
    <td>${a.activationTitle?`<div><span class="reserve-status">تم التفعيل</span><br><small>${esc(a.activationTitle)}</small></div>`:(a.ackAt?'<span class="reserve-status">تم الاطلاع</span>':(a.published?'<span class="reserve-status pending">معتمد</span>':'—'))}</td>
    <td><div class="reserve-actions"><button class="reserve-mini reserve-save-assignee">تحديث وحفظ</button>${a.published?`<button class="reserve-mini reserve-copy-ack" type="button">نسخ رابط نموذج المعلمة</button><button class="reserve-mini reserve-open-ack" type="button">فتح نموذج المعلمة</button><button class="reserve-mini reserve-send-ack" type="button">إرسال إشعار</button>`:""}<button class="reserve-mini danger reserve-delete-assignment">حذف</button></div></td>
  </tr>`}).join("")}</tbody></table></div>`;
}


function workspaceHTML(){
  const sections=[
    ["manual","الإنشاء اليدوي","إدخال جميع الغائبات أولًا ثم اختيار معلمات التسديد يدويًا من القوائم المتاحة."],
    ["auto","الإنشاء الآلي","توليد الحصص وفق معايير المفاضلة المعتمدة ثم المراجعة والحفظ والاعتماد."],
    ["ranking","احتساب المفاضلة","تفاصيل الأسبوع الحالي، العدالة، النصاب، العبء، والتصحيح الإداري."],
    ["excellence","التميز في شغل الاحتياط","الحصص اليومية والأسبوعية والتراكمية وعناوين التفعيل والتصدير."]
  ];
  return `<div class="reserve-card-grid reserve-work-accordions">${sections.map(([kind,title,note])=>
    `<details class="reserve-work-fold" data-reserve-card="${kind}">
       <summary><strong>${title}</strong><small>${note}</small></summary>
       <div class="reserve-work-content"></div>
     </details>`).join("")}</div>`;
}
function renderWorkspaceCard(kind){
  const chosen=String(kind||"manual");
  const fold=[...document.querySelectorAll("details[data-reserve-card]")].find(x=>x.dataset.reserveCard===chosen);
  if(!fold)return;
  state.workspaceCard=chosen;
  document.querySelectorAll("details[data-reserve-card]").forEach(card=>{card.open=card===fold;});
  const body=fold.querySelector(".reserve-work-content");
  if(!body)return;
  if(chosen==="auto"){body.innerHTML=dayAdminHTML();bindDayAdmin();return;}
  if(chosen==="ranking"){body.innerHTML=rankingAdminHTML();bindRankingAdmin();return;}
  if(chosen==="excellence"){body.innerHTML=excellenceAdminHTML();bindExcellenceAdmin();return;}
  body.innerHTML=manualAdminHTML();bindManualAdmin();
}
function bindWorkspace(){
  document.querySelectorAll("details[data-reserve-card]").forEach(card=>
    card.addEventListener("toggle",()=>{
      if(card.open){
        if(state.workspaceCard!==card.dataset.reserveCard||
          !card.querySelector(".reserve-work-content")?.hasChildNodes()){
          renderWorkspaceCard(card.dataset.reserveCard);
        }
      }else if(state.workspaceCard===card.dataset.reserveCard)state.workspaceCard="";
    })
  );
  // All four editor cards begin collapsed; none of their operational tools is duplicated.
  state.workspaceCard="";
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
// Flexible administrative reassignment does not invoke or modify candidateRanking.
// Current nominations and source type remain immutable; only the chosen assignee changes.
function reserveFlexibleAssigneeOptions(selectedId){
  const all=manualAssigneeDirectory();
  if(selectedId&&!all.some(t=>String(t.id)===String(selectedId))){
    const previous=teacherOf(selectedId);
    if(previous)all.unshift(previous);
  }
  return `<option value="">اختاري المعلمة المسددة</option>`+all.map(t=>
    `<option value="${esc(t.id)}" ${String(t.id)===String(selectedId)?"selected":""}>${esc(t.name)}${t.supportStaff?" — التوجيه / المختبر":""}</option>`).join("");
}
function reserveUnlockAssigneeSelector(select){
  if(!select)return;
  const selected=select.value;
  const row=select.closest("[data-assignment]");
  const a=state.assignments.find(x=>String(x.id)===String(row?.dataset.assignment));
  if(a&&a.manual!==true){
    const choices=manualCandidateOptions(a);
    select.innerHTML='<option value="">اختاري المعلمة المسددة</option>'+
      choices.map(c=>`<option value="${esc(c.teacherId)}">${esc(c.name)}</option>`).join("");
  }else select.innerHTML=reserveFlexibleAssigneeOptions(selected);
  select.value=selected;
  select.disabled=false;
  select.hidden=false;
  select.focus();
}
function reserveSavedManualAssignmentsHTML(date){
  const assignments=assignmentsOn(date).filter(a=>a.manual===true&&a.published===true&&a.assignedTeacherId);
  if(!assignments.length)return '<div class="empty-inline">لا توجد تكليفات يدوية معتمدة لهذا اليوم.</div>';
  return `<div class="reserve-admin-list">${assignments.sort((a,b)=>Number(a.period)-Number(b.period)).map(a=>
    `<div class="reserve-teacher-row" data-reserve-flex-id="${esc(a.id)}">
      <strong>${esc(a.assignedTeacherName||"—")}</strong>
      <span>الحصة ${esc(a.period)} | ${esc(a.className||"—")} | بدلًا عن ${esc(a.absentTeacherName||"—")}</span>
      <div class="reserve-actions">
        <button class="reserve-mini reserve-flex-edit" type="button" aria-label="تعديل المعلمة المسددة">✎ تعديل</button>
        <select class="reserve-flex-select" aria-label="اختيار المعلمة المسددة" hidden disabled>${reserveFlexibleAssigneeOptions(a.assignedTeacherId)}</select>
        <button class="reserve-mini reserve-flex-save" type="button" hidden>حفظ التعديل</button>
      </div>
      <small class="reserve-flex-msg" role="status"></small>
    </div>`).join("")}</div>`;
}
async function reserveCommitFlexibleAssignee(recordId,teacherId){
  await ensureAdmin();
  const initial=state.assignments.find(x=>String(x.id)===String(recordId)&&x.status!=="ملغي");
  // Auto changes must consider the latest cloud assignments, including manual ones.
  if(initial&&initial.manual!==true)await loadAll();
  const a=state.assignments.find(x=>String(x.id)===String(recordId)&&x.status!=="ملغي");
  const t=teacherOf(teacherId);
  if(!a||!t||!a.date)throw new Error("تعذر العثور على التكليف أو المعلمة المسددة.");
  if(a.manual!==true){
    assertAutoAssignmentIntegrity(t.id,a.date,Number(a.period),a.id,a.className,a.fullCadreEnabled===true);
  }
  const changed=String(a.assignedTeacherId)!==String(t.id);
  const warnings=manualConflictMessages(a.date,[{
    teacherId:String(t.id),period:Number(a.period),className:a.className,existingId:String(a.id)
  }],[String(a.absentTeacherId),...absencesOn(a.date).map(x=>String(x.teacherId))]);
  const data={...plainData(a),assignedTeacherId:String(t.id),assignedTeacherName:t.name,
    fullCadreEnabled:a.fullCadreEnabled===true,
    manualOverride:changed||a.manualOverride===true||warnings.length>0,
    manualOverrideWarnings:warnings};
  // Ensure the former teacher's link cannot continue to act for reassigned work.
  if(changed){data.ackToken=uid();data.ackAt="";data.activationTitle="";data.activationAt="";}
  const result=await patchKind(K.assignment,a.id,data,token(),a.published===true?"معتمد":"مسودة");
  if(!result?.id||String(result.id)!==String(a.id))throw new Error("لم تؤكد قاعدة البيانات تحديث التكليف.");
  await loadAll();
  const persisted=state.assignments.find(x=>String(x.id)===String(a.id));
  if(!persisted||String(persisted.assignedTeacherId)!==String(t.id)||
     persisted.manual!==a.manual||persisted.published!==a.published||
     (changed&&persisted.ackToken===a.ackToken))
    throw new Error("لم يثبت حفظ تعديل المعلمة في قاعدة البيانات.");
  state.lastReserveWarnings={date:a.date,source:a.manual===true?"manual":"auto",warnings};
  return {date:a.date,warnings};
}
function bindReserveFlexibleAssignmentEditing(container){
  const node=byId(container);
  if(!node)return;
  // Persist changes to an existing manual assignment as soon as its select changes.
  // The existing save handler verifies Supabase before showing success.
  node.addEventListener("change",event=>{
    const select=event.target.closest("select.reserve-flex-select");
    const row=select?.closest("[data-reserve-flex-id]");
    const save=row?.querySelector("button.reserve-flex-save");
    if(select?.value && save && !save.hidden && !save.disabled)save.click();
  });
  node.addEventListener("click",async event=>{
    const button=event.target.closest("button.reserve-flex-edit,button.reserve-flex-save");
    if(!button)return;
    const row=button.closest("[data-reserve-flex-id]");
    const select=row?.querySelector(".reserve-flex-select");
    const message=row?.querySelector(".reserve-flex-msg");
    if(!row||!select)return;
    if(button.classList.contains("reserve-flex-edit")){
      reserveUnlockAssigneeSelector(select);
      const save=row.querySelector(".reserve-flex-save");if(save)save.hidden=false;
      if(message)message.textContent="يمكن اعتماد تغيير المعلمة حتى مع وجود تحذيرات القيود.";
      return;
    }
    if(!select.value){if(message)message.textContent="اختاري معلمة قبل الحفظ.";return;}
    button.disabled=true;
    if(message)message.textContent="جارٍ حفظ التعديل...";
    try{
      const res=await reserveCommitFlexibleAssignee(row.dataset.reserveFlexId,select.value);
      renderWorkspaceCard("manual");
      const status=byId("reserveManualMsg");if(status)status.textContent="تم الحفظ";
      try{await reserveSyncAdminMutation(res.date);}catch(error){console.error("تعذر تحديث الإشعارات بعد الحفظ",error);
        if(status)status.textContent="تم الحفظ، لكن تعذر تحديث بعض البطاقات.";}
    }catch(error){console.error("تعذر تعديل الإسناد اليدوي",error);
      if(message)message.textContent=`تعذر حفظ التعديل: ${error.message||"خطأ غير معروف"}`;
      button.disabled=false;}
  });
}
function manualTeacherLinksHTML(date){
  const groups=reservePublishedTeacherGroups(date);
  if(!groups.length)return '<div class="empty-inline">بعد اعتماد التكليفات، تظهر هنا روابط المعلمات الموحدة.</div>';
  return `<p class="reserve-public-note">لكل معلمة رسالة واحدة ورابط موحد لجميع حصصها في هذا اليوم، مع إجراء مستقل لكل حصة.</p>
    <div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>معلمة الاحتياط</th><th>عدد الحصص</th><th>الاطلاع</th><th>التفعيل</th><th>الإجراءات</th></tr></thead><tbody>
    ${groups.map(g=>`<tr data-manual-teacher="${esc(g.id)}"><td>${esc(g.name)}</td><td>${g.assignments.length}</td>
    <td>${g.assignments.filter(a=>a.ackAt).length} / ${g.assignments.length}</td>
    <td>${g.assignments.filter(a=>a.activationTitle).length} / ${g.assignments.length}</td>
    <td><div class="reserve-actions"><button type="button" class="reserve-mini reserve-manual-copy-action">نسخ رابط نموذج المعلمة</button>
    <button type="button" class="reserve-mini reserve-manual-open-action">فتح نموذج المعلمة</button>
    <button type="button" class="reserve-mini reserve-manual-send-action">إرسال إشعار</button></div></td></tr>`).join("")}
    </tbody></table></div>`;
}
function manualAdminHTML(){
  const date=state.currentDate;
  const selected=(state.manualAbsentIds||[]).map(String);
  return `<section class="surface form-card reserve-admin-only">
    <div class="form-section-title">الإنشاء اليدوي</div>
    ${reserveWorkspaceSharingHTML()}
    <div id="reserveWorkspaceNotify">${reserveWorkspaceNotificationHTML()}</div>
    <p class="reserve-source-note">المرجع الوحيد: جدول الحصص — الإصدار السادس، 27/04/1448هـ (39 معلمة)</p>
    <p class="reserve-public-note">اختاري جميع المعلمات الغائبات أولًا. بعد ذلك يظهر جدول جميع حصصهن، ويجب تسديد كل حصة قبل الحفظ.</p>
    ${hijriDateControl("reserveManualDate",date)}
    <div class="form-grid" style="margin-top:12px">
      <label class="wide">جميع المعلمات الغائبات
        <select id="reserveManualAbsent" class="reserve-multi-select" multiple>
          ${reserveAbsentDirectory().map(t=>`<option value="${esc(t.id)}" ${selected.includes(String(t.id))?"selected":""}>${esc(t.name)}</option>`).join("")}
        </select>
      </label>
    </div>
    <label class="reserve-admin-manual-toggle"><input id="reserveManualAllNames" type="checkbox" ${state.manualAllNames?"checked":""}>
      <span><strong>تحرير يدوي شامل:</strong> إظهار جميع المعلمات (حتى المستثنيات والغائبات) والموجهات الطلابيات ومحضرة المختبر في قوائم التسديد. سيظهر تحذير عند التعارض.</span>
    </label>
    <div class="form-actions">
      <button class="btn btn-primary" id="reserveManualBuild" type="button">إظهار جدول التسديد الكامل</button>
      <button class="reserve-mini danger" id="reserveDeleteManualTable" type="button" aria-label="حذف جدول الإنشاء اليدوي لهذا اليوم" title="حذف الجدول اليدوي للتاريخ المختار">🗑 حذف الجدول</button>
    </div>
    <div id="reserveManualMsg" role="status" aria-live="polite"></div>
    <section class="reserve-admin-warnings"><strong>مساحة تحذيرات الإسناد</strong><div id="reserveManualWarnings">${reserveWarningsMarkup(currentReserveWarnings(date))}</div></section>
    <div id="reserveManualRows" style="margin-top:12px"></div>
    <section class="surface panel" style="margin-top:16px">
      <div class="panel-head"><h3>بطاقات المعلمات المسددات – تعديل التكليفات اليدوية المحفوظة</h3></div>
      <div id="reserveSavedManualAssignments">${reserveSavedManualAssignmentsHTML(date)}</div>
    </section>
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
      <td><div class="reserve-actions"><select class="reserve-manual-assignee"><option value="">اختاري معلمة التسديد</option>${r.candidates.map(t=>`<option value="${esc(t.id)}" ${String(t.id)===r.existingTeacherId?"selected":""}>${esc(t.name)}${t.supportStaff?" — التوجيه / المختبر":""}</option>`).join("")}</select>
      <button type="button" class="reserve-mini reserve-manual-unlock" aria-label="تعديل المعلمة المسددة">✎ تعديل</button></div></td>
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
  });
  slotUse.forEach((n,key)=>{
    if(n>1){
      const [id,p]=key.split("|"),t=teacherOf(id);
      warnings.push(`${t?.name||"معلمة"}: تم اختيارها لأكثر من فصل في الحصة ${p}.`);
    }
  });
  return [...new Set(warnings)];
}
// Task 6: scoped table deletion, with post-write verification before success feedback.
// Shared absences belonging to the other creation mode are never deleted.
function reserveTableDeleteNotice(mode,phase,detail=""){
  const messages={busy:"جارٍ الحذف...",success:"تم الحذف بنجاح",error:"تعذر الحذف"};
  const label=messages[phase]||detail;
  const message=detail?label+" — "+detail:label;
  const local=byId(mode==="manual"?"reserveManualMsg":"reserveDayMsg");
  if(local){local.dataset.deletionState=phase;local.textContent=message;}
  const global=byId("reserveDeleteNotice");
  if(global){global.hidden=false;global.dataset.state=phase;global.textContent=message;}
}
async function reserveDeleteTableForDate(mode,date){
  if(mode!=="auto"&&mode!=="manual")throw new Error("نوع الجدول غير صحيح");
  await ensureAdmin();
  const isTarget=a=>mode==="manual"?a.manual===true:a.manual!==true;
  const original=assignmentsOn(date).filter(isTarget);
  const absentCandidates=absencesOn(date).filter(a=>a.source===mode);
  if(!original.length&&!absentCandidates.length)return {deleted:0,empty:true};
  for(const record of original)await deleteKind(K.assignment,record.id,token());
  await loadAll();
  if(assignmentsOn(date).some(isTarget))throw new Error("لم يكتمل حذف التكليفات؛ أعيدي المحاولة");
  let removedAbsences=0;
  const obsoleteAbsences=absencesOn(date).filter(a=>a.source===mode&&
    !assignmentsOn(date).some(x=>String(x.absentTeacherId)===String(a.teacherId)));
  for(const absence of obsoleteAbsences){
    await deleteKind(K.absence,absence.id,token());removedAbsences++;
  }
  await loadAll();
  if(obsoleteAbsences.some(a=>absencesOn(date).some(x=>String(x.id)===String(a.id))))
    throw new Error("تعذر التحقق من حذف الغياب المرتبط بالجدول");
  let syncWarning=false;
  try{await reserveSyncAdminMutation(date)}
  catch(error){
    // Persistence and read-back checks succeeded; a secondary panel refresh
    // must not turn an actual deletion into a false deletion failure.
    console.error("تعذر تحديث اللوحات بعد التحقق من الحذف",error);
    syncWarning=true;
  }
  return {deleted:original.length+removedAbsences,empty:false,syncWarning};
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
  if(missing||selections.length!==rows.length||selections.some(x=>!teacherOf(x.teacherId))){
    msg.textContent="يجب اختيار معلمة معتمدة لكل حصة قبل الحفظ.";return;
  }
  const warnings=manualConflictMessages(date,selections,absentIds);
  // Administration explicitly allows all rule warnings to be overridden.
  // Never block saving completed substitutions; keep an audit trail.
  const saveButton=byId("reserveManualSave");
  if(saveButton?.disabled)return;
  if(saveButton){saveButton.disabled=true;saveButton.textContent="جارٍ الحفظ...";}
  msg.textContent="جارٍ الحفظ... يتم حفظ واعتماد الجدول اليدوي.";
  try{
    await ensureAdmin();
    for(const id of absentIds){
      const t=teacherOf(id),s=scheduleOf(id),cells=s?.timetable?.[dayKey(date)]||[];
      const periods=cells.map((v,i)=>{const p=parseScheduleValue(v);return {period:i+1,className:p.className,activity:p.activity}}).filter(x=>x.className);
      let abs=absencesOn(date).find(a=>String(a.teacherId)===String(id));
      if(!abs)await insertKind(K.absence,{date,dayKey:dayKey(date),teacherId:String(id),teacherName:t?.name||"",reason:"غياب",periods,source:"manual",createdAt:new Date().toISOString()},token());
    }
    await loadAll();
    const savedAssignments=[];
    for(const x of selections){
      const t=teacherOf(x.teacherId);
      const existing=existingSlotAssignment(date,x.absent.id,x.period);
      const data={
        date,dayKey:dayKey(date),period:Number(x.period),className:x.className,activity:x.activity===true,reason:"غياب",
        absentTeacherId:String(x.absent.id),absentTeacherName:x.absent.name,
        candidates:[],assignedTeacherId:String(t.id),assignedTeacherName:t.name,
        published:true,status:"معتمد",manual:existing?existing.manual===true:true,
        source:existing?.source||(existing?.manual===false?"auto":"manual"),
        manualOverride:warnings.length>0||existing?.manualOverride===true,
        manualOverrideWarnings:warnings.slice(0,70),
        ackToken:(existing&&String(existing.assignedTeacherId)!==String(t.id))?uid():(existing?.ackToken||uid()),
        ackAt:existing?.assignedTeacherId===String(t.id)?(existing.ackAt||""):"",
        activationTitle:existing?.assignedTeacherId===String(t.id)?(existing.activationTitle||""):"",
        activationAt:existing?.assignedTeacherId===String(t.id)?(existing.activationAt||""):"",
        updatedAt:new Date().toISOString()
      };
      const saved=existing?await patchKind(K.assignment,existing.id,data,token(),"معتمد"):
        await insertKind(K.assignment,data,token(),"معتمد");
      if(!saved?.id)throw new Error("قاعدة البيانات لم تؤكد حفظ إحدى الحصص.");
      savedAssignments.push({id:String(saved.id),teacherId:String(t.id),manual:data.manual});
    }
    await loadAll();
    if(savedAssignments.some(entry=>!state.assignments.some(a=>
      String(a.id)===entry.id&&String(a.assignedTeacherId)===entry.teacherId&&
      a.manual===entry.manual&&a.published===true)))
      throw new Error("لم يكتمل التحقق من حفظ جميع التكليفات؛ بعض الحصص لم تُعتمد.");
    state.currentDate=date;
    state.lastReserveWarnings={date,source:"manual",warnings};
    renderWorkspaceCard("manual");
    const done=byId("reserveManualMsg");
    if(done)done.textContent="تم الحفظ";
    showReserveWorkspaceWarnings("reserveManualWarnings",warnings);
    // A notification refresh must never turn a verified successful save into
    // a false 'save failed' message; report synchronization failures distinctly.
    try{await reserveSyncAdminMutation(date)}
    catch(syncError){console.error("تعذر تحديث العرض بعد حفظ الجدول اليدوي",syncError);
      if(done)done.textContent="تم الحفظ، لكن تعذر تحديث بعض البطاقات. أعيدي فتح القسم.";}
  }catch(err){console.error(err);const current=byId("reserveManualMsg")||msg;
    if(current)current.textContent=`تعذر إكمال الحفظ أو التحقق منه: ${err.message||"خطأ غير معروف"}. قد تكون بعض الحصص محفوظة.`;}
  finally{if(saveButton?.isConnected){saveButton.disabled=false;saveButton.textContent="حفظ";}}
}
function bindManualAdmin(){
  bindHijriDateControl("reserveManualDate",next=>syncReserveSectionDate(next));
  bindReserveFlexibleAssignmentEditing("reserveSavedManualAssignments");
  byId("reserveManualRows")?.addEventListener("click",event=>{
    const button=event.target.closest(".reserve-manual-unlock");
    if(button)reserveUnlockAssigneeSelector(button.closest("[data-manual-row]")?.querySelector(".reserve-manual-assignee"));
  });
  byId("reserveDeleteManualTable")?.addEventListener("click",async()=>{
    const date=state.currentDate,msg=byId("reserveManualMsg"),button=byId("reserveDeleteManualTable");
    if(button.disabled)return;
    const count=assignmentsOn(date).filter(a=>a.manual===true).length;
    const absences=absencesOn(date).filter(a=>a.source==="manual").length;
    if(!count&&!absences){msg.textContent="لا يوجد جدول يدوي لحذفه.";return;}
    if(!confirm(`هل تريدين حذف جدول الإنشاء اليدوي ليوم ${dayName(date)} الموافق ${fmtDate(date)}؟\nسيُحذف ${count} تكليف يدوي مع سجلات الغياب اليدوية غير المستخدمة.\nستبقى التكليفات الآلية والجداول الأخرى محفوظة.`))return;
    button.disabled=true;button.textContent="جارٍ الحذف...";button.setAttribute("aria-busy","true");
    reserveTableDeleteNotice("manual","busy","جدول الإنشاء اليدوي — "+fmtDate(date));
    try{
      const result=await reserveDeleteTableForDate("manual",date);
      // Clear draft selections only after verified deletion, before re-rendering.
      if(state.currentDate===date){
        state.manualAbsentIds=[];
        state.manualRows=[];
        if(state.lastReserveWarnings?.date===date&&state.lastReserveWarnings.source==="manual")state.lastReserveWarnings=null;
      }
      renderWorkspaceCard("manual");
      reserveTableDeleteNotice("manual","success",result.syncWarning?
        "حُذف الجدول وتأكد حفظ التغيير، لكن تعذر تحديث بعض البطاقات.":
        "جدول الإنشاء اليدوي — "+fmtDate(date));
    }catch(err){
      console.error("تعذر حذف جدول الاحتياط اليدوي",err);
      reserveTableDeleteNotice("manual","error","لم يكتمل التحقق من الحذف؛ قد تكون بعض السجلات حُذفت. "+(err?.message||"أعيدي المحاولة."));
    }finally{
      const next=byId("reserveDeleteManualTable");
      if(next){next.disabled=false;next.textContent="حذف الجدول";next.removeAttribute("aria-busy");}
    }
  });
  byId("reserveManualTeacherLinks")?.addEventListener("click",async event=>{
    const b=event.target.closest(".reserve-manual-copy-action,.reserve-manual-open-action,.reserve-manual-send-action");
    if(!b)return;
    const tr=b.closest("[data-manual-teacher]");
    const group=reservePublishedTeacherGroups(state.currentDate).find(g=>g.id===tr?.dataset.manualTeacher);
    if(!group)return;
    const url=reserveTeacherBundleUrl(group);
    if(b.classList.contains("reserve-manual-send-action")){reserveOpenWhatsapp(group);return;}
    if(b.classList.contains("reserve-manual-open-action")){
      const win=window.open(url,"_blank","noopener,noreferrer");
      if(!win)alert("اسمحي بفتح النوافذ لمعاينة النموذج.");return;
    }
    await reserveCopyText(url);
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

// Leadership ranking is derived exclusively from "جدول النشر" canonical rows.
// New weeks start Sunday; history and term totals are not deleted.
function excellenceMetrics(referenceDate){
  const wr=weekRange(referenceDate),start=termStart()||COUNT_START;
  const countStart=state.settings?.countStart||COUNT_START;
  const weekItems=publicationAssignmentsUntil(referenceDate,wr.start);
  const termItems=publicationAssignmentsUntil(referenceDate,start>countStart?start:countStart);
  const counts=assignmentCounts(referenceDate);
  const byTeacher=new Map();
  const ensure=id=>{
    const key=String(id);
    if(!byTeacher.has(key))byTeacher.set(key,{
      teacher:teacherOf(key),weekAssignments:[],allAssignments:[],daily:{},titles:[],
      weekAcknowledged:0,weekActivated:0,weekBoth:0
    });
    return byTeacher.get(key);
  };
  weekItems.forEach(a=>{
    const x=ensure(a.assignedTeacherId);
    if(!x.teacher)return;
    x.weekAssignments.push(a);
    (x.daily[a.date]??=[]).push(a);
    const ack=!!clean(a.ackAt),topic=!!clean(a.activationTitle);
    if(ack)x.weekAcknowledged++;
    if(topic){x.weekActivated++;x.titles.push(`${dayName(a.date)}: ${a.activationTitle}`)}
    if(ack&&topic)x.weekBoth++;
  });
  termItems.forEach(a=>{
    const x=ensure(a.assignedTeacherId);
    if(x.teacher)x.allAssignments.push(a);
  });
  const rows=[];
  byTeacher.forEach(x=>{
    const total=counts.get(String(x.teacher?.id))||{week:0,month:0,term:0};
    const weekCount=Number(total.week||0);
    if(!x.teacher||!x.weekAssignments.length)return;
    const maxDaily=Math.max(...Object.values(x.daily).map(arr=>arr.length));
    const tier=weekCount>=2?2:1;
    // Rank priority unchanged: weekly count, both icons, topic, acknowledgement.
    // Weekly, Hijri monthly and term values match the public statistical card.
    rows.push({...x,weekCount,monthCount:Number(total.month||0),
      qualifiedWeek:weekCount,cumulativeQualified:Number(total.term||0),maxDaily,tier});
  });
  rows.sort((a,b)=>b.weekCount-a.weekCount||b.weekBoth-a.weekBoth||
    b.weekActivated-a.weekActivated||b.weekAcknowledged-a.weekAcknowledged||
    clean(a.teacher.name).localeCompare(clean(b.teacher.name),"ar"));
  let previousKey="",rank=0;
  return rows.map(r=>{
    const key=[r.weekCount,r.weekBoth,r.weekActivated,r.weekAcknowledged].join("|");
    if(key!==previousKey)rank++;
    previousKey=key;
    return {...r,rank};
  });
}


// Monthly certificates reproduce the site's approved workshop-certificate layout.
// Ranking uses precisely the excellence-board priority, accumulated over the
// complete Umm al-Qura month: assigned count, both confirmations, topic, receipt.
function reserveSaudiDate(){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Riyadh",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const part=k=>parts.find(x=>x.type===k)?.value||"";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
function reserveMonthlyCertificateMonths(){
  const dates=publishedAssignments().map(a=>a.date).filter(d=>/^\d{4}-\d{2}-\d{2}$/.test(d));
  const known=[...dates,...(state.monthlyCertificates||[]).map(a=>a.endDate).filter(Boolean)];
  const lookup=new Map();
  known.forEach(date=>{
    const month=reserveHijriMonthRange(date);
    // Do not issue a certificate while any part of the Hijri month remains.
    if(month.end>=reserveSaudiDate())return;
    lookup.set(month.key,{...month,title:reserveHijriMonthTitle(month.end)});
  });
  return [...lookup.values()].sort((a,b)=>b.start.localeCompare(a.start));
}
function reserveMonthlyCertificateSnapshot(key){
  return (state.monthlyCertificates||[]).filter(c=>c.monthKey===key)
    .sort((a,b)=>String(b.updatedAt||b.issuedAt||"").localeCompare(String(a.updatedAt||a.issuedAt||"")))[0]||null;
}
function reserveMonthlyCertificateRanking(month){
  const assignments=publicationAssignmentsUntil(month.end,month.start);
  const counts=assignmentCounts(month.end);
  const grouped=new Map();
  assignments.forEach(a=>{
    const id=String(a.assignedTeacherId||"");
    if(!id)return;
    if(!grouped.has(id))grouped.set(id,{teacherId:id,name:teacherOf(id)?.name||a.assignedTeacherName||"",assignments:0,acknowledged:0,activated:0,both:0});
    const item=grouped.get(id);item.assignments++;
    const ack=!!clean(a.ackAt),topic=!!clean(a.activationTitle);
    if(ack)item.acknowledged++;
    if(topic)item.activated++;
    if(ack&&topic)item.both++;
  });
  const ranked=[...grouped.values()].filter(r=>r.name&&r.assignments>0).map(r=>({
    ...r,monthCount:Number(counts.get(r.teacherId)?.month??r.assignments)
  }));
  ranked.sort((a,b)=>b.monthCount-a.monthCount||b.both-a.both||b.activated-a.activated||b.acknowledged-a.acknowledged||clean(a.name).localeCompare(clean(b.name),"ar"));
  let rank=0,previous="";
  return ranked.map(r=>{
    const signature=[r.monthCount,r.both,r.activated,r.acknowledged].join("|");
    if(signature!==previous)rank++;
    previous=signature;
    return {...r,rank};
  });
}
function reserveMonthlyCertificatePanelHTML(){
  const months=reserveMonthlyCertificateMonths();
  if(!months.length)return `<section class="surface panel reserve-admin-only" id="reserveMonthlyCertificates"><div class="panel-head"><h3>شهادات التميز الشهري</h3></div><p class="reserve-public-note">تُتاح شهادات المعلمات المكلفات بعد اكتمال الشهر الهجري، ولا تُصدر خلال الشهر الجاري.</p></section>`;
  const selected=months.find(m=>m.key===state.monthlyCertificateKey)||months[0];
  state.monthlyCertificateKey=selected.key;
  const snapshot=reserveMonthlyCertificateSnapshot(selected.key);
  const rows=snapshot?.rows||reserveMonthlyCertificateRanking(selected);
  const approved=!!snapshot;
  return `<section class="surface panel reserve-admin-only" id="reserveMonthlyCertificates">
    <div class="panel-head"><h3>إصدار شهادات التميز الشهري</h3><span>وفق المفاضلة التراكمية للشهر الهجري</span></div>
    <p class="reserve-public-note">القالب الرسمي نفسه المستخدم في شهادات منجز، مع حفظ المراكز المعتمدة. تشمل الشهادات جميع المعلمات اللاتي لديهن تكليفات منشورة خلال الشهر، مهما كان ترتيبهن.</p>
    <div class="form-grid"><label>الشهر الهجري المكتمل<select id="reserveMonthlyCertSelect">${months.map(m=>`<option value="${esc(m.key)}" ${m.key===selected.key?'selected':''}>${esc(m.title)}</option>`).join("")}</select></label>
    <div class="reserve-source-note">الفترة: ${esc(fmtDate(selected.start))} – ${esc(fmtDate(selected.end))}<br>${approved?`نتائج معتمدة بتاريخ ${esc(fmtDateTimeHijri(snapshot.issuedAt))}`:"نتائج قيد المعاينة – لم يتم اعتمادها بعد"}</div></div>
    <div class="form-actions">
      <button class="btn btn-primary" type="button" id="reserveMonthlyCertApprove" ${!rows.length?'disabled':''}>${approved?'إعادة اعتماد نتائج الشهر':'اعتماد نتائج الشهر وإتاحة الشهادات'}</button>
      <button class="btn btn-ghost" type="button" id="reserveMonthlyCertAll" ${!approved||!rows.length?'disabled':''}>تنزيل شهادات جميع المستحقات PDF</button>
    </div>
    <div class="reserve-public-note" id="reserveMonthlyCertStatus" role="status">${approved?`عدد المستحقات: ${rows.length} معلمة | حُفظت المراكز لإعادة الإصدار.`:`عدد المستحقات: ${rows.length} معلمة | اعتمدي النتيجة لإصدار الشهادات.`}</div>
    <div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>المركز</th><th>المعلمة</th><th>حصص الشهر</th><th>تأكيد وتفعيل</th><th>الشهادة</th></tr></thead><tbody>
      ${rows.length?rows.map(r=>`<tr><td><strong>${esc(r.rank)}</strong></td><td>${esc(r.name)}</td><td>${esc(r.monthCount)}</td><td>${esc(r.both)}</td><td><button type="button" class="reserve-mini reserve-monthly-cert-preview" data-teacher="${esc(r.teacherId)}" ${!approved?'disabled':''}>معاينة وإصدار</button></td></tr>`).join(""):'<tr><td colspan="5">لا توجد تكليفات منشورة مستحقة خلال الشهر.</td></tr>'}
    </tbody></table></div>
    <div id="reserveMonthlyCertPreview" class="reserve-monthly-preview" style="display:none">
      <div class="form-actions"><button type="button" class="btn btn-primary" id="reserveMonthlyCertDownload">تنزيل شهادة المعلمة PDF</button><button type="button" class="btn btn-ghost" id="reserveMonthlyCertClose">إغلاق المعاينة</button></div>
      <div class="certificate-stage" style="overflow:auto"><div id="reserveMonthlyCertPaper" class="certificate-paper cert-final"></div></div>
    </div>
  </section>`;
}
function reserveMonthlyCertificatePaperHTML(row,month,issuedAt){
  // This is the exact approved certificate composition/classes/background used
  // by certificates.js; only subject, recipient, month and rank are dynamic.
  const dateLabel=fmtDateTimeHijri(issuedAt);
  return `<header class="cert-final-header">
      <div class="cert-final-org"><strong>وزارة التعليم</strong><span>إدارة تعليم جدة</span><span>الثانوية الرابعة والتسعون - مسارات</span></div>
      <div class="cert-final-ministry"><img src="ministry-logo.png" alt="شعار وزارة التعليم"></div>
      <div class="cert-final-manjaz"><img src="manjaz-logo.png" alt="شعار منجز"></div>
    </header>
    <main class="cert-final-main">
      <div class="cert-final-title">شهادة التميز الشهري</div>
      <div class="cert-final-workshop">في تسديد حصص الاحتياط</div>
      <div class="cert-final-testimony">تتقدم إدارة الثانوية الرابعة والتسعون - مسارات بالشكر والتقدير للمعلمة</div>
      <div class="cert-final-name">${esc(row.name)}</div>
      <div class="cert-final-attendance">تقديرًا لجهودها في تنفيذ حصص الاحتياط خلال شهر ${esc(month.title)}، وتحقيقها <strong>المركز ${esc(row.rank)}</strong> في المفاضلة الشهرية التراكمية وفق المعايير المعتمدة.</div>
      <div class="cert-final-wish">مع خالص التقدير، ومتمنين لها دوام التميز والعطاء</div>
      <div class="cert-final-wish" style="font-size:13px;margin-top:4px">تاريخ إصدار الشهادة: ${esc(dateLabel)}</div>
    </main>
    <footer class="cert-final-footer">
      <div class="cert-final-principal"><strong>مديرة المدرسة</strong><span>زينب ناصر علي حكمي</span></div>
      <div class="cert-final-stamp"><img src="official-school-stamp.png" alt="الختم الرسمي للمدرسة"></div>
    </footer>`;
}
function reserveMonthlyCertificateRender(row,month,issuedAt){
  const paper=byId("reserveMonthlyCertPaper");if(!paper)return;
  paper.className="certificate-paper cert-final";
  paper.style.backgroundImage='url("manjaz-certificate-background.png")';
  paper.innerHTML=reserveMonthlyCertificatePaperHTML(row,month,issuedAt);
}
let reserveMonthlyCertLibraryPromise=null;
async function reserveMonthlyCertWaitStyles(){
  reserveMonthlyCertStyle();
  const link=document.querySelector('link[data-reserve-monthly-cert-css]');
  if(!link)return;
  // If the CSS already loaded, the approved certificate geometry is ready.
  if([...document.styleSheets].some(sheet=>sheet.href&&sheet.href.includes("certificates.css")))return;
  await new Promise((resolve,reject)=>{
    link.addEventListener("load",resolve,{once:true});
    link.addEventListener("error",()=>reject(new Error("تعذر تحميل قالب شهادات منجز")),{once:true});
  });
}
async function reserveMonthlyCertLibraries(){
  if(!reserveMonthlyCertLibraryPromise){
    const script=(url,check)=>new Promise((resolve,reject)=>{
      if(check())return resolve();
      const node=document.createElement("script");node.src=url;node.onload=()=>check()?resolve():reject(new Error("فشل تحميل مكتبة الشهادات"));
      node.onerror=()=>reject(new Error("تعذر تحميل مكتبة الشهادات، تحققي من الاتصال"));document.head.appendChild(node);
    });
    reserveMonthlyCertLibraryPromise=(async()=>{
      if(!window.html2canvas)await script("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",()=>!!window.html2canvas);
      if(!window.jspdf?.jsPDF)await script("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",()=>!!window.jspdf?.jsPDF);
    })().catch(e=>{reserveMonthlyCertLibraryPromise=null;throw e});
  }
  return reserveMonthlyCertLibraryPromise;
}
function reserveMonthlyCertStyle(){
  if(document.querySelector('link[data-reserve-monthly-cert-css]'))return;
  const css=document.createElement("link");css.rel="stylesheet";css.href="certificates.css?v=13.7";
  css.setAttribute("data-reserve-monthly-cert-css","1");document.head.appendChild(css);
}
async function reserveMonthlyCertCapture(row,month,issuedAt){
  await Promise.all([reserveMonthlyCertLibraries(),reserveMonthlyCertWaitStyles()]);
  // Capture the same HTML/CSS and logo assets as the existing Manjaz certificates.
  const host=document.createElement("div");
  host.style.cssText="position:fixed;left:-12000px;top:0;width:1123px;height:794px;pointer-events:none;z-index:-1";
  const paper=document.createElement("div");paper.className="certificate-paper cert-final";
  paper.style.cssText="width:1123px;height:794px;transform:none!important;margin:0!important;box-shadow:none!important;background-image:url('manjaz-certificate-background.png')";
  paper.innerHTML=reserveMonthlyCertificatePaperHTML(row,month,issuedAt);
  host.appendChild(paper);document.body.appendChild(host);
  try{
    if(document.fonts?.ready)await document.fonts.ready;
    const sources=[...paper.querySelectorAll("img")].map(el=>el.getAttribute("src"));
    sources.push("manjaz-certificate-background.png");
    await Promise.all(sources.map(src=>new Promise((resolve,reject)=>{
      const img=new Image();img.onload=()=>resolve();img.onerror=()=>reject(new Error(`لم يتم تحميل أصل الشهادة: ${src}`));img.src=src;
      if(img.complete&&img.naturalWidth)resolve();
    })));
    return await window.html2canvas(paper,{scale:2.5,useCORS:true,allowTaint:false,backgroundColor:"#ffffff",logging:false});
  }finally{host.remove()}
}
async function reserveMonthlyCertPDF(rows,month,issuedAt,onProgress){
  if(!rows.length)throw new Error("لا توجد شهادات للإصدار");
  await reserveMonthlyCertLibraries();
  const {jsPDF}=window.jspdf;
  const pdf=new jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
  for(let i=0;i<rows.length;i++){
    if(onProgress)onProgress(i+1,rows.length);
    if(i)pdf.addPage("a4","landscape");
    const canvas=await reserveMonthlyCertCapture(rows[i],month,issuedAt);
    const ratio=Math.min(297/canvas.width,210/canvas.height);
    const w=canvas.width*ratio,h=canvas.height*ratio;
    pdf.addImage(canvas.toDataURL("image/jpeg",0.93),"JPEG",(297-w)/2,(210-h)/2,w,h,undefined,"FAST");
    // Release one large canvas before processing the next teacher.
    canvas.width=1;canvas.height=1;
  }
  const label=month.title.replace(/[\\/:*?"<>|]/g,"-");
  pdf.save(`شهادات_تميز_الاحتياط_${label}_${rows.length}.pdf`);
}
function bindReserveMonthlyCertificates(){
  reserveMonthlyCertStyle();
  const select=byId("reserveMonthlyCertSelect");if(!select)return;
  select.onchange=()=>{state.monthlyCertificateKey=select.value;renderWorkspaceCard("excellence")};
  const current=()=>reserveMonthlyCertificateMonths().find(m=>m.key===state.monthlyCertificateKey);
  const say=message=>{const el=byId("reserveMonthlyCertStatus");if(el)el.textContent=message};
  const approvedMonth=()=>{
    const month=current(),snap=month&&reserveMonthlyCertificateSnapshot(month.key);
    return snap?{month,snap}:null;
  };
  byId("reserveMonthlyCertApprove")?.addEventListener("click",async event=>{
    const month=current();if(!month||month.end>=reserveSaudiDate())return say("لا يمكن اعتماد الشهر قبل اكتماله.");
    const rows=reserveMonthlyCertificateRanking(month);
    if(!rows.length)return say("لا توجد معلمات لديهن تكليفات منشورة خلال هذا الشهر.");
    const existing=reserveMonthlyCertificateSnapshot(month.key);
    const question=existing?`إعادة اعتماد شهر ${month.title} ستحدّث مراكز ${rows.length} معلمة في الشهادات المؤرشفة. هل توافقين؟`:
      `اعتماد مفاضلة شهر ${month.title} وإصدار شهادات لجميع ${rows.length} معلمة مكلفة؟`;
    if(!confirm(question))return;
    if(existing&&!confirm("تأكيد نهائي: ستُستبدل نتائج الشهر المحفوظة بالمفاضلة الحالية. هل تريدين المتابعة؟"))return;
    event.currentTarget.disabled=true;say("جارٍ اعتماد نتائج الشهر...");
    const data={monthKey:month.key,startDate:month.start,endDate:month.end,monthLabel:month.title,
      issuedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
      rows:rows.map(({teacherId,name,rank,assignments,monthCount,acknowledged,activated,both})=>({teacherId,name,rank,assignments,monthCount,acknowledged,activated,both})),
      certificateTemplate:"manjaz-cert-final"};
    try{
      // Guard against stale screens or duplicate records caused by two devices.
      const records=await fetchKind(K.monthlyCertificate);
      const stored=records.find(r=>r.monthKey===month.key);
      if(stored&&!existing)throw new Error("سبق اعتماد هذا الشهر من جهاز آخر. حدّثي الصفحة لمراجعة النتائج قبل تعديلها.");
      if(stored){await patchKind(K.monthlyCertificate,stored.id,data,token());}
      else await insertKind(K.monthlyCertificate,data,token());
      await loadAll();renderWorkspaceCard("excellence");
      const status=byId("reserveMonthlyCertStatus");if(status)status.textContent=`تم اعتماد ${rows.length} شهادة لشهر ${month.title}.`;
    }catch(e){console.error(e);event.currentTarget.disabled=false;say(e.message||"تعذر اعتماد النتائج، ولم تصدر شهادات.")}
  });
  document.querySelectorAll(".reserve-monthly-cert-preview").forEach(button=>button.onclick=()=>{
    const found=approvedMonth();if(!found)return say("يجب اعتماد نتائج الشهر أولًا.");
    const row=found.snap.rows.find(r=>String(r.teacherId)===String(button.dataset.teacher));
    if(!row)return say("تعذر العثور على المعلمة في سجل الشهر المعتمد.");
    state.monthlyCertificatePreviewTeacherId=String(row.teacherId);
    reserveMonthlyCertificateRender(row,found.month,found.snap.issuedAt);
    byId("reserveMonthlyCertPreview").style.display="block";
    say(`معاينة شهادة ${row.name} – المركز ${row.rank}.`);
  });
  byId("reserveMonthlyCertClose")?.addEventListener("click",()=>{
    byId("reserveMonthlyCertPreview").style.display="none";
    state.monthlyCertificatePreviewTeacherId="";
  });
  const run=async(button,rows,month,issuedAt)=>{
    button.disabled=true;say(`جارٍ إنشاء ${rows.length} شهادة بصيغة PDF وفق قالب منجز...`);
    try{await reserveMonthlyCertPDF(rows,month,issuedAt,(i,total)=>say(`جارٍ تجهيز الشهادة ${i} من ${total}...`));say(`تم تجهيز ${rows.length} شهادة بصيغة PDF.`)}
    catch(e){console.error(e);say(e.message||"تعذر تنزيل الشهادات، تحققي من الاتصال ثم أعيدي المحاولة.")}
    finally{button.disabled=false}
  };
  byId("reserveMonthlyCertDownload")?.addEventListener("click",event=>{
    const found=approvedMonth();if(!found)return say("يجب اعتماد الشهر أولًا.");
    const rows=found.snap.rows.filter(r=>String(r.teacherId)===state.monthlyCertificatePreviewTeacherId);
    if(rows.length)run(event.currentTarget,rows,found.month,found.snap.issuedAt);
  });
  byId("reserveMonthlyCertAll")?.addEventListener("click",event=>{
    const found=approvedMonth();if(!found)return say("يجب اعتماد الشهر أولًا.");
    run(event.currentTarget,found.snap.rows,found.month,found.snap.issuedAt);
  });
}

function excellenceAdminHTML(){
  const rows=excellenceMetrics(state.currentDate),wr=weekRange(state.currentDate);
  return `<section class="surface panel reserve-admin-only">
    <div class="panel-head"><h3>التميز في شغل حصص الاحتياط</h3><span>${esc(fmtDate(wr.start))} – ${esc(fmtDate(wr.end))}</span></div>
    <div class="form-actions">
      <button class="btn btn-primary reserve-excellence-export" data-scope="week" type="button">تصدير الأسبوع</button>
      <button class="btn btn-ghost reserve-excellence-export" data-scope="cumulative" type="button">تصدير التراكمي</button>
      <button class="btn btn-primary" id="reserveMonthlyCertJump" type="button">إصدار شهادات التميز الشهري</button>
    </div>
    <div class="reserve-table-wrap reserve-excellence"><table class="reserve-table"><thead><tr>
      <th>المركز</th><th>المعلمة</th><th>تفصيل يومي</th><th>حصص الأسبوع</th><th>تراكمي الشهر الهجري</th><th>تم الاطلاع</th><th>تم تفعيل الموضوع</th><th>الاثنتان معًا</th><th>التراكمي للفصل</th><th>عناوين التفعيل</th>
    </tr></thead><tbody>${rows.length?rows.map(r=>`<tr>
      <td><strong>${r.rank}</strong></td><td>${esc(r.teacher.name)}</td>
      <td>${Object.entries(r.daily).sort().map(([d,a])=>`${dayName(d)}: ${a.length}`).join(" — ")||"—"}</td>
      <td><strong>${r.weekCount}</strong></td><td>${r.monthCount}</td><td>${r.weekAcknowledged}</td><td>${r.weekActivated}</td><td>${r.weekBoth}</td>
      <td>${r.cumulativeQualified}</td><td>${r.titles.length?r.titles.map(t=>`<div>${esc(t)}</div>`).join(""):"—"}</td>
    </tr>`).join(""):'<tr><td colspan="10">لا توجد بيانات تميز لهذا الأسبوع</td></tr>'}</tbody></table></div>
    <p class="reserve-public-note">الترتيب من جدول النشر فقط: الأكثر حصصًا منذ الأحد يتقدم، وعند التعادل يُفضّل اكتمال الاطلاع والموضوع، ثم الموضوع، ثم الاطلاع؛ وعند تساوي الجميع يتشاركون المركز. تبدأ المراكز من جديد كل أحد.</p>
  </section>${reserveMonthlyCertificatePanelHTML()}`;
}
function exportExcellence(scope){
  const refs=scope==="week"?[state.currentDate]:[];
  let rows=[];
  if(scope==="week"){
    rows=excellenceMetrics(state.currentDate).map(r=>[r.rank,r.teacher.name,r.weekCount,r.monthCount,r.qualifiedWeek,r.cumulativeQualified,r.weekBoth,r.titles.join(" | ")]);
  }else{
    // Export exactly the selected date/week, not a different later date.
    rows=excellenceMetrics(state.currentDate).map(r=>[r.rank,r.teacher.name,r.weekCount,r.monthCount,r.qualifiedWeek,r.cumulativeQualified,r.weekBoth,r.titles.join(" | ")]);
  }
  const headers=["المركز","المعلمة","حصص الأسبوع","تراكمي الشهر الهجري","المحتسب","التراكمي للفصل","الحصص المكتملة الأيقونتين","عناوين التفعيل"];
  return downloadReserveTablePDF(`تميز الاحتياط ${scope}`, ["يوم التقرير","التاريخ الهجري",...headers],
    rows.map(row=>[dayName(state.currentDate),fmtDate(state.currentDate),...row]),state.currentDate,
    `أسبوع التميز: ${fmtDate(weekRange(state.currentDate).start)} – ${fmtDate(weekRange(state.currentDate).end)}`);
}
function bindExcellenceAdmin(){
  document.querySelectorAll(".reserve-excellence-export").forEach(b=>b.onclick=()=>exportExcellence(b.dataset.scope));
  bindReserveMonthlyCertificates();
  byId("reserveMonthlyCertJump")?.addEventListener("click",()=>byId("reserveMonthlyCertificates")?.scrollIntoView({behavior:"smooth",block:"start"}));
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
    <p class="reserve-public-note">المفاضلة الآلية وفق أهلية التكليف وأولوية الفصل الأصلي وتعويض الغياب السابق والاستثناءات الفردية والحدود اليومية والأسبوعية.</p>
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
      <div class="panel-head"><h3>تصدير سجلات الاحتياط</h3><span>PDF</span></div>
      <p class="reserve-public-note">يتم التصدير من السجلات المعتمدة فقط، ويمكن استخراج أسبوعي أو شهري أو فصلي.</p>
      <div class="form-actions">
        <button class="btn btn-primary reserve-export-xls" data-range="week" type="button">PDF أسبوعي</button>
        <button class="btn btn-ghost reserve-export-xls" data-range="month" type="button">PDF شهري</button>
        <button class="btn btn-ghost reserve-export-xls" data-range="term" type="button">PDF فصلي</button>
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
    #reservePublishOverlay .reserve-publish-preview-scroll{width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;box-sizing:border-box}
    #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet{width:100%;max-width:100%;min-width:950px;box-sizing:border-box;margin-left:auto;margin-right:auto}
    #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet table{width:100%;max-width:100%;box-sizing:border-box}
    #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet th:last-child,
    #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet td:last-child{box-sizing:border-box}
    #reservePublishSheet{display:block!important;color:#172c34;background:white;direction:rtl;line-height:1.6;font:12px Tahoma,Arial,sans-serif}
    #reservePublishSheet .reserve-publication-date{display:flex;justify-content:space-between;gap:12px;border-bottom:2px solid #0f5f59;padding-bottom:7px;font-size:14px;flex-wrap:wrap}
    #reservePublishSheet h1{text-align:center;margin:9px 0 0;font-size:20px;color:#123e50}
    #reservePublishSheet .reserve-publication-school{text-align:center;margin:0 0 12px;color:#576c72;font-size:12px}
    #reservePublishSheet table{width:100%;table-layout:fixed;border-collapse:collapse;text-align:center}
    #reservePublishSheet th,#reservePublishSheet td{border:1px solid #637982;padding:8px 5px;vertical-align:middle;overflow-wrap:anywhere;box-sizing:border-box}
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
      #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet{width:950px;max-width:none;min-width:950px!important;font-size:11px!important}
      #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet table{width:100%;table-layout:fixed;font-size:9px}
      #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet th,
      #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet td{padding:3px 1px;overflow-wrap:anywhere;word-break:normal;font-size:8px;line-height:1.35}
      #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet .reserve-publication-status{font-size:7px;padding:2px 0}
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
      #reservePublishOverlay .reserve-publish-preview-scroll #reservePublishSheet{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important}
      #reservePublishSheet{font-size:10px!important;line-height:1.28!important;overflow:visible!important}
      #reservePublishSheet table{width:100%!important;max-width:100%!important;table-layout:fixed!important}
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
    // Keep the publication PDF landscape, matching its preview.
    const page=sheet.cloneNode(true);
    page.id="reservePublishSheet";
    // Landscape A4 has 277mm usable width with two 10mm margins.
    // Use 268mm to retain a safety margin around the signature column.
    page.style.cssText="width:268mm;max-width:268mm;min-width:0;box-sizing:border-box;margin:0;padding:0;overflow:visible;font-size:11px;line-height:1.4";
    const table=page.querySelector("table");
    if(table){table.style.cssText="width:100%;table-layout:fixed;font-size:10px";
      table.querySelectorAll("th,td").forEach(cell=>{cell.style.padding="4px 2px";cell.style.overflowWrap="anywhere";});
    }
    // Preserve publication styles on the detached PDF copy without changing the preview.
    const offscreen=document.createElement("div");
    offscreen.style.cssText="position:fixed;left:-20000px;top:0;width:268mm;max-width:268mm;pointer-events:none";
    offscreen.appendChild(page);document.body.appendChild(offscreen);
    try{
    await engine().set({
      margin:[10,10,10,10],filename:`جدول_النشر_${date}.pdf`,
      image:{type:"jpeg",quality:0.98},
      html2canvas:{scale:2,useCORS:true,backgroundColor:"#ffffff",scrollY:0},
      jsPDF:{unit:"mm",format:"a4",orientation:"landscape"},
      pagebreak:{mode:["css","legacy"]}
    }).from(page).save();
    }finally{offscreen.remove()}
    msg.textContent="تم إعداد ملف جدول النشر بصيغة PDF.";
  }catch(err){
    console.error("تعذر إنشاء PDF مباشر",err);
    msg.textContent="تعذر التنزيل المباشر. استخدمي «طباعة» ثم «حفظ كملف PDF» من الجهاز.";
  }finally{btn.disabled=false}
}
// All reserve exports use PDF, with an explicit day and Hijri date.
async function downloadReserveTablePDF(name,headers,rows,scopeDate=state.currentDate,notes=""){
  const sheet=document.createElement("div");
  sheet.className="reserve-pdf-sheet";
  sheet.setAttribute("dir","rtl");
  const today=state.currentDate;
  sheet.innerHTML=`<h2>${esc(name)}</h2>
    <div class="reserve-pdf-meta">الثانوية الرابعة والتسعون – مسارات | يوم التقرير: ${esc(dayName(today))} | تاريخ التقرير: ${esc(fmtDate(today))}<br>اليوم المرجعي: ${esc(dayName(scopeDate))} | التاريخ المرجعي: ${esc(fmtDate(scopeDate))}${notes?`<br>${esc(notes)}`:""}</div>
    <table><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join("")}</tr></thead>
      <tbody>${rows.length?rows.map(row=>`<tr>${row.map(v=>`<td>${esc(v==null?"":v)}</td>`).join("")}</tr>`).join(""):`<tr><td colspan="${headers.length}">لا توجد بيانات لهذا النطاق</td></tr>`}</tbody></table>
    <div class="reserve-pdf-footer">الثانوية الرابعة والتسعون – مسارات | قسم الاحتياط اليومي | ${esc(dayName(today))} ${esc(fmtDate(today))}</div>`;
  const host=document.createElement("div");
  host.style.cssText="position:fixed;left:-20000px;top:0;width:735px;pointer-events:none;z-index:-1";
  sheet.style.cssText="width:735px;max-width:735px;position:relative;left:0;top:0";
  const table=sheet.querySelector("table");
  if(table){table.style.tableLayout="fixed";table.style.fontSize=headers.length>9?"8px":"9px";}
  host.appendChild(sheet);document.body.appendChild(host);
  try{
    const engine=await loadReservePdfEngine();
    await engine().set({margin:[10,9,10,9],filename:`${name.replace(/\s+/g,"_")}_${today}.pdf`,
      image:{type:"jpeg",quality:0.98},
      html2canvas:{scale:1.6,useCORS:true,backgroundColor:"#ffffff",scrollY:0},
      jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
      pagebreak:{mode:["css","legacy"]}
    }).from(sheet).save();
  }catch(err){
    console.error("PDF export failed",err);
    alert("تعذر إنشاء ملف PDF الآن. تحققي من الاتصال وأعيدي المحاولة.");
  }finally{host.remove()}
}
function exportExcel(range){
  const rr=exportRange(range);
  const items=dateRangeAssignments(rr.start,rr.end).slice().sort((a,b)=>a.date.localeCompare(b.date)||Number(a.period)-Number(b.period));
  const headers=["التاريخ الهجري","اليوم","الحصة","الفصل","سبب الاحتياط","المعلمة الغائبة","معلمة الاحتياط","الحالة","عنوان التفعيل"];
  const rows=items.map(a=>[fmtDate(a.date),dayName(a.date),a.period,a.className||"",a.reason||"غياب",a.absentTeacherName||"",a.assignedTeacherName||"",assignmentStatusLabel(a),a.activationTitle||""]);
  return downloadReserveTablePDF(`سجلات الاحتياط ${range}`,headers,rows,rr.start,`الفترة: ${fmtDate(rr.start)} – ${fmtDate(rr.end)} | اليوم: ${dayName(rr.start)}`);
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
  const reference=state.currentDate;
  const wr=weekRange(reference);
  const periodLabel=byId("reserveStatPeriodLabel");
  if(periodLabel)periodLabel.textContent=`الاحتساب حتى: ${fmtDate(reference)} | الأسبوع: ${fmtDate(wr.start)} – ${fmtDate(wr.end)} | الشهر الهجري: ${reserveHijriMonthTitle(reference)}`;
  const weekly=byId("reserveWeeklyHolder");
  if(weekly)weekly.innerHTML=weeklyTableHTML(publicWeeklyRows(reference),reference);
  const excellence=byId("reserveExcellenceHolder");
  if(excellence)excellence.innerHTML=excellenceTableHTML(reference);
}

// Refresh the linked reserve admin views after a persisted save or delete.
// Never rebuild or replace the original WhatsApp queue controls.
async function reserveSyncAdminMutation(date=state.currentDate){
  if(date!==state.currentDate)return; // Do not repopulate another day's cards after a date change.
  const status=byId("reserveAdminSyncStatus");
  if(status){status.dataset.state="busy";status.textContent="جارٍ تحديث البيانات واللوحات...";}
  try{
    refreshReserveStatisticsViews();
    if(byId("reserveNotifyPanel"))await reserveHydrateNotificationPanel();
    if(date===state.currentDate&&byId("reservePublishOverlay"))openReservePublication(date);
    if(status){status.dataset.state="ready";status.textContent="تم تحديث بيانات الاحتياط — "+fmtDateTimeHijri(new Date().toISOString());}
  }catch(error){
    if(status){status.dataset.state="error";status.textContent="تعذر تحديث بعض البيانات؛ أعيدي فتح القسم.";}
    throw error;
  }
}
async function refreshAndRenderPublic(){
  await loadAll();
  refreshReserveStatisticsViews();
}
function mountAdminShell(){
  const mount=byId("reserveAdminMount"); if(!mount)return;
  mount.innerHTML=state.admin?adminHTML():loginHTML();
  if(state.admin){bindAdminShell();bindReserveSharing();bindReserveNotificationPanel()} else bindLogin();
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

let reserveDateSyncBusy=false;
let reservePendingDateChange=null;
async function syncReserveSectionDate(next,keepWeekAnchor=false){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(next))return;
  if(reserveDateSyncBusy){reservePendingDateChange={date:next,keepWeekAnchor};return;}
  if(!keepWeekAnchor){state.statsWeekAnchor=next;state.statsWeekShift=0;}
  // Save view configuration before rebuilding all cards from the one shared date.
  const hadAdmin=!!byId("reserveAdminMount")?.firstElementChild;
  const activeAdminTab=document.querySelector("[data-admin-tab].active")?.dataset.adminTab||"workspace";
  const activeWorkspaceCard=state.workspaceCard;
  const hadPublishOverlay=!!byId("reservePublishOverlay");
  state.publicOpenCards=[...document.querySelectorAll(".reserve-public-card[open]")]
    .map(card=>card.dataset.reservePublicCard);
  state.currentDate=next;
  state.manualRows=[];
  state.manualAbsentIds=[];
  state.autoAbsentIds=[];
  state.autoAbsentSelectionResetDate="";
  reserveDateSyncBusy=true;
  try{
    await renderPage();
    if(hadAdmin&&byId("reserveAdminMount")){
      state.workspaceCard=activeWorkspaceCard;
      mountAdminShell();
      if(state.admin&&activeAdminTab!=="workspace"){
        document.querySelectorAll("[data-admin-tab]").forEach(b=>
          b.classList.toggle("active",b.dataset.adminTab===activeAdminTab));
        renderAdminTab(activeAdminTab);
      }
    }
    if(hadPublishOverlay)openReservePublication(next);
    // Public statistics/excellence and the rebuilt admin workspace now share next.
    refreshReserveStatisticsViews();
  }catch(err){console.error("تعذر مزامنة تاريخ الاحتياط",err);}
  finally{
    reserveDateSyncBusy=false;
    if(reservePendingDateChange){
      const pending=reservePendingDateChange;
      reservePendingDateChange=null;
      if(pending.date!==state.currentDate)syncReserveSectionDate(pending.date,pending.keepWeekAnchor);
    }
  }
}
function bindPublic(){
  bindHijriDateControl("reservePublicDate",next=>syncReserveSectionDate(next));
  document.querySelectorAll(".reserve-public-card").forEach(card=>card.addEventListener("toggle",()=>{
    const opened=new Set(state.publicOpenCards||[]),id=card.dataset.reservePublicCard;
    if(card.open)opened.add(id);else opened.delete(id);
    state.publicOpenCards=[...opened];
  }));
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
    const shift=Number(b.dataset.weekShift||0);
    if(shift!==0&&shift!==-7)return;
    const anchor=state.statsWeekAnchor||state.currentDate;
    state.statsWeekAnchor=anchor;
    state.statsWeekShift=shift;
    // Period controls modify the shared date, never an independent hidden card date.
    return syncReserveSectionDate(shift===-7?addDays(anchor,-7):anchor,true);
  });
  // Each course in a grouped teacher link keeps its own acknowledgement token.
  bindReserveBundleActions();
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
    state.admin=null;state.reserveContactBook.clear();state.reserveNotificationStates.clear();mountAdminShell();
  });
  renderAdminTab("workspace");
}
function renderAdminTab(tab){
  const body=byId("reserveAdminBody"),aux=byId("reserveAdminAuxBody");
  if(!body||!aux)return;
  if(tab==="teachers"||tab==="settings"){
    body.innerHTML="";
    aux.innerHTML=tab==="teachers"?teachersAdminHTML():settingsHTML();
    if(tab==="teachers")bindTeachersAdmin();else bindSettingsAdmin();
  }else{
    aux.innerHTML="";
    body.innerHTML=workspaceHTML();
    bindWorkspace();
  }
}

function plainData(x){
  const y={...x};
  // A reflected title is virtual: never persist it during unrelated reserve edits.
  if(y.manjazAutoSource===true){y.activationTitle="";y.activationAt="";}
  delete y.manjazAutoSource;delete y.id;delete y.createdAt;delete y.updatedAt;
  return y;
}
async function ensureAdmin(){if(!token())throw new Error("يلزم تسجيل الدخول الإداري")}


function bindDayAdmin(){
  bindHijriDateControl("reserveAdminDate",next=>syncReserveSectionDate(next));
  // Changing a saved automatic assignee commits the change immediately while
  // retaining the current draft/approved state; the full-day approval is separate.
  byId("reserveAssignmentsAdmin")?.addEventListener("change",event=>{
    const select=event.target.closest("select.reserve-assignee");
    const row=select?.closest("[data-assignment]");
    const save=row?.querySelector("button.reserve-save-assignee");
    if(select?.value && save && !save.disabled)save.click();
  });
  byId("reserveAssignmentsAdmin")?.addEventListener("click",event=>{
    const button=event.target.closest(".reserve-auto-unlock");
    if(button)reserveUnlockAssigneeSelector(button.closest("[data-assignment]")?.querySelector(".reserve-assignee"));
  });
  byId("reserveAutoAllNames")?.addEventListener("change",event=>{
    state.autoAllNames=event.target.checked;
    state.autoAbsentIds=[...(byId("reserveAbsentTeacher")?.selectedOptions||[])].map(o=>String(o.value));
    renderWorkspaceCard("auto");
  });
  // Both actions consume the selected absent teachers directly. Register once,
  // generate once, and leave manual assignments unmodified.
  async function registerSelectedAbsences(date,ids,reason){
    const existingIds=new Set(absencesOn(date).map(a=>String(a.teacherId)));
    let created=0;
    for(const teacherId of ids){
      const t=teacherOf(teacherId);
      if(!t||existingIds.has(String(teacherId)))continue;
      const cells=scheduleOf(teacherId)?.timetable?.[dayKey(date)]||[];
      const periods=cells.map((v,i)=>{
        const x=parseScheduleValue(v);
        return {period:i+1,className:x.className,activity:x.activity};
      }).filter(x=>x.className);
      const saved=await insertKind(K.absence,{
        date,dayKey:dayKey(date),teacherId:String(teacherId),teacherName:t.name,
        reason,periods,source:"auto",createdAt:new Date().toISOString()
      },token());
      state.absences.push(saved);
      existingIds.add(String(teacherId));created++;
    }
    return created;
  }
  const chosenAbsentIds=()=>[...(byId("reserveAbsentTeacher")?.selectedOptions||[])]
    .map(o=>String(o.value)).filter(Boolean);
  byId("reserveAddAbsence")?.addEventListener("click",async()=>{
    const msg=byId("reserveDayMsg"),date=state.currentDate,ids=chosenAbsentIds();
    if(!ids.length){msg.textContent="اختاري أسماء الغائبات أولًا.";return}
    if(!dayKey(date)){msg.textContent="اختاري تاريخًا من الأحد إلى الخميس.";return}
    const reason=clean(byId("reserveAbsenceReason")?.value||"غياب");
    state.autoAbsentIds=ids;
    state.autoAbsentSelectionResetDate="";
    msg.textContent="جارٍ حفظ أسماء الغائبات...";
    try{
      await ensureAdmin();
      const n=await registerSelectedAbsences(date,ids,reason);
      await loadAll();renderWorkspaceCard("auto");
      await reserveSyncAdminMutation(date);
      byId("reserveDayMsg").textContent=`تم تسجيل الغائبات (${n} جديدات). اضغطي «توليد آلي» لإنشاء التكليفات.`;
    }catch(err){console.error(err);msg.textContent="تعذر استكمال تسجيل الغياب. الأسماء المحفوظة لن تتكرر عند إعادة المحاولة."}
  });
  document.querySelectorAll(".reserve-delete-absence").forEach(b=>b.onclick=async()=>{
    if(!confirm("حذف تسجيل الغياب؟"))return;
    const msg=byId("reserveDayMsg");b.disabled=true;if(msg)msg.textContent="جارٍ الحذف...";
    try{
      await ensureAdmin();await deleteKind(K.absence,b.dataset.id,token());
      await loadAll();renderWorkspaceCard("auto");
      await reserveSyncAdminMutation(state.currentDate);
      const done=byId("reserveDayMsg");if(done)done.textContent="تم الحذف";
    }catch(error){console.error(error);const current=byId("reserveDayMsg")||msg;
      if(current)current.textContent="تعذر الحذف: "+(error?.message||"خطأ غير معروف");
    }finally{b.disabled=false;}
  });
  byId("reserveGenerate")?.addEventListener("click",async()=>{
    const msg=byId("reserveDayMsg"),button=byId("reserveGenerate"),date=state.currentDate,ids=chosenAbsentIds();
    if(!dayKey(date)){msg.textContent="اختاري تاريخًا من الأحد إلى الخميس.";return;}
    if(!ids.length&&!absencesOn(date).length){msg.textContent="اختاري أسماء الغائبات أولًا، ثم اضغطي التوليد.";return;}
    state.autoAbsentIds=ids;
    state.autoAbsentSelectionResetDate="";
    button.disabled=true;button.textContent="جارٍ التوليد...";
    msg.textContent="جارٍ توليد الاحتياط وفق المعايير المعتمدة...";
    let created=0,repaired=0,unfilled=0,processed=0;
    try{
      await ensureAdmin();
      const reason=clean(byId("reserveAbsenceReason")?.value||"غياب");
      if(ids.length)await registerSelectedAbsences(date,ids,reason);
      const abs=absencesOn(date).filter(a=>!ids.length||ids.includes(String(a.teacherId)));
      const usedPrimary=new Set(assignmentsOn(date).map(a=>String(a.assignedTeacherId||"")).filter(Boolean));
      const known=new Map(assignmentsOn(date).map(a=>[
        [String(a.absentTeacherId),Number(a.period),clean(a.className)].join("|"),a]));
      for(const absent of abs){
        for(const period of (absent.periods||[])){
          const key=[String(absent.teacherId),Number(period.period),clean(period.className)].join("|");
          if(!period.className)continue;
          let record=known.get(key);
          if(record?.assignedTeacherId){processed++;continue;}
          // أنشئ مسودة فارغة أولًا؛ لا تنشئ سجلًا ثانيًا عند رفض ترشيح.
          if(!record){
            record=await insertKind(K.assignment,{
              date,dayKey:dayKey(date),period:Number(period.period),className:period.className,
              activity:period.activity===true,reason:absent.reason||"غياب",
              absentTeacherId:String(absent.teacherId),absentTeacherName:absent.teacherName,
              candidates:[],assignedTeacherId:"",assignedTeacherName:"",
              fullCadreEnabled:state.autoAllNames!==false,manual:false,source:"auto",
              published:false,status:"مسودة",ackToken:uid(),ackAt:"",
              activationTitle:"",activationAt:"",createdAt:new Date().toISOString()
            },token(),"مسودة");
            if(!record?.id)throw new Error("لم تؤكد قاعدة البيانات إنشاء المسودة");
            state.assignments.push(record);known.set(key,record);created++;
          }
          const choices=candidateRanking(date,period.period,absent.teacherId,String(record.id),{
            className:period.className,usedPrimary,limit:200
          });
          let selected=null;
          for(const candidate of choices){
            try{
              assertAutoAssignmentIntegrity(candidate.teacherId,date,record.period,
                record.id,record.className,state.autoAllNames!==false);
              const data={...plainData(record),assignedTeacherId:String(candidate.teacherId),
                assignedTeacherName:candidate.name,candidates:[candidate],
                fullCadreEnabled:state.autoAllNames!==false,
                manual:false,source:"auto",published:false,status:"مسودة",
                draftAutoCandidateNote:""};
              const saved=await patchKind(K.assignment,record.id,data,token(),"مسودة");
              if(saved?.id){
                const idx=state.assignments.findIndex(x=>String(x.id)===String(record.id));
                if(idx>=0)state.assignments[idx]=saved;
                record=saved;
              }
              if(String(saved?.assignedTeacherId)===String(candidate.teacherId)){
                selected=candidate;usedPrimary.add(String(candidate.teacherId));repaired++;break;
              }
            }catch(error){
              if(/401|403|JWT|permission|Failed to fetch/i.test(error?.message||""))throw error;
            }
          }
          if(!selected)unfilled++;

          processed++;
          const progress=byId("reserveDayMsg");if(progress)progress.textContent=
            "جارٍ التوليد... "+processed+" حصة، أُسندت "+repaired+"، وتحتاج مراجعة "+unfilled+".";
        }
      }
      await loadAll();renderWorkspaceCard("auto");
      await reserveSyncAdminMutation(date);
      const done=byId("reserveDayMsg");
      if(done)done.textContent="تم التوليد. المسودات الجديدة: "+created+"، حصص أُسندت: "+repaired+(unfilled?"، حصص تحتاج إسنادًا: "+unfilled+". لا يمكن اعتماد جدول ناقص.":"؛ راجعي الجدول ثم احفظي واعتمدي.");
    }catch(err){
      console.error("reserve auto generation",err);
      await loadAll().catch(()=>{});renderWorkspaceCard("auto");
      const fail=byId("reserveDayMsg");if(fail)fail.textContent=
        "تعذر إكمال التوليد: "+(err?.message||"خطأ غير معروف")+
        ". ما تم حفظه باقٍ كمسودة؛ أعيدي التوليد لإكمال الناقص.";
    }finally{
      const next=byId("reserveGenerate");if(next){next.disabled=false;next.textContent="توليد آلي للمعلمات المحددات";}
    }
  });

  document.querySelectorAll(".reserve-save-assignee").forEach(b=>b.onclick=async()=>{
    const tr=b.closest("[data-assignment]");
    const target=tr?.querySelector(".reserve-assignee")?.value||"";
    const msg=byId("reserveDayMsg");
    if(!target){if(msg)msg.textContent="اختاري المعلمة المسددة قبل الحفظ.";return;}
    b.disabled=true;
    if(msg)msg.textContent="جارٍ حفظ التعديل...";
    try{
      const result=await reserveCommitFlexibleAssignee(tr.dataset.assignment,target);
      renderWorkspaceCard("auto");
      const done=byId("reserveDayMsg");if(done)done.textContent="تم الحفظ";
      try{await reserveSyncAdminMutation(result.date);}
      catch(error){console.error(error);if(done)done.textContent="تم الحفظ، لكن تعذر تحديث بعض البطاقات.";}
    }catch(error){console.error("تعذر تعديل التكليف الآلي",error);
      const current=byId("reserveDayMsg")||msg;
      if(current)current.textContent=`تعذر حفظ التعديل: ${error.message||"خطأ غير معروف"}`;
      // Restore the persisted teacher after a rejected automatic reassignment.
      const persisted=state.assignments.find(a=>String(a.id)===String(tr.dataset.assignment));
      const select=tr.querySelector(".reserve-assignee");
      if(select&&persisted)select.value=String(persisted.assignedTeacherId||"");
      b.disabled=false;
    }
  });
  document.querySelectorAll(".reserve-delete-assignment").forEach(b=>b.onclick=async()=>{
    const tr=b.closest("[data-assignment]"); if(!confirm("حذف هذا التكليف؟"))return;
    const msg=byId("reserveDayMsg");b.disabled=true;if(msg)msg.textContent="جارٍ الحذف...";
    try{
      await ensureAdmin();await deleteKind(K.assignment,tr.dataset.assignment,token());
      await loadAll();renderWorkspaceCard("auto");
      await reserveSyncAdminMutation(state.currentDate);
      const done=byId("reserveDayMsg");if(done)done.textContent="تم الحذف";
    }catch(error){console.error(error);const current=byId("reserveDayMsg")||msg;
      if(current)current.textContent="تعذر الحذف: "+(error?.message||"خطأ غير معروف");
    }finally{b.disabled=false;}
  });
  // Links are grouped by teacher and date, even if that teacher has multiple periods.
  const groupedForRow=button=>{
    const tr=button.closest("[data-assignment]");
    const a=state.assignments.find(x=>String(x.id)===String(tr?.dataset.assignment));
    return a?.published?reservePublishedTeacherGroups(a.date).find(g=>g.id===String(a.assignedTeacherId)):null;
  };
  document.querySelectorAll(".reserve-copy-ack").forEach(b=>b.onclick=async()=>{
    const group=groupedForRow(b);if(group)await reserveCopyText(reserveTeacherBundleUrl(group));
  });
  document.querySelectorAll(".reserve-open-ack").forEach(b=>b.onclick=()=>{
    const group=groupedForRow(b);if(group)window.open(reserveTeacherBundleUrl(group),"_blank","noopener,noreferrer");
  });
  document.querySelectorAll(".reserve-send-ack").forEach(b=>b.onclick=()=>{
    const group=groupedForRow(b);if(group)reserveOpenWhatsapp(group);
  });
  byId("reserveDeleteAutoTable")?.addEventListener("click",async()=>{
    const date=state.currentDate,msg=byId("reserveDayMsg"),button=byId("reserveDeleteAutoTable");
    if(button.disabled)return;
    const count=assignmentsOn(date).filter(a=>a.manual!==true).length;
    const absences=absencesOn(date).filter(a=>a.source==="auto").length;
    if(!count&&!absences){msg.textContent="لا يوجد جدول آلي لحذفه.";return;}
    if(!confirm(`هل تريدين حذف جدول الإنشاء الآلي ليوم ${dayName(date)} الموافق ${fmtDate(date)}؟\nسيُحذف ${count} تكليف آلي مع سجلات الغياب الآلية غير المستخدمة.\nستبقى التكليفات اليدوية والجداول الأخرى محفوظة.`))return;
    button.disabled=true;button.textContent="جارٍ الحذف...";button.setAttribute("aria-busy","true");
    reserveTableDeleteNotice("auto","busy","جدول الإنشاء الآلي — "+fmtDate(date));
    try{
      const result=await reserveDeleteTableForDate("auto",date);
      // Unselect the multi-select immediately; surviving shared absences remain in DB.
      if(state.currentDate===date){
        state.autoAbsentIds=[];
        state.autoAbsentSelectionResetDate=date;
        if(state.lastReserveWarnings?.date===date&&state.lastReserveWarnings.source==="auto")state.lastReserveWarnings=null;
      }
      renderWorkspaceCard("auto");
      reserveTableDeleteNotice("auto","success",result.syncWarning?
        "حُذف الجدول وتأكد حفظ التغيير، لكن تعذر تحديث بعض البطاقات.":
        "جدول الإنشاء الآلي — "+fmtDate(date));
    }catch(err){
      console.error("تعذر حذف جدول الاحتياط الآلي",err);
      reserveTableDeleteNotice("auto","error","لم يكتمل التحقق من الحذف؛ قد تكون بعض السجلات حُذفت. "+(err?.message||"أعيدي المحاولة."));
    }finally{
      const next=byId("reserveDeleteAutoTable");
      if(next){next.disabled=false;next.textContent="حذف الجدول";next.removeAttribute("aria-busy");}
    }
  });
  byId("reserveApproveAuto")?.addEventListener("click",async()=>{
    const msg=byId("reserveDayMsg"),button=byId("reserveApproveAuto"),date=state.currentDate;
    const entries=[...document.querySelectorAll('#reserveAssignmentsAdmin tr[data-assignment]')]
      .map(tr=>({id:String(tr.dataset.assignment),teacherId:String(tr.querySelector('.reserve-assignee')?.value||'')}));
    const items=assignmentsOn(date).filter(a=>a.manual!==true);
    if(!items.length){msg.textContent="لا توجد تكليفات آلية لهذا اليوم. اختاري الغائبات واضغطي «توليد آلي» أولًا.";return}
    if(items.some(a=>!entries.some(x=>x.id===String(a.id)&&x.teacherId&&teacherOf(x.teacherId)))){
      msg.textContent="يجب اختيار معلمة لكل حصة من القوائم المنسدلة قبل الاعتماد.";return;
    }
    button.disabled=true;button.textContent="جارٍ الحفظ...";msg.textContent="جارٍ الحفظ والاعتماد...";
    try{
      await ensureAdmin();
      await loadAll();
      const fresh=assignmentsOn(date).filter(a=>a.manual!==true);
      if(fresh.length!==items.length||items.some(a=>!fresh.some(b=>String(a.id)===String(b.id))))
        throw new Error("تغيّرت تكليفات اليوم؛ أعيدي فتح الجدول قبل الاعتماد.");
      // Revalidate the completed plan against the latest cloud data before publishing.
      if(items.some(a=>!entries.some(x=>x.id===String(a.id)&&x.teacherId)))
        throw new Error("يجب إسناد جميع الحصص قبل الاعتماد.");
      assertAutoReserveFullCoverage(date);
      assertAutoReservePlannedCapacity(date,items.map(a=>({
        teacherId:entries.find(x=>x.id===String(a.id))?.teacherId||"",id:String(a.id)
      })));
      // Recheck mandatory daily and weekly ceilings plus health and exclusions before publishing.
      let saved=0;
      const selectedAssignments=items.map(a=>({
        teacherId:entries.find(x=>x.id===String(a.id))?.teacherId||"",
        period:Number(a.period),className:a.className,existingId:String(a.id)
      }));
      // Conflict warnings are non-blocking administrative overrides.
      const allWarnings=manualConflictMessages(date,selectedAssignments,
        [...new Set(absencesOn(date).map(x=>String(x.teacherId)))]);
      for(const a of items){
        const teacherId=entries.find(x=>x.id===String(a.id))?.teacherId;
        const t=teacherOf(teacherId);
        if(!t)throw new Error("Missing selected teacher");
        const changed=String(a.assignedTeacherId)!==teacherId;
        const previousWarnings=Array.isArray(a.manualOverrideWarnings)?a.manualOverrideWarnings:[];
        const warnings=changed?manualConflictMessages(date,[{
          teacherId,period:Number(a.period),className:a.className,existingId:String(a.id)
        }],[...new Set(absencesOn(date).map(x=>String(x.teacherId)))])
          :previousWarnings;
        // A saved teacher can still have non-blocking constraints; keep their
        // audit evidence even when the selection is unchanged.
        const finalWarnings=warnings.length?warnings:allWarnings.filter(w=>w.startsWith(`${t.name}:`));
        const overridden=changed||a.manualOverride===true||finalWarnings.length>0;
        const data={...plainData(a),assignedTeacherId:teacherId,assignedTeacherName:t.name,
          manual:false,source:"auto",fullCadreEnabled:a.fullCadreEnabled===true,candidates:(a.candidates||[]).slice(0,1),
          manualOverride:overridden,manualOverrideWarnings:finalWarnings,
          published:true,status:"معتمد"};
        if(changed){data.ackAt="";data.activationTitle="";data.activationAt="";data.ackToken=uid()}
        const auditChanged=overridden!==a.manualOverride||JSON.stringify(finalWarnings)!==JSON.stringify(previousWarnings);
        if(changed||a.published!==true||auditChanged){
          const written=await patchKind(K.assignment,a.id,data,token(),"معتمد");
          if(!written?.id||String(written.id)!==String(a.id))throw new Error("قاعدة البيانات لم تؤكد حفظ إحدى حصص الإنشاء الآلي.");
          saved++;
        }
      }
      await loadAll();
      const persisted=assignmentsOn(date);
      assertAutoReservePlannedCapacity(date,persisted.filter(a=>a.manual!==true).map(a=>({
        teacherId:String(a.assignedTeacherId||""),id:String(a.id)
      })));
      if(items.some(item=>{
         const selected=entries.find(x=>x.id===String(item.id));
         return !selected||!persisted.some(a=>String(a.id)===String(item.id)&&
           String(a.assignedTeacherId)===selected.teacherId&&a.manual!==true&&a.published===true&&
           (a.manualOverride!==true||Array.isArray(a.manualOverrideWarnings)));
      }))
        throw new Error("لم يكتمل اعتماد جميع التكليفات الآلية");
      state.lastReserveWarnings={date,source:"auto",warnings:allWarnings};
      renderWorkspaceCard("auto");
      byId("reserveDayMsg").textContent="تم الحفظ والاعتماد، وأصبح جدول اليوم ظاهرًا في النشر.";
      showReserveWorkspaceWarnings("reserveAutoWarnings",allWarnings);
      try{await reserveSyncAdminMutation(date)}
      catch(syncError){console.error("تعذر تحديث العرض بعد حفظ الجدول الآلي",syncError);
        const current=byId("reserveDayMsg");if(current)current.textContent="تم الحفظ، لكن تعذر تحديث بعض البطاقات. أعيدي فتح القسم.";}
    }catch(err){console.error(err);const current=byId("reserveDayMsg")||msg;
      if(current)current.textContent=`تعذر اكتمال الاعتماد أو التحقق منه: ${err.message||"خطأ غير معروف"}. قد تكون بعض الحصص محفوظة.`;}
    finally{button.disabled=false;button.textContent="حفظ واعتماد جدول اليوم";}
  });
}

function bindTeachersAdmin(){
  byId("reserveTeacherForm")?.addEventListener("submit",async e=>{
    e.preventDefault(); const msg=byId("rtMsg");
    const button=e.target.querySelector('button[type="submit"]');
    if(button?.disabled)return;
    if(button){button.disabled=true;button.textContent="جارٍ الحفظ...";}
    msg.textContent="جارٍ الحفظ...";
    try{
      await insertKind(K.teacher,{
        name:clean(byId("rtName").value),subject:clean(byId("rtSubject").value),
        workload:Number(byId("rtWorkload").value||0),excluded:byId("rtExcluded").value==="1",
        active:true,createdAt:new Date().toISOString()
      },token());
      await loadAll(); renderAdminTab("teachers");
    }catch(err){console.error(err);msg.textContent="تعذر حفظ المعلمة"}
    finally{if(button?.isConnected){button.disabled=false;button.textContent="حفظ المعلمة";}}
  });
  document.querySelectorAll(".reserve-edit-schedule").forEach(b=>b.onclick=()=>{
    const row=b.closest("[data-teacher]"),t=teacherOf(row.dataset.teacher),ed=byId("reserveTeacherEditor");
    ed.innerHTML=scheduleEditorHTML(t);ed.style.display="block";ed.scrollIntoView({behavior:"smooth",block:"start"});
    byId("reserveCloseTeacherEditor").onclick=()=>ed.style.display="none";
    let savingSchedule=false,saveScheduleAgain=false;
    const saveSchedule=async()=>{
      if(savingSchedule){saveScheduleAgain=true;return}
      const button=byId("reserveSaveSchedule");
      if(!button)return;
      savingSchedule=true;
      button.disabled=true;
      button.textContent="جارٍ الحفظ...";
      let message=byId("reserveScheduleMessage");
      if(!message){
        message=document.createElement("div");message.id="reserveScheduleMessage";
        message.setAttribute("role","status");message.setAttribute("aria-live","polite");
        ed.appendChild(message);
      }
      try{
        do{
          saveScheduleAgain=false;
          const timetable={sun:[],mon:[],tue:[],wed:[],thu:[]};
          ed.querySelectorAll("[data-day][data-period]").forEach(i=>{
            timetable[i.dataset.day][Number(i.dataset.period)-1]=clean(i.value);
          });
          const existing=scheduleOf(t.id);
          const data={teacherId:String(t.id),teacherName:t.name,timetable,updatedAt:new Date().toISOString()};
          message.textContent="جارٍ الحفظ...";
          if(existing)await patchKind(K.schedule,existing.id,data,token());
          else await insertKind(K.schedule,data,token());
          await loadAll();
        }while(saveScheduleAgain);
        message.textContent="تم الحفظ";
      }catch(err){console.error(err);message.textContent="تعذر الحفظ، أعيدي المحاولة."}
      finally{
        savingSchedule=false;
        if(button.isConnected){button.disabled=false;button.textContent="حفظ الجدول";}
      }
    };
    byId("reserveSaveSchedule").onclick=saveSchedule;
    ed.querySelectorAll("[data-day][data-period]").forEach(input=>
      input.addEventListener("change",saveSchedule));
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
    if(b.disabled)return;
    b.disabled=true;b.textContent="جارٍ الحذف...";
    try{
      await patchKind(K.teacher,id,{...plainData(t),active:false},token());
      await loadAll();renderAdminTab("teachers");
    }catch(err){console.error(err);alert("تعذر حذف المعلمة؛ لم يتم تأكيد العملية.")}
    finally{if(b.isConnected){b.disabled=false;b.textContent="حذف";}}
  });
}

function bindSettingsAdmin(){
  byId("rwEmergency")?.addEventListener("change",()=>{
    const button=byId("reserveSaveSettings");
    if(button && !button.disabled)button.click();
  });
  byId("reserveSaveSettings")?.addEventListener("click",async()=>{
    const msg=byId("reserveSettingsMsg");
    const button=byId("reserveSaveSettings");
    if(button.disabled)return;
    button.disabled=true;
    msg.textContent="جارٍ الحفظ...";
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
    finally{if(button.isConnected)button.disabled=false}
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
    const shareQuery=new URLSearchParams(location.search);
    const deepDate=shareQuery.get("reserve_publish")||shareQuery.get("reserve_date")||"";
    if(/^\d{4}-\d{2}-\d{2}$/.test(deepDate)&&!state.deepLinkHandled){
      state.currentDate=deepDate;
      if(shareQuery.get("reserve_view")==="daily")state.publicOpenCards=["daily"];
    }
    view.innerHTML=publicHTML();
    decorateReservePortraitTables(byId("dailyReserveRoot"));
    bindPublic();
    if(!state.deepLinkHandled){
      const shareParams=new URLSearchParams(location.search);
      const publicationDate=shareParams.get("reserve_publish")||"";
      if(/^\d{4}-\d{2}-\d{2}$/.test(publicationDate))openReservePublication(publicationDate);
      state.deepLinkHandled=true;
    }
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