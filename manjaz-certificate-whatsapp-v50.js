/* MANJAZ v50: attach the actual generated PDF through mobile system sharing.
   A URL sent to WhatsApp alone cannot contain a PDF attachment.
   Two deliberate taps keep navigator.share() inside a user gesture after rendering. */
(()=>{"use strict";
 const cache=new WeakMap();
 const safe=s=>String(s||"شهادة").replace(/[\\/:*?"<>|\r\n]/g," ").trim();
 const supported=file=>typeof navigator.share==="function"&&
   typeof navigator.canShare==="function"&&navigator.canShare({files:[file]});
 function isReady(button){return !!(button&&cache.has(button));}
 function clear(button,label="مشاركة PDF عبر واتساب"){
  if(!button)return;cache.delete(button);button.removeAttribute("data-mj-pdf-ready");
  button.textContent=label;
 }
 function prepare(button,pdf,title,filename,report){
  if(!button||!pdf||typeof pdf.output!=="function")throw Error("تعذر تحضير ملف الشهادة");
  const name=safe(filename||"شهادة.pdf");
  const blob=pdf.output("blob");
  const file=new File([blob],name.endsWith(".pdf")?name:name+".pdf",{type:"application/pdf"});
  if(!supported(file)){
   pdf.save(name);
   if(typeof report==="function")report("تم تنزيل شهادة PDF. لم يدعم المتصفح مشاركة ملف مباشر؛ أرفقيه في واتساب من الملفات.");
   return false;
  }
  cache.set(button,{file,title:String(title||"شهادة PDF")});
  button.setAttribute("data-mj-pdf-ready","1");
  button.disabled=false;button.textContent="مشاركة PDF الآن";
  if(typeof report==="function")report("الشهادة جاهزة كمرفق PDF. اضغطي «مشاركة PDF الآن» ثم اختاري واتساب.");
  return true;
 }
 function share(button,report){
  const payload=cache.get(button);
  if(!payload)return false;
  // Navigator share is invoked immediately, before any await: required for iOS transient activation.
  let promise;
  try{
   promise=navigator.share({files:[payload.file],title:payload.title,text:payload.title});
  }catch(err){
   if(typeof report==="function")report("تعذرت المشاركة: "+(err?.message||err));
   return true;
  }
  Promise.resolve(promise).then(()=>{
   if(typeof report==="function")report("فُتحت مشاركة ملف PDF. تأكدي من إتمام إرساله داخل واتساب.");
  }).catch(err=>{
   if(err?.name==="AbortError")return;
   if(typeof report==="function")report("تعذرت المشاركة عبر النظام: "+(err?.message||err)+". يمكن تنزيل PDF وإرفاقه في واتساب يدويًا.");
  });
  return true;
 }
 window.ManjazCertificateShareV50={isReady,clear,prepare,share};
})();