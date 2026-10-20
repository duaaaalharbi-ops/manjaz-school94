/* MANJAZ v57: isolated PDF renderer for Positive Behavior and Other; general card renderer unchanged. */
(function(){"use strict";
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function row(label,value){return '<div class="kv"><b>'+esc(label)+'</b><span>'+esc(value||"—")+'</span></div>';}
function cardTemplate(v){
 var behavior=v.bag==="positive_behavior";
 var card=behavior&&(window.ManjazBehaviorCards||[]).find(x=>x.id===Number(v.c&&v.c[0]));
 if(behavior&&!card)throw new Error("تعذر العثور على بطاقة السلوك الإيجابي.");
 var title=behavior?card.title:v.title;
 var s='<section class="mj-extra-paper" dir="rtl" lang="ar"><header class="mj-extra-head"><div><strong>وزارة التعليم</strong><span>الإدارة العامة للتعليم بمحافظة جدة</span><span>الثانوية الرابعة والتسعون – مسارات</span></div><b>تفعيل حصص الاحتياط</b></header>';
 s+='<div class="mj-extra-stripe"></div><div class="mj-extra-tag">'+esc(behavior?"حقيبة تعزيز السلوك الإيجابي":"حقيبة التفعيل – أخرى")+'</div>';
 s+='<h1>'+esc(title)+'</h1>';
 if(behavior)s+='<div class="mj-extra-number">المجال: '+esc(card.main)+' | القسم الفرعي: بطاقات المجال | البطاقة '+String(card.id).padStart(2,"0")+' من 90 | المدة: 45 دقيقة</div>';
 s+='<div class="mj-extra-grid">'+row("المعلمة المنفذة",v.teacher)+row("اليوم والتاريخ الهجري",v.weekday+" – "+v.day+"/"+v.month+"/"+v.year)+row("الفصول",v.klasses.join("، "))+row("الحصص",v.periods.map(x=>"الحصة "+x).join("، "))+'</div>';
 if(behavior){
  s+='<div class="mj-extra-block"><h2>الهدف السلوكي</h2><p>'+esc(card.goal.replace(/^الهدف السلوكي\s*/,""))+'</p></div>';
  s+='<div class="mj-extra-block"><h2>موقف من واقع المدرسة</h2><p>'+esc(card.scenario)+'</p></div>';
  s+='<div class="mj-extra-block mj-extra-plan"><h2>خطة تفعيل الحصة</h2><p>'+esc(card.plan)+'</p></div>';
  s+='<div class="mj-extra-block"><h2>نتاج الحصة</h2><p>'+esc(card.result)+'</p></div>';
  s+='<div class="mj-extra-block"><h2>مؤشرات البطاقة</h2><p>'+esc(card.verify)+'</p></div>';
 }else{
  s+='<div class="mj-extra-block mj-extra-custom"><h2>عنوان التفعيل</h2><p>'+esc(v.title)+'</p></div>';
  if(v.url)s+='<div class="mj-extra-block"><h2>الرابط الإلكتروني المرفق</h2><p class="mj-extra-url">'+esc(v.url)+'</p></div>';
 }
 if(v.indicators.length)s+='<div class="mj-extra-block mj-extra-ind"><h2>مؤشرات التحقق السريع المحددة</h2><p>'+esc(v.indicators.join(" | "))+'</p></div>';
 if(v.outcome)s+='<div class="mj-extra-block mj-extra-outcome"><h2>مساحة الإنجاز – وصف نواتج الإنجاز</h2><p>'+esc(v.outcome)+'</p></div>';
 s+='<footer><span>الثانوية الرابعة والتسعون – مسارات</span><span>العام الدراسي 1448هـ</span><span>تفعيل حصص الاحتياط</span></footer></section>';
 return s;
}
var style="\n.mj-extra-paper{box-sizing:border-box;width:210mm;height:297mm;max-height:297mm;overflow:hidden;background:#fff;color:#174454;padding:0 15mm 13mm;font:15px/1.5 Tahoma,Arial,sans-serif;position:relative;direction:rtl}\n.mj-extra-head{background:#133a4b;color:#fff;display:flex;align-items:center;justify-content:space-between;margin:0 -15mm;padding:13mm 15mm 8mm;min-height:32mm;box-sizing:border-box}\n.mj-extra-head>div{display:grid;gap:2px;font-size:13px}.mj-extra-head strong{font-size:19px}.mj-extra-head b{font-size:14px}\n.mj-extra-stripe{height:3mm;margin:0 -15mm;background:linear-gradient(90deg,#128875,#19869f,#6ab769)}\n.mj-extra-tag{font-weight:700;background:#e4f3ef;color:#116b6f;display:inline-block;padding:5px 14px;border-radius:8px;margin-top:10mm;font-size:14px}\n.mj-extra-paper h1{font-size:24px;color:#12475c;margin:5mm 0 2mm;font-weight:800}\n.mj-extra-number{font-size:12px;color:#436b74;border-bottom:1px solid #d4e5e4;padding-bottom:4mm}\n.mj-extra-grid{display:grid;grid-template-columns:1fr 1fr;gap:2mm 3mm;margin:5mm 0}\n.mj-extra-grid .kv{background:#edf5f5;border:1px solid #d4e5e4;padding:3mm;min-height:13mm;box-sizing:border-box;display:flex;flex-direction:column;gap:1mm;border-radius:5px;overflow-wrap:anywhere;font-size:13px}\n.mj-extra-grid .kv b{color:#0e7880;font-size:12px}\n.mj-extra-block{border-right:3px solid #148b8d;padding:1.4mm 4mm;margin:2mm 0;background:#f5faf9;border-radius:3px;overflow-wrap:anywhere}\n.mj-extra-block h2{font-size:13px;color:#086e73;margin:0 0 1mm}.mj-extra-block p{font-size:13.5px;line-height:1.65;margin:0}\n.mj-extra-paper .mj-extra-plan{background:#eef6f6}\n.mj-extra-custom{min-height:35mm}\n.mj-extra-url{direction:ltr;text-align:left;unicode-bidi:plaintext;font-size:11px!important;overflow-wrap:anywhere}\n.mj-extra-outcome{background:#f0f5ed}\n.mj-extra-paper footer{position:absolute;bottom:0;right:0;left:0;box-sizing:border-box;height:16mm;display:flex;justify-content:space-between;align-items:center;background:#133a4b;color:#fff;padding:0 15mm;font-size:11px}\n.mj-extra-paper.compact{font-size:13px}.mj-extra-paper.compact .mj-extra-head{padding-top:8mm;padding-bottom:6mm;min-height:25mm}\n.mj-extra-paper.compact .mj-extra-tag{margin-top:4mm}.mj-extra-paper.compact .mj-extra-grid{margin:2mm 0;gap:1mm}.mj-extra-paper.compact .kv{min-height:9mm;padding:1mm 3mm}\n.mj-extra-paper.compact .mj-extra-block{margin:1mm 0;padding:1mm 3mm}.mj-extra-paper.compact .mj-extra-block p{font-size:12px;line-height:1.35}.mj-extra-paper.compact h1{font-size:20px;margin:2mm 0}";

function ensureEngine(){
 if(typeof window.html2pdf==="function")return Promise.resolve(window.html2pdf);
 return new Promise(function(resolve,reject){var x=document.createElement("script");x.src="vendor/html2pdf.bundle.min.js?v=57";
 x.onload=()=>window.html2pdf?resolve(window.html2pdf):reject(new Error("محرك PDF غير متاح"));
 x.onerror=()=>reject(new Error("تعذر تحميل محرك PDF"));
 document.head.appendChild(x);});
}
async function exportPdf(v){
 if(v.bag!=="positive_behavior"&&v.bag!=="other")throw new Error("نوع الحقيبة غير مدعوم.");
 var pdfEngine=await ensureEngine();
 var staging=document.createElement("div");
 staging.style.cssText="position:fixed;top:0;left:-20000px;z-index:-1;pointer-events:none;visibility:visible";
 var root=document.createElement("div");
 root.style.cssText="position:relative;box-sizing:border-box;width:210mm;height:297mm;background:#fff;visibility:visible";
 var s=document.createElement("style");s.textContent=style;root.appendChild(s);
 root.insertAdjacentHTML("beforeend",cardTemplate(v));
 staging.appendChild(root);
 document.body.appendChild(staging);
 try{
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  var paper=root.querySelector(".mj-extra-paper");
  if(paper.scrollHeight>paper.clientHeight+2)paper.classList.add("compact");
  if(paper.scrollHeight>paper.clientHeight+2)throw new Error("البيانات تتجاوز مساحة البطاقة؛ اختصري وصف الإنجاز أو الاختيارات.");
  var worker=pdfEngine().set({margin:0,html2canvas:{scale:2,backgroundColor:"#fff",logging:false,scrollX:0,scrollY:0,windowWidth:1200},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:[]},enableLinks:false}).from(root).toCanvas();
  var canvas=await worker.get("canvas");
  if(!canvas||canvas.width<750||canvas.height<1050)throw new Error("تعذر توليد صورة A4.");
  var JSPDF=window.jspdf&&window.jspdf.jsPDF;
  if(!JSPDF){
   await new Promise((resolve,reject)=>{var j=document.createElement("script");j.src="vendor/jspdf.umd.min.js?v=57";j.onload=resolve;j.onerror=reject;document.head.appendChild(j);});
   JSPDF=window.jspdf&&window.jspdf.jsPDF;
  }
  if(!JSPDF)throw new Error("مكتبة PDF غير متاحة.");
  var pdf=new JSPDF({unit:"mm",format:"a4",orientation:"portrait",compress:true});
  pdf.addImage(canvas.toDataURL("image/jpeg",.96),"JPEG",0,0,210,297,undefined,"FAST");
  if(pdf.internal.getNumberOfPages()!==1)throw new Error("عدد الصفحات غير صحيح.");
  return {blob:pdf.output("blob"),filename:"بطاقة_تفعيل_"+(v.bag==="other"?"أخرى":String(v.c[0]).padStart(3,"0"))+".pdf"};
 }finally{staging.remove();}
}
window.ManjazExtraActivityV57={exportPdf:exportPdf,html:cardTemplate};
})();