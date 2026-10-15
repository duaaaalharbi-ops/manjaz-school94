/* MANJAZ DAILY RESERVE 1.0
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
  settings:"reserve_settings"
};

const DAYS=[
  ["sun","الأحد",0],["mon","الاثنين",1],["tue","الثلاثاء",2],["wed","الأربعاء",3],["thu","الخميس",4]
];
const PERIODS=[1,2,3,4,5,6,7];
const DEFAULT_WEIGHTS={week:30,term:10,daily:18,workload:0.35,consecutive:9};
let state={teachers:[],schedules:[],absences:[],assignments:[],settings:null,admin:null,currentDate:todayISO()};

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
  try{return new Intl.DateTimeFormat("ar-SA",{year:"numeric",month:"2-digit",day:"2-digit"}).format(parseDate(s))}
  catch(_){return s}
}

function baseHeaders(token){
  return {
    "apikey":SUPABASE_KEY,
    "Authorization":`Bearer ${token||SUPABASE_KEY}`,
    "Content-Type":"application/json"
  };
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
  const [teachers,schedules,absences,assignments,settings]=await Promise.all([
    fetchKind(K.teacher),fetchKind(K.schedule),fetchKind(K.absence),fetchKind(K.assignment),fetchKind(K.settings)
  ]);
  state.teachers=teachers.filter(x=>x.active!==false);
  state.schedules=schedules;
  state.absences=absences;
  state.assignments=assignments;
  state.settings=settings[0]||null;
}
function scheduleOf(teacherId){
  return state.schedules.find(x=>String(x.teacherId)===String(teacherId))||null;
}
function teacherOf(id){return state.teachers.find(x=>String(x.id)===String(id))||null}
function weights(){return {...DEFAULT_WEIGHTS,...(state.settings?.weights||{})}}
function termStart(){return state.settings?.termStart||""}

function publishedAssignments(){
  return state.assignments.filter(x=>x.published===true&&x.status!=="ملغي");
}
function assignmentCounts(referenceDate){
  const wr=weekRange(referenceDate),start=termStart();
  const pub=publishedAssignments();
  const map=new Map();
  state.teachers.forEach(t=>map.set(String(t.id),{daily:0,week:0,term:0,days:{sun:0,mon:0,tue:0,wed:0,thu:0}}));
  pub.forEach(a=>{
    const s=map.get(String(a.assignedTeacherId)); if(!s)return;
    if(!start||a.date>=start)s.term++;
    if(inRange(a.date,wr.start,wr.end)){
      s.week++; if(s.days[a.dayKey]!=null)s.days[a.dayKey]++;
    }
    if(a.date===referenceDate)s.daily++;
  });
  return map;
}
function publicWeeklyRows(referenceDate){
  const counts=assignmentCounts(referenceDate);
  return state.teachers.slice().sort((a,b)=>clean(a.name).localeCompare(clean(b.name),"ar"))
    .map(t=>({teacher:t,count:counts.get(String(t.id))||{week:0,term:0,days:{}}}));
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

function candidateRanking(date,period,absentTeacherId,exceptAssignmentId=""){
  const counts=assignmentCounts(date),w=weights();
  const candidates=[];
  state.teachers.forEach(t=>{
    if(String(t.id)===String(absentTeacherId))return;
    if(t.active===false||t.excluded===true)return;
    if(isAbsent(t.id,date))return;
    if(regularCell(t.id,date,period))return;
    if(occupiedByReserve(t.id,date,period,exceptAssignmentId))return;
    const c=counts.get(String(t.id))||{daily:0,week:0,term:0};
    const consecutive=consecutivePenalty(t.id,date,period);
    const score=
      c.week*w.week+
      c.term*w.term+
      c.daily*w.daily+
      Number(t.workload||0)*w.workload+
      consecutive*w.consecutive;
    candidates.push({
      teacherId:String(t.id),name:t.name||"",workload:Number(t.workload||0),
      week:c.week,term:c.term,daily:c.daily,consecutive,score:Number(score.toFixed(2))
    });
  });
  return candidates.sort((a,b)=>a.score-b.score||a.week-b.week||a.term-b.term||a.workload-b.workload||a.name.localeCompare(b.name,"ar")).slice(0,3);
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
  @media(max-width:760px){
    .reserve-grid{grid-template-columns:1fr}
    .schedule-day{grid-template-columns:80px repeat(7,95px)}
    .schedule-matrix{overflow:auto}
  }
  @media print{
    .sidebar,.mobile-nav,.reserve-no-print,.manjaz-brand-header,#manjazVersionBadge{display:none!important}
    .content{margin:0!important;padding:0!important}
    #dailyReserveRoot{display:block}
    .reserve-table-wrap{border:0;overflow:visible}
    .reserve-table{min-width:0;font-size:11px}
  }`;
  document.head.appendChild(s);
}

function publicHTML(){
  const date=state.currentDate,wr=weekRange(date);
  const daily=assignmentsOn(date).filter(x=>x.published===true);
  const rows=publicWeeklyRows(date);
  const ackToken=new URLSearchParams(location.search).get("reserve_ack")||"";
  const ack=ackToken?state.assignments.find(x=>x.ackToken===ackToken&&x.published===true):null;
  return `<div id="dailyReserveRoot">
    <section class="page-intro"><div>
      <span class="kicker">منجز</span>
      <h2>الاحتياط اليومي</h2>
      <p>جدول الاحتياط المعتمد والحسبة الأسبوعية التراكمية للمعلمات</p>
    </div></section>

    ${ack?`<section class="reserve-ack reserve-no-print">
      <strong>تأكيد الاطلاع على التكليف</strong>
      <div>${esc(ack.assignedTeacherName)} — الحصة ${esc(ack.period)} — ${esc(ack.className||"")}</div>
      <div>${esc(dayName(ack.date))} ${esc(fmtDate(ack.date))}</div>
      ${ack.ackAt?`<span class="reserve-status">تم الاطلاع ${esc(new Date(ack.ackAt).toLocaleString("ar-SA"))}</span>`:
      `<button class="btn btn-primary" id="reserveAckBtn">اطلعت</button>`}
      <div id="reserveAckMsg"></div>
    </section>`:""}

    <section class="surface panel">
      <div class="panel-head"><h3>جدول الاحتياط اليومي</h3><span>${esc(dayName(date))} — ${esc(fmtDate(date))}</span></div>
      <div class="reserve-no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <input id="reservePublicDate" type="date" value="${esc(date)}">
        <button class="btn btn-ghost" type="button" id="reservePrint">طباعة الجدول</button>
        <button class="btn btn-ghost" type="button" id="reserveAdminOpen">دخول الإدارة</button>
      </div>
      <div class="reserve-table-wrap">
        <table class="reserve-table"><thead><tr><th>الحصة</th><th>الفصل</th><th>المعلمة الغائبة</th><th>معلمة الاحتياط</th><th>حالة الاطلاع</th></tr></thead>
        <tbody>${daily.length?daily.sort((a,b)=>Number(a.period)-Number(b.period)).map(a=>`<tr>
          <td>${esc(a.period)}</td><td>${esc(a.className||"—")}</td><td>${esc(a.absentTeacherName||"—")}</td>
          <td><strong>${esc(a.assignedTeacherName||"—")}</strong></td>
          <td>${a.ackAt?'<span class="reserve-status">تم الاطلاع</span>':'<span class="reserve-status pending">بانتظار الاطلاع</span>'}</td>
        </tr>`).join(""):`<tr><td colspan="5">لا يوجد جدول احتياط معتمد لهذا اليوم</td></tr>`}</tbody></table>
      </div>
    </section>

    <section class="surface panel">
      <div class="panel-head"><h3>الحسبة الأسبوعية التراكمية للاحتياط</h3><span>${esc(fmtDate(wr.start))} – ${esc(fmtDate(wr.end))}</span></div>
      <div class="reserve-no-print" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
        <button class="reserve-tab active" type="button" data-week-shift="0">الأسبوع الحالي</button>
        <button class="reserve-tab" type="button" data-week-shift="-7">الأسبوع السابق</button>
      </div>
      <div id="reserveWeeklyHolder">${weeklyTableHTML(rows,date)}</div>
      <p class="reserve-public-note">الأرقام للعرض فقط وتتحدث تلقائيًا بعد اعتماد أو إلغاء أو استبدال تكليف الاحتياط.</p>
    </section>

    <section id="reserveAdminMount" class="reserve-no-print"></section>
  </div>`;
}
function weeklyTableHTML(rows,referenceDate){
  return `<div class="reserve-table-wrap"><table class="reserve-table"><thead><tr>
    <th>المعلمة</th>${DAYS.map(d=>`<th>${d[1]}</th>`).join("")}<th>مجموع الأسبوع</th><th>التراكمي للفصل</th>
  </tr></thead><tbody>${rows.length?rows.map(r=>`<tr>
    <td><strong>${esc(r.teacher.name)}</strong></td>
    ${DAYS.map(d=>`<td>${Number(r.count.days?.[d[0]]||0)}</td>`).join("")}
    <td><strong>${Number(r.count.week||0)}</strong></td><td><strong>${Number(r.count.term||0)}</strong></td>
  </tr>`).join(""):`<tr><td colspan="8">لا توجد بيانات معلمات بعد</td></tr>`}</tbody></table></div>`;
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
      <button class="reserve-tab active" data-admin-tab="day">جدول اليوم</button>
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
      <div class="form-section-title">تسجيل غياب</div>
      <div class="form-grid">
        <label>التاريخ<input id="reserveAdminDate" type="date" value="${esc(date)}"></label>
        <label>المعلمة الغائبة<select id="reserveAbsentTeacher"><option value="">اختاري المعلمة</option>${state.teachers.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")}</select></label>
      </div>
      <div class="form-actions"><button class="btn btn-primary" id="reserveAddAbsence" type="button">تسجيل الغياب واستخراج الحصص</button></div>
      <div id="reserveDayMsg"></div>
      <div class="reserve-admin-list" style="margin-top:12px">${abs.length?abs.map(a=>`<div class="reserve-teacher-row">
        <strong>${esc(a.teacherName)}</strong><span>${(a.periods||[]).map(p=>`ح${p.period}: ${esc(p.className)}`).join(" — ")||"لا توجد حصص مسجلة"}</span>
        <button class="reserve-mini danger reserve-delete-absence" data-id="${esc(a.id)}">حذف الغياب</button>
      </div>`).join(""):'<div class="empty-inline">لا يوجد غياب مسجل لهذا اليوم</div>'}</div>
      <div class="form-actions" style="margin-top:12px"><button class="btn btn-primary" id="reserveGenerate" type="button">توليد أفضل 3 مرشحات</button></div>
    </section>

    <section class="surface panel">
      <div class="panel-head"><h3>توزيع الاحتياط</h3><span>${assign.length} تكليف</span></div>
      <div id="reserveAssignmentsAdmin">${adminAssignmentsHTML(assign)}</div>
      <div class="form-actions" style="margin-top:12px"><button class="btn btn-primary" id="reservePublish" type="button">اعتماد ونشر جدول اليوم</button></div>
    </section>
  </div>`;
}
function adminAssignmentsHTML(items){
  if(!items.length)return '<div class="empty-inline">سجلي الغياب ثم اضغطي توليد أفضل 3 مرشحات</div>';
  return `<div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>الحصة</th><th>الفصل</th><th>الغائبة</th><th>أفضل 3 مرشحات</th><th>المكلفة</th><th>الإجراءات</th></tr></thead>
  <tbody>${items.sort((a,b)=>Number(a.period)-Number(b.period)).map(a=>`<tr data-assignment="${esc(a.id)}">
    <td>${esc(a.period)}</td><td>${esc(a.className||"—")}</td><td>${esc(a.absentTeacherName)}</td>
    <td>${(a.candidates||[]).map((c,i)=>`<div class="reserve-candidate"><strong>${i+1}. ${esc(c.name)}</strong><small>الأسبوع ${c.week} | التراكمي ${c.term} | النصاب ${c.workload}</small><span class="reserve-score">درجة الترشيح: ${c.score}</span></div>`).join("")||"لا توجد مرشحات"}</td>
    <td><select class="reserve-assignee">${(a.candidates||[]).map(c=>`<option value="${esc(c.teacherId)}" ${String(c.teacherId)===String(a.assignedTeacherId)?"selected":""}>${esc(c.name)}</option>`).join("")}</select></td>
    <td><div class="reserve-actions"><button class="reserve-mini reserve-save-assignee">حفظ</button>${a.published?`<button class="reserve-mini reserve-copy-ack">نسخ رابط الاطلاع</button>`:""}<button class="reserve-mini danger reserve-delete-assignment">حذف</button></div></td>
  </tr>`).join("")}</tbody></table></div>`;
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
        <strong>${esc(t.name)}</strong><span>${esc(t.subject||"")} — النصاب: ${Number(t.workload||0)} ${t.excluded?'<span class="reserve-status pending">مستبعدة مؤقتًا</span>':""}</span>
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
    <div class="schedule-matrix">${DAYS.map(d=>`<div class="schedule-day"><strong>${d[1]}</strong>${PERIODS.map(p=>`<input data-day="${d[0]}" data-period="${p}" placeholder="ح${p}" value="${esc(tt?.[d[0]]?.[p-1]||"")}">`).join("")}</div>`).join("")}</div>
    <div class="form-actions"><button class="btn btn-primary" id="reserveSaveSchedule" data-teacher="${esc(t.id)}">حفظ الجدول</button></div>`;
}
function settingsHTML(){
  const w=weights();
  return `<section class="surface form-card">
    <div class="form-section-title">إعدادات معادلة الترشيح</div>
    <p class="reserve-public-note">الأقل درجة يحصل على أولوية أعلى. المعادلة لا تستبدل شروط الأهلية: يجب أن تكون المعلمة فارغة وغير غائبة وغير مكلفة في نفس الحصة.</p>
    <div class="form-grid">
      <label>وزن احتياط الأسبوع<input id="rwWeek" type="number" step="0.1" value="${w.week}"></label>
      <label>وزن التراكمي للفصل<input id="rwTerm" type="number" step="0.1" value="${w.term}"></label>
      <label>وزن احتياط اليوم<input id="rwDaily" type="number" step="0.1" value="${w.daily}"></label>
      <label>وزن النصاب<input id="rwWorkload" type="number" step="0.01" value="${w.workload}"></label>
      <label>عقوبة الحصص المتجاورة<input id="rwConsecutive" type="number" step="0.1" value="${w.consecutive}"></label>
      <label>بداية الفصل للتراكمي<input id="rwTermStart" type="date" value="${esc(state.settings?.termStart||"")}"></label>
    </div>
    <div class="form-actions"><button class="btn btn-primary" id="reserveSaveSettings">حفظ الإعدادات</button></div><div id="reserveSettingsMsg"></div>
  </section>`;
}

async function refreshAndRenderPublic(){
  await loadAll(); renderPage();
}
function mountAdminShell(){
  const mount=byId("reserveAdminMount"); if(!mount)return;
  mount.innerHTML=state.admin?adminHTML():loginHTML();
  if(state.admin)bindAdminShell(); else bindLogin();
}
function bindPublic(){
  byId("reservePublicDate")?.addEventListener("change",async e=>{state.currentDate=e.target.value||todayISO();renderPage()});
  byId("reservePrint")?.addEventListener("click",()=>window.print());
  byId("reserveAdminOpen")?.addEventListener("click",async()=>{
    const s=await validateSession().catch(()=>null);
    if(s)state.admin=s; mountAdminShell(); byId("reserveAdminMount")?.scrollIntoView({behavior:"smooth"});
  });
  document.querySelectorAll("[data-week-shift]").forEach(b=>b.onclick=()=>{
    document.querySelectorAll("[data-week-shift]").forEach(x=>x.classList.toggle("active",x===b));
    const ref=addDays(state.currentDate,Number(b.dataset.weekShift||0));
    byId("reserveWeeklyHolder").innerHTML=weeklyTableHTML(publicWeeklyRows(ref),ref);
  });
  const ack=new URLSearchParams(location.search).get("reserve_ack")||"";
  byId("reserveAckBtn")?.addEventListener("click",async()=>{
    const a=state.assignments.find(x=>x.ackToken===ack&&x.published===true);
    const msg=byId("reserveAckMsg"); if(!a||!msg)return;
    try{
      const data={...a,ackAt:new Date().toISOString()};
      delete data.id; delete data.createdAt; delete data.updatedAt;
      /* acknowledgement is the single public write allowed by this section */
      await patchKind(K.assignment,a.id,data,"","معتمد");
      msg.textContent="تم تسجيل اطلاعك بنجاح";
      await refreshAndRenderPublic();
    }catch(err){console.error(err);msg.textContent="تعذر تسجيل الاطلاع، أعيدي المحاولة"}
  });
}
function bindLogin(){
  byId("reserveCloseLogin")?.addEventListener("click",()=>{byId("reserveAdminMount").innerHTML=""});
  byId("reserveLoginForm")?.addEventListener("submit",async e=>{
    e.preventDefault(); const msg=byId("reserveLoginMsg");
    try{
      await login(clean(byId("reserveAdminEmail").value),byId("reserveAdminPassword").value);
      mountAdminShell();
    }catch(err){msg.textContent=err.message||"تعذر تسجيل الدخول"}
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
  renderAdminTab("day");
}
function renderAdminTab(tab){
  const body=byId("reserveAdminBody"); if(!body)return;
  body.innerHTML=tab==="teachers"?teachersAdminHTML():tab==="settings"?settingsHTML():dayAdminHTML();
  if(tab==="teachers")bindTeachersAdmin();
  else if(tab==="settings")bindSettingsAdmin();
  else bindDayAdmin();
}

function plainData(x){
  const y={...x}; delete y.id;delete y.createdAt;delete y.updatedAt; return y;
}
async function ensureAdmin(){if(!token())throw new Error("يلزم تسجيل الدخول الإداري")}

function bindDayAdmin(){
  byId("reserveAdminDate")?.addEventListener("change",async e=>{
    state.currentDate=e.target.value||todayISO(); renderPage(); await validateSession(); mountAdminShell();
  });
  byId("reserveAddAbsence")?.addEventListener("click",async()=>{
    const msg=byId("reserveDayMsg"),teacherId=byId("reserveAbsentTeacher").value,date=state.currentDate;
    const t=teacherOf(teacherId); if(!t){msg.textContent="اختاري المعلمة الغائبة";return}
    if(!dayKey(date)){msg.textContent="التاريخ المختار ليس من أيام الدوام الأحد–الخميس";return}
    const s=scheduleOf(teacherId),cells=s?.timetable?.[dayKey(date)]||[];
    const periods=cells.map((v,i)=>({period:i+1,className:clean(v)})).filter(x=>x.className);
    try{
      await ensureAdmin();
      if(absencesOn(date).some(x=>String(x.teacherId)===String(teacherId))){msg.textContent="الغياب مسجل مسبقًا لهذه المعلمة";return}
      await insertKind(K.absence,{date,dayKey:dayKey(date),teacherId:String(teacherId),teacherName:t.name,periods,createdAt:new Date().toISOString()},token());
      await loadAll(); renderAdminTab("day");
    }catch(err){console.error(err);msg.textContent="تعذر حفظ الغياب"}
  });
  document.querySelectorAll(".reserve-delete-absence").forEach(b=>b.onclick=async()=>{
    if(!confirm("حذف تسجيل الغياب؟"))return;
    await deleteKind(K.absence,b.dataset.id,token()); await loadAll(); renderAdminTab("day");
  });
  byId("reserveGenerate")?.addEventListener("click",async()=>{
    const msg=byId("reserveDayMsg");
    try{
      await ensureAdmin();
      const abs=absencesOn(state.currentDate);
      if(!abs.length){msg.textContent="لا يوجد غياب مسجل لهذا اليوم";return}
      const existing=assignmentsOn(state.currentDate);
      for(const a of abs){
        for(const p of (a.periods||[])){
          if(existing.some(x=>String(x.absentTeacherId)===String(a.teacherId)&&Number(x.period)===Number(p.period)))continue;
          const cand=candidateRanking(state.currentDate,p.period,a.teacherId);
          const first=cand[0]||null;
          await insertKind(K.assignment,{
            date:state.currentDate,dayKey:dayKey(state.currentDate),period:Number(p.period),className:p.className,
            absentTeacherId:String(a.teacherId),absentTeacherName:a.teacherName,
            candidates:cand,
            assignedTeacherId:first?.teacherId||"",assignedTeacherName:first?.name||"",
            published:false,status:"مسودة",ackToken:uid(),ackAt:"",
            createdAt:new Date().toISOString()
          },token(),"مسودة");
          await loadAll();
        }
      }
      renderAdminTab("day");
    }catch(err){console.error(err);msg.textContent="تعذر توليد الاحتياط"}
  });
  document.querySelectorAll(".reserve-save-assignee").forEach(b=>b.onclick=async()=>{
    const tr=b.closest("[data-assignment]"),id=tr.dataset.assignment;
    const a=state.assignments.find(x=>String(x.id)===String(id)); if(!a)return;
    const teacherId=tr.querySelector(".reserve-assignee").value;
    const c=(a.candidates||[]).find(x=>String(x.teacherId)===String(teacherId)); if(!c)return;
    const data={...plainData(a),assignedTeacherId:String(c.teacherId),assignedTeacherName:c.name,ackAt:""};
    await patchKind(K.assignment,id,data,token(),a.published?"معتمد":"مسودة");
    await loadAll(); renderAdminTab("day");
  });
  document.querySelectorAll(".reserve-delete-assignment").forEach(b=>b.onclick=async()=>{
    const tr=b.closest("[data-assignment]"); if(!confirm("حذف هذا التكليف؟"))return;
    await deleteKind(K.assignment,tr.dataset.assignment,token()); await loadAll(); renderAdminTab("day");
  });
  document.querySelectorAll(".reserve-copy-ack").forEach(b=>b.onclick=async()=>{
    const tr=b.closest("[data-assignment]"),a=state.assignments.find(x=>String(x.id)===String(tr.dataset.assignment));
    if(!a)return;
    const url=`${location.origin}${location.pathname}?reserve_ack=${encodeURIComponent(a.ackToken)}#daily-reserve`;
    try{await navigator.clipboard.writeText(url);b.textContent="تم النسخ"}catch(_){prompt("انسخي رابط الاطلاع:",url)}
  });
  byId("reservePublish")?.addEventListener("click",async()=>{
    const msg=byId("reserveDayMsg");
    try{
      const items=assignmentsOn(state.currentDate);
      if(!items.length){msg.textContent="لا توجد تكليفات لاعتمادها";return}
      for(const a of items){
        if(!a.assignedTeacherId)continue;
        await patchKind(K.assignment,a.id,{...plainData(a),published:true,status:"معتمد"},token(),"معتمد");
      }
      await loadAll(); renderPage(); await validateSession(); mountAdminShell();
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
      weights:{
        week:Number(byId("rwWeek").value||0),term:Number(byId("rwTerm").value||0),
        daily:Number(byId("rwDaily").value||0),workload:Number(byId("rwWorkload").value||0),
        consecutive:Number(byId("rwConsecutive").value||0)
      },
      termStart:byId("rwTermStart").value||"",updatedAt:new Date().toISOString()
    };
    try{
      if(state.settings)await patchKind(K.settings,state.settings.id,data,token());
      else await insertKind(K.settings,data,token());
      await loadAll();msg.textContent="تم حفظ الإعدادات";
    }catch(err){console.error(err);msg.textContent="تعذر حفظ الإعدادات"}
  });
}

async function renderPage(){
  if(!isRoute())return;
  injectStyle();
  const view=byId("view"); if(!view)return;
  view.innerHTML=`<section class="surface panel"><div class="panel-head"><h3>جارٍ تحميل الاحتياط اليومي</h3></div></section>`;
  try{await loadAll()}catch(err){
    console.error(err);
    view.innerHTML=`<section class="surface empty-state"><h3>تعذر تحميل بيانات الاحتياط حاليًا</h3><p>تحققي من الاتصال ثم أعيدي المحاولة.</p></section>`;
    return;
  }
  view.innerHTML=publicHTML();
  bindPublic();
  const s=await validateSession().catch(()=>null);
  if(s)state.admin=s;
}

addEventListener("hashchange",()=>setTimeout(renderPage,0));
addEventListener("popstate",()=>setTimeout(renderPage,0));
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>setTimeout(renderPage,0),{once:true});
else setTimeout(renderPage,0);

const view=byId("view");
if(view){
  let timer;
  new MutationObserver(()=>{
    if(!isRoute())return;
    if(byId("dailyReserveRoot"))return;
    clearTimeout(timer);timer=setTimeout(renderPage,50);
  }).observe(view,{childList:true,subtree:true});
}
})();