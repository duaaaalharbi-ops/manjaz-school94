/* MANJAZ v45 — place certificate review in Requests, keep export permissions compact. */
(()=>{"use strict";
const STYLE_ID="mj45CertificateQueueStyle";
function injectCSS(){
 if(document.getElementById(STYLE_ID))return;
 const style=document.createElement("style");style.id=STYLE_ID;
 style.textContent=`
 #view.mj16-admin-only #mj15Requests>.mj15-body{display:grid;gap:14px}
 #view.mj16-admin-only #mj15Requests #mj15CertificatePowers{
   display:grid!important;grid-template-columns:minmax(0,1fr);gap:10px;
   width:100%;max-width:100%;margin:0;padding:0;background:transparent!important;
   border:0!important;box-shadow:none!important
 }
 #view.mj16-admin-only #mj15Requests #mj15CertificatePowers>.mj13-card,
 #view.mj16-admin-only #mj15Requests #mj15CertificatePowers #mj13ExportCards{display:none!important}
 #view.mj16-admin-only #mj15Requests #mj15CertificatePowers>h3{display:none!important}
 #view.mj16-admin-only #mj15Requests #mj15CertificatePowers>.mj15-actions{grid-column:1;margin:0!important}
 #view.mj16-admin-only #mj15Requests #mj15ApprovalList,
 #view.mj16-admin-only #mj15Requests #mj15ApprovalDetail{grid-column:1;min-width:0}
 #view.mj16-admin-only #mj15Requests #mj15ApprovalDetail{display:none}
 #view.mj16-admin-only #mj15Requests.mj45-detail-open #mj15ApprovalDetail{display:block}
 #view.mj16-admin-only #mj15Requests.mj45-guest #mj15CertificatePowers{display:none!important}
 #view.mj16-admin-only #mj15Requests .mj36-request-group{margin:0}
 #view.mj16-admin-only #mj15Requests[data-mj45-group="pending"] .mj36-request-group:nth-of-type(2),
 #view.mj16-admin-only #mj15Requests[data-mj45-group="approved"] .mj36-request-group:nth-of-type(1){display:none!important}
 #view.mj16-admin-only #mj15Requests .mj45-filter{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
 #view.mj16-admin-only #mj15Requests .mj45-filter>button{
  border:1px solid #cbdedb;border-radius:9px;background:#f3f9f8;color:#14515c;
  font:700 13px Tahoma,Arial,sans-serif;padding:10px 13px;cursor:pointer
 }
 #view.mj16-admin-only #mj15Requests .mj45-filter>button[aria-pressed="true"]{
  background:#0f5f59;color:#fff;border-color:#0f5f59
 }
 #view.mj16-admin-only #mj15Requests .mj45-beneficiary-details{
  margin-top:4px;border:1px solid #d7e6e4;border-radius:10px;background:#fbfdfc
 }
 #view.mj16-admin-only #mj15Requests .mj45-beneficiary-details>summary{
  cursor:pointer;font-size:13px;color:#39666a;padding:12px 14px;font-weight:700
 }
 #view.mj16-admin-only #mj15Requests .mj45-beneficiary-details>.mj45-public-slot{padding:12px}
 #view.mj16-admin-only #mj15Requests .mj45-message{
  margin:6px 0;padding:12px;background:#f6faf9;border:1px solid #d8e8e6;
  border-radius:9px;color:#285c64;font-size:13px
 }
 #view.mj16-admin-only #mj15Requests .mj36-request-actions{display:flex;flex-wrap:wrap;gap:6px}
 @media(max-width:700px){#view.mj16-admin-only #mj15Requests .mj45-filter>button{flex:1}}
 `;
 document.head.appendChild(style);
}
let busy=false;
function organize(){
 if(busy)return;
 busy=true;
 try{
  if((location.hash||"").split("?")[0]!=="#admin")return;
  const requests=document.getElementById("mj15Requests");
  const powers=document.getElementById("mj15Powers");
  const area=requests?.querySelector(".mj15-body");
  if(!requests||!powers||!area)return;
  injectCSS();
  requests.dataset.mj45Group=requests.dataset.mj45Group||"pending";
  const heading=requests.querySelector("summary");
  if(heading&&!heading.textContent.includes("طلبات الشهادات")){
   heading.innerHTML='<span class="mj15-number">٢</span>طلبات الشهادات';
  }
  const nav=document.getElementById("mj34PowersSelect");
  if(nav){
   const old=nav.querySelector('option[value="certificates"]');
   if(old)old.remove();
   if(nav.value==="certificates")nav.value="";
  }
  const publicArea=document.getElementById("mj15PublicArea");
  if(publicArea&&!publicArea.closest(".mj45-beneficiary-details")){
    const details=document.createElement("details");
    details.className="mj45-beneficiary-details";
    details.innerHTML='<summary>نموذج تقديم طلب شهادة للمستفيدات</summary><div class="mj45-public-slot"></div>';
    area.appendChild(details);
    details.querySelector(".mj45-public-slot").appendChild(publicArea);
  }
  const certificate=document.getElementById("mj15CertificatePowers");
  if(certificate&&certificate.parentElement!==area){
   area.insertBefore(certificate,area.firstChild);
   certificate.style.display="grid";
  }
  if(certificate){
   const oldExport=certificate.querySelector("#mj13CertificateDownload")?.closest(".mj13-card");
   if(oldExport)oldExport.style.display="none";
  }
  if(!area.querySelector(".mj45-filter")){
    const filter=document.createElement("div");
    filter.className="mj45-filter";
    filter.innerHTML='<button type="button" data-mj45-tab="pending" aria-pressed="true">الطلبات الجديدة</button>'+
      '<button type="button" data-mj45-tab="approved" aria-pressed="false">الشهادات المعتمدة</button>';
    area.insertBefore(filter,certificate||area.firstChild);
  }
  for(const button of area.querySelectorAll("[data-mj45-tab]"))
   button.setAttribute("aria-pressed",String(button.dataset.mj45Tab===requests.dataset.mj45Group));
  const feedback=area.querySelector(".mj45-message");
  let token=null;try{token=JSON.parse(sessionStorage.getItem("manjaz_admin_auth_session_v1")||"null")}catch(_){}
  requests.classList.toggle('mj45-guest',!token?.access_token);
  if(!token?.access_token){
   if(!feedback){
    const prompt=document.createElement("div");prompt.className="mj45-message";
    prompt.textContent="لعرض الطلبات أو اعتمادها، سجّلي الدخول أولًا من بطاقة «الصلاحيات الإدارية» بالأسفل.";
    area.insertBefore(prompt,certificate||area.firstChild);
   }
  }else if(feedback)feedback.remove();
 }finally{busy=false}
}
document.addEventListener("click",event=>{
 const tab=event.target.closest("[data-mj45-tab]");
 if(tab){
  const box=document.getElementById("mj15Requests");
  if(!box)return;
  box.dataset.mj45Group=tab.dataset.mj45Tab;
  box.classList.remove("mj45-detail-open");
  organize();
  return;
 }
 const open=event.target.closest("#mj15Requests [data-mj15-open]");
 if(open)document.getElementById("mj15Requests")?.classList.add("mj45-detail-open");
},true);
document.addEventListener("manjaz:admin-session-changed",()=>queueMicrotask(organize));
function boot(){
 const view=document.getElementById("view");
 if(view){
  let queued=false;
  new MutationObserver(()=>{
   if(queued)return;queued=true;
   queueMicrotask(()=>{queued=false;organize()});
  }).observe(view,{childList:true,subtree:true});
 }
 organize();
 addEventListener("hashchange",()=>queueMicrotask(organize));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});
else boot();
})();