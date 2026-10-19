/* MANJAZ v48 — certificate approval queue in Section 5, public requests remain in Section 2. */
(()=>{"use strict";
const STYLE_ID="mj48AdminCertificateQueueStyle";
let busy=false;
function style(){
 if(document.getElementById(STYLE_ID))return;
 const el=document.createElement("style");el.id=STYLE_ID;
 el.textContent=[
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers{width:100%;max-width:100%;min-width:0;box-sizing:border-box;margin:14px 0 0;padding:0;gap:12px;background:transparent;border:0;box-shadow:none}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers>h3{margin:0;color:#104a55;font-size:17px}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers #mj13ExportCards,#view.mj16-admin-only #mj15Powers #mj15CertificatePowers>.mj13-card{display:none!important}',
 '#view.mj16-admin-only #mj15Powers #mj15ApprovalList,#view.mj16-admin-only #mj15Powers #mj15ApprovalDetail{width:100%;min-width:0}',
 '#view.mj16-admin-only #mj15Powers #mj15ApprovalDetail{display:none}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers.mj48-detail-open #mj15ApprovalDetail{display:block}',
 '#view.mj16-admin-only #mj15Powers .mj48-cert-filter{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
 '#view.mj16-admin-only #mj15Powers .mj48-cert-filter button{border:1px solid #cbdedb;border-radius:9px;background:#f3f9f8;color:#14515c;padding:10px 13px;font:700 13px Tahoma,Arial,sans-serif;cursor:pointer}',
 '#view.mj16-admin-only #mj15Powers .mj48-cert-filter button[aria-pressed="true"]{background:#0f5f59;color:#fff;border-color:#0f5f59}',
 '#view.mj16-admin-only #mj15Powers #mj15ApprovalList .mj36-request-group{margin:0}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers[data-mj45-group="pending"] .mj36-request-group:not([data-mj45-kind="pending"]),#view.mj16-admin-only #mj15Powers #mj15CertificatePowers[data-mj45-group="approved"] .mj36-request-group:not([data-mj45-kind="approved"]),#view.mj16-admin-only #mj15Powers #mj15CertificatePowers[data-mj45-group="rejected"] .mj36-request-group:not([data-mj45-kind="rejected"]){display:none!important}',
 '#view.mj16-admin-only #mj15Powers .mj48-table-scroll{overflow-x:auto;max-width:100%;border:1px solid #d9e6e5;border-radius:11px;background:#fff;-webkit-overflow-scrolling:touch}',
 '#view.mj16-admin-only #mj15Powers .mj48-certificate-table{width:100%;min-width:800px;border-collapse:collapse;direction:rtl;font:normal 13px/1.6 Tahoma,Arial,sans-serif;color:#244c53}',
 '#view.mj16-admin-only #mj15Powers .mj48-certificate-table th{background:#eff6f5;color:#114957;padding:11px 10px;border-bottom:1px solid #d7e6e3;white-space:nowrap;text-align:right;font-weight:800}',
 '#view.mj16-admin-only #mj15Powers .mj48-certificate-table td{background:#fff;padding:11px 10px;vertical-align:middle;border-bottom:1px solid #e7efee;overflow-wrap:anywhere;text-align:right}',
 '#view.mj16-admin-only #mj15Powers .mj48-certificate-table tbody tr:last-child td{border-bottom:0}',
 '#view.mj16-admin-only #mj15Powers .mj48-row-actions{display:flex;gap:5px;align-items:center;flex-wrap:wrap}',
 '#view.mj16-admin-only #mj15Powers .mj48-certificate-table button{display:inline-flex;justify-content:center;align-items:center;white-space:nowrap;padding:7px 9px;border-radius:8px;border:1px solid #bfd5d2;color:#13565c;background:#f6faf9;font:700 12px Tahoma,Arial,sans-serif;cursor:pointer}',
 '#view.mj16-admin-only #mj15Powers .mj48-certificate-table .mj48-approve{background:#0f5f59;color:#fff;border-color:#0f5f59}',
 '#view.mj16-admin-only #mj15Powers .mj48-certificate-table .mj48-reject{color:#933a37;border-color:#e8caca;background:#fff9f8}',
 '#view.mj16-admin-only #mj15Powers .mj48-certificate-table button:disabled{opacity:.55;cursor:wait}',
 '#view.mj16-admin-only #mj15Powers .mj48-status{font-weight:700;color:#4e6b70}',
 '@media(max-width:600px){#view.mj16-admin-only #mj15Powers .mj48-cert-filter button{flex:1 1 28%}}',
 '@media(max-width:640px){',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]){width:100%;max-width:100%;min-width:0;grid-template-columns:minmax(0,1fr)}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) #mj15ApprovalList,#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-request-group,#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj36-list-summary{width:100%;max-width:100%;min-width:0;box-sizing:border-box;overflow-wrap:anywhere}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-table-scroll{display:block;width:100%;max-width:100%;min-width:0;overflow:visible;border:0;background:transparent}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-certificate-table{display:block;width:100%;max-width:100%;min-width:0;table-layout:auto}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-certificate-table thead{display:none}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-certificate-table tbody{display:grid;grid-template-columns:minmax(0,1fr);gap:10px;width:100%;min-width:0;max-width:100%}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-certificate-table tbody tr{display:grid;grid-template-columns:minmax(0,1fr);width:100%;max-width:100%;min-width:0;border:1px solid #d9e6e5;border-radius:10px;overflow:hidden}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-certificate-table tbody td{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;min-width:0;max-width:100%;width:100%;box-sizing:border-box;padding:10px;white-space:normal;overflow-wrap:anywhere}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-certificate-table tbody td::before{content:attr(data-label);flex:0 0 40%;max-width:40%;min-width:0;color:#174e59;font-weight:800;white-space:normal;overflow-wrap:anywhere}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-certificate-table .mj48-row-actions{display:flex;flex:1 1 auto;justify-content:flex-start;flex-wrap:wrap;min-width:0;max-width:100%}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-cert-filter{display:grid;grid-template-columns:repeat(auto-fit,minmax(95px,1fr));gap:7px;min-width:0;max-width:100%}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj48-cert-filter button{width:100%;min-width:0;box-sizing:border-box;white-space:normal;overflow-wrap:anywhere}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) #mj49GroupAdmin,#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj49-admin-scroll{width:100%;max-width:100%;min-width:0;box-sizing:border-box}',
 '#view.mj16-admin-only #mj15Powers #mj15CertificatePowers:is([data-mj45-group="approved"],[data-mj45-group="rejected"]) .mj49-admin-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}',
 '}'
 ].join("\n");
 document.head.appendChild(el);
}
function organize(){
 if(busy)return;
 busy=true;
 try{
  if((location.hash||"").split("?")[0]!=="#admin")return;
  const requests=document.getElementById("mj15Requests");
  const powers=document.getElementById("mj15Powers");
  const body=powers?.querySelector(".mj15-body");
  const queue=document.getElementById("mj15CertificatePowers");
  if(!requests||!powers||!body||!queue)return;
  style();
  // Keep the existing queue node and all of its request, preview and approval listeners.
  // The public application form never moves from #mj15Requests.
  if(queue.parentElement!==body)body.appendChild(queue);
  const title=queue.querySelector("h3");
  if(title)title.textContent="طلبات اعتمادات الشهادات";
  const sel=document.getElementById("mj34PowersSelect");
  if(sel&&!sel.querySelector('option[value="certificates"]')){
   const opt=document.createElement("option");
   opt.value="certificates";opt.textContent="طلبات اعتمادات الشهادات";
   sel.appendChild(opt);
  }
  const opt=sel?.querySelector('option[value="certificates"]');
  if(opt)opt.textContent="طلبات اعتمادات الشهادات";
  if(!queue.dataset.mj45Group)queue.dataset.mj45Group="pending";
  if(!queue.querySelector(".mj48-cert-filter")){
   const filter=document.createElement("div");filter.className="mj48-cert-filter";
   filter.innerHTML='<button type="button" data-mj48-group="pending">الطلبات الجديدة</button>'+
    '<button type="button" data-mj48-group="approved">الشهادات المعتمدة</button>'+
    '<button type="button" data-mj48-group="rejected">الطلبات المرفوضة</button>';
   const actions=queue.querySelector(".mj15-actions");
   if(actions)actions.after(filter);
   else queue.insertBefore(filter,queue.querySelector("#mj15ApprovalList"));
  }
  for(const btn of queue.querySelectorAll("[data-mj48-group]"))
   btn.setAttribute("aria-pressed",String(btn.dataset.mj48Group===queue.dataset.mj45Group));
  const protectedUI=document.getElementById("mj34PowersProtected");
  const permitted=sel?.value==="certificates"&&protectedUI?.hidden===false;
  queue.style.display=permitted?"grid":"none";
 }finally{busy=false}
}
document.addEventListener("click",e=>{
 const tab=e.target.closest("#mj15CertificatePowers [data-mj48-group]");
 if(tab){
  const queue=document.getElementById("mj15CertificatePowers");
  if(!queue)return;
  queue.dataset.mj45Group=tab.dataset.mj48Group;
  queue.classList.remove("mj48-detail-open");
  organize();return;
 }
 if(e.target.closest("#mj15CertificatePowers [data-mj15-open]"))
  document.getElementById("mj15CertificatePowers")?.classList.add("mj48-detail-open");
},true);
document.addEventListener("change",e=>{
 if(e.target.id==="mj34PowersSelect")queueMicrotask(organize);
});
document.addEventListener("manjaz:admin-session-changed",()=>queueMicrotask(organize));
function boot(){
 const view=document.getElementById("view");
 if(view){
  let queued=false;
  new MutationObserver(()=>{
   if(queued)return;queued=true;
   queueMicrotask(()=>{queued=false;organize()});
  }).observe(view,{childList:true,subtree:false});
 }
 organize();
 addEventListener("hashchange",()=>queueMicrotask(organize));
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
