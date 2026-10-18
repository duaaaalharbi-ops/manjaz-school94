/* Manjaz v34: unified approvals, clean cards and administrative navigation. */
(()=>{"use strict";
const BASE="https://idkjuqfxcweqekdkcktk.supabase.co";
const KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const SESSION="manjaz_admin_auth_session_v1";
const ADMIN_EMAIL="munjz.s94@hotmail.com";
const STATUS="manjazApprovalV34Status";
let applying=false,working=false;
const css=document.createElement("style");css.id="manjazReviewV34CSS";
css.textContent=`
/* Use the established Manjaz petrol/turquoise palette and card geometry. */
#view:has(#achievementList) .mj18-utility-card{display:none!important}
#view:has(#achievementList) .achievement-card.mj34-partnership-hidden{display:none!important}
#view:has(#partnerList)>.page-intro,
#view:has(#partnerList)>.stat-grid,
#view:has(#partnerList)>.section-actions,
#view:has(#partnerList)>#partnerEmpty{display:none!important}
#view:has(#partnerList)>#partnerForm{display:none!important}
#view.mj34-add-partner:has(#partnerList)>#partnerForm{display:block!important;margin:0 0 16px}
#view:has(#partnerList) #partnerList{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,275px),1fr));gap:16px;margin-top:0}
#view.mj16-admin-only #mj15Dashboard .mj15-panel{
 background:#fff!important;border:1px solid #dae6e5!important;border-radius:14px!important;
 box-shadow:0 4px 16px rgba(10,61,70,.06)!important;color:#174852!important;overflow:hidden
}
#view.mj16-admin-only #mj15Dashboard .mj15-panel>summary{
 background:#f2f8f7!important;color:#0c4954!important;border-bottom:1px solid #d7e6e3!important;
 border-radius:0!important;padding:15px 18px!important;font-weight:800!important
}
#view.mj16-admin-only #mj15Dashboard .mj15-panel .mj15-body{background:#fff!important;padding:14px!important}
#view.mj16-admin-only #mj15Dashboard .admin-item{
 background:#fff;border:1px solid #e0ebea;border-radius:12px;padding:12px;gap:12px;margin:8px 0;align-items:center;
}
#view.mj16-admin-only #mj15Dashboard .admin-actions{display:flex;gap:8px;flex-wrap:wrap}
#view.mj16-admin-only #mj15Dashboard .admin-actions button{min-height:38px;border-radius:8px}
#mj15Powers .mj34-admin-select{width:100%;height:45px;border:1px solid #b9d8d6;border-radius:10px;
 background:#fff;color:#104b54;font:700 14px Tahoma,Arial,sans-serif;padding:8px 12px;direction:rtl}
#mj15Powers #mj15ReservePowers,#mj15Powers #mj15CertificatePowers{display:none}
#mj15Powers .mj34-admin-link{display:inline-block;margin:10px 0;color:#0a6666;font-weight:700}
#mj15Powers .mj34-hidden-legacy{display:none!important}
#mj15Powers .mj34-admin-intro{margin:6px 0 10px;color:#5a6e70}
#mj15Powers .mj34-inline-login{display:grid;gap:12px;max-width:570px;padding:14px;border:1px solid #cbdedc;border-radius:12px;background:#fbfdfd}
#mj15Powers .mj34-inline-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
#mj15Powers .mj34-inline-fields label{display:grid;gap:6px;color:#144b55;font-weight:700;min-width:0}
#mj15Powers .mj34-inline-fields input{width:100%;min-width:0;box-sizing:border-box;border:1px solid #bed5d4;border-radius:10px;background:#fff;color:#183a43;padding:12px;font:inherit;direction:ltr;text-align:left}
#mj15Powers .mj34-inline-login button,#mj15Powers .mj34-inline-logout{min-height:40px;border:0;border-radius:10px;background:#0b6067;color:white;padding:9px 16px;font:700 14px Tahoma,Arial,sans-serif;cursor:pointer}
#mj15Powers .mj34-inline-logout{background:#edf5f4;border:1px solid #bdd9d5;color:#15545b}
#mj15Powers .mj34-auth-feedback{font-size:13px;font-weight:600;line-height:1.6;min-height:18px}
#mj15Powers .mj34-inline-login[hidden],#mj15Powers .mj34-powers-protected[hidden]{display:none!important}
#mj15Powers .mj34-session-status{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px;color:#21565d}
@media(max-width:650px){#mj15Powers .mj34-inline-fields{grid-template-columns:1fr}}
#${STATUS}{margin:8px 0;padding:10px;border:1px solid #bfdad6;border-radius:9px;background:#f5faf9;font-weight:700}
@media(max-width:650px){#view.mj16-admin-only #mj15Dashboard .admin-item{display:flex;flex-wrap:wrap} }
`;
document.head.appendChild(css);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const kindFrom=x=>({"منجز":"achievement","تكريم":"award","شراكة":"partner",
"achievement":"achievement","award":"award","partner":"partner"})[x]||"";
function status(message,isError=false){
 const list=document.getElementById("adminList");
 if(!list)return;
 let el=document.getElementById(STATUS);
 if(!el){el=document.createElement("div");el.id=STATUS;el.setAttribute("role","status");el.setAttribute("aria-live","polite");list.parentElement?.insertBefore(el,list)}
 el.textContent=message;el.style.color=isError?"#a33330":"#075a53";
}
async function authorizedToken(){
 let s;try{s=JSON.parse(sessionStorage.getItem(SESSION)||"null")}catch{s=null}
 if(!s?.access_token)throw Error("يرجى تسجيل الدخول ببيانات الإدارة أولًا");
 if(s.expires_at&&Number(s.expires_at)<=Date.now()/1000+30){
  if(!s.refresh_token)throw Error("انتهت الجلسة الإدارية؛ أعيدي تسجيل الدخول");
  const renewal=await fetch(BASE+"/auth/v1/token?grant_type=refresh_token",{
   method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},
   body:JSON.stringify({refresh_token:s.refresh_token}),cache:"no-store"
  });
  if(!renewal.ok)throw Error("انتهت الجلسة الإدارية؛ أعيدي تسجيل الدخول");
  const refreshed=await renewal.json();
  s={...s,access_token:refreshed.access_token,refresh_token:refreshed.refresh_token||s.refresh_token,
   expires_at:Math.floor(Date.now()/1000)+Number(refreshed.expires_in||3600),user:refreshed.user||s.user};
  sessionStorage.setItem(SESSION,JSON.stringify(s));
 }
 const r=await fetch(BASE+"/auth/v1/user",{headers:{apikey:KEY,Authorization:"Bearer "+s.access_token},cache:"no-store"});
 if(!r.ok)throw Error("انتهت الجلسة الإدارية؛ أعيدي تسجيل الدخول");
 const u=await r.json();
 if(String(u.email||"").toLowerCase()!==ADMIN_EMAIL)
  throw Error("هذه الوظيفة مخصصة لحساب إدارة منجز");
 return s.access_token;
}
async function review(btn,decision){
 if(working)return;
 const kind=kindFrom(btn.dataset.kind),id=Number(btn.dataset.id);
 if(!kind||!Number.isSafeInteger(id)||id<1){status("الطلب غير محفوظ في قاعدة البيانات؛ يلزم رفع الإضافة سحابيًا أولًا",true);return}
 const reason=decision==="reject"?prompt("سبب رفض الطلب (اختياري):",""):"";
 if(reason===null)return;
 working=true;btn.disabled=true;
 const original=btn.textContent;btn.textContent=decision==="approve"?"جارٍ الاعتماد...":"جارٍ الرفض...";
 status(decision==="approve"?"جارٍ اعتماد الطلب في قسمه الأصلي...":"جارٍ حفظ قرار الرفض...");
 try{
  const token=await authorizedToken();
  const r=await fetch(BASE+"/rest/v1/rpc/manjaz_content_review_v34",{
   method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({p_kind:kind,p_id:id,p_decision:decision,p_reason:reason||""})
  });
  const result=await r.json().catch(()=>({}));
  if(!r.ok||String(result.id)!==String(id))throw Error(result.message||"لم تؤكد قاعدة البيانات حفظ القرار");
  status(decision==="approve"?"تم اعتماد الطلب ونشره في قسمه الأصلي":"تم حفظ الرفض");
  if(typeof window.refreshAllCloudCollections==="function")await window.refreshAllCloudCollections();
  if(typeof window.render==="function")window.render();
  else location.reload();
  const sum=document.querySelector('#mj15Dashboard .mj15-panel summary');
  if(sum)sum.textContent="اعتماد الطلبات";
  status(decision==="approve"?"تم اعتماد الطلب ونشره في قسمه الأصلي":"تم رفض الطلب");
 }catch(e){console.error(e);status("تعذر اعتماد الطلب: "+(e?.message||"خطأ غير معروف"),true)}
 finally{working=false;if(btn.isConnected){btn.disabled=false;btn.textContent=original}}
}

function setPowersAuthenticated(ready){
 const login=document.getElementById("mj34InlineAdminLogin");
 const protectedPanel=document.getElementById("mj34PowersProtected");
 if(!login||!protectedPanel)return;
 login.hidden=!!ready;protectedPanel.hidden=!ready;
 if(!ready){
  const select=document.getElementById("mj34PowersSelect");
  if(select)select.value="";
  for(const id of ["mj15ReservePowers","mj15CertificatePowers"]){
   const panel=document.getElementById(id);
   if(panel)panel.style.display="none";
  }
  const destination=document.getElementById("mj34PowerNavigation");
  if(destination)destination.replaceChildren();
 }
}
async function restoreInlinePowersLogin(){
 const form=document.getElementById("mj34InlineAdminLogin");
 if(!form)return;
 try{
  await authorizedToken();
  if(form.isConnected){setPowersAuthenticated(true);document.dispatchEvent(new Event('manjaz:admin-session-changed'));}
 }catch(_){
  if(form.isConnected)setPowersAuthenticated(false);
 }
}
function addInlinePowersAuth(body){
 const legacyLink=body.querySelector('a[href="#admin-permissions"]');
 if(legacyLink)legacyLink.classList.add("mj34-hidden-legacy");
 const lead=body.querySelector("p.mj15-hint");
 if(lead)lead.classList.add("mj34-hidden-legacy");
 const container=document.createElement("div");
 container.id="mj34InlinePowers";
 container.innerHTML=
  '<form id="mj34InlineAdminLogin" class="mj34-inline-login" autocomplete="on">'+
   '<strong>تسجيل الدخول إلى الصلاحيات الإدارية</strong>'+
   '<div class="mj34-inline-fields">'+
    '<label>اسم المستخدم<input id="mj34InlineUsername" type="email" autocomplete="username" placeholder="البريد الإلكتروني الإداري" required></label>'+
    '<label>كلمة المرور<input id="mj34InlinePassword" type="password" autocomplete="current-password" placeholder="كلمة المرور" required></label>'+
   '</div><div><button type="submit" id="mj34InlineLoginButton">دخول</button></div>'+
   '<div class="mj34-auth-feedback" id="mj34InlineAuthMessage" role="status" aria-live="polite"></div>'+
  '</form>'+
  '<div id="mj34PowersProtected" class="mj34-powers-protected" hidden>'+
   '<div class="mj34-session-status"><strong>تم تسجيل الدخول بصلاحية الإدارة</strong>'+
    '<button type="button" class="mj34-inline-logout" id="mj34InlineLogout">تسجيل الخروج</button></div>'+
   '<label for="mj34PowersSelect" class="mj34-admin-intro">اختاري الوظيفة الإدارية</label>'+
   '<select id="mj34PowersSelect" class="mj34-admin-select" aria-label="قائمة الصلاحيات الإدارية">'+
    '<option value="">اختاري من القائمة</option>'+
    '<option value="reserve">كشوف الاحتياط</option>'+
    '<option value="duty">كشوف المناوبة</option>'+
    '<option value="certificates">طلبات اعتماد الشهادات</option>'+
   '</select><div id="mj34PowerNavigation"></div>'+
  '</div>';
 body.insertBefore(container,body.firstChild);
 const form=container.querySelector("#mj34InlineAdminLogin");
 const button=container.querySelector("#mj34InlineLoginButton");
 const feedback=container.querySelector("#mj34InlineAuthMessage");
 form.addEventListener("submit",async e=>{
  e.preventDefault();
  if(button.disabled)return;
  const email=String(container.querySelector("#mj34InlineUsername").value||"").trim().toLowerCase();
  const password=container.querySelector("#mj34InlinePassword").value;
  button.disabled=true;button.textContent="جارٍ التحقق...";
  feedback.textContent="جارٍ التحقق من حساب الإدارة...";
  try{
   if(email!==ADMIN_EMAIL)throw Error("أدخلي البريد الإلكتروني الإداري المعتمد");
   const login=await fetch(BASE+"/auth/v1/token?grant_type=password",{
    method:"POST",headers:{apikey:KEY,"Content-Type":"application/json"},
    body:JSON.stringify({email,password}),cache:"no-store"
   });
   if(!login.ok)throw Error("اسم المستخدم أو كلمة المرور غير صحيحة");
   const result=await login.json();
   if(!result?.access_token)throw Error("لم يكتمل تسجيل الدخول");
   const verification=await fetch(BASE+"/auth/v1/user",{
    headers:{apikey:KEY,Authorization:"Bearer "+result.access_token},cache:"no-store"
   });
   if(!verification.ok)throw Error("تعذر التحقق من صلاحية الحساب");
   const user=await verification.json();
   if(String(user.email||"").toLowerCase()!==ADMIN_EMAIL)throw Error("الحساب لا يمتلك صلاحية الإدارة");
   sessionStorage.setItem(SESSION,JSON.stringify({
    access_token:result.access_token,refresh_token:result.refresh_token||"",
    expires_at:Math.floor(Date.now()/1000)+Number(result.expires_in||3600),
    user
   }));
   container.querySelector("#mj34InlinePassword").value="";
   feedback.textContent="";
   setPowersAuthenticated(true);
   document.dispatchEvent(new Event('manjaz:admin-session-changed'));
  }catch(err){
   container.querySelector("#mj34InlinePassword").value="";
   feedback.textContent=err?.message||"تعذر تسجيل الدخول";
   feedback.style.color="#aa302e";
  }finally{
   button.disabled=false;button.textContent="دخول";
  }
 });
 container.querySelector("#mj34InlineLogout").addEventListener("click",()=>{
  sessionStorage.removeItem(SESSION);
  form.reset();feedback.textContent="";
  setPowersAuthenticated(false);
  // Public approved certificates remain visible when an administrator logs out.
  document.dispatchEvent(new Event('manjaz:admin-session-changed'));
 });
 void restoreInlinePowersLogin();
}

function normalize(){
 if(applying)return;
 applying=true;
 try{
  const route=(location.hash||"#home").slice(1).split("&")[0].split("?")[0];
  const view=document.getElementById("view");if(!view)return;
  if(route==="partners"){
   // Keep legacy achievements tagged as partnership visible in this section.
   const list=document.getElementById("partnerList");
   if(list&&typeof window.getItems==="function"){
    const legacy=window.getItems().filter(x=>/الشراك/.test(String(x.category||""))&&x._kind!=="partner");
    for(const item of legacy){
     if(list.querySelector('[data-mj34-legacy-id="'+String(item.id)+'"]'))continue;
     const card=document.createElement("article");
     card.className="achievement-card mj34-legacy-partnership";
     card.dataset.mj34LegacyId=String(item.id);
     card.innerHTML='<div class="card-cover">'+
       (item.coverUrl?'<img loading="lazy" alt="" src="'+esc(item.coverUrl)+'">':'<div class="card-cover-placeholder">الشراكة المجتمعية</div>')+
       '</div><span class="badge">'+esc(item.status||"تحت المراجعة")+'</span>'+
       '<h3>'+esc(item.title||"شراكة مجتمعية")+'</h3>'+
       '<div class="meta"><span>'+esc(item.entity||item.team||"")+'</span><span>'+esc(item.date||"")+'</span></div>'+
       '<p>'+esc(item.impact||item.description||"")+'</p>'+
       '<button type="button" class="small-btn mj34-legacy-details">عرض التفاصيل</button>';
     card.querySelector(".mj34-legacy-details").onclick=()=>{if(typeof window.openDetails==="function")window.openDetails("achievement",String(item.id))};
     list.appendChild(card);
    }
   }
   const wantAdd=sessionStorage.getItem("manjaz_v34_add_partner")==="1";
   if(wantAdd&&document.getElementById("partnerForm")){
    sessionStorage.removeItem("manjaz_v34_add_partner");
    view.classList.add("mj34-add-partner");
    document.getElementById("showPartnerForm")?.click();
   }
   const form=document.getElementById("partnerForm");
   if(!wantAdd&&form&&form.style.display==="none")view.classList.remove("mj34-add-partner");
  }else view.classList.remove("mj34-add-partner");
  if(route==="achievements"){
    const list=document.getElementById("achievementList");
    if(list)for(const card of list.querySelectorAll(".achievement-card")){
      const category=card.querySelector(".meta span")?.textContent||"";
      if(/الشراك/.test(category))card.classList.add("mj34-partnership-hidden");
    }
  }
  if(route!=="admin")return;
  const dash=document.getElementById("mj15Dashboard");if(!dash)return;
  const section=dash.querySelector(".mj15-panel");
  const summary=section?.querySelector("summary");
  if(summary&&summary.textContent.includes("طلبات اعتماد المنجزات"))summary.innerHTML='<span class="mj15-number">١</span>اعتماد الطلبات';
  const approvals=document.getElementById("adminList");
  if(approvals){
   for(const approve of approvals.querySelectorAll("button.approve")){
    if(approve.dataset.mj34Bound)continue;
    approve.dataset.mj34Bound="1";
    const row=approve.closest(".admin-item");
    if(row&&!row.querySelector("button.mj34-reject")){
     const reject=document.createElement("button");reject.type="button";
     reject.className="small-btn mj34-reject";reject.textContent="رفض";
     reject.dataset.id=approve.dataset.id;reject.dataset.kind=approve.dataset.kind;approve.after(reject);
    }
   }
  }
  // Existing partnership-category achievements are classified as partnership
  // in the review UI, but keep their original record ID and kind for safe approval.
  for(const row of document.querySelectorAll('#adminList .admin-item')){
    const summary=row.querySelector("p");
    if(summary&&/^منجز\s*•\s*الشراك/.test(summary.textContent||""))
      summary.textContent=summary.textContent.replace(/^منجز/,"شراكة");
  }
  const powers=document.getElementById("mj15Powers");
  const body=powers?.querySelector(".mj15-body");
  if(body&&!body.querySelector("#mj34InlinePowers"))addInlinePowersAuth(body);
 }finally{applying=false}
}
document.addEventListener("click",e=>{
 const add=e.target.closest('a.manjaz-home-action.add[href="#partners"]');
 if(add)sessionStorage.setItem("manjaz_v34_add_partner","1");
 const approve=e.target.closest("button.approve[data-kind]");
 const reject=e.target.closest("button.mj34-reject");
 if(approve||reject){
  e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
  void review(approve||reject,reject?"reject":"approve");
 }
},true);
document.addEventListener("change",e=>{
 if(e.target.id!=="mj34PowersSelect")return;
 const select=e.target,val=select.value;
 if(!val)return;
 void (async()=>{
  try{await authorizedToken()}
  catch(error){
   setPowersAuthenticated(false);
   const message=document.getElementById("mj34InlineAuthMessage");
   if(message)message.textContent=error.message||"يرجى تسجيل الدخول مرة أخرى";
   return;
  }
  if(!select.isConnected)return;
  const powers=document.getElementById("mj15Powers");
  const reserve=powers?.querySelector("#mj15ReservePowers"),cert=powers?.querySelector("#mj15CertificatePowers");
  const nav=powers?.querySelector("#mj34PowerNavigation");
  if(reserve)reserve.style.display=val==="reserve"?"block":"none";
  if(cert)cert.style.display=val==="certificates"?"block":"none";
  if(nav)nav.innerHTML=val==="reserve"?'<a class="mj34-admin-link" href="#daily-reserve">فتح كشوف الاحتياط اليومي</a>':"";
  if(val==="duty")location.hash="#daily-duty";
  if(val==="certificates"){
   const panel=document.getElementById("mj15Powers");
   if(panel)panel.open=true;
   cert?.querySelector('[data-mj15-refresh]')?.click();
  }
 })();
});
function boot(){
 const view=document.getElementById("view");
 if(view)new MutationObserver(()=>queueMicrotask(normalize)).observe(view,{childList:true,subtree:true});
 normalize();addEventListener("hashchange",()=>queueMicrotask(normalize));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();