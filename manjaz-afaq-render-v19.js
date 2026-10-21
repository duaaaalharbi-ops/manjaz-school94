/* Update 19: isolated renderer for Afaq al-Fikr cards. No existing renderer is changed. */
(function(){"use strict";
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function get(id){return (window.ManjazAfaqCards||[]).find(c=>c.id===Number(id));}
const labels=["تهيئة وفكرة أولية","أفكر وحدي","أتعاون وأنتج","أعرض وأناقش","أطبق وأغادر"];
const minutes=[5,7,12,15,6];
const css=".ma-afaq-paper{width:210mm;height:297mm;box-sizing:border-box;background:#fff;color:#143944;direction:rtl;text-align:right;overflow:hidden;position:relative;padding:11mm 13mm 18mm;font:13px/1.45 Tahoma,Arial,sans-serif}.ma-afaq-paper *{box-sizing:border-box}.ma-afaq-paper header{border-bottom:2px solid #236a73;display:flex;justify-content:space-between;gap:10px;padding-bottom:3mm;font-size:11px}.ma-afaq-paper header div{display:grid;gap:2px}.ma-afaq-paper header strong{font-size:14px}.ma-afaq-paper h1{text-align:center;font-size:22px;margin:3mm 0 1mm;color:#124354}.ma-afaq-paper h2{font-size:13px;color:#126271;margin:0 0 1mm}.ma-afaq-paper .af-kicker{text-align:center;margin-top:4mm;font-size:12px;color:#17717b}.ma-afaq-paper .af-count{text-align:center;margin-bottom:4mm;font-size:11px;color:#647d84}.ma-afaq-paper .af-data{display:grid;grid-template-columns:1fr 1fr;gap:2mm;margin-bottom:3mm}.ma-afaq-paper .af-data span{border:1px solid #d6e5e7;padding:1.5mm;font-size:11px}.ma-afaq-paper section{border-right:3px solid #2c8a87;background:#f6faf9;padding:2.2mm 3mm;margin:2.5mm 0;overflow-wrap:anywhere}.ma-afaq-paper p{margin:0;overflow-wrap:anywhere}.ma-afaq-paper .af-question{background:#e9f3f5;font-weight:700}.ma-afaq-paper table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:10.5px;line-height:1.35;margin-top:2mm}.ma-afaq-paper th,.ma-afaq-paper td{border:1px solid #cddddd;padding:1.5mm;text-align:right;vertical-align:top;overflow-wrap:anywhere}.ma-afaq-paper th{background:#e7f1f0}.ma-afaq-paper th:first-child{width:24%}.ma-afaq-paper th:last-child{width:13%}.ma-afaq-paper .af-blank{height:6mm;border-bottom:1px dotted #afc4c8}.ma-afaq-paper footer{position:absolute;bottom:6mm;right:13mm;left:13mm;border-top:1px solid #a3c0c1;display:flex;justify-content:space-between;padding-top:2mm;color:#476971;font-size:10px;gap:5px}.ma-afaq-paper.compact{font-size:11.5px;line-height:1.3;padding-top:6mm}.ma-afaq-paper.compact h1{font-size:18px;margin:1mm 0}.ma-afaq-paper.compact section{margin:1.2mm 0;padding:1.2mm 2mm}.ma-afaq-paper.compact table{font-size:9.4px}.ma-afaq-paper.compact td,.ma-afaq-paper.compact th{padding:1mm}";
function block(label,content,cl=""){return '<section class="'+cl+'"><h2>'+esc(label)+'</h2><p>'+esc(content||"—")+'</p></section>';}
function planParts(lines){
 const items=labels.map((label,i)=>({label,minutes:minutes[i],text:""}));let last=-1;
 for(const source of lines||[]){
  const line=String(source||"").trim();if(!line)continue;
  const idx=labels.findIndex(label=>line.includes(label));
  if(idx!==-1){last=idx;items[idx].text+=line.replace(label,"").replace(/\b(5|7|12|15|6)\s*دقائق?\b/g,"").replace(/^\s*[:：]\s*/,"").trim()+" ";}
  else if(last>=0)items[last].text+=line+" ";
 }
 return items;
}
function markup(id,variant,meta={}){
 const c=get(id);if(!c)throw Error("بطاقة آفاق الفكر غير متاحة.");
 if(!["activity","solved"].includes(variant))throw Error("نوع البطاقة غير صالح.");
 const no=String(c.id).padStart(2,"0"),solved=variant==="solved";
 let s='<article class="ma-afaq-paper" dir="rtl" lang="ar"><header><div><strong>المملكة العربية السعودية | وزارة التعليم</strong><span>الإدارة العامة للتعليم بمحافظة جدة</span><span>الثانوية الرابعة والتسعون – مسارات</span></div><div><span>حقيبة تدريبية تفاعلية</span><span>المرحلة الثانوية | 1448 هـ</span></div></header>';
 s+='<div class="af-kicker">'+(solved?'دليل المعلمة | الحل النموذجي':'حصة الاحتياط | 45 دقيقة')+'</div><h1>آفاق الفكر – مهارات التفكير العليا</h1>';
 s+='<p class="af-count">'+esc((solved?'بطاقة الحل النموذجي ':'بطاقة النشاط ')+no+' من 50 | '+c.skill+' | '+c.sub)+'</p>';
 if(solved){
  s+=block("السؤال المرتبط بالنشاط",c.question,"af-question");
  s+=block("نموذج استجابة مقترح",c.model);
  s+=block("التعليل أو الدليل الداعم",c.reason);
  s+=block("وجهة نظر بديلة للنقاش",c.alternative);
  s+=block("تطبيق عملي أو خالصة للحصة",c.practice);
  s+='<section><h2>مؤشرات قبول إجابات الطالبات</h2>'+c.criteria.map(x=>'<p>□ '+esc(x)+'</p>').join('')+'</section>';
  s+=block("إرشاد تربوي","هذه إجابة إرشادية قابلة للتطوير؛ تُقبل البدائل المبررة ويحترم اختلاف الآراء.");
 }else{
  const periods=Array.isArray(meta.periods)?meta.periods:[],classes=Array.isArray(meta.klasses)?meta.klasses:[];
  s+='<div class="af-data"><span>المعلمة المنفذة: '+esc(meta.teacher||"—")+'</span><span>التاريخ الهجري: '+esc((meta.weekday||"")+" "+(meta.day||"")+"/"+(meta.month||"")+"/"+(meta.year||""))+'</span><span>الفصول: '+esc(classes.join("، ")||"—")+'</span><span>الحصص: '+esc(periods.join("، ")||"—")+'</span></div>';
  s+=block("السؤال المحوري",c.question,"af-question");
  s+=block("التحدي التفاعلي",c.challenge);
  s+='<section><h2>خطة الحصة التفاعلية</h2><table><thead><tr><th>المرحلة</th><th>التكليف</th><th>الزمن</th></tr></thead><tbody>'+
    planParts(c.plan).map(x=>'<tr><td>'+esc(x.label)+'</td><td>'+esc(x.text.trim()||"تقديم استنتاج أو حجة مدعمة.")+'</td><td>'+x.minutes+' د</td></tr>').join('')+'</tbody></table></section>';
  s+=block("نتاج البطاقة","حجة واضحة + بديل مدروس + إجراء تطبيقي.");
  s+=block("التحقق السريع","□ فسرت الفكرة  □ قارنت بديلًا  □ بررت اختياري");
  if(meta.indicators?.length)s+=block("مؤشرات التنفيذ المختارة",meta.indicators.join(" | "));
  if(meta.outcome)s+=block("وصف نواتج الإنجاز",meta.outcome);
  s+='<section><h2>مساحة إنجاز الطالبة / المجموعة</h2><p>فكرتنا أو قرارنا المبرر:</p><div class="af-blank"></div><p>البديل أو الدليل الذي ناقشناه:</p><div class="af-blank"></div></section>';
 }
 s+='<footer><span>إعداد المعلمة هاجر السلمي | الإنتاج المعرفي الرقمي</span><span>الثانوية الرابعة والتسعون – مسارات</span></footer></article>';
 return s;
}
function show(host,id,variant,meta={}){
 if(!host)throw Error("معاينة البطاقة غير متاحة");
 host.innerHTML='<style>'+css+'</style>'+markup(id,variant,meta);
 const paper=host.querySelector(".ma-afaq-paper"),scale=Math.min(1,Math.max(0.25,(host.clientWidth-15)/794));
 paper.style.transform="scale("+scale+")";paper.style.transformOrigin="top right";host.style.minHeight=Math.ceil(1123*scale+16)+"px";return paper;
}
let loading=null;
async function ensureEngine(){
 if(typeof window.html2pdf==="function")return window.html2pdf;
 if(!loading)loading=new Promise((resolve,reject)=>{const t=document.createElement("script");t.src="vendor/html2pdf.bundle.min.js?v=57";t.onload=()=>window.html2pdf?resolve(window.html2pdf):reject(Error("محرك PDF غير متاح"));t.onerror=()=>reject(Error("تعذر تحميل محرك PDF"));document.head.append(t)}).catch(e=>{loading=null;throw e});
 return loading;
}
async function exportPdf(v,variant="activity"){
 if(v?.bag!=="afaq")throw Error("الحقيبة غير مدعومة");
 const card=get(v.c?.[0]);if(!card)throw Error("بطاقة آفاق الفكر غير متاحة");
 const pdfEngine=await ensureEngine(),outer=document.createElement("div"),root=document.createElement("div");
 outer.style.cssText="position:fixed;left:-20000px;top:0;z-index:-1;pointer-events:none;visibility:visible";
 root.style.cssText="width:210mm;height:297mm;position:relative;background:white;overflow:hidden";
 root.innerHTML='<style>'+css+'</style>'+markup(card.id,variant,v);outer.append(root);document.body.append(outer);
 try{
  if(document.fonts?.ready)await document.fonts.ready;
  const paper=root.querySelector(".ma-afaq-paper");
  if(paper.scrollHeight>paper.clientHeight+3)paper.classList.add("compact");
  if(paper.scrollHeight>paper.clientHeight+3)throw Error("محتوى البطاقة يتجاوز صفحة A4؛ اختصري وصف الإنجاز.");
  const canvas=await pdfEngine().set({margin:0,html2canvas:{scale:2,backgroundColor:"#fff",logging:false,scrollY:0,windowWidth:1200},jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},pagebreak:{mode:[]},enableLinks:false}).from(root).toCanvas().get("canvas");
  if(!canvas||canvas.width<750||canvas.height<1050)throw Error("تعذر توليد صفحة A4");
  let JSPDF=window.jspdf?.jsPDF;
  if(!JSPDF){await new Promise((resolve,reject)=>{const t=document.createElement("script");t.src="vendor/jspdf.umd.min.js?v=57";t.onload=resolve;t.onerror=reject;document.head.append(t)});JSPDF=window.jspdf?.jsPDF;}
  if(!JSPDF)throw Error("مكتبة PDF غير متاحة");
  const pdf=new JSPDF({unit:"mm",format:"a4",orientation:"portrait",compress:true});
  pdf.addImage(canvas.toDataURL("image/jpeg",0.96),"JPEG",0,0,210,297,undefined,"FAST");
  if(pdf.internal.getNumberOfPages()!==1)throw Error("لم تنشأ بطاقة PDF من صفحة واحدة");
  return {blob:pdf.output("blob"),filename:"آفاق_الفكر_"+(variant==="solved"?"الحل_النموذجي_":"بطاقة_النشاط_")+String(card.id).padStart(2,"0")+".pdf"};
 }finally{outer.remove();}
}
window.ManjazAfaqActivityV19=Object.freeze({show,exportPdf,markup,cardFor:get,planParts});
})();