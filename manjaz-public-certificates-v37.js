/* MANJAZ 37 — approved certificates are public to view and download.
 * Administrative review, edits and approval remain protected by Supabase.
 * No draft requests, applicant emails, edit tokens or admin permissions are returned.
 */
(()=>{"use strict";
const BASE="https://idkjuqfxcweqekdkcktk.supabase.co";
const KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const ROUTE="approved-certificates";
const CATEGORIES={execution_teacher:"شهادات التنفيذ – معلمات",thanks_student:"شهادات الشكر – طالبات",thanks_teacher:"شهادات الشكر – معلمات",parents:"شهادات أولياء الأمور",execution_staff:"شهادات تنفيذ الهيكل الإداري",thanks_staff:"شهادات شكر الهيكل الإداري"};
let items=[],requestSerial=0,downloading=false;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rowData=r=>({name:r.name||"",title:r.title||"",description:r.short_description||"",date:r.date_iso||"",duration:r.duration||"",executionType:r.execution_type||""});
const root=()=>document.getElementById("view");
const active=()=>((location.hash||"").slice(1).split("?")[0]===ROUTE);
const template=(r)=>{if(!window.ManjazTask15?.certHTML)throw Error("تعذر تحميل نموذج الشهادة الرسمي");return window.ManjazTask15.certHTML(r.category,rowData(r),false)};
const getItem=id=>items.find(r=>String(r.id)===String(id));
function status(text,isError=false){const node=document.getElementById("mj37Status");if(node){node.textContent=text;node.style.color=isError?"#a33532":"#185b57"}}
async function getApproved(){
 const response=await fetch(BASE+"/rest/v1/rpc/manjaz_public_approved_certificates_v37",{
   method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},
   body:"{}",cache:"no-store"
 });
 if(!response.ok)throw Error("تعذر تحميل الشهادات المعتمدة ("+response.status+")");
 const data=await response.json();if(!Array.isArray(data))throw Error("استجابة غير صحيحة");
 return data.filter(r=>r&&["معتمد","تم الإصدار","تم الإرسال"].includes(r.status)&&r.approved_at);
}
function renderRows(){
 const box=document.getElementById("mj37CertificateList");if(!box)return;
 box.innerHTML=items.length?items.map(r=>
  '<article class="mj37-card"><div class="mj37-label">'+esc(CATEGORIES[r.category]||"شهادة معتمدة")+'</div>'+
  '<h3>'+esc(r.name)+'</h3><p>'+esc(r.title)+'</p><small>تاريخ الشهادة: '+esc(r.display_date||r.date_iso||"")+'</small>'+
  '<div class="mj37-actions"><button type="button" data-mj37-preview="'+esc(r.id)+'">معاينة كاملة</button>'+
  '<button type="button" class="primary" data-mj37-download="'+esc(r.id)+'">إصدار وتحميل PDF</button></div></article>'
 ).join(""):'<div class="mj37-empty">لا توجد شهادات معتمدة متاحة للإصدار حاليًا.</div>';
}
function fitDialog(dialog){
 if(!dialog?.open)return;
 const frame=dialog.querySelector(".mj37-frame"),paper=frame?.firstElementChild;
 if(!frame||!paper)return;
 const w=Math.max(1,frame.getBoundingClientRect().width);
 const available=Math.max(130,window.innerHeight-195);
 const scale=Math.max(.08,Math.min(1,w/1123,available/794));
 frame.style.height=Math.ceil(794*scale)+"px";
 paper.style.setProperty("--mj37-scale",String(scale));
 paper.style.transform="scale("+scale+")";
}
function preview(row){
 let dialog=document.getElementById("mj37Dialog");
 if(!dialog){dialog=document.createElement("dialog");dialog.id="mj37Dialog";dialog.className="mj37-dialog";document.body.appendChild(dialog);}
 dialog.innerHTML='<div class="mj37-dialog-head"><strong>شهادة معتمدة – '+esc(row.name)+'</strong>'+
  '<button type="button" data-mj37-close>إغلاق</button></div>'+
  '<div class="mj37-preview"><div class="mj37-frame">'+template(row)+'</div></div>'+
  '<div class="mj37-dialog-bottom"><button type="button" class="primary" data-mj37-download="'+esc(row.id)+'">إصدار وتحميل PDF</button></div>';
 if(dialog.open)dialog.close();
 dialog.showModal();
 requestAnimationFrame(()=>{fitDialog(dialog);requestAnimationFrame(()=>fitDialog(dialog))});
}
async function loadLibrary(url,key){
 if(window[key])return;
 await new Promise((resolve,reject)=>{
  const id="mj37Library"+key;
  let element=document.getElementById(id);
  if(element){element.addEventListener("load",resolve,{once:true});element.addEventListener("error",reject,{once:true});return}
  element=document.createElement("script");element.id=id;element.src=url;
  element.onload=resolve;element.onerror=()=>reject(Error("تعذر تحميل مكتبة PDF"));
  document.head.appendChild(element);
 });
}
async function awaitImages(paper){
 await Promise.all([...paper.querySelectorAll("img")].map(img=>new Promise(resolve=>{
  if(img.complete)return resolve();
  img.addEventListener("load",resolve,{once:true});
  img.addEventListener("error",resolve,{once:true});
 })));
}
async function download(row,button){
 if(downloading)return;downloading=true;
 const original=button?.textContent||"";
 if(button){button.disabled=true;button.textContent="جارٍ تجهيز PDF..."}
 status("جارٍ إصدار الشهادة المعتمدة...");
 let stage;
 try{
  if(!row||!row.approved_at||!["معتمد","تم الإصدار","تم الإرسال"].includes(row.status))
   throw Error("هذه الشهادة لم تعتمدها الإدارة بعد");
  await Promise.all([
   loadLibrary("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas"),
   loadLibrary("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf")
  ]);
  stage=document.createElement("div");stage.className="mj37-export-stage";
  stage.innerHTML=template(row);
  document.body.appendChild(stage);
  const paper=stage.firstElementChild;paper.style.setProperty("transform","none","important");
  await document.fonts?.ready;await awaitImages(paper);
  if(paper.querySelector(".cert-final-main")?.scrollHeight>paper.querySelector(".cert-final-main")?.clientHeight+16)
   throw Error("النص أطول من مساحة الشهادة؛ يرجى مراجعة الإدارة لتعديل الوصف");
  const canvas=await window.html2canvas(paper,{
    scale:Math.max(2.5,Math.min(3.6,3300/1123)),useCORS:true,allowTaint:false,
    backgroundColor:"#ffffff",width:1123,height:794,scrollX:0,scrollY:0
  });
  const pdf=new window.jspdf.jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
  const ratio=Math.min(297/canvas.width,210/canvas.height);
  const w=canvas.width*ratio,h=canvas.height*ratio;
  pdf.addImage(canvas.toDataURL("image/png"),"PNG",(297-w)/2,(210-h)/2,w,h);
  const safe=String(row.name||"شهادة").replace(/[^\u0600-\u06FF\w -]/g,"").slice(0,75);
  pdf.save("منجز_شهادة_معتمدة_"+safe+".pdf");
  status("تم إصدار الشهادة المعتمدة وتحميل PDF دون علامة مائية.");
 }catch(error){console.error("manjaz public certificate",error);status("تعذر إصدار الشهادة: "+(error?.message||error),true)}
 finally{stage?.remove();downloading=false;if(button?.isConnected){button.disabled=false;button.textContent=original}}
}
async function mountInto(host){
 if(!host||!host.isConnected)return;
 const serial=++requestSerial;
 host.innerHTML='<section class="mj37-page mj37-embedded" dir="rtl">'+
  '<div class="mj37-toolbar"><a href="#approved-certificates" class="mj37-public-link">فتح صفحة الشهادات للمستفيدات</a>'+
  '<button type="button" data-mj37-refresh>تحديث الشهادات</button></div>'+
  '<div id="mj37Status" role="status" aria-live="polite">جارٍ تحميل الشهادات المعتمدة دون تسجيل دخول...</div>'+
  '<div id="mj37CertificateList" class="mj37-grid"></div></section>';
 try{
  const rows=await getApproved();
  if(!host.isConnected||serial!==requestSerial)return;
  items=rows;
  renderRows();
  status('الشهادات المعتمدة المتاحة لجميع المستفيدات: '+items.length);
 }catch(error){
  if(host.isConnected&&serial===requestSerial)status(error?.message||'تعذر تحميل الشهادات المعتمدة',true);
 }
}
window.ManjazPublicApprovedCertificates={mountInto};
async function render(){
 if(!active())return;
 const view=root();if(!view)return;
 const serial=++requestSerial;
 view.innerHTML='<section class="mj37-page" dir="rtl">'+
  '<div class="mj37-head"><h2>إصدار الشهادات المعتمدة</h2><p>استعراض وإصدار شهادات منجز التي اعتمدتها إدارة المدرسة دون تسجيل دخول.</p></div>'+
  '<div class="mj37-toolbar"><button id="mj37Refresh" type="button">تحديث الشهادات</button></div>'+
  '<div id="mj37Status" aria-live="polite" role="status">جارٍ تحميل الشهادات المعتمدة...</div>'+
  '<div id="mj37CertificateList" class="mj37-grid"></div></section>';
 try{
  const loaded=await getApproved();
  if(!active()||serial!==requestSerial)return;
  items=loaded;renderRows();status("الشهادات المعتمدة المتاحة: "+items.length);
 }catch(e){if(active()&&serial===requestSerial)status(e.message||"تعذر عرض الشهادات",true)}
}
document.addEventListener("click",e=>{
 const close=e.target.closest("[data-mj37-close]");if(close){document.getElementById("mj37Dialog")?.close();return}
 if(e.target.id==="mj37Refresh"){void render();return}
 if(e.target.closest("[data-mj37-refresh]")){void mountInto(document.getElementById("mj15IssueList"));return}
 const prev=e.target.closest("[data-mj37-preview]");if(prev){
  const item=getItem(prev.dataset.mj37Preview);if(item)try{preview(item)}catch(err){status(err.message,true)}
  return;
 }
 const down=e.target.closest("[data-mj37-download]");if(down){const item=getItem(down.dataset.mj37Download);void download(item,down);return}
});
window.addEventListener("resize",()=>fitDialog(document.getElementById("mj37Dialog")),{passive:true});
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.getElementById("mj37Dialog")?.close()});
window.renderManjazPublicCertificates=render;
window.addEventListener("hashchange",()=>{
 if(active()&&!document.getElementById("mj37CertificateList"))void render();
 else if(!active())++requestSerial;
});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>{if(active())void render()},{once:true});
else if(active())void render();
})();