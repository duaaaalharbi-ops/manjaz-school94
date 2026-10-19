/* MANJAZ v49 — public approved group certificate cards, PDF booklet, named ZIP and individual PDF. */
(()=>{"use strict";
const BASE="https://idkjuqfxcweqekdkcktk.supabase.co";
const KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const ROUTE="approved-certificates";
let records=[],loading=false,downloading=false,container=null,observer=null,queued=false;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const active=()=>location.hash.slice(1).split("?")[0]===ROUTE;
const getRecord=id=>records.find(r=>String(r.id)===String(id));
const categoryName=c=>window.ManjazGroupCertificateUI?.categoryName(c)||"شهادة معتمدة";
function dateDisplay(x){
 if(!x)return "—";
 try{return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",{
  day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Riyadh"
 }).format(new Date(x))}catch(_){return "—"}
}
function style(){
 if(document.getElementById("mj49GroupDownloadStyle"))return;
 const s=document.createElement("style");s.id="mj49GroupDownloadStyle";
 s.textContent=[
 '#mj49ApprovedGroups{direction:rtl;margin:22px 0;padding:0;display:grid;gap:13px;color:#164d56}',
 '#mj49ApprovedGroups>h3{font:800 18px Tahoma,Arial,sans-serif;margin:0 0 3px}',
 '#mj49ApprovedGroups .mj49-approved-card{border:1px solid #d4e4e0;border-radius:13px;box-shadow:0 3px 12px rgba(8,64,63,.06);padding:16px;background:#fff}',
 '#mj49ApprovedGroups .mj49-approved-card h4{margin:0 0 12px;font:800 16px Tahoma,Arial,sans-serif;color:#0d4d54}',
 '#mj49ApprovedGroups .mj49-group-metadata{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}',
 '#mj49ApprovedGroups .mj49-group-metadata>div{display:grid;gap:5px;padding:10px;border:1px solid #e4eeeb;border-radius:9px;background:#f8fbfa}',
 '#mj49ApprovedGroups .mj49-group-metadata span{font:normal 12px Tahoma,Arial,sans-serif;color:#608080}',
 '#mj49ApprovedGroups .mj49-group-metadata strong{font:700 14px Tahoma,Arial,sans-serif;color:#174953;overflow-wrap:anywhere}',
 '#mj49ApprovedGroups .mj49-approved-actions,#mj49ApprovedGroups .mj49-issue-options{display:flex;gap:8px;align-items:center;flex-wrap:wrap}',
 '#mj49ApprovedGroups button{border:1px solid #0f5f59;border-radius:9px;background:#f4faf9;color:#145c59;padding:10px 14px;min-height:42px;font:700 14px Tahoma,Arial,sans-serif;cursor:pointer}',
 '#mj49ApprovedGroups .mj49-primary{background:#0f5f59;color:#fff}',
 '#mj49ApprovedGroups button:disabled{opacity:.55;cursor:wait}',
 '#mj49ApprovedGroups .mj49-issue-options{margin-top:13px;padding:13px;border:1px solid #dce8e7;background:#f7faf9;border-radius:10px}',
 '#mj49ApprovedGroups .mj49-issue-options[hidden]{display:none!important}',
 '#mj49ApprovedGroups .mj49-issue-options label{display:grid;gap:5px;min-width:220px;flex:1 1 230px;font:700 13px Tahoma,Arial,sans-serif;color:#174b53}',
 '#mj49ApprovedGroups .mj49-issue-options select{background:#fff;color:#173c49;border:1px solid #b6d4d0;padding:10px;border-radius:8px;min-height:42px;max-width:100%;font:normal 14px Tahoma,Arial,sans-serif}',
 '#mj49ApprovedGroups .mj49-download-status{display:block;min-height:20px;font:700 13px/1.8 Tahoma,Arial,sans-serif;color:#185b58;margin-top:9px}',
 '@media(max-width:620px){#mj49ApprovedGroups .mj49-group-metadata{grid-template-columns:1fr}#mj49ApprovedGroups .mj49-approved-actions>button{flex:1}}'
 ].join("\n");
 document.head.appendChild(s);
}
function renderGroupCards(){
 if(!active())return;
 const list=document.getElementById("mj37CertificateList");
 if(!list)return;
 style();
 let host=document.getElementById("mj49ApprovedGroups");
 if(!host||host.parentElement!==list){
  host=document.createElement("section");host.id="mj49ApprovedGroups";
  list.appendChild(host);
 }
 host.innerHTML=records.length?'<h3>الشهادات الجماعية المعتمدة</h3>'+records.map(r=>{
  const id=esc(r.id),names=r.recipient_names||[];
  return '<article class="mj49-approved-card" data-mj49-group-card="'+id+'">'+
   '<h4>إصدار شهادة جماعية</h4><div class="mj49-group-metadata">'+
   '<div><span>نوع الشهادة</span><strong>'+esc(categoryName(r.category))+'</strong></div>'+
   '<div><span>تاريخ الطلب</span><strong>'+esc(dateDisplay(r.created_at))+'</strong></div>'+
   '<div><span>عدد الشهادات</span><strong>'+names.length+' شهادة</strong></div></div>'+
   '<div class="mj49-approved-actions"><button type="button" data-mj49-public-preview="'+id+'">معاينة</button>'+
   '<button type="button" class="mj49-primary" data-mj49-open-issue="'+id+'">إصدار</button></div>'+
   '<div class="mj49-issue-options" id="mj49Issue-'+id+'" hidden>'+
   '<button type="button" data-mj49-download-book="'+id+'">إصدار PDF جماعي</button>'+
   '<button type="button" data-mj49-download-zip="'+id+'">إصدار ZIP بالأسماء</button>'+
   '<label>اختيار المستفيدة لإصدار شهادة فردية<select data-mj49-recipient-select="'+id+'">'+
   names.map((n,i)=>'<option value="'+i+'">'+esc(n)+'</option>').join("")+'</select></label>'+
   '<button type="button" data-mj49-download-one="'+id+'">إصدار شهادة فردية PDF</button>'+
   '</div><div class="mj49-download-status" aria-live="polite"></div></article>';
 }).join(""):'';
}
function mountPublic(){
 if(!active())return;
 const root=document.getElementById("mj37CertificateList");
 if(!root)return;
 if(container===root&&observer){if(records.length&&!document.getElementById("mj49ApprovedGroups"))renderGroupCards();return}
 observer?.disconnect();container=root;
 observer=new MutationObserver(()=>{
  if(queued)return;queued=true;
  queueMicrotask(()=>{queued=false;if(container?.isConnected&&records.length&&!document.getElementById("mj49ApprovedGroups"))renderGroupCards()});
 });
 observer.observe(root,{childList:true,subtree:false});
 if(records.length)renderGroupCards();
 void loadApproved();
}
async function loadApproved(){
 if(loading)return;
 loading=true;
 try{
  const response=await fetch(BASE+"/rest/v1/rpc/manjaz_group_certificate_public_approved_v49",{
   method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},
   body:"{}",cache:"no-store"
  });
  const rows=await response.json().catch(()=>null);
  if(!response.ok||!Array.isArray(rows))throw Error("تعذر تحميل الشهادات الجماعية المعتمدة");
  records=rows.filter(r=>r&&r.status==="معتمد"&&r.approved_at&&Array.isArray(r.recipient_names)&&r.recipient_names.length>0&&r.recipient_names.length<=100);
  if(active())renderGroupCards();
 }catch(err){
  const host=document.getElementById("mj49ApprovedGroups")||container;
  if(host?.isConnected){const el=document.getElementById("mj49ApprovedGroups")||document.createElement("section");el.id="mj49ApprovedGroups";el.textContent="تعذر تحميل الشهادات الجماعية: "+(err?.message||err);if(!el.parentElement)host.appendChild(el)}
 }finally{loading=false}
}
function awaitScript(src,key){
 if(window[key])return Promise.resolve();
 return new Promise((resolve,reject)=>{
  const name="mj49-lib-"+key;
  let el=document.getElementById(name);
  if(el){el.addEventListener("load",resolve,{once:true});el.addEventListener("error",()=>reject(Error("تعذر تحميل "+key)),{once:true});return}
  el=document.createElement("script");el.id=name;el.src=src;
  el.onload=resolve;el.onerror=()=>reject(Error("تعذر تحميل "+key));
  document.head.appendChild(el);
 });
}
async function ensureLibraries(zip){
 await Promise.all([
  awaitScript("https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js","html2canvas"),
  awaitScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js","jspdf"),
  ...(zip?[awaitScript("https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js","JSZip")]:[])
 ]);
 if(!window.html2canvas||!window.jspdf?.jsPDF||(zip&&!window.JSZip))
  throw Error("تعذر تحميل إحدى مكتبات إصدار الشهادات");
}
async function imagesLoaded(paper){
 await Promise.all([...paper.querySelectorAll("img")].map(img=>new Promise(resolve=>{
  if(img.complete)return resolve();
  img.addEventListener("load",resolve,{once:true});
  img.addEventListener("error",resolve,{once:true});
 })));
 const broken=[...paper.querySelectorAll("img")].find(img=>!img.naturalWidth);
 if(broken)throw Error("تعذر تحميل شعار رسمي؛ أعيدي المحاولة عند استقرار الاتصال.");
}
function makeStage(row,name){
 if(!window.ManjazTask15?.certHTML)throw Error("تعذر تحميل قالب الشهادة الرسمي");
 const stage=document.createElement("div");
 stage.className="mj49-export-stage";
 stage.style.cssText="position:fixed;left:-20000px;top:0;width:1123px;height:794px;overflow:hidden;z-index:-10;background:#fff;";
 stage.innerHTML=window.ManjazTask15.certHTML(row.category,{
  name,title:row.title||"",description:row.short_description||"",
  date:row.date_iso||"",duration:row.duration||"",executionType:row.execution_type||""
 },false);
 document.body.appendChild(stage);
 const paper=stage.firstElementChild;
 paper.style.setProperty("transform","none","important");
 paper.style.setProperty("position","relative","important");
 paper.style.setProperty("top","0","important");
 paper.style.setProperty("right","0","important");
 paper.style.setProperty("width","1123px","important");
 paper.style.setProperty("height","794px","important");
 return stage;
}
async function canvasFor(row,name,quality=2){
 const stage=makeStage(row,name);
 let canvas;
 try{
  const paper=stage.firstElementChild;
  await document.fonts?.ready;await imagesLoaded(paper);
  const main=paper.querySelector(".cert-final-main");
  if(main&&main.scrollHeight>main.clientHeight+16)
   throw Error("نص الشهادة أطول من المساحة المتاحة للقالب الرسمي؛ يرجى مراجعة الإدارة.");
  canvas=await window.html2canvas(paper,{
   scale:quality,useCORS:true,allowTaint:false,
   backgroundColor:"#ffffff",width:1123,height:794,scrollX:0,scrollY:0,
   logging:false
  });
  return canvas;
 }finally{stage.remove()}
}
function releaseCanvas(canvas){if(canvas){canvas.width=0;canvas.height=0}}
function freshPdf(){
 return new window.jspdf.jsPDF({orientation:"landscape",unit:"mm",format:"a4",compress:true});
}
function addPageImage(pdf,canvas,first){
 if(!first)pdf.addPage("a4","landscape");
 const img=canvas.toDataURL("image/jpeg",.89);
 const ratio=Math.min(297/canvas.width,210/canvas.height),w=canvas.width*ratio,h=canvas.height*ratio;
 pdf.addImage(img,"JPEG",(297-w)/2,(210-h)/2,w,h,undefined,"FAST");
}
function fileSafe(name){return String(name||"مستفيدة").replace(/[^\u0600-\u06FF\w -]/g,"").replace(/\s+/g,"_").slice(0,90)||"مستفيدة"}
function saveBlob(blob,name){
 const url=URL.createObjectURL(blob);
 const a=document.createElement("a");a.href=url;a.download=name;
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
const waitUI=()=>new Promise(resolve=>requestAnimationFrame(()=>setTimeout(resolve,0)));
async function exportCertificates(row,mode,recipientIndex,report){
 if(!row||row.status!=="معتمد"||!row.approved_at)throw Error("لم يُعتمد هذا الطلب");
 const names=row.recipient_names;
 if(!Array.isArray(names)||names.length<1||names.length>100)throw Error("قائمة المستفيدات غير صالحة");
 if(mode==="one"&&(recipientIndex<0||recipientIndex>=names.length))throw Error("يرجى اختيار اسم المستفيدة");
 await ensureLibraries(mode==="zip");
 const selected=mode==="one"?[names[recipientIndex]]:names;
 const batch=mode!=="one";
 let pdf=mode==="book"?freshPdf():null;
 const zip=mode==="zip"?new window.JSZip():null;
 await document.fonts?.ready;
 for(let i=0;i<selected.length;i++){
  const name=selected[i];
  report("جارٍ تجهيز الشهادات: "+(i+1)+" من "+selected.length+"...");
  await waitUI();
  let canvas;
  try{
   canvas=await canvasFor(row,name,batch?1.85:2.8);
   if(mode==="book"){
    addPageImage(pdf,canvas,i===0);
   }else{
    const one=freshPdf();addPageImage(one,canvas,true);
    if(zip)zip.file(String(i+1).padStart(3,"0")+"_"+fileSafe(name)+".pdf",one.output("blob"));
    else saveBlob(one.output("blob"),"منجز_شهادة_"+fileSafe(name)+".pdf");
   }
  }finally{releaseCanvas(canvas)}
 }
 if(pdf){
  report("جارٍ إعداد ملف PDF الجماعي...");
  saveBlob(pdf.output("blob"),"منجز_شهادات_جماعية_"+fileSafe(row.title)+".pdf");
 }else if(zip){
  report("جارٍ ضغط "+selected.length+" شهادة PDF في ملف ZIP...");
  const blob=await zip.generateAsync({type:"blob",compression:"STORE"},info=>{
   report("جارٍ ضغط ملف ZIP: "+Math.round(info.percent)+"٪");
  });
  saveBlob(blob,"منجز_شهادات_جماعية_"+fileSafe(row.title)+".zip");
 }
 report("اكتمل إصدار "+selected.length+" شهادة دون علامة مائية.");
}
async function actionDownload(row,kind,button){
 if(downloading)return;
 const host=button?.closest(".mj49-approved-card");
 const sel=host?.querySelector("select[data-mj49-recipient-select]");
 const id=Number(sel?.value||0);
 const status=host?.querySelector(".mj49-download-status");
 const report=msg=>{if(status){status.textContent=msg;status.style.color="#185b58"}};
 downloading=true;
 const text=button.textContent;button.disabled=true;
 try{await exportCertificates(row,kind,id,report)}
 catch(err){
  console.error("Group certificate export",err);
  report("تعذر إصدار الملف: "+(err?.message||err));
  if(status)status.style.color="#a13a38";
 }finally{downloading=false;if(button.isConnected){button.disabled=false;button.textContent=text}}
}
document.addEventListener("click",e=>{
 const preview=e.target.closest("[data-mj49-public-preview]");
 if(preview){
  const r=getRecord(preview.dataset.mj49PublicPreview);
  if(r)try{window.ManjazGroupCertificateUI.openPreview(r,false)}
  catch(err){const s=preview.closest(".mj49-approved-card")?.querySelector(".mj49-download-status");if(s)s.textContent=err.message}
  return;
 }
 const open=e.target.closest("[data-mj49-open-issue]");
 if(open){
  const host=document.getElementById("mj49Issue-"+open.dataset.mj49OpenIssue);
  if(host)host.hidden=!host.hidden;
  return;
 }
 const b=e.target.closest("[data-mj49-download-book],[data-mj49-download-zip],[data-mj49-download-one]");
 if(!b)return;
 const mode=b.hasAttribute("data-mj49-download-book")?"book":
  b.hasAttribute("data-mj49-download-zip")?"zip":"one";
 const id=mode==="book"?b.dataset.mj49DownloadBook:mode==="zip"?b.dataset.mj49DownloadZip:b.dataset.mj49DownloadOne;
 const r=getRecord(id);if(r)void actionDownload(r,mode,b);
});
function boot(){
 const view=document.getElementById("view");
 if(view){
  let pending=false;
  new MutationObserver(()=>{
   if(pending)return;pending=true;
   queueMicrotask(()=>{pending=false;mountPublic()});
  }).observe(view,{childList:true,subtree:false});
 }
 if(active())mountPublic();
 window.addEventListener("hashchange",()=>{
  if(active()){container=null;observer?.disconnect();observer=null;queueMicrotask(mountPublic)}
  else {observer?.disconnect();observer=null;container=null;records=[]}
 });
 document.addEventListener("click",e=>{
  if(e.target.id==="mj37Refresh")setTimeout(()=>{if(active())mountPublic()},100);
 },true);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();