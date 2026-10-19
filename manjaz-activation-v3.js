/* MANJAZ | Daily Activation v3: original per-card previews, public solved cards, optional outcomes, stable PDF */
(function(){"use strict";
if(window.manjazActivationV3Loaded)return;window.manjazActivationV3Loaded=true;
var API="https://idkjuqfxcweqekdkcktk.supabase.co",KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
var MONTHS=["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
var timer=null,busy=false,rendererVersion="3.1";
function el(id){return document.getElementById(id);}
function value(id){var x=el(id);return x?x.value:"";}
function text(id,value){var x=el(id);if(x)x.textContent=value;}
function msg(s,error){var x=el("ma-message");if(x){x.textContent=s;x.style.color=error?"#b42318":"#0e7770";}}
function current(){
 var id=Number(value("ma-card")),item=el("ma-card"),option=item&&item.selectedOptions[0];
 return Number.isInteger(id)&&id>0&&id<=130?{id:id,title:option?option.textContent:"بطاقة نشاط"}:null;
}
function checks(){return [...document.querySelectorAll("#manjazActivation .ma-check-item:checked")].map(function(x){return x.value;});}
function form(){
 var c=current();if(!c)return null;
 return {card:c.id,teacher:value("ma-teacher"),klass:value("ma-class"),
 weekday:value("ma-weekday"),day:Number(value("ma-hday")),month:Number(value("ma-hmonth")),
 year:Number(value("ma-hyear")),period:Number(value("ma-period")),indicators:checks(),
 outcome:value("ma-outcome").trim()};
}
function complete(v){
 if(!v||!v.teacher||!v.klass||!v.weekday||!v.day||!v.month||!v.year||!v.period){
  msg("أكملي اليوم والتاريخ واسم المعلمة والفصل والحصة قبل التصدير أو الحفظ.",true);return false;
 }
 return true;
}
function cardLink(v,variant){
 var u=new URL("manjaz-activation-card-render.html",location.href);
 u.searchParams.set("v",rendererVersion);
 u.searchParams.set("card",v.card);
 u.searchParams.set("variant",variant);
 if(variant==="activity"){
  u.searchParams.set("date",(v.weekday&&v.day&&v.month&&v.year)?(v.weekday+" | "+v.day+" "+MONTHS[v.month-1]+" "+v.year+" هـ"):"");
  u.searchParams.set("teacher",v.teacher||"");u.searchParams.set("class",v.klass||"");
  u.searchParams.set("period",v.period?"الحصة "+v.period:"");
  if(v.indicators.length)u.searchParams.set("checks",v.indicators.join("|"));
  if(v.outcome)u.searchParams.set("outcome",v.outcome);
 }
 return u.toString();
}
function loadFrame(frame,url){
 return new Promise(function(resolve,reject){
  var done=false;
  var timeout=setTimeout(function(){finish(new Error("انتهت مهلة تحميل البطاقة، افتحيها من الرابط المباشر."));},25000);
  var watcher=setInterval(function(){
   try{
    var body=frame.contentDocument&&frame.contentDocument.body;
    if(!body)return;
    if(body.dataset.cardState==="ready"&&body.querySelector(".session"))finish(null);
    else if(body.dataset.cardState==="error")finish(new Error(body.textContent.trim().slice(0,170)));
   }catch(e){finish(new Error("تعذر الوصول إلى بطاقة المعاينة."));}
  },120);
  function finish(err){if(done)return;done=true;clearTimeout(timeout);clearInterval(watcher);err?reject(err):resolve(frame);}
  frame.src=url;
 });
}
async function preview(variant,needComplete){
 var v=form();if(!v){msg("اختاري بطاقة من القائمة أولًا.",true);return;}
 if(needComplete&&!complete(v))return;
 var solved=variant==="solved",section=el(solved?"ma-answer":"ma-preview");
 var frame=el(solved?"ma-v3-solved-frame":"ma-preview-frame");
 var url=cardLink(v,variant);
 section.hidden=false;frame.style.minHeight="540px";
 text(solved?"ma-v3-solved-state":"ma-v3-preview-state","جارٍ تحميل البطاقة الأصلية من قاعدة البيانات…");
 var external=el(solved?"ma-v3-solved-link":"ma-v3-preview-link");external.href=url;
 try{
  await loadFrame(frame,url);
  text(solved?"ma-v3-solved-state":"ma-v3-preview-state",solved?"تم تحميل بطاقة الحل النموذجي كما هي من النسخة الأصلية.":"تم تحميل البطاقة بنجاح مع بيانات التنفيذ.");
  msg(solved?"بطاقة الحل النموذجي الأصلية جاهزة للاستعراض والتصدير.":"البطاقة المعبأة جاهزة للمعاينة.",false);
  section.scrollIntoView({behavior:"smooth",block:"start"});
 }catch(e){
  text(solved?"ma-v3-solved-state":"ma-v3-preview-state","تعذر عرض المعاينة داخل الصفحة. استخدمي «فتح البطاقة في نافذة مستقلة».");
  msg("تعذر عرض المعاينة: "+e.message,true);
 }
}
function loadEngine(win){
 if(typeof win.html2pdf==="function")return Promise.resolve();
 return new Promise(function(resolve,reject){
  var node=win.document.createElement("script"),done=false;
  var t=setTimeout(function(){if(!done){done=true;reject(new Error("لم يكتمل تحميل محرك PDF."));}},18000);
  node.src="vendor/html2pdf.bundle.min.js?v=0.14.0";node.async=true;
  node.onload=function(){if(done)return;done=true;clearTimeout(t);typeof win.html2pdf==="function"?resolve():reject(new Error("تعذر تهيئة محرك PDF."));};
  node.onerror=function(){if(done)return;done=true;clearTimeout(t);reject(new Error("ملف مكتبة PDF غير متاح."));};
  win.document.head.appendChild(node);
 });
}
var lastBlob=null;
async function exportPDF(variant){
 var v=form();if(!v){msg("اختاري بطاقة أولًا.",true);return;}
 if(variant==="activity"&&!complete(v))return;
 if(busy)return;busy=true;
 var solved=variant==="solved";
 var button=el(solved?"ma-v3-export-solved":"ma-print");
 var label=button.textContent;button.disabled=true;button.textContent="جارٍ إنشاء PDF…";
 var section=el(solved?"ma-answer":"ma-preview"),frame=el(solved?"ma-v3-solved-frame":"ma-preview-frame"),node;
 var oldStyle={};
 try{
  section.hidden=false;
  await loadFrame(frame,cardLink(v,variant));
  var win=frame.contentWindow,doc=frame.contentDocument;
  node=doc.querySelector(".session");
  if(!node||doc.querySelectorAll(".session").length!==1||!node.querySelector("footer"))
   throw new Error("صفحة البطاقة أو التذييل الرسمي غير مكتمل.");
  await loadEngine(win);
  if(doc.fonts&&doc.fonts.ready)await doc.fonts.ready;
  oldStyle={height:node.style.height,breakAfter:node.style.breakAfter,letterSpacing:node.style.letterSpacing};
  node.style.height="294mm";node.style.breakAfter="auto";node.style.letterSpacing="normal";
  if(doc.querySelector(".outcome-description")){
   var desc=doc.querySelector(".outcome-description");
   if(desc.scrollHeight>desc.clientHeight+3)throw new Error("وصف النواتج أطول من المساحة المتاحة بصفحة واحدة؛ اختصريه قليلًا.");
  }
  var filename=(solved?"بطاقة_الحل_النموذجي_":"بطاقة_تفعيل_الاحتياط_")+String(v.card).padStart(3,"0")+".pdf";
  var worker=win.html2pdf().set({
   filename:filename,margin:0,
   image:{type:"jpeg",quality:0.98},
   html2canvas:{scale:2,useCORS:true,backgroundColor:"#fff",logging:false,
    scrollX:0,scrollY:0,windowWidth:1200,
    onclone:function(cloned){
     cloned.querySelectorAll(".session h1,.session p,.session .question,.session .step,.session .solved-text").forEach(function(n){
      n.style.letterSpacing="normal";n.style.wordSpacing="normal";
      n.style.fontKerning="none";
     });
    }},
   jsPDF:{unit:"mm",format:"a4",orientation:"portrait",compress:true},
   pagebreak:{mode:[]},enableLinks:false
  }).from(node).toPdf();
  var pdf=await worker.get("pdf");
  if(!pdf||!pdf.internal||pdf.internal.getNumberOfPages()!==1)
   throw new Error("لم يمكن ضبط المحتوى في صفحة A4 واحدة.");
  var blob=pdf.output("blob");if(!blob||!blob.size)throw new Error("الملف الناتج فارغ.");
  if(lastBlob)URL.revokeObjectURL(lastBlob);
  lastBlob=URL.createObjectURL(blob);
  var anchor=el(solved?"ma-v3-download-solved":"ma-pdf-download");
  anchor.href=lastBlob;anchor.download=filename;anchor.hidden=false;
  var ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  if(!ios)anchor.click();
  msg("تم تجهيز PDF بصفحة واحدة. استخدمي «فتح / حفظ PDF» لفتحه أو حفظه.",false);
 }catch(e){msg("تعذر التصدير: "+(e.message||String(e))+". بإمكانك فتح البطاقة الأصلية في نافذة مستقلة.",true);}
 finally{
  if(node){node.style.height=oldStyle.height||"";node.style.breakAfter=oldStyle.breakAfter||"";node.style.letterSpacing=oldStyle.letterSpacing||"";}
  busy=false;button.disabled=false;button.textContent=label;
 }
}
function hijriMatches(v){
 try{
  var start=Date.UTC(Math.floor(v.year*.970224+621)-1,0,1);
  var dateFormat=new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura",{timeZone:"Asia/Riyadh",year:"numeric",month:"numeric",day:"numeric"});
  var wd=new Intl.DateTimeFormat("ar-SA",{timeZone:"Asia/Riyadh",weekday:"long"});
  for(var i=0;i<1120;i++){
   var day=new Date(start+i*86400000),parts=Object.fromEntries(dateFormat.formatToParts(day).filter(function(x){return x.type!=="literal";}).map(function(x){return [x.type,x.value];}));
   if(+parts.year===v.year&&+parts.month===v.month&&+parts.day===v.day)
    return wd.format(day).replace("الاثنين","الإثنين")===v.weekday;
  }
 }catch(e){return false;}
 return false;
}
async function save(){
 var v=form();if(!complete(v))return;
 if(!hijriMatches(v)){msg("اليوم لا يوافق التاريخ الهجري المختار وفق تقويم أم القرى.",true);return;}
 var btn=el("ma-save");btn.disabled=true;
 try{
  var main=value("ma-main"),sub=value("ma-sub");
  var options=el("ma-card").selectedOptions,title=(options[0]?.textContent||"").replace(/^\d+\s*\|\s*/,"");
  var row={teacher_name:v.teacher,class_name:v.klass,weekday:v.weekday,hijri_day:v.day,hijri_month:v.month,hijri_year:v.year,period:v.period,card_id:v.card,main_category:main,sub_category:sub,card_title:title,verification_indicators:v.indicators,outcome_description:v.outcome};
  var res=await fetch(API+"/rest/v1/manjaz_activation_logs",{method:"POST",headers:{"apikey":KEY,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(row)});
  if(!res.ok)throw new Error("استجابة الحفظ "+res.status+": "+(await res.text()).slice(0,120));
  msg("تم حفظ بطاقة التفعيل"+(v.outcome?" مع وصف النواتج":" دون وصف نواتج")+" بنجاح.",false);
 }catch(e){msg("تعذر حفظ التنفيذ: "+(e.message||String(e)),true);}
 finally{btn.disabled=false;}
}
function replaceClick(id,callback){
 var original=el(id);if(!original)return;
 var fresh=original.cloneNode(true);original.replaceWith(fresh);
 fresh.addEventListener("click",callback);
}
function injectLink(parent,id,textValue){
 var a=document.createElement("a");
 a.id=id;a.textContent=textValue;a.href="#";a.target="_blank";a.rel="noopener noreferrer";
 a.className="ma-v3-action-link";parent.appendChild(a);return a;
}
function init(){
 var root=el("manjazActivation");if(!root||root.dataset.activationV3==="ready")return;
 root.dataset.activationV3="ready";
 var selected=el("ma-selected");
 if(!selected)return;
 var wrap=document.createElement("div");wrap.className="ma-v3-outcome";
 wrap.innerHTML='<label for="ma-outcome">مساحة الإنجاز – وصف نواتج التنفيذ <small>(اختياري)</small></label><textarea id="ma-outcome" rows="3" maxlength="800" placeholder="اكتبي وصفًا موجزًا للنواتج إن رغبتِ. يمكن حفظ البطاقة وتصديرها دون كتابة أي وصف."></textarea><p>إذا تُرك الحقل فارغًا فلن يُدرج وصف إضافي في البطاقة المصدّرة.</p>';
 selected.insertAdjacentElement("afterend",wrap);
 var previewSection=el("ma-preview"),previewState=document.createElement("p");previewState.id="ma-v3-preview-state";
 previewSection.insertBefore(previewState,el("ma-preview-frame"));
 injectLink(previewSection,"ma-v3-preview-link","فتح البطاقة في نافذة مستقلة");
 var solvedSection=el("ma-answer");solvedSection.replaceChildren();
 var heading=document.createElement("h3");heading.textContent="بطاقة الحل النموذجي الأصلية";solvedSection.appendChild(heading);
 var state=document.createElement("p");state.id="ma-v3-solved-state";solvedSection.appendChild(state);
 var solvedFrame=document.createElement("iframe");solvedFrame.id="ma-v3-solved-frame";solvedFrame.title="بطاقة الحل النموذجي";solvedSection.appendChild(solvedFrame);
 var actions=document.createElement("div");actions.className="ma-actions";solvedSection.appendChild(actions);
 var exportBtn=document.createElement("button");exportBtn.id="ma-v3-export-solved";exportBtn.type="button";exportBtn.textContent="تصدير بطاقة الحل النموذجي PDF";actions.appendChild(exportBtn);
 injectLink(actions,"ma-v3-solved-link","فتح البطاقة الأصلية");
 var dl=injectLink(actions,"ma-v3-download-solved","فتح / حفظ PDF المحلول");dl.hidden=true;
 replaceClick("ma-open",function(){preview("activity",false);});
 replaceClick("ma-print",function(){exportPDF("activity");});
 replaceClick("ma-solution",function(){preview("solved",false);});
 replaceClick("ma-save",save);
 el("ma-card").addEventListener("change",function(){var outcome=el("ma-outcome");if(outcome)outcome.value="";var dl=el("ma-pdf-download");if(dl)dl.hidden=true;var sd=el("ma-v3-download-solved");if(sd)sd.hidden=true;});
 exportBtn.addEventListener("click",function(){exportPDF("solved");});
 var btn=el("ma-solution");if(btn)btn.textContent="بطاقة الحل النموذجي";
 var dlAct=el("ma-pdf-download");if(dlAct)dlAct.hidden=true;
 if(!el("maActivationV3Style")){
  var style=document.createElement("style");style.id="maActivationV3Style";
  style.textContent='#manjazActivation .ma-v3-outcome{margin:12px 0;padding:12px;background:#f7fafb;border:1px solid #d8e5e8;border-radius:10px}'+
   '#manjazActivation .ma-v3-outcome textarea{direction:rtl;width:100%;box-sizing:border-box;border:1px solid #b6cbd0;border-radius:8px;background:#fff;padding:11px;font:14px/1.8 Tahoma,Arial,sans-serif;resize:vertical;color:#173847}'+
   '#manjazActivation .ma-v3-outcome small{color:#63818a}#manjazActivation .ma-v3-outcome p{color:#607981;font-size:12px;margin:5px 0 0}'+
   '#manjazActivation .ma-v3-action-link{display:inline-block;background:#e7f4f2;border:1px solid #c5dbda;color:#12545b;border-radius:8px;text-decoration:none;padding:9px 14px;font-weight:700;font-size:13px;margin:10px 4px}'+
   '#manjazActivation .ma-v3-action-link[hidden]{display:none!important}';
  document.head.appendChild(style);
 }
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",init,{once:true});else init();
window.addEventListener("hashchange",function(){setTimeout(init,110);});
var view=el("view");if(view){var pending;new MutationObserver(function(){if(location.hash!=="#daily-activation")return;clearTimeout(pending);pending=setTimeout(init,60);}).observe(view,{childList:true,subtree:false});}
})();