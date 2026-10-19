/* Daily reserve 94: view original Supabase cards + native text-based canvas PDF */
(function(){"use strict";
if(window.ManjazActivityCardV4)return;
var API="https://idkjuqfxcweqekdkcktk.supabase.co",KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL",styles="@page {size:210mm 297mm; margin:0;}\n*{box-sizing:border-box}html,body{padding:0;margin:0;font-family:'Noto Sans Arabic','DejaVu Sans',sans-serif;color:#243444; direction:rtl;}body{font-size:11px}\n.session,.front,.cover{position:relative;width:210mm;height:297mm;page-break-after:always;break-after:page;overflow:hidden;background:#fff}\n.session{padding:14mm 15mm 11mm;background:linear-gradient(180deg,#fbfdfe 0%,#fff 21%)}\n.topline{display:flex;align-items:flex-start;justify-content:space-between;border-bottom:1px solid #cad8db;padding-bottom:3.5mm;gap:10px}.org{font-size:9.5px;line-height:1.85;color:#596e76}.org strong{font-size:10.5px;color:#203f4a}.city{font-weight:400}.brand{text-align:left;padding-top:4px}.brand b{font-size:12px;color:var(--accent)}.brand span{display:block;font-size:9px;color:#78909a;margin-top:3px}\n.stripe{margin-top:3.6mm;display:flex;gap:5mm;background:#ecf2f4;border-right:4px solid var(--accent);border-radius:3mm;padding:3mm 3.5mm;font-size:10.5px;color:#52616c}.stripe span:first-child{width:46%}.stripe b{color:#294553;font-weight:700}\n.number{display:flex;align-items:center;justify-content:space-between;margin-top:4.5mm;font-size:10px}.session-tag{padding:1.5mm 3mm;background:var(--accent);border-radius:4mm;color:#fff;font-weight:800}.unit-tag{color:#72838b}.session h1{margin:3.1mm 0 4mm;font-size:23px;line-height:1.45;letter-spacing:-.1px;color:#203545}\n.info-grid{display:grid;grid-template-columns:1.15fr .75fr .85fr 2fr;gap:2.2mm;margin:0 0 3.7mm}.info-grid>div{border:1px solid #b9cbd1;background:#fff;border-radius:2.3mm;min-height:14mm;padding:1.8mm 2.4mm}.info-grid strong{font-size:9.8px;color:#647580;display:block}.write-field{display:block;min-height:6.2mm;border-bottom:1px solid #93aab4}\n.outcomes{display:flex;gap:2.5mm;margin:0 0 3.3mm}.outcomes>div{flex:1;min-height:16.5mm;border-radius:2.2mm;background:#f2f6f7;padding:2.4mm 3.2mm}.outcomes>div:first-child{flex:1.45}.mini-label{display:block;font-size:9.1px;font-weight:700;color:var(--accent)}.outcomes p{margin:1mm 0 0;line-height:1.75;font-size:10.3px}\n.timing{display:flex;align-items:center;gap:2mm;padding:2.2mm 1mm;margin-bottom:3.5mm;border-top:1px solid #e2e8eb;border-bottom:1px solid #e2e8eb;font-size:10px}.timing span{display:flex;gap:4px;justify-content:center;flex:1;white-space:nowrap;color:#546875}.timing span b{color:var(--accent)}.timing strong{font-size:9.5px;color:#243d4b;white-space:nowrap}\n.box{border:1px solid #d3e0e4;border-radius:3mm;background:#fff;overflow:hidden}.content-box{margin-bottom:3mm;padding:3mm 3.8mm;background:#f7fafb;border-right:3px solid var(--accent)}.kicker{font-size:11.2px;font-weight:800;color:var(--accent);margin-bottom:1.9mm}.kicker small{font-size:9px;color:#82919b;font-weight:500;margin-right:2mm}.passage{font-size:12px;line-height:2.0;margin:0;text-align:justify;text-align-last:right}.lead{font-size:11.8px;line-height:1.95;margin:0}\n.activity-box{padding:3mm 3.8mm;margin-bottom:3.2mm}.questions{display:grid;gap:1.6mm;margin-top:1.8mm}.question,.step{display:flex;gap:2.1mm;align-items:flex-start;line-height:1.8;font-size:11.1px;color:#354854}.n{font-weight:800;color:var(--accent);min-width:5mm}.question>span:last-child,.step>span:last-child{flex:1}.quant-list{gap:2.5mm}\n.response{padding:2.8mm 3.8mm;height:37mm;margin-top:1.2mm;position:relative;background:#fff !important}.response .kicker{font-size:10.5px;margin-bottom:1mm}.rules{height:24mm;background:#fff !important;display:flex;flex-direction:column;justify-content:space-evenly}.rules .rule{height:7mm;background:#fff !important;border-bottom:1px solid #dce6e8}.output{position:absolute;bottom:0;right:0;left:0;padding:1.3mm 3.7mm;background:#eef3f4;border-top:1px solid #dae5e7;font-size:9.6px;color:#596d74}.output strong{color:#355566}\n.exit{display:flex;align-items:flex-start;gap:2mm;margin-top:3.5mm;border-radius:2.5mm;background:#eef4f5;border-right:3px solid var(--accent);padding:2.6mm 3.4mm;line-height:1.7;font-size:10.6px}.exit strong{color:var(--accent);white-space:nowrap}.exit span{flex:1}\n.teacher{display:flex;gap:2.3mm;margin-top:3mm;padding:2mm 3mm;line-height:1.6;font-size:9px;color:#74858b;background:#f8fafb;border-radius:2mm}.teacher b{color:#56707d;white-space:nowrap}\n.rubric{display:flex;gap:4mm;align-items:center;flex-wrap:wrap;font-size:9.3px;margin-top:3mm;color:#566e77}.rubric span:first-child{font-weight:700;color:#3b5964}.notes{margin-right:auto}\n.session footer{position:absolute;bottom:7.4mm;left:15mm;right:15mm;border-top:1px solid #dae3e6;display:flex;justify-content:space-between;padding-top:2.5mm;font-size:8.9px;color:#82939a}\n.cover{background:linear-gradient(180deg,#0c4959 0%,#176e7c 82%,#e5f1ef 82.2%,#f7faf9 100%);color:white;padding:24mm 22mm}.cover:before{content:'';position:absolute;top:10mm;left:-25mm;width:85mm;height:85mm;border:1px solid #ffffff50;border-radius:50%}.cover:after{content:'';position:absolute;top:35mm;left:-20mm;width:70mm;height:70mm;border:1px solid #ffffff35;border-radius:50%}.cover-top{font-size:13px;line-height:2.05}.cover-top b{font-size:14px}.cover-middle{position:absolute;top:108mm;right:22mm;left:22mm}.eyebrow{font-size:12.3px;color:#c6e9e6}.cover-middle h1{font-size:46px;line-height:1.4;margin:4mm 0 2mm}.cover-middle p{font-size:16px;line-height:1.8;max-width:125mm}.cover-pills{position:absolute;top:225mm;right:22mm;left:22mm;display:flex;gap:8px;flex-wrap:wrap}.cover-pills span{padding:8px 11px;background:#ffffff20;border:1px solid #b7dad8;border-radius:50px;color:#fff;font-size:10.5px}.cover-footer{position:absolute;bottom:18mm;right:22mm;color:#173d48;font-weight:700;font-size:14px;line-height:2.3}.cover-footer small{font-size:11px;color:#58787c}\n.front{padding:23mm 20mm;color:#253b48}.front-title{color:#176b76;font-weight:800;font-size:16px;border-right:6px solid #176b76;padding:5mm;margin-bottom:13mm;background:#e9f3f4}.front h2{font-size:21px;margin:0 0 8mm}.front h3{margin:9mm 0 2mm;font-size:15px;color:#236978}.front p{line-height:2.2;font-size:12px;text-align:justify}.guide-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin:12mm 0}.guide-cards>div{border:1px solid #d7e4e8;border-radius:3mm;padding:5mm;min-height:51mm}.guide-cards b{color:#1a6877;font-size:14px}.guide-cards p{font-size:10px;line-height:1.85}.guide-footer{margin-top:20mm;border:1px dashed #88b6b8;text-align:center;padding:5mm;color:#1a6674;font-weight:700;font-size:14px}\n.toc table{border-collapse:collapse;width:100%;margin:11mm 0;font-size:11px}.toc td,.toc th{border-bottom:1px solid #d6e5e7;padding:3.3mm 2mm;text-align:right}.toc th{background:#176b76;color:#fff}.toc tr:nth-child(even) td{background:#f2f7f8}.toc td:first-child{font-weight:800;color:#20727d}.summary-count{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm;margin-top:12mm}.summary-count>div{background:#eaf4f3;padding:6mm;text-align:center;border-radius:3mm}.summary-count b{display:block;font-size:28px;color:#176b76}.summary-count span{font-size:10px;color:#486b71}.toc-foot{margin-top:8mm;text-align:center;color:#6f818a}\n\n@media screen {.write-field:focus{outline:1.5px solid #17818c;background:#eaf8f7}.session{margin:0 auto;box-shadow:0 1px 10px #00000018}}\n.toc table{margin:6.5mm 0 5mm;font-size:10.2px}.toc td,.toc th{padding:2.3mm 1.8mm}.toc .summary-count{margin-top:6mm}.toc .toc-foot{margin-top:4mm}.front.toc{padding-top:19mm}.front.toc>p{font-size:11px;line-height:1.7}.front.toc .front-title{margin-bottom:8mm}\n\n.cover-pills{top:211mm}\n";
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
 var vals=[date,metadata.period?"الحصة "+metadata.period:"—",metadata.klass||"—",metadata.teacher||"—"];
 section.querySelectorAll(".info-grid .write-field").forEach(function(x,i){x.removeAttribute("contenteditable");x.removeAttribute("role");x.textContent=vals[i]||"—";x.classList.add("ma-autofill");});
 section.querySelectorAll(".teacher,.notes,.response .kicker small").forEach(function(x){x.remove();});
 var rubric=section.querySelector(".rubric"),checks=metadata.indicators||[];
 if(rubric){
  rubric.querySelectorAll("label").forEach(function(x){var label=compact(x.textContent).replace(/^[□✓☑✔]\s*/,"");if(!checks.includes(label))x.remove();else{x.textContent="✓ "+label;x.classList.add("ma-verified");}});
  if(!checks.length)rubric.remove();
 }
 if(variant==="activity"&&compact(metadata.outcome)){
  var outcome=section.querySelector(".response");
  if(outcome){
   var rules=outcome.querySelector(".rules");if(rules)rules.remove();
   var p=doc.createElement("p");p.className="ma-user-outcome";p.textContent=compact(metadata.outcome);
   var kicker=outcome.querySelector(".kicker");if(kicker)kicker.after(p);else outcome.prepend(p);
   outcome.classList.add("ma-with-outcome");
  }
 }
 return section;
}
function previewStyles(){return styles+
 "\n:host{display:block;direction:rtl;max-width:100%;width:100%;} .ma-holder{position:relative;width:100%;overflow:hidden;} .session{width:210mm!important;min-width:210mm!important;max-width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;box-sizing:border-box!important;overflow:hidden!important;transform-origin:top right!important;margin:0!important;background:#fff!important;box-shadow:0 4px 16px #0b304726!important;} .ma-autofill{display:block!important;min-height:7mm!important;border-bottom:0!important;background:#f1f7f8;padding:3px 5px;color:#184653;font-weight:700;border-radius:4px;white-space:normal;overflow-wrap:anywhere;line-height:1.5;} .ma-verified{color:#126b59;background:#ecf5f3;border-radius:3px;padding:2px 5px;} .ma-user-outcome{font-size:10px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;color:#254554;margin:0;padding:1.5mm 2mm;} .response.ma-with-outcome{max-height:58mm;height:auto;overflow:hidden;} .response.ma-with-outcome .output{position:relative;margin-top:1mm;} .teacher,.notes{display:none!important;} ";
}
function adjust(host){
 var root=host.shadowRoot,holder=root&&root.querySelector(".ma-holder"),sec=root&&root.querySelector(".session");
 if(!holder||!sec)return;
 var scale=Math.min(1,Math.max(.2,(host.clientWidth-4)/794));
 sec.style.transform="scale("+scale+")";
 holder.style.height=Math.ceil(1123*scale+6)+"px";
}
async function show(host,id,variant,metadata){
 if(!host)throw Error("مساحة المعاينة غير موجودة.");
 var html=await loadCard(id,variant),node=fill(html,metadata,variant);
 if(!host.shadowRoot)host.attachShadow({mode:"open"});
 var root=host.shadowRoot;root.replaceChildren();
 var st=document.createElement("style");st.textContent=previewStyles();root.appendChild(st);
 var holder=document.createElement("div");holder.className="ma-holder";holder.appendChild(document.importNode(node,true));root.appendChild(holder);
 adjust(host);
 if(!host.__resize){host.__resize=new ResizeObserver(function(){adjust(host);});host.__resize.observe(host);}
 return node;
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
function generateCanvas(section,m,variant){
 var W=1240,H=1754,margin=68,right=W-margin,span=W-2*margin,footer=1682;
 var canvas=document.createElement("canvas");canvas.width=W;canvas.height=H;
 var ctx=canvas.getContext("2d",{alpha:false});if(!ctx)throw Error("تعذر إنشاء صفحة PDF.");
 ctx.fillStyle="#fff";ctx.fillRect(0,0,W,H);ctx.textAlign="right";ctx.textBaseline="top";ctx.direction="rtl";
 var ink="#213f4c",accent="#116c79",muted="#617984",pale="#eef5f6",line="#cbdde0",maroon="#8b2941";
 var scale=1;
 function font(px,bold){return (bold?"bold ":"")+Math.round(px*scale)+"px Tahoma,Arial,sans-serif";}
 function wrap(str,width,px,bold){
  str=compact(str);if(!str)return [];
  ctx.font=font(px,bold);
  var result=[],row="";
  str.split(" ").forEach(function(word){
   var next=row?row+" "+word:word;
   if(row&&ctx.measureText(next).width>width){result.push(row);row=word;}else row=next;
  });if(row)result.push(row);return result;
 }
 function t(str,x,y,px,color,bold,width,lh,draw){
  var lines=wrap(str,width||span-30,px,bold),step=Math.ceil(px*scale*(lh||1.42));
  if(draw){ctx.font=font(px,bold);ctx.fillStyle=color||ink;ctx.textAlign="right";ctx.direction="rtl";lines.forEach(function(v,i){ctx.fillText(v,x,y+i*step);});}
  return {lines:lines.length,height:lines.length*step};
 }
 function rect(x,y,w,h,fill,stroke,draw){
  if(!draw)return;ctx.fillStyle=fill;ctx.beginPath();ctx.roundRect(x,y,w,h,11);ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.7;ctx.stroke();}
 }
 var headline=txt(section,"h1");
 var lead=txt(section,".content-box .passage")||txt(section,".content-box .lead");
 var steps=[...section.querySelectorAll(".activity-box .question,.activity-box .step")].map(function(x){return compact(x.textContent);});
 var result=txt(section,".response .output");
 var answer=variant==="solved"?txt(section,".solved-text"):compact(m.outcome);
 var exit=txt(section,".exit span"),ticks=m.indicators||[];
 function top(draw){
  rect(margin,37,span,111,"#e8f3f4",null,draw);
  if(draw){
   t("المملكة العربية السعودية | وزارة التعليم",right-18,52,17,muted,false,span-30,1.25,true);
   t("الإدارة العامة للتعليم بمحافظة جدة",right-18,78,17,muted,false,span-30,1.25,true);
   t("الثانوية الرابعة والتسعون – مسارات",right-18,110,23,accent,true,span-30,1.25,true);
  }
  rect(margin,162,span,59,pale,line,draw);
  if(draw){t("القسم الرئيسي: "+txt(section,".stripe span:first-child b"),right-12,176,18,accent,true,span-25,1.25,true);}
  if(draw){t("القسم الفرعي: "+txt(section,".stripe span:last-child b"),right-12,199,16,muted,false,span-25,1.25,true);}
  if(draw){t("البطاقة رقم "+m.id+" / ١٣٠",right,239,17,accent,true,span,1.3,true);}
  if(draw){t(headline,right,271,36,ink,true,span,1.1,true);}
  var attrs=[
   ["اسم المعلمة المنفذة",m.teacher||"—"],
   ["الفصل",m.klass||"—"],
   ["الحصة",m.period?"الحصة "+m.period:"—"],
   ["التاريخ الهجري",m.day&&m.monthLabel&&m.year?m.weekday+"، "+m.day+" "+m.monthLabel+" "+m.year+" هـ":"—"]
  ];
  var g=8,w=(span-3*g)/4;
  attrs.forEach(function(v,i){
   var x=margin+(3-i)*(w+g);rect(x,329,w,94,"#f6fafb",line,draw);
   if(draw){t(v[0],x+w-9,341,15,muted,true,w-17,1.2,true);ctx.font=font(17,true);ctx.fillStyle=ink;ctx.textAlign="right";ctx.direction="rtl";ctx.fillText(v[1],x+w-9,376,w-19);}
  });
  rect(margin,440,span,108,pale,null,draw);
  if(draw){
   t("نواتج التعلم",right-13,449,18,accent,true,span-26,1.2,true);
   t(txt(section,".outcomes > div:first-child p"),right-13,476,18,ink,false,span-25,1.3,true);
   ctx.font=font(15);ctx.fillStyle=muted;ctx.textAlign="right";ctx.direction="rtl";ctx.fillText("الاستراتيجية: "+txt(section,".outcomes > div:nth-child(2) p"),right-13,527,span-25);
  }
  rect(margin,562,span,47,pale,null,draw);
  if(draw)t("الزمن: ٤٥ دقيقة | التهيئة ٥ د | التطبيق ٢٥ د | المشاركة ١٠ د | التقويم ٥ د",right-12,573,17,accent,false,span-25,1.3,true);
 }
 function contentBox(name,str,y,kind,draw){
  var isAnswer=kind==="answer",isSteps=kind==="steps";
  var color=isAnswer&&variant==="solved"?maroon:ink;
  var width=span-46,rows=[],height=0;
  if(isSteps){
   steps.forEach(function(z){var v=wrap(z,width,20);rows.push(v);height+=Math.max(1,v.length)*Math.ceil(20*scale*1.45)+5;});
  }else{
   var size=kind==="lead"?20:kind==="answer"?19:20;
   rows=wrap(str,width,size);height=rows.length*Math.ceil(size*scale*1.48);
  }
  var resultlines=kind==="answer"?wrap(result,width,15):[];
  var base=kind==="answer"?102:kind==="exit"?84:74;
  var boxh=Math.max(base,53+height+(resultlines.length?30+resultlines.length*24:0)+15);
  rect(margin,y,span,boxh,kind==="answer"&&variant==="solved"?"#fff4f5":kind==="exit"?"#edf6f7":kind==="answer"?"#fff":"#f4f8f9",line,draw);
  if(draw){
   t(name,right-17,y+13,20,isAnswer&&variant==="solved"?maroon:accent,true,width,1.2,true);
   var pos=y+51;
   if(isSteps){
    rows.forEach(function(list){ctx.font=font(20);ctx.fillStyle=ink;list.forEach(function(z,i){ctx.fillText(z,right-17,pos+i*Math.ceil(20*scale*1.45));});pos+=Math.max(1,list.length)*Math.ceil(20*scale*1.45)+5;});
   }else{
    var size=kind==="answer"?19:20;ctx.font=font(size);ctx.fillStyle=color;
    rows.forEach(function(z,i){ctx.fillText(z,right-17,pos+i*Math.ceil(size*scale*1.48));});
   }
   if(resultlines.length){var yy=y+boxh-resultlines.length*24-12;ctx.fillStyle=muted;ctx.font=font(15,true);resultlines.forEach(function(z,i){ctx.fillText(z,right-17,yy+i*24);});}
  }
  return boxh;
 }
 function body(draw){
  var y=630,sections=[
   [txt(section,".content-box .kicker")||"التمهيد",lead,"lead"],
   [txt(section,".activity-box .kicker")||"خطوات النشاط","","steps"],
   [variant==="solved"?"الحل النموذجي":"مساحة الإنجاز",answer,"answer"],
   ["تذكرة الخروج",exit,"exit"]
  ];
  sections.forEach(function(a){y+=contentBox(a[0],a[1],y,a[2],draw)+13;});
  if(ticks.length){rect(margin,y,span,60,"#e9f6f2",null,draw);if(draw)t("مؤشرات التحقق السريع: "+ticks.map(function(x){return "✓ "+x;}).join("     "),right-17,y+16,18,"#136950",true,span-36,1.3,true);y+=73;}
  return y;
 }
 for(var i=0;i<7;i++){scale=1-0.065*i;if(body(false)<footer-30)break;}
 if(body(false)>=footer-30)throw Error("وصف نواتج الإنجاز أطول من صفحة واحدة؛ يرجى اختصاره.");
 top(true);body(true);
 ctx.strokeStyle=line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(margin,footer-18);ctx.lineTo(right,footer-18);ctx.stroke();
 t("الثانوية الرابعة والتسعون – مسارات",right,footer,16,accent,true,span,1.2,true);
 ctx.textAlign="left";ctx.direction="ltr";ctx.font=font(14);
 ctx.fillStyle=muted;ctx.fillText("حقيبة الاحتياط اليومي | بطاقة "+m.id+" من ١٣٠",margin,footer);
 return canvas;
}
async function exportPdf(id,variant,m){
 var promises=await Promise.all([loadCard(id,variant),engine()]);
 var source=fill(promises[0],m,variant),canvas=generateCanvas(source,Object.assign({},m,{id:id}),variant);
 var pdf=new promises[1]({unit:"mm",format:"a4",orientation:"portrait",compress:true});
 pdf.addImage(canvas.toDataURL("image/jpeg",0.94),"JPEG",0,0,210,297);
 if(pdf.internal.getNumberOfPages()!==1)throw Error("لم يتم إنشاء صفحة واحدة.");
 var blob=pdf.output("blob");if(!blob.size)throw Error("نتج ملف PDF فارغ.");
 return {blob:blob,filename:(variant==="solved"?"الحل_النموذجي_":"بطاقة_الاحتياط_")+String(id).padStart(3,"0")+".pdf"};
}
window.ManjazActivityCardV4={show:show,exportPdf:exportPdf,loadCard:loadCard};
})();