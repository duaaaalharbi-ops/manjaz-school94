/* Daily reserve 94: view original Supabase cards + native text-based canvas PDF */
(function(){"use strict";
if(window.ManjazActivityCardV4)return;
var API="https://idkjuqfxcweqekdkcktk.supabase.co",KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL",styles="@page {size:210mm 297mm; margin:0;}\n*{box-sizing:border-box}html,body{padding:0;margin:0;font-family:'Noto Sans Arabic','DejaVu Sans',sans-serif;color:#243444; direction:rtl;}body{font-size:11px}\n.session,.front,.cover{position:relative;width:210mm;height:297mm;page-break-after:always;break-after:page;overflow:hidden;background:#fff}\n.session{padding:14mm 15mm 11mm;background:linear-gradient(180deg,#fbfdfe 0%,#fff 21%)}\n.topline{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid #cad8db;padding-bottom:3.5mm;gap:10px}.org{font-size:9.5px;line-height:1.85;color:#596e76}.org strong{font-size:10.5px;color:#203f4a}.city{font-weight:400}.brand{text-align:left;padding-top:4px}.brand b{font-size:12px;color:var(--accent)}.brand span{display:block;font-size:9px;color:#78909a;margin-top:3px}\n.stripe{margin-top:3.6mm;display:flex;gap:5mm;background:#ecf2f4;border-right:4px solid var(--accent);border-radius:3mm;padding:3mm 3.5mm;font-size:10.5px;color:#52616c}.stripe span:first-child{width:46%}.stripe b{color:#294553;font-weight:700}\n.number{display:flex;align-items:center;justify-content:space-between;margin-top:4.5mm;font-size:10px}.session-tag{padding:1.5mm 3mm;background:var(--accent);border-radius:4mm;color:#fff;font-weight:800}.unit-tag{color:#72838b}.session h1{margin:3.1mm 0 4mm;font-size:23px;line-height:1.45;letter-spacing:-.1px;color:#203545}\n.info-grid{display:grid;grid-template-columns:1.15fr .75fr .85fr 2fr;gap:2.2mm;margin:0 0 3.7mm}.info-grid>div{border:1px solid #b9cbd1;background:#fff;border-radius:2.3mm;min-height:14mm;padding:1.8mm 2.4mm}.info-grid strong{font-size:9.8px;color:#647580;display:block}.write-field{display:block;min-height:6.2mm;border-bottom:1px solid #93aab4}\n.outcomes{display:flex;gap:2.5mm;margin:0 0 3.3mm}.outcomes>div{flex:1;min-height:16.5mm;border-radius:2.2mm;background:#f2f6f7;padding:2.4mm 3.2mm}.outcomes>div:first-child{flex:1.45}.mini-label{display:block;font-size:9.1px;font-weight:700;color:var(--accent)}.outcomes p{margin:1mm 0 0;line-height:1.75;font-size:10.3px}\n.timing{display:flex;align-items:center;gap:2mm;padding:2.2mm 1mm;margin-bottom:3.5mm;border-top:1px solid #e2e8eb;border-bottom:1px solid #e2e8eb;font-size:10px}.timing span{display:flex;gap:4px;justify-content:center;flex:1;white-space:nowrap;color:#546875}.timing span b{color:var(--accent)}.timing strong{font-size:9.5px;color:#243d4b;white-space:nowrap}\n.box{border:1px solid #d3e0e4;border-radius:3mm;background:#fff;overflow:hidden}.content-box{margin-bottom:3mm;padding:3mm 3.8mm;background:#f7fafb;border-right:3px solid var(--accent)}.kicker{font-size:11.2px;font-weight:800;color:var(--accent);margin-bottom:1.9mm}.kicker small{font-size:9px;color:#82919b;font-weight:500;margin-right:2mm}.passage{font-size:12px;line-height:2.0;margin:0;text-align:justify;text-align-last:right}.lead{font-size:11.8px;line-height:1.95;margin:0}\n.activity-box{padding:3mm 3.8mm;margin-bottom:3.2mm}.questions{display:grid;gap:1.6mm;margin-top:1.8mm}.question,.step{display:flex;gap:2.1mm;align-items:flex-start;line-height:1.8;font-size:11.1px;color:#354854}.n{font-weight:800;color:var(--accent);min-width:5mm}.question>span:last-child,.step>span:last-child{flex:1}.quant-list{gap:2.5mm}\n.response{padding:2.8mm 3.8mm;height:37mm;margin-top:1.2mm;position:relative;background:#fff !important}.response .kicker{font-size:10.5px;margin-bottom:1mm}.rules{height:24mm;background:#fff !important;display:flex;flex-direction:column;justify-content:space-evenly}.rules .rule{height:7mm;background:#fff !important;border-bottom:1px solid #dce6e8}.output{position:absolute;bottom:0;right:0;left:0;padding:1.3mm 3.7mm;background:#eef3f4;border-top:1px solid #dae5e7;font-size:9.6px;color:#596d74}.output strong{color:#355566}\n.exit{display:flex;align-items:flex-start;gap:2mm;margin-top:3.5mm;border-radius:2.5mm;background:#eef4f5;border-right:3px solid var(--accent);padding:2.6mm 3.4mm;line-height:1.7;font-size:10.6px}.exit strong{color:var(--accent);white-space:nowrap}.exit span{flex:1}\n.teacher{display:flex;gap:2.3mm;margin-top:3mm;padding:2mm 3mm;line-height:1.6;font-size:9px;color:#74858b;background:#f8fafb;border-radius:2mm}.teacher b{color:#56707d;white-space:nowrap}\n.rubric{display:flex;gap:4mm;align-items:center;flex-wrap:wrap;font-size:9.3px;margin-top:3mm;color:#566e77}.rubric span:first-child{font-weight:700;color:#3b5964}.notes{margin-right:auto}\n.session footer{position:absolute;bottom:7.4mm;left:15mm;right:15mm;border-top:1px solid #dae3e6;display:flex;justify-content:space-between;padding-top:2.5mm;font-size:8.9px;color:#82939a}\n.cover{background:linear-gradient(180deg,#0c4959 0%,#176e7c 82%,#e5f1ef 82.2%,#f7faf9 100%);color:white;padding:24mm 22mm}.cover:before{content:'';position:absolute;top:10mm;left:-25mm;width:85mm;height:85mm;border:1px solid #ffffff50;border-radius:50%}.cover:after{content:'';position:absolute;top:35mm;left:-20mm;width:70mm;height:70mm;border:1px solid #ffffff35;border-radius:50%}.cover-top{font-size:13px;line-height:2.05}.cover-top b{font-size:14px}.cover-middle{position:absolute;top:108mm;right:22mm;left:22mm}.eyebrow{font-size:12.3px;color:#c6e9e6}.cover-middle h1{font-size:46px;line-height:1.4;margin:4mm 0 2mm}.cover-middle p{font-size:16px;line-height:1.8;max-width:125mm}.cover-pills{position:absolute;top:225mm;right:22mm;left:22mm;display:flex;gap:8px;flex-wrap:wrap}.cover-pills span{padding:8px 11px;background:#ffffff20;border:1px solid #b7dad8;border-radius:50px;color:#fff;font-size:10.5px}.cover-footer{position:absolute;bottom:18mm;right:22mm;color:#173d48;font-weight:700;font-size:14px;line-height:2.3}.cover-footer small{font-size:11px;color:#58787c}\n.front{padding:23mm 20mm;color:#253b48}.front-title{color:#176b76;font-weight:800;font-size:16px;border-right:6px solid #176b76;padding:5mm;margin-bottom:13mm;background:#e9f3f4}.front h2{font-size:21px;margin:0 0 8mm}.front h3{margin:9mm 0 2mm;font-size:15px;color:#236978}.front p{line-height:2.2;font-size:12px;text-align:justify}.guide-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:12mm 0}.guide-cards>div{border:1px solid #d7e4e8;border-radius:3mm;padding:5mm;min-height:51mm}.guide-cards b{color:#1a6877;font-size:14px}.guide-cards p{font-size:10px;line-height:1.85}.guide-footer{margin-top:20mm;border:1px dashed #88b6b8;text-align:center;padding:5mm;color:#1a6674;font-weight:700;font-size:14px}\n.toc table{border-collapse:collapse;width:100%;margin:11mm 0;font-size:11px}.toc td,.toc th{border-bottom:1px solid #d6e5e7;padding:3.3mm 2mm;text-align:right}.toc th{background:#176b76;color:#fff}.toc tr:nth-child(even) td{background:#f2f7f8}.toc td:first-child{font-weight:800;color:#20727d}.summary-count{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:12mm}.summary-count>div{background:#eaf4f3;padding:6mm;text-align:center;border-radius:3mm}.summary-count b{display:block;font-size:28px;color:#176b76}.summary-count span{font-size:10px;color:#486b71}.toc-foot{margin-top:8mm;text-align:center;color:#6f818a}\n\n@media screen {.write-field:focus{outline:1.5px solid #17818c;background:#eaf8f7}.session{margin:0 auto;box-shadow:0 1px 10px #00000018}}\n.toc table{margin:6.5mm 0 5mm;font-size:10.2px}.toc td,.toc th{padding:2.3mm 1.8mm}.toc .summary-count{margin-top:6mm}.toc .toc-foot{margin-top:4mm}.front.toc{padding-top:19mm}.front.toc>p{font-size:11px;line-height:1.7}.front.toc .front-title{margin-bottom:8mm}\n\n.cover-pills{top:211mm}\n" + "\n/* Exact source-layout export: no handwritten guide lines; electronic field values only. */\n.response.ma-activity-response{height:37mm!important;min-height:37mm!important;max-height:37mm!important;overflow:hidden!important;background:#fff!important}\n.response.ma-activity-response .rules,.response.ma-activity-response .rule{display:none!important}\n.response.ma-activity-response .output{position:absolute!important;bottom:0!important;right:0!important;left:0!important}\n.response.ma-activity-response .ma-user-outcome{font-size:10.2px!important;line-height:1.6!important;margin:1mm 0 0!important;padding:1mm 2mm!important;max-height:24mm!important;overflow:hidden!important;white-space:pre-wrap!important;overflow-wrap:anywhere!important;direction:rtl!important;text-align:right!important}\n.session .write-field.ma-autofill{border:0!important;box-shadow:none!important}\n.session.ma-multi-coverage .info-grid{grid-template-columns:1.1fr 1.05fr 1.85fr 1.45fr!important}\n.session.ma-multi-coverage .info-grid>div{min-height:16mm!important;overflow:visible!important}\n.session.ma-multi-coverage .write-field.ma-multiple-values{font-weight:700!important;overflow-wrap:anywhere!important;white-space:normal!important}\n.session .teacher,.session .notes{display:none!important}\n";
var cache=new Map(),pdfEngine=null;
var compact=function(x){return String(x==null?"":x).replace(/\s+/g," ").trim();};
function txt(root,selector){var e=root.querySelector(selector);return e?compact(e.textContent):"";}
async function loadCard(id,variant){
 var key=variant+":"+id;if(cache.has(key))return cache.get(key);
 var url=API+"/rest/v1/manjaz_activation_card_templates?card_id=eq."+Number(id)+"&variant=eq."+variant+"&select=card_html&limit=1";
 var res=await fetch(url,{headers:{"apikey":KEY},cache:"no-store"});
 if(!res.ok)throw Error("تعذر تحميل البطاقة من قاعدة البيانات ("+res.status+").");
 var data=await res.json();if(!data.length||!data[0].card_html)throw Error("لم يُعثر على نسخة البطاقة في قاعدة البيانات.");
 cache.set(key,data[0].card_html);return data[0].card_html;
}
function fill(html,metadata,variant){
 var doc=new DOMParser().parseFromString(html,"text/html"),section=doc.querySelector("section.session");
 if(!section)throw Error("صفحة البطاقة الأصلية غير مكتملة.");
 section.querySelectorAll("script,iframe,object,embed,form,link").forEach(function(x){x.remove();});
 section.querySelectorAll("*").forEach(function(x){[...x.attributes].forEach(function(a){if(/^on/i.test(a.name))x.removeAttribute(a.name);});});
 var date=metadata.day&&metadata.monthLabel&&metadata.year?metadata.weekday+" | "+metadata.day+" "+metadata.monthLabel+" "+metadata.year+" هـ":"—";
 var klasses=Array.isArray(metadata.klasses)&&metadata.klasses.length?metadata.klasses:[metadata.klass].filter(Boolean);
 var periods=Array.isArray(metadata.periods)&&metadata.periods.length?metadata.periods:[metadata.period].filter(Boolean);
 var multi=klasses.length>1||periods.length>1;
 var vals=[date,periods.length>1?periods.join("، "):periods.length?"الحصة "+periods[0]:"—",klasses.join("، ")||"—",metadata.teacher||"—"];
 if(multi){
  section.classList.add("ma-multi-coverage");
  var headings=section.querySelectorAll(".info-grid>div strong");
  if(headings[1])headings[1].textContent="الحصص";
  if(headings[2])headings[2].textContent="الفصول";
 }
 section.querySelectorAll(".info-grid .write-field").forEach(function(x,i){
  x.removeAttribute("contenteditable");x.removeAttribute("role");
  x.textContent=vals[i]||"—";x.classList.add("ma-autofill");
  if(multi&&(i===1||i===2)){
   x.classList.add("ma-multiple-values");
   x.style.fontSize=(i===2&&klasses.length>6)?"8px":"9.5px";
   x.style.lineHeight="1.45";
  }
 });
 // No teacher notes or handwritten-note labels in either exported card.
 section.querySelectorAll(".teacher,.notes,.response .kicker small").forEach(function(x){x.remove();});
 var rubric=section.querySelector(".rubric"),checks=metadata.indicators||[];
 if(rubric){
  rubric.querySelectorAll("label").forEach(function(x){
   var label=compact(x.textContent).replace(/^[□✓☑✔]\\s*/,"");
   if(!checks.includes(label))x.remove();
   else{x.textContent="✓ "+label;x.classList.add("ma-verified");}
  });
  if(!checks.length)rubric.remove();
 }
 if(variant==="activity"){
  var response=section.querySelector(".response");
  if(response){
   // Electronically filled: leave a plain writing-free area even with no outcome.
   response.querySelectorAll(".rules,.rule").forEach(function(x){x.remove();});
   response.classList.add("ma-activity-response");
   var description=String(metadata.outcome||"").trim();
   if(description){
    var p=doc.createElement("p");p.className="ma-user-outcome";p.textContent=description;
    var kicker=response.querySelector(".kicker");
    if(kicker)kicker.after(p);else response.prepend(p);
    response.classList.add("ma-with-outcome");
   }
  }
 }
 return section;
}
var SAFE_LAYOUT_CSS="\n.session .topline .org,.session .topline .brand{min-width:0;overflow-wrap:anywhere}\n.session .stripe>span{min-width:0;flex:1 1 0;width:auto!important;overflow-wrap:anywhere}\n.session .info-grid>div{min-width:0;overflow-wrap:anywhere}\n.session .info-grid .write-field.ma-autofill{min-height:0!important;overflow-wrap:anywhere!important;white-space:normal!important}\n.session .response.ma-activity-response,.session .response.solved-response{\n display:flex!important;flex-direction:column!important;align-items:stretch!important;\n height:auto!important;min-height:34mm!important;max-height:none!important;\n overflow:visible!important;gap:0!important\n}\n.session .response .output{\n position:static!important;inset:auto!important;\n flex-shrink:0!important;margin:2mm -3.8mm -2.8mm!important;\n width:auto!important;line-height:1.55!important;\n white-space:normal!important;overflow-wrap:anywhere!important\n}\n.session .response .solved-text,.session .response .ma-user-outcome{\n display:block!important;flex-shrink:0!important;height:auto!important;\n min-height:0!important;max-height:none!important;overflow:visible!important;\n white-space:pre-wrap!important;overflow-wrap:anywhere!important;\n word-break:normal!important;line-height:1.65!important\n}\n.session .response.ma-activity-response .ma-user-outcome{\n font-size:10.2px!important;padding:1mm!important;margin:1mm 0 0!important\n}\n.session .response.solved-response .solved-text{\n font-size:11px!important;padding:0 1mm!important;margin:1mm 0 0!important\n}\n.session.ma-density-1{padding-top:12mm!important}\n.session.ma-density-1 h1{margin:2mm 0 2.6mm!important;font-size:21px!important}\n.session.ma-density-1 .stripe{margin-top:2.6mm!important;padding:2.2mm 3mm!important}\n.session.ma-density-1 .number{margin-top:2.8mm!important}\n.session.ma-density-1 .info-grid{margin-bottom:2.6mm!important}\n.session.ma-density-1 .outcomes{margin-bottom:2.4mm!important}\n.session.ma-density-1 .content-box,.session.ma-density-1 .activity-box{margin-bottom:2.2mm!important;padding:2.4mm 3.3mm!important}\n.session.ma-density-1 .passage{font-size:11px!important;line-height:1.75!important}\n.session.ma-density-1 .question,.session.ma-density-1 .step{font-size:10.6px!important;line-height:1.6!important}\n.session.ma-density-1 .questions{gap:1mm!important}\n.session.ma-density-1 .response{min-height:30mm!important}\n.session.ma-density-1 .exit{margin-top:2mm!important}\n.session.ma-density-2{padding-top:10.5mm!important}\n.session.ma-density-2 h1{margin:1.5mm 0 2mm!important;font-size:19px!important}\n.session.ma-density-2 .topline{padding-bottom:2mm!important}\n.session.ma-density-2 .stripe{margin-top:1.8mm!important;padding:1.7mm 2.5mm!important}\n.session.ma-density-2 .number{margin-top:2mm!important}\n.session.ma-density-2 .info-grid{margin-bottom:1.8mm!important}\n.session.ma-density-2 .info-grid>div{padding:1.3mm 2mm!important}\n.session.ma-density-2 .outcomes{margin-bottom:1.7mm!important}\n.session.ma-density-2 .outcomes>div{min-height:13mm!important;padding:1.7mm 2.4mm!important}\n.session.ma-density-2 .timing{margin-bottom:2mm!important}\n.session.ma-density-2 .content-box,.session.ma-density-2 .activity-box{margin-bottom:1.5mm!important;padding:2mm 3mm!important}\n.session.ma-density-2 .passage{font-size:10.3px!important;line-height:1.6!important}\n.session.ma-density-2 .lead{font-size:10.5px!important;line-height:1.6!important}\n.session.ma-density-2 .question,.session.ma-density-2 .step{font-size:10px!important;line-height:1.5!important}\n.session.ma-density-2 .questions{gap:.8mm!important}\n.session.ma-density-2 .response{min-height:27mm!important;padding:2.2mm 3.8mm!important}\n.session.ma-density-2 .response .solved-text{font-size:10px!important;line-height:1.55!important}\n.session.ma-density-2 .response .ma-user-outcome{font-size:9.8px!important;line-height:1.5!important}\n.session.ma-density-2 .exit{margin-top:1.4mm!important;padding:1.8mm 2.5mm!important}\n.session.ma-density-2 .rubric{margin-top:1.5mm!important}\n";
function previewStyles(){return styles+SAFE_LAYOUT_CSS+".solved-response{background:#fff8f9 !important;border:1.25px solid #d8a6ae !important;}\n.solved-response .kicker{color:#962546;font-weight:800;margin-bottom:2mm;font-size:12px;}\n.solved-response .kicker small{color:#9a6d7a;font-size:8.6px;}\n.solved-response .solved-text{color:#922442;font-size:11px;font-weight:700;line-height:1.75;text-align:right;direction:rtl;unicode-bidi:plaintext;max-height:25.4mm;overflow:hidden;}\n.solved-response .output{background:#fcecef!important;border-top-color:#e8cbd2;color:#7b5360;}\n.solved-response .output strong{color:#962546;}\n.cover-pills .solved-flag{background:#fff;color:#7a2140;border-color:#fff;}\n@media print {.solved-response{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"+
 "\n:host{display:block;direction:rtl;max-width:100%;width:100%;} .ma-holder{position:relative;width:100%;overflow:hidden;} .session{width:210mm!important;min-width:210mm!important;max-width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;box-sizing:border-box!important;overflow:hidden!important;transform-origin:top right!important;margin:0!important;background:#fff!important;box-shadow:0 4px 16px #0b304726!important;} .ma-autofill{display:block!important;min-height:7mm!important;border-bottom:0!important;background:#f1f7f8;padding:3px 5px;color:#184653;font-weight:700;border-radius:4px;white-space:normal;overflow-wrap:anywhere;line-height:1.5;} .ma-verified{color:#126b59;background:#ecf5f3;border-radius:3px;padding:2px 5px;} .ma-user-outcome{font-size:10px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;color:#254554;margin:0;padding:1.5mm 2mm;} .response.ma-with-outcome{max-height:58mm;height:auto;overflow:hidden;} .response.ma-with-outcome .output{position:relative;margin-top:1mm;} .teacher,.notes{display:none!important;} ";
}
function adjust(host){
 var root=host.shadowRoot,holder=root&&root.querySelector(".ma-holder"),sec=root&&root.querySelector(".session");
 if(!holder||!sec)return;
 var available=Math.max(260,host.clientWidth||host.getBoundingClientRect().width||794);
 var scale=Math.min(1,Math.max(.25,(available-4)/794));
 sec.style.transform="scale("+scale+")";
 holder.style.height=Math.ceil(1123*scale+6)+"px";
}
async function show(host,id,variant,metadata){
 if(!host)throw Error("مساحة المعاينة غير موجودة.");
 if(!host.shadowRoot)host.attachShadow({mode:"open"});
 var root=host.shadowRoot;
 root.replaceChildren();
 var loading=document.createElement("p");loading.setAttribute("role","status");loading.textContent="جارٍ تحميل البطاقة الأصلية من قاعدة البيانات…";
 loading.style.cssText="padding:25px;text-align:center;font:700 14px Tahoma,Arial;color:#1b5660;direction:rtl;";
 root.appendChild(loading);
 try{
  var html=await loadCard(id,variant),node=fill(html,metadata,variant);
  var st=document.createElement("style");st.textContent=previewStyles();
  var holder=document.createElement("div");holder.className="ma-holder";holder.appendChild(document.importNode(node,true));
  root.replaceChildren(st,holder);
  adjust(host);
  if(!host.__resize){
   if(typeof ResizeObserver==="function"){host.__resize=new ResizeObserver(function(){adjust(host);});host.__resize.observe(host);}
   else{host.__resize=true;window.addEventListener("resize",function(){adjust(host);});}
  }
  return node;
 }catch(e){
  loading.textContent="تعذر عرض البطاقة: "+(e.message||e);
  loading.style.color="#9c2430";
  root.replaceChildren(loading);
  throw e;
 }
}
async function engine(){
 if(window.jspdf&&window.jspdf.jsPDF)return window.jspdf.jsPDF;
 if(pdfEngine)return pdfEngine;
 pdfEngine=new Promise(function(resolve,reject){
  var s=document.createElement("script");s.src="vendor/jspdf.umd.min.js?v=4.2.1";s.async=true;
  s.onload=function(){window.jspdf&&window.jspdf.jsPDF?resolve(window.jspdf.jsPDF):reject(new Error("تعذر تهيئة PDF."));};
  s.onerror=function(){reject(new Error("تعذر تحميل محرك PDF من موقع منجز."));};
  document.head.appendChild(s);
 }).catch(function(e){pdfEngine=null;throw e;});
 return pdfEngine;
}
var captureEngine=null;
function loadCaptureEngine(){
 if(typeof window.html2pdf==="function")return Promise.resolve(window.html2pdf);
 if(captureEngine)return captureEngine;
 captureEngine=new Promise(function(resolve,reject){
  var script=document.createElement("script");
  script.src="vendor/html2pdf.bundle.min.js?v=4.6-electronic-layout";
  script.async=true;
  script.onload=function(){typeof window.html2pdf==="function"?resolve(window.html2pdf):reject(new Error("تعذر تشغيل محرك تصوير البطاقة."));};
  script.onerror=function(){reject(new Error("مكتبة تصدير PDF غير متاحة."));};
  document.head.appendChild(script);
 }).catch(function(err){captureEngine=null;throw err;});
 return captureEngine;
}
function layoutProblem(paper){
 var page=paper.querySelector(".session"),footer=page&&page.querySelector("footer");
 if(!page||!footer)return "مكونات الصفحة الرسمية غير مكتملة";
 var bounds=page.getBoundingClientRect(),foot=footer.getBoundingClientRect();
 var selectors=[".topline",".stripe",".number","h1",".info-grid",".outcomes",".timing",".content-box",".activity-box",".response",".exit",".rubric"],last=null;
 for(var i=0;i<selectors.length;i++){
  var node=page.querySelector(selectors[i]);if(!node)continue;
  var rect=node.getBoundingClientRect();if(rect.width<=0||rect.height<=0)continue;
  if(last&&rect.top<last.bottom-1)return "تداخل بين عناصر البطاقة: "+selectors[i];
  if(rect.right>bounds.right+2||rect.left<bounds.left-2)return "تجاوز نصوص حدود عرض البطاقة: "+selectors[i];
  last=rect;
 }
 if(last&&last.bottom>foot.top-3)return "المحتوى يصل إلى تذييل صفحة A4";
 if(page.scrollHeight>page.clientHeight+4)return "المحتوى يتجاوز ارتفاع صفحة A4";
 var fields=page.querySelectorAll(".info-grid>div");
 for(var j=0;j<fields.length;j++){
  var value=fields[j].querySelector(".ma-autofill");
  if(value&&value.getBoundingClientRect().bottom>fields[j].getBoundingClientRect().bottom+2)return "الفصول أو الحصص تتجاوز حقل البيانات";
 }
 var response=page.querySelector(".response");
 if(response){
  var output=response.querySelector(".output"),body=response.querySelector(".solved-text,.ma-user-outcome");
  if(output&&body&&body.getBoundingClientRect().bottom>output.getBoundingClientRect().top-1)return "الناتج المتوقع يتداخل مع نص الحل أو الإنجاز";
  if(output&&output.getBoundingClientRect().bottom>response.getBoundingClientRect().bottom+2)return "شريط الناتج المتوقع يتجاوز مساحة الإجابة";
 }
 return "";
}
async function captureOriginalPage(section,html2pdf){
 // The same source template, content and print stylesheet serve both the PDF and preview.
 var paper=document.createElement("div");
 paper.style.cssText="box-sizing:border-box;width:210mm;height:297mm;min-height:297mm;max-height:297mm;overflow:hidden;direction:rtl;background:#fff;";
 var stylesheet=document.createElement("style");
 stylesheet.textContent=previewStyles()+" .session{width:210mm!important;height:297mm!important;max-height:297mm!important;min-height:297mm!important;margin:0!important;box-shadow:none!important;transform:none!important;page-break-after:auto!important;break-after:auto!important;background:#fff!important} .ma-holder{width:210mm!important}";
 paper.appendChild(stylesheet);
 paper.appendChild(document.importNode(section,true));
 paper.style.cssText+="position:fixed;top:0;left:0;z-index:-2147483647;visibility:hidden;";
 document.body.appendChild(paper);
 try{
  if(document.fonts&&document.fonts.ready)await document.fonts.ready;
  var page=paper.querySelector(".session");
  if(!page||!paper.querySelector("footer"))throw new Error("التصميم الأصلي للبطاقة أو التذييل غير مكتمل.");
  var problem=layoutProblem(paper);
  if(problem){page.classList.add("ma-density-1");problem=layoutProblem(paper);}
  if(problem){page.classList.remove("ma-density-1");page.classList.add("ma-density-2");problem=layoutProblem(paper);}
  if(problem)throw new Error("لا يمكن تصدير البطاقة دون تداخل نصوص: "+problem+". قللي الفصول المختارة أو اختصري وصف الإنجاز.");
 }finally{paper.remove();paper.style.position="";paper.style.top="";paper.style.left="";paper.style.zIndex="";paper.style.visibility="";}
 var worker=html2pdf().set({
  margin:0,
  html2canvas:{scale:2,useCORS:true,backgroundColor:"#fff",logging:false,scrollX:0,scrollY:0,windowWidth:1200},
  jsPDF:{unit:"mm",format:"a4",orientation:"portrait"},
  pagebreak:{mode:[]},enableLinks:false
 }).from(paper).toCanvas();
 var canvas=await worker.get("canvas");
 if(!canvas||canvas.width<750||canvas.height<1050||Math.abs(canvas.width/canvas.height-210/297)>0.03)throw new Error("تعذر تصدير البطاقة بالمقاس الصحيح A4.");
 return canvas;
}
async function exportPdf(id,variant,m){
 var loaded=await Promise.all([loadCard(id,variant),engine(),loadCaptureEngine()]);
 var section=fill(loaded[0],m,variant);
 var canvas=await captureOriginalPage(section,loaded[2]);
 var pdf=new loaded[1]({unit:"mm",format:"a4",orientation:"portrait",compress:true});
 pdf.addImage(canvas.toDataURL("image/jpeg",0.96),"JPEG",0,0,210,297,undefined,"FAST");
 if(pdf.internal.getNumberOfPages()!==1)throw new Error("لم يتم إنشاء ملف من صفحة واحدة.");
 var blob=pdf.output("blob");
 if(!blob||!blob.size)throw new Error("نتج ملف PDF فارغ.");
 return {blob:blob,filename:(variant==="solved"?"بطاقة_الحل_المقترح_":"بطاقة_تفعيل_الاحتياط_")+String(id).padStart(3,"0")+".pdf"};
}
window.ManjazActivityCardV4={show:show,exportPdf:exportPdf,loadCard:loadCard};
})();