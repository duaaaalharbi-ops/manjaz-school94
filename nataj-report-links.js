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
 let session=null;try{session=JSON.parse(sessionStorage.getItem(SESSION_KEY)||"null");}catch(_){}
 if(!session?.access_token||session.expires_at&&session.expires_at<Date.now()/1000+20)return null;
 const res=await fetch(API+"/auth/v1/user",{headers:hdr(session.access_token),cache:"no-store"});
 if(!res.ok)return null;
 const user=await res.json();
 return String(user.email||"").trim().toLowerCase()===ADMIN_EMAIL?session.access_token:null;
}
async function api(query,init={}){
 const {adminToken,...other}=init;
 const res=await fetch(API+"/rest/v1/records"+query,{cache:"no-store",...other,headers:{...hdr(adminToken),...(other.headers||{})}});
 if(!res.ok)throw Error("رمز الخطأ "+res.status);
 return res.status===204?null:res.json();
}
async function load(){
 const kinds=REPORTS.map(x=>x.kind).join(",");
 const query="?"+new URLSearchParams({select:"id,kind,data,created_at",kind:"in.("+kinds+")",order:"created_at.desc",limit:"60"});
 const rows=await api(query);
 saved=new Map();
 if(Array.isArray(rows))rows.forEach(row=>{if(!saved.has(row.kind))saved.set(row.kind,row);});
}
function makeCard(r){
 const row=saved.get(r.kind),prev=String(row?.data?.url||"").trim();
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
   if(!adminToken)throw Error("يلزم تسجيل الدخول بصلاحيات الإدارة أولًا.");
   const now=new Date().toISOString(),value={data:{url,updatedAt:now},status:"معتمد",updated_at:now};
   if(row){
    const q="?"+new URLSearchParams({id:"eq."+row.id,kind:"eq."+r.kind});
    await api(q,{adminToken,method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(value)});
   }else await api("",{adminToken,method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({...value,kind:r.kind})});
   await load();if(location.hash===PAGE)renderCards();
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
  const grid=document.createElement("div");grid.className="nr-grid";grid.id="nrGrid";
  root.append(intro,toolbar,grid);view.replaceChildren(root);renderCards();
  try{await load();if(location.hash===PAGE)renderCards();}
  catch(_){if(location.hash===PAGE){const m=document.createElement("p");m.textContent="تعذر تحميل الروابط الآن. أعيدي فتح القسم.";root.insertBefore(m,grid);}}
 }finally{rendering=false;}
}
function styles(){
 if($("nrStyle"))return;
 const st=document.createElement("style");st.id="nrStyle";
 st.textContent="#nrPage{direction:rtl;max-width:1080px;margin:0 auto;font-family:Tahoma,Arial,sans-serif}"+
 "#nrPage .nr-toolbar{display:flex;flex-wrap:wrap;gap:10px;margin:10px 0 18px}"+
 "#nrPage .nr-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:15px}"+
 "#nrPage .nr-card{min-width:0;display:flex;flex-direction:column;gap:12px;background:#fff;border:1px solid #d2e4e3;border-top:4px solid #137d7e;border-radius:14px;padding:20px 16px}"+
 "#nrPage .nr-card h3{margin:0;color:#164556;font-size:17px;line-height:1.65;min-height:85px}"+
 "#nrPage .nr-card label{display:grid;gap:7px;font-size:13px;font-weight:700;color:#345662}"+
 "#nrPage .nr-card input{width:100%;box-sizing:border-box;min-height:42px;padding:10px;border:1px solid #abc5c9;border-radius:8px;background:#fff;font-size:15px}"+
 "#nrPage .nr-note{margin:0;color:#58727b;font-size:12px}"+
 "#nrPage .nr-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:auto}"+
 "#nrPage .nr-actions .btn{font-size:13px;min-height:42px;display:inline-flex;align-items:center;justify-content:center}"+
 "#nrPage .nr-status{font-size:12px;color:#9d3933;line-height:1.7;margin:0}"+
 "@media(max-width:820px){#nrPage .nr-grid{grid-template-columns:1fr}#nrPage .nr-card h3{min-height:0}}";
 document.head.appendChild(st);
}
function sync(){styles();if(location.hash===PAGE)render();else hookHome();}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;sync();},0);}
addEventListener("hashchange",schedule);
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",schedule,{once:true});else schedule();
const view=$("view");if(view)new MutationObserver(schedule).observe(view,{childList:true,subtree:true});
})();