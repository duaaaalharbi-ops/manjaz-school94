/* Manjaz Nataj: three independent report-link cards. No existing module changed. */
(()=>{"use strict";
const PAGE="#nataj-reports",ORIGINAL="https://school-selfeval-compass.lovable.app",
API="https://idkjuqfxcweqekdkcktk.supabase.co",KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL",
ADMIN_EMAIL="munjz.s94@hotmail.com",SESSION_KEY="manjaz_admin_auth_session_v1";
const REPORTS=[
 {kind:"nataj_external_report_2025",title:"التقرير الخارجي المحدث٢٠٢٥"},
 {kind:"nataj_self_evaluation_1448",title:"تقرير التقويم المدرسي الذاتي ١٤٤٨"},
 {kind:"nataj_qudrat_tahsili_1447",title:"تحليل بطاقة القدرات والتحصيلي ١٤٤٧"}
];
const $=id=>document.getElementById(id),hdr=token=>({apikey:KEY,Authorization:"Bearer "+(token||KEY),"Content-Type":"application/json"});
const valid=value=>{try{const u=new URL(String(value||"").trim());return u.protocol==="https:"&&!!u.hostname&&!u.username&&!u.password;}catch(_){return false;}};
let saved=new Map(),scheduled=false,rendering=false,busy=false;
function hookHome(){
 if(location.hash&&location.hash!="#home")return;
 const el=document.querySelector("#manjazHome .nataj-entry");
 if(!el||el.getAttribute("href")===PAGE)return;
 el.href=PAGE;el.removeAttribute("target");el.removeAttribute("rel");
 el.setAttribute("aria-label","نَتاج – التقارير المدرسية");
}
async function token(){
 let session=null;
 try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");}catch(_){}
 if(!session?.access_token)return null;
 const now=Math.floor(Date.now()/1000);
 if(Number(session.expires_at||0)<=now+30){
  if(!session.refresh_token)return null;
  const refreshed=await fetch(API+"/auth/v1/token?grant_type=refresh_token",{
   method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},
   body:JSON.stringify({refresh_token:session.refresh_token})
  });
  if(!refreshed.ok)return null;
  const data=await refreshed.json();
  session={access_token:data.access_token,refresh_token:data.refresh_token||session.refresh_token,
   expires_at:data.expires_at||(now+Number(data.expires_in||3600)),user:data.user||{}};
  sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));
 }
 const res=await fetch(API+"/auth/v1/user",{headers:hdr(session.access_token),cache:"no-store"});
 if(!res.ok)return null;
 const user=await res.json();
 return String(user.email||"").trim().toLowerCase()===ADMIN_EMAIL?session.access_token:null;
}
async function signIn(email,password){
 const res=await fetch(API+"/auth/v1/token?grant_type=password",{
  method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},
  body:JSON.stringify({email,password})
 });
 if(!res.ok)throw Error("بيانات دخول الإدارة غير صحيحة.");
 const data=await res.json();
 if(!data.access_token)throw Error("لم تكتمل جلسة دخول الإدارة.");
 const session={access_token:data.access_token,refresh_token:data.refresh_token||"",
  expires_at:data.expires_at||(Math.floor(Date.now()/1000)+Number(data.expires_in||3600)),user:data.user||{}};
 sessionStorage.setItem(SESSION_KEY,JSON.stringify(session));
 const verified=await token();
 if(!verified)throw Error("الحساب الحالي لا يملك صلاحية الإدارة في منجز.");
 return verified;
}
async function api(query,init={}){
 const {adminToken,...other}=init;
 const res=await fetch(API+"/rest/v1/manjaz_nataj_report_links"+query,{
  cache:"no-store",...other,headers:{...hdr(adminToken),...(other.headers||{})}
 });
 if(!res.ok){
  const body=await res.json().catch(()=>({}));
  const msg=String(body.message||body.error_description||body.details||"رمز الخطأ "+res.status);
  throw Error(res.status===401||res.status===403?"انتهت صلاحية الدخول أو ليست لديك صلاحية حفظ الروابط ("+res.status+").":msg);
 }
 return res.status===204?null:res.json();
}
async function load(){
 const rows=await api("?select=report_key,url,updated_at&order=updated_at.desc&limit=3");
 saved=new Map();
 if(Array.isArray(rows))rows.forEach(row=>{
  if(REPORTS.some(r=>r.kind===row.report_key)&&!saved.has(row.report_key))saved.set(row.report_key,row);
 });
}
function makeCard(r){
 const row=saved.get(r.kind),prev=String(row?.url||"").trim();
 const card=document.createElement("article");card.className="nr-card";card.dataset.kind=r.kind;
 const h=document.createElement("h3");h.textContent=r.title;
 const label=document.createElement("label");label.textContent="رابط التقرير";
 const field=document.createElement("input");field.type="url";field.dir="ltr";field.inputMode="url";
 field.placeholder="https://";field.maxLength=1800;field.value=valid(prev)?prev:"";
 field.setAttribute("aria-label","رابط "+r.title);label.appendChild(field);
 const info=document.createElement("p");info.className="nr-note";info.textContent=valid(prev)?"الرابط محفوظ":"لم يُضف رابط لهذا التقرير بعد";
 const actions=document.createElement("div");actions.className="nr-actions";
 const btn=document.createElement("button");btn.type="button";btn.className="btn btn-primary";btn.textContent="حفظ الرابط";actions.appendChild(btn);
 if(valid(prev)){
  const a=document.createElement("a");a.className="btn btn-ghost";a.href=prev;a.target="_blank";
  a.rel="noopener noreferrer";a.textContent="فتح التقرير";actions.appendChild(a);
 }
 const status=document.createElement("p");status.className="nr-status";status.setAttribute("role","status");status.setAttribute("aria-live","polite");
 btn.onclick=async()=>{
  if(busy)return;
  const url=field.value.trim();
  if(!valid(url)){status.textContent="أدخلي رابط https صحيحًا ثم احفظيه.";return;}
  busy=true;btn.disabled=true;status.textContent="جارٍ حفظ الرابط…";
  try{
   const adminToken=await token();
   if(!adminToken){
    const form=$("nrAuthForm"),state=$("nrAuthStatus");
    if(form){form.hidden=false;if(state)state.textContent="سجّلي الدخول في النموذج أعلى البطاقات، ثم اضغطي حفظ الرابط مرة أخرى.";}
    throw Error("سجّلي الدخول إلى الإدارة من النموذج أعلى البطاقات أولًا.");
   }
   const now=new Date().toISOString(),payload={report_key:r.kind,url,updated_at:now};
   let persisted;
   if(row){
    const q="?"+new URLSearchParams({report_key:"eq."+r.kind});
    persisted=await api(q,{adminToken,method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({url,updated_at:now})});
   }else{
    persisted=await api("",{adminToken,method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(payload)});
   }
   if(!Array.isArray(persisted)||persisted.length!==1||persisted[0].report_key!==r.kind||persisted[0].url!==url)
    throw Error("لم تؤكد قاعدة البيانات حفظ الرابط المطلوب.");
   await load();
   if(saved.get(r.kind)?.url!==url)throw Error("تعذر التأكد من ظهور الرابط بعد حفظه.");
   if(location.hash===PAGE)renderCards();
  }catch(e){status.textContent="تعذر حفظ الرابط: "+(e.message||e);}
  finally{busy=false;btn.disabled=false;}
 };
 card.append(h,label,info,actions,status);return card;
}
function renderCards(){const grid=$("nrGrid");if(grid)grid.replaceChildren(...REPORTS.map(makeCard));}
async function render(){
 if(location.hash!==PAGE||rendering||$("nrPage"))return;
 const view=$("view");if(!view)return;
 rendering=true;
 try{
  const root=document.createElement("section");root.id="nrPage";
  const intro=document.createElement("div");intro.className="page-intro";
  intro.innerHTML='<div><span class="kicker">نَتاج – لوحة الأداء المدرسي</span><h2>التقارير المدرسية</h2><p>تقارير الأداء والتقويم والتحليل</p></div>';
  const toolbar=document.createElement("div");toolbar.className="nr-toolbar";
  const back=document.createElement("a");back.href="#home";back.className="btn btn-ghost";back.textContent="العودة للرئيسية";
  const original=document.createElement("a");original.href=ORIGINAL;original.className="btn btn-primary";
  original.target="_blank";original.rel="noopener noreferrer";original.textContent="فتح لوحة نتاج الأصلية";
  toolbar.append(back,original);
  const authPanel=document.createElement("section");authPanel.id="nrAuthPanel";authPanel.className="surface form-card";
  authPanel.innerHTML='<h3>دخول الإدارة لحفظ روابط التقارير</h3>'+
   '<p id="nrAuthStatus" role="status" aria-live="polite">روابط التقارير متاحة للاستعراض، وحفظها يتطلب صلاحية الإدارة.</p>'+
   '<form id="nrAuthForm"><div class="nr-auth-fields">'+
   '<label>البريد الإلكتروني للإدارة<input type="email" id="nrAuthEmail" autocomplete="username" value="munjz.s94@hotmail.com" required></label>'+
   '<label>كلمة المرور<input type="password" id="nrAuthPassword" autocomplete="current-password" required></label>'+
   '</div><button type="submit" class="btn btn-primary" id="nrAuthSubmit">تسجيل دخول الإدارة</button></form>';
  const loginForm=authPanel.querySelector("#nrAuthForm");
  const loginState=authPanel.querySelector("#nrAuthStatus");
  const loginButton=authPanel.querySelector("#nrAuthSubmit");
  loginForm.onsubmit=async event=>{
   event.preventDefault();loginButton.disabled=true;loginState.textContent="جارٍ التحقق من صلاحية الإدارة…";
   try{
    await signIn(authPanel.querySelector("#nrAuthEmail").value.trim(),authPanel.querySelector("#nrAuthPassword").value);
    authPanel.querySelector("#nrAuthPassword").value="";
    loginForm.hidden=true;loginState.textContent="صلاحية الإدارة مفعّلة. يمكنك الآن حفظ رابط كل بطاقة.";
   }catch(err){loginState.textContent="تعذر تسجيل الدخول: "+(err.message||err);}
   finally{loginButton.disabled=false;}
  };
  const grid=document.createElement("div");grid.className="nr-grid";grid.id="nrGrid";
  root.append(intro,toolbar,authPanel,grid);view.replaceChildren(root);renderCards();
  try{await load();if(location.hash===PAGE)renderCards();}
  catch(_){if(location.hash===PAGE){const m=document.createElement("p");m.textContent="تعذر تحميل الروابط الآن. أعيدي فتح القسم.";root.insertBefore(m,grid);}}
  try{
   if(await token()){loginForm.hidden=true;loginState.textContent="صلاحية الإدارة مفعّلة. يمكنك حفظ روابط التقارير.";}
  }catch(_){} 
 }finally{rendering=false;}
}
function styles(){
 if($("nrStyle"))return;
 const st=document.createElement("style");st.id="nrStyle";
 st.textContent="#nrPage{direction:rtl;max-width:1080px;margin:0 auto;font-family:Tahoma,Arial,sans-serif}"+
 "#nrPage .nr-toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 18px}"+
 "#nrPage #nrAuthPanel{padding:16px;margin:0 0 18px;border:1px solid #c5dbdd;border-radius:12px;background:#f7fbfb}"+
 "#nrPage #nrAuthPanel h3{margin:0 0 8px;font-size:16px}"+
 "#nrPage #nrAuthPanel p{margin:0 0 12px;line-height:1.7;color:#365f66}"+
 "#nrPage .nr-auth-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-bottom:12px}"+
 "#nrPage .nr-auth-fields label{display:grid;gap:7px;min-width:0;font-size:13px}"+
 "#nrPage .nr-auth-fields input{width:100%;box-sizing:border-box;min-height:43px;padding:10px;border:1px solid #abc5c9;border-radius:8px;background:white;font-size:15px}"+
 "#nrPage .nr-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}"+
 "#nrPage .nr-card{min-width:0;display:flex;flex-direction:column;gap:12px;background:#fff;border:1px solid #d2e4e3;border-top:4px solid #137d7e;border-radius:14px;padding:20px 16px}"+
 "#nrPage .nr-card h3{margin:0;color:#164556;font-size:17px;line-height:1.65;min-height:85px}"+
 "#nrPage .nr-card label{display:grid;gap:7px;font-size:13px;font-weight:700;color:#345662}"+
 "#nrPage .nr-card input{width:100%;box-sizing:border-box;min-height:42px;padding:10px;border:1px solid #abc5c9;border-radius:8px;background:#fff;font-size:15px}"+
 "#nrPage .nr-note{margin:0;color:#58727b;font-size:12px}"+
 "#nrPage .nr-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}"+
 "#nrPage .nr-actions .btn{font-size:13px;min-height:42px;display:inline-flex;align-items:center;justify-content:center}"+
 "#nrPage .nr-status{font-size:12px;color:#9d3933;line-height:1.7;margin:0}"+
 "@media(max-width:820px){#nrPage .nr-grid,#nrPage .nr-auth-fields{grid-template-columns:1fr}#nrPage .nr-card h3{min-height:0}}";
 document.head.appendChild(st);
}
function sync(){styles();if(location.hash===PAGE)render();else hookHome();}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;sync();},0);}
addEventListener("hashchange",schedule);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
const view=$("view");if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
})();