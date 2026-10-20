/* MANJAZ v49 — group certificate request form & secure administrative approval.
   One request, 1–100 beneficiaries, all-or-nothing approval; reuses official templates. */
(()=>{"use strict";
const BASE="https://idkjuqfxcweqekdkcktk.supabase.co";
const KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const STORAGE="manjaz_group_certificate_own_v49";
const SESSION="manjaz_admin_auth_session_v1";
const types=()=>window.ManjazTask15?.types||[];
const categoryName=k=>types().find(t=>t[0]===k)?.[1]||"شهادة معتمدة";
const isExecution=k=>k==="execution_teacher"||k==="execution_staff";
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const clean=x=>String(x||"").replace(/\s+/g," ").trim();
const keyName=x=>clean(x).toLocaleLowerCase("ar");
const currentRoute=()=>((location.hash||"").slice(1).split("?")[0]);
let names=[],requestId="",editToken="",selectedCategory="execution_teacher";
let adminList=[],adminLoading=false,mounting=false,previewState=null;
function randomToken(){
 const data=new Uint8Array(32);crypto.getRandomValues(data);
 return [...data].map(v=>v.toString(16).padStart(2,"0")).join("");
}
function loadSaved(){try{return JSON.parse(localStorage.getItem(STORAGE)||"null")}catch(_){return null}}
function savedToken(){return editToken||(editToken=randomToken())}
function getData(){
 const f=document.getElementById("mj49GroupForm");
 if(!f)return null;
 const v=new FormData(f);
 const category=String(v.get("category")||selectedCategory);
 let executionType=clean(v.get("executionType"));
 if(executionType==="أخرى")executionType=clean(v.get("executionTypeOther"));
 return {
 requester_name:clean(v.get("requester_name")),category,
 title:clean(v.get("title")),description:clean(v.get("description")),
 date:clean(v.get("date")),duration:clean(v.get("duration")),
 executionType:isExecution(category)?executionType:""
 };
}
function unique(newNames,base=names){
 const out=[],seen=new Set();
 for(const n of [...base,...newNames]){
  const name=clean(n);if(!name)continue;
  const key=keyName(name);if(seen.has(key))continue;
  if(name.length>160)throw Error("لا يمكن أن يتجاوز الاسم ١٦٠ حرفًا.");
  out.push(name);seen.add(key);
 }
 if(out.length>100)throw Error("الحد الأقصى ١٠٠ مستفيدة في الطلب الواحد.");
 return out;
}
function message(msg,error=false){
 const host=document.getElementById("mj49Message");
 if(host){host.textContent=msg;host.style.color=error?"#a33b37":"#175a5c"}
}
function renderNames(){
 const host=document.getElementById("mj49Names");
 if(host)host.innerHTML=names.length?names.map((n,i)=>
  '<div class="mj49-name-row"><span class="mj49-name-number">'+(i+1)+'</span>'+
  '<input aria-label="اسم المستفيدة '+(i+1)+'" maxlength="160" data-mj49-name-index="'+i+'" value="'+esc(n)+'">'+
  '<button type="button" data-mj49-remove="'+i+'" aria-label="حذف '+esc(n)+'">حذف</button></div>'
 ).join(""):'<p class="mj49-muted">لم تُضف أسماء مستفيدات بعد.</p>';
 const counter=document.getElementById("mj49NameCount");
 if(counter)counter.textContent=names.length+" / ١٠٠ مستفيدة";
}
function updateExecFields(){
 const form=document.getElementById("mj49GroupForm");if(!form)return;
 const cat=form.elements.category.value;
 const row=form.querySelector("[data-mj49-exec]");
 if(row){row.hidden=!isExecution(cat);row.querySelector("select").required=isExecution(cat);}
 const type=form.elements.executionType;
 const other=form.querySelector("[data-mj49-other]");
 if(type&&other){
  other.hidden=!isExecution(cat)||type.value!=="أخرى";
  other.querySelector("input").required=isExecution(cat)&&type.value==="أخرى";
 }
}
function addNames(newOnes){
 const previous=names.length;
 names=unique(newOnes);renderNames();
 message("أضيفت "+(names.length-previous)+" مستفيدة. "+(names.length-previous<newOnes.filter(clean).length?"تم تجاهل الأسماء المكررة.":""));
}
function groupForm(){
 const cache=loadSaved();
 if(cache?.editToken&&Array.isArray(cache.names)){
  names=unique(cache.names,[]);requestId=String(cache.requestId||"");
  editToken=String(cache.editToken||"");
  selectedCategory=String(cache.fields?.category||selectedCategory);
 }else{names=[];requestId="";editToken="";selectedCategory="execution_teacher"}
 const field=key=>esc(cache?.fields?.[key]||"");
 const options=types().map(t=>'<option value="'+esc(t[0])+'"'+(selectedCategory===t[0]?" selected":"")+'>'+esc(t[1])+'</option>').join("");
 const execTypes=["ورشة تدريبية","درس تطبيقي","برنامج","مبادرة","دورة","لقاء","فعالية"];
 const savedType=cache?.fields?.executionType||"";
 const isOther=!!savedType&&!execTypes.includes(savedType);
 return '<section id="mj49GroupRequest" class="mj49-group-details" dir="rtl">'+
 '<div class="mj49-content"><p class="mj49-muted">طلب جماعي واحد، شهادة مستقلة باسم كل مستفيدة. لا تُصدر الشهادات إلا بعد اعتماد الإدارة للطلب كاملًا.</p>'+
 '<form id="mj49GroupForm">'+
 '<div class="mj49-fields">'+
 '<label>اسم مقدمة الطلب *<input name="requester_name" required minlength="2" maxlength="160" value="'+field("requester_name")+'"></label>'+
 '<label>نوع الشهادة *<select name="category" required>'+options+'</select></label>'+
 '<label class="mj49-wide">عنوان الإنجاز أو التكريم *<input name="title" required minlength="2" maxlength="220" value="'+field("title")+'"></label>'+
 '<label class="mj49-wide" data-mj49-exec>نوع التنفيذ *<select name="executionType">'+
 execTypes.map(t=>'<option value="'+t+'"'+(savedType===t?" selected":"")+'>'+t+'</option>').join("")+
 '<option value="أخرى"'+(isOther?" selected":"")+'>أخرى – اكتبي نوع التنفيذ</option></select></label>'+
 '<label class="mj49-wide" data-mj49-other hidden>نوع التنفيذ الآخر *<input name="executionTypeOther" maxlength="120" value="'+(isOther?esc(savedType):"")+'"></label>'+
 '<label class="mj49-wide">وصف الإنجاز أو سبب الشكر *<textarea name="description" minlength="2" maxlength="1200" required rows="3">'+field("description")+'</textarea></label>'+
 '<label>تاريخ الشهادة *<input type="date" name="date" required value="'+field("date")+'"></label>'+
 '<label>المدة (إن وجدت)<input name="duration" maxlength="150" value="'+field("duration")+'"></label>'+
 '</div><div class="mj49-name-entry"><h4>أسماء المستفيدات</h4>'+
 '<label>إضافة اسم يدويًا<input id="mj49ManualName" maxlength="160" placeholder="اكتبي اسم المستفيدة"></label>'+
 '<button type="button" data-mj49-add>إضافة الاسم</button>'+
 '<label class="mj49-wide">إضافة أسماء متعددة (اسم في كل سطر)<textarea id="mj49BulkNames" rows="3" placeholder="انسخي الأسماء هنا، اسمًا في كل سطر"></textarea></label>'+
 '<button type="button" data-mj49-bulk>إضافة الأسماء المكتوبة</button>'+
 '<label class="mj49-wide">استيراد أسماء من Excel (XLSX / XLS / CSV)<input id="mj49ExcelFile" type="file" accept=".xlsx,.xls,.csv"></label>'+
 '<p class="mj49-muted">يمكن الجمع بين الإدخال اليدوي وExcel. تُدمج الأسماء غير المكررة فقط ويمكن تعديلها أو حذفها قبل إرسال الطلب.</p>'+
 '<strong id="mj49NameCount">٠ / ١٠٠ مستفيدة</strong><div id="mj49Names"></div></div>'+
 '<div class="mj49-form-actions"><button type="button" data-mj49-preview>معاينة الشهادات والتنقل بين الأسماء</button>'+
 '<button type="submit" id="mj49Submit">'+(requestId?"حفظ تعديل الطلب الجماعي":"إرسال طلب الشهادة الجماعية")+'</button>'+
 '<button type="button" class="mj49-secondary" data-mj49-reset>طلب جماعي جديد</button></div>'+
 '<div id="mj49Message" role="status" aria-live="polite"></div></form></div></section>';
}
function injectCSS(){
 if(document.getElementById("mj49GroupStyles"))return;
 const e=document.createElement("style");e.id="mj49GroupStyles";
 e.textContent=[
 '.mj49-main-panel>summary{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
 '.mj49-main-panel .mj49-main-pill{display:inline-flex;align-items:center;justify-content:center;border-radius:20px;background:#0f5f59;color:#fff;font:800 12px Tahoma,Arial,sans-serif;padding:5px 12px}',
 '.mj49-main-panel .mj49-main-panel-body{padding:14px!important}',
 '.mj49-main-panel .mj49-group-details{margin:0;border:0;border-radius:0}',
 '.mj49-main-panel .mj49-group-details .mj49-content{padding:0}',
 '.mj49-group-details{border:1px solid #cddfdd;border-radius:12px;background:#fff;margin:12px 0;overflow:hidden;color:#164d55}',
 '.mj49-group-details>summary{font:800 15px Tahoma,Arial,sans-serif;background:#f0f7f6;cursor:pointer;padding:16px}',
 '.mj49-group-details .mj49-content{padding:16px;display:grid;gap:12px}',
 '#mj49GroupForm{display:grid;gap:14px}',
 '.mj49-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}',
 '.mj49-fields label,.mj49-name-entry label{display:grid;gap:6px;font-weight:700;font-size:13px;color:#174d56}',
 '.mj49-wide{grid-column:1/-1}',
 '.mj49-fields input,.mj49-fields select,.mj49-fields textarea,.mj49-name-entry input,.mj49-name-entry textarea,.mj49-name-row input{width:100%;min-width:0;box-sizing:border-box;border:1px solid #a8c9ca;background:#fff;color:#173e46;padding:11px;border-radius:9px;font:normal 14px Tahoma,Arial,sans-serif}',
 '.mj49-name-entry{border-top:1px solid #ddeae8;padding-top:13px;display:flex;flex-wrap:wrap;gap:10px;align-items:end}',
 '.mj49-name-entry>label{flex:1 1 230px}',
 '.mj49-name-entry>.mj49-wide{flex-basis:100%}',
 '.mj49-name-entry h4,#mj49Names,#mj49NameCount{flex-basis:100%;margin:0}',
 '.mj49-name-row{display:flex;align-items:center;gap:8px;margin:6px 0}',
 '.mj49-name-number{min-width:30px;text-align:center;color:#53777d}',
 '.mj49-name-row input{flex:1}',
 '.mj49-name-row button,.mj49-name-entry>button,.mj49-form-actions button,.mj49-admin-toolbar button,.mj49-admin-table button,.mj49-preview-actions button{border:1px solid #a8c9ca;border-radius:9px;padding:9px 13px;background:#f4faf8;color:#155a60;font:700 13px Tahoma,Arial,sans-serif;cursor:pointer}',
 '.mj49-form-actions{display:flex;flex-wrap:wrap;gap:10px}',
 '.mj49-form-actions button[type=submit]{background:#0f5f59;color:#fff;border-color:#0f5f59}',
 '.mj49-muted{color:#627e81;font:normal 13px/1.8 Tahoma,Arial,sans-serif;margin:0}',
 '#mj49Message,#mj49AdminMessage{min-height:22px;font-weight:700;line-height:1.7}',
 '.mj49-admin-panel{border-top:1px solid #dce8e5;margin-top:14px;padding-top:14px}',
 '.mj49-admin-toolbar{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px}',
 '.mj49-admin-toolbar h4{margin:0;color:#104c55}',
 '.mj49-admin-scroll{overflow-x:auto;border:1px solid #d8e8e5;border-radius:9px}',
 '.mj49-admin-table{width:100%;min-width:780px;border-collapse:collapse;direction:rtl}',
 '.mj49-admin-table th,.mj49-admin-table td{padding:10px;text-align:right;border-bottom:1px solid #e2ecea;font:normal 13px/1.6 Tahoma,Arial,sans-serif}',
 '.mj49-admin-table th{background:#f1f7f6;font-weight:800;color:#124c55}',
 '.mj49-admin-table .mj49-approve{background:#11645c;color:#fff}',
 '.mj49-admin-table .mj49-reject{color:#a33434;background:#fff7f7}',
 '.mj49-admin-table .mj49-cell-actions{display:flex;gap:7px}',
 '.mj49-preview-dialog{direction:rtl;width:min(96vw,1200px);max-width:96vw;max-height:95dvh;overflow:auto;border:1px solid #b7d5d3;border-radius:14px;padding:12px;background:#f4f8f8;color:#124a52}',
 '.mj49-preview-dialog::backdrop{background:rgba(5,28,38,.7)}',
 '.mj49-preview-header,.mj49-preview-actions{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0}',
 '.mj49-preview-frame{width:100%;overflow:hidden;position:relative;background:#fffdf8}',
 '.mj49-preview-frame>.certificate-paper{position:absolute!important;top:0;right:0;width:1123px!important;min-width:1123px!important;max-width:none!important;height:794px!important;min-height:794px!important;transform-origin:top right!important}',
 '@media(max-width:650px){.mj49-fields{grid-template-columns:1fr}.mj49-preview-dialog{padding:6px}}'
 ].join("\n");
 document.head.appendChild(e);
}
function certificateData(row,name){
 return {name,title:row.title||"",description:row.description||row.short_description||"",
  date:row.date||row.date_iso||"",duration:row.duration||"",executionType:row.executionType||row.execution_type||""};
}
function fitPreview(){
 const dlg=document.getElementById("mj49PreviewDialog");
 if(!dlg?.open)return;
 const frame=dlg.querySelector(".mj49-preview-frame"),paper=frame?.firstElementChild;
 if(!frame||!paper)return;
 const width=frame.getBoundingClientRect().width;
 if(!width)return;
 const scale=Math.max(.08,Math.min(1,width/1123,Math.max(120,innerHeight-240)/794));
 frame.style.height=Math.ceil(794*scale)+"px";
 paper.style.setProperty("transform","scale("+scale+")","important");
}
function openPreview(row,watermark=false,index=0){
 injectCSS();
 if(!window.ManjazTask15?.certHTML)throw Error("لم يكتمل تحميل القالب الرسمي للشهادة");
 const list=row.recipient_names||names;
 if(!Array.isArray(list)||!list.length)throw Error("أضيفي أسماء المستفيدات أولًا");
 previewState={row,watermark,index:Math.max(0,Math.min(index,list.length-1))};
 let dlg=document.getElementById("mj49PreviewDialog");
 if(!dlg){
  dlg=document.createElement("dialog");dlg.id="mj49PreviewDialog";dlg.className="mj49-preview-dialog";
  document.body.appendChild(dlg);
  dlg.addEventListener("click",e=>{if(e.target===dlg)dlg.close()});
 }
 paintPreview();
 if(!dlg.open)dlg.showModal();
 requestAnimationFrame(()=>{fitPreview();requestAnimationFrame(fitPreview)});
}
function paintPreview(){
 const dlg=document.getElementById("mj49PreviewDialog");
 if(!dlg||!previewState)return;
 const {row,watermark,index}=previewState,list=row.recipient_names||names;
 const title="معاينة شهادة "+(index+1)+" من "+list.length+" – "+list[index];
 const html=window.ManjazTask15.certHTML(row.category,certificateData(row,list[index]),watermark);
 dlg.innerHTML='<div class="mj49-preview-header"><strong>'+esc(title)+'</strong>'+
 '<button type="button" data-mj49-close>إغلاق ×</button></div>'+
 '<div class="mj49-preview-frame">'+html+'</div>'+
 '<div class="mj49-preview-actions">'+
 '<button type="button" data-mj49-nav="-1"'+(index===0?" disabled":"")+'>السابق</button>'+
 '<span>'+(index+1)+' / '+list.length+'</span>'+
 '<button type="button" data-mj49-nav="1"'+(index===list.length-1?" disabled":"")+'>التالي</button></div>'+
 (watermark?'<p class="mj49-muted">معاينة فقط بعلامة مائية؛ لا تصدر الشهادة إلا بعد الاعتماد.</p>':'');
 requestAnimationFrame(fitPreview);
}
async function rpc(name,body,bearer=KEY){
 const r=await fetch(BASE+"/rest/v1/rpc/"+name,{method:"POST",
  headers:{apikey:KEY,Authorization:"Bearer "+bearer,"Content-Type":"application/json"},
  body:JSON.stringify(body),cache:"no-store"});
 const result=await r.json().catch(()=>null);
 if(!r.ok)throw Error(result?.message||"تعذر حفظ طلب الشهادة ("+r.status+")");
 return result;
}
async function adminToken(){
 let s;try{s=JSON.parse(sessionStorage.getItem(SESSION)||"null")}catch(_){}
 if(!s?.access_token)throw Error("سجّلي الدخول بصلاحية الإدارة أولًا");
 if(Number(s.expires_at||0)<=Math.floor(Date.now()/1000)+45){
  if(!s.refresh_token)throw Error("انتهت الجلسة الإدارية");
  const r=await fetch(BASE+"/auth/v1/token?grant_type=refresh_token",{method:"POST",
   headers:{apikey:KEY,"Content-Type":"application/json"},
   body:JSON.stringify({refresh_token:s.refresh_token})});
  if(!r.ok)throw Error("انتهت الجلسة الإدارية؛ سجلي الدخول من جديد");
  const j=await r.json();s={...s,access_token:j.access_token,
   refresh_token:j.refresh_token||s.refresh_token,
   expires_at:Math.floor(Date.now()/1000)+Number(j.expires_in||3600),user:j.user||s.user};
  sessionStorage.setItem(SESSION,JSON.stringify(s));
 }
 return s.access_token;
}
async function submit(){
 const form=document.getElementById("mj49GroupForm");
 if(!form?.reportValidity())return;
 const values=getData();
 try{names=unique(names,[])}catch(err){message(err.message,true);return}
 if(!names.length){message("أضيفي اسم مستفيدة واحدة على الأقل.",true);return}
 if(isExecution(values.category)&&values.executionType.length<2){
  message("حددي نوع التنفيذ.",true);return
 }
 const button=document.getElementById("mj49Submit");
 button.disabled=true;message("جارٍ تسجيل طلب الشهادة الجماعية...");
 try{
  const result=await rpc("manjaz_group_certificate_save_v49",{
   p_requester_name:values.requester_name,p_category:values.category,
   p_title:values.title,p_description:values.description,
   p_date_iso:values.date,p_date_display:new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",
    {day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Riyadh"}).format(new Date(values.date+"T12:00:00+03:00")),
   p_duration:values.duration,p_execution_type:values.executionType,
   p_recipient_names:names,p_edit_token:savedToken(),p_request_id:requestId||null
  });
  if(!result?.request_id||result.status!=="مستلم"||result.recipient_count!==names.length)
   throw Error("لم تؤكد قاعدة البيانات حفظ جميع الأسماء.");
  requestId=result.request_id;
  localStorage.setItem(STORAGE,JSON.stringify({requestId,editToken,names,fields:values}));
  button.textContent="حفظ تعديل الطلب الجماعي";
  message("تم إرسال الطلب الجماعي ("+names.length+" شهادة) إلى الإدارة للمراجعة. لا تتاح الشهادات النهائية قبل الاعتماد.");
 }catch(err){message("تعذر إرسال الطلب: "+(err?.message||err),true)}
 finally{button.disabled=false}
}
async function loadExcel(input){
 const file=input.files?.[0];if(!file)return;
 message("جارٍ قراءة أسماء المستفيدات من Excel...");
 try{
  if(file.size>5*1024*1024)throw Error("حجم Excel يتجاوز ٥ ميغابايت");
  if(!window.XLSX)await new Promise((resolve,reject)=>{
   const id="mj49ExcelLib";let s=document.getElementById(id);
   if(s){s.addEventListener("load",resolve,{once:true});s.addEventListener("error",()=>reject(Error("تعذر تحميل قارئ Excel")),{once:true});return}
   s=document.createElement("script");s.id=id;s.src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
   s.onload=resolve;s.onerror=()=>reject(Error("تعذر تحميل قارئ Excel"));
   document.head.appendChild(s);
  });
  if(!window.XLSX)throw Error("قارئ Excel غير متاح");
  const wb=window.XLSX.read(await file.arrayBuffer(),{type:"array"});
  const sheet=wb.Sheets[wb.SheetNames[0]];if(!sheet)throw Error("ملف Excel فارغ");
  const rows=window.XLSX.utils.sheet_to_json(sheet,{header:1,raw:false,defval:""});
  if(rows.length>5000)throw Error("يرجى تقليل حجم قائمة Excel");
  let header=-1,col=0;
  for(let i=0;i<Math.min(10,rows.length);i++){
   for(let j=0;j<(rows[i]||[]).length;j++){
    if(/^(?:اسم|الاسم|اسم المستفيدة|اسم المعلمة|اسم الطالبة|name|recipient)/i.test(clean(rows[i][j]))){
     header=i;col=j;break;
    }
   }
   if(header>=0)break;
  }
  const entries=rows.slice(header>=0?header+1:0).map(row=>{
   if(header>=0)return clean(row?.[col]);
   return clean((row||[]).find(v=>/[A-Za-z\u0600-\u06FF]/.test(String(v||""))));
  }).filter(s=>s&&!/^(?:اسم|الاسم|name|recipient)/i.test(s));
  if(!entries.length)throw Error("لم يُعثر على أسماء في الملف");
  addNames(entries);
 }catch(err){message("تعذر استيراد Excel: "+(err?.message||err),true)}
 finally{input.value=""}
}
function adminDate(s){
 if(!s)return "—";try{return new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura",
  {day:"numeric",month:"long",year:"numeric",timeZone:"Asia/Riyadh"}).format(new Date(s))}catch(_){return "—"}
}
function adminMarkup(){
 const statuses=[["مستلم","الطلبات الجديدة"],["معتمد","الطلبات المعتمدة"],["مرفوض","الطلبات المرفوضة"]];
 return '<div class="mj49-admin-toolbar"><h4>طلبات إصدار الشهادات الجماعية</h4>'+
 '<button type="button" data-mj49-admin-refresh>تحديث الطلبات الجماعية</button></div>'+
 '<div id="mj49AdminMessage" role="status" aria-live="polite"></div>'+
 '<div class="mj49-admin-scroll"><table class="mj49-admin-table"><thead><tr>'+
 '<th>اسم مقدمة الطلب</th><th>نوع الشهادة</th><th>تاريخ الطلب</th>'+
 '<th>عدد الشهادات</th><th>الحالة</th><th>معاينة</th><th>اعتماد</th><th>رفض</th></tr></thead><tbody>'+
 (adminList.length?adminList.map(r=>{
  const pending=r.status==="مستلم",label=statuses.find(x=>x[0]===r.status)?.[1]||r.status;
  return '<tr><td>'+esc(r.requester_name)+'</td><td>'+esc(categoryName(r.category))+'</td>'+
   '<td>'+esc(adminDate(r.created_at))+'</td><td>'+r.recipient_names.length+'</td>'+
   '<td>'+esc(label)+(r.status==="مرفوض"&&r.rejected_reason?'<small> — '+esc(r.rejected_reason)+'</small>':'')+'</td>'+
   '<td><button type="button" data-mj49-admin-preview="'+esc(r.id)+'">معاينة</button></td>'+
   '<td>'+(pending?'<button type="button" class="mj49-approve" data-mj49-approve="'+esc(r.id)+'">اعتماد</button>':'—')+'</td>'+
   '<td>'+(pending?'<button type="button" class="mj49-reject" data-mj49-reject="'+esc(r.id)+'">رفض</button>':'—')+'</td></tr>';
 }).join(""):'<tr><td colspan="8">لا توجد طلبات جماعية حاليًا.</td></tr>')+
 '</tbody></table></div>';
}
function adminStatus(msg,error=false){
 const n=document.getElementById("mj49AdminMessage");if(n){n.textContent=msg;n.style.color=error?"#a33434":"#16625e"}
}
async function refreshAdmin(){
 const host=document.getElementById("mj49GroupAdmin");
 if(!host||adminLoading)return;
 adminLoading=true;adminStatus("جارٍ تحميل طلبات الشهادات الجماعية...");
 try{
  const token=await adminToken();
  const out=await rpc("manjaz_group_certificate_admin_list_v49",{},token);
  if(!Array.isArray(out))throw Error("استجابة الطلبات غير صحيحة");
  adminList=out;
  if(host.isConnected)host.innerHTML=adminMarkup();
  adminStatus("الطلبات الجماعية: "+adminList.length);
 }catch(err){adminStatus("تعذر تحديث الطلبات الجماعية: "+(err?.message||err),true)}
 finally{adminLoading=false}
}
async function adminDecision(id,action){
 const record=adminList.find(r=>r.id===id);
 if(!record||record.status!=="مستلم")return;
 let reason="";
 if(action==="reject"){
  const answer=prompt("سبب رفض الطلب الجماعي كاملًا (يلزم ذكر السبب):");
  if(answer===null)return;
  reason=clean(answer);
  if(reason.length<3||reason.length>500){adminStatus("اكتبي سبب الرفض من ٣ إلى ٥٠٠ حرفًا.",true);return}
 }else if(!confirm("اعتماد "+record.recipient_names.length+" شهادة جماعية للطلب المقدم باسم "+record.requester_name+"؟"))return;
 adminStatus("جارٍ تسجيل القرار...");
 try{
  const result=await rpc("manjaz_group_certificate_admin_decide_v49",{
   p_request_id:id,p_action:action,p_reason:reason
  },await adminToken());
  if(result?.request_id!==id||result.status!==(action==="approve"?"معتمد":"مرفوض"))
   throw Error("قاعدة البيانات لم تؤكد القرار");
  await refreshAdmin();
  adminStatus(action==="approve"?"تم اعتماد جميع الشهادات وإتاحتها في قسم الشهادات المعتمدة.":"تم رفض الطلب كاملًا وتسجيل السبب.");
 }catch(err){adminStatus("تعذر تنفيذ القرار: "+(err?.message||err),true)}
}
function mount(){
 if(mounting||currentRoute()!=="admin")return;
 mounting=true;
 try{
  const requests=document.getElementById("mj15Requests");
  if(!requests)return;injectCSS();
  // This independent card must not live inside #mj15PublicArea: the
  // individual-certificate controls replace that area's HTML on every change.
  // Keep existing certificate workflows and records completely untouched.
  const dashboard=requests.parentElement;
  if(dashboard&&!document.getElementById("mj49GroupPanel")){
   const panel=document.createElement("details");
   panel.id="mj49GroupPanel";
   panel.className="mj15-panel mj49-main-panel";
   panel.innerHTML='<summary><span class="mj49-main-pill">جماعي</span><span>إصدار شهادة جماعية – حتى ١٠٠ مستفيدة</span></summary>'+
     '<div class="mj15-body mj49-main-panel-body"></div>';
   requests.insertAdjacentElement("afterend",panel);
  }
  const groupHost=document.querySelector("#mj49GroupPanel .mj49-main-panel-body");
  if(groupHost&&!document.getElementById("mj49GroupRequest")){
   groupHost.innerHTML=groupForm();
   renderNames();updateExecFields();window.ManjazHijriPicker?.refresh?.();
  }
  const powers=document.getElementById("mj15CertificatePowers");
  if(powers&&!document.getElementById("mj49GroupAdmin")){
   const d=document.createElement("div");d.id="mj49GroupAdmin";d.className="mj49-admin-panel";
   d.innerHTML='<div class="mj49-admin-toolbar"><h4>طلبات إصدار الشهادات الجماعية</h4><button type="button" data-mj49-admin-refresh>عرض الطلبات الجماعية</button></div><div id="mj49AdminMessage" role="status"></div>';
   powers.appendChild(d);
  }
 }finally{mounting=false}
}
function maybeLoadAdmin(){
 if(currentRoute()==="admin"&&document.getElementById("mj34PowersSelect")?.value==="certificates"
  &&document.getElementById("mj34PowersProtected")?.hidden===false)void refreshAdmin();
}
document.addEventListener("click",e=>{
 const el=e.target.closest("[data-mj49-add],[data-mj49-bulk],[data-mj49-remove],[data-mj49-preview],[data-mj49-reset],[data-mj49-admin-preview],[data-mj49-approve],[data-mj49-reject],[data-mj49-admin-refresh],[data-mj49-nav],[data-mj49-close]");
 if(!el)return;
 if(el.hasAttribute("data-mj49-add")){
  const inp=document.getElementById("mj49ManualName");
  if(inp?.value.trim()){try{addNames([inp.value]);inp.value="";inp.focus()}catch(err){message(err.message,true)}}return
 }
 if(el.hasAttribute("data-mj49-bulk")){
  const inp=document.getElementById("mj49BulkNames");
  try{addNames(String(inp?.value||"").split(/[\r\n;؛]+/));if(inp)inp.value=""}
  catch(err){message(err.message,true)}return;
 }
 if(el.hasAttribute("data-mj49-remove")){
  names.splice(Number(el.dataset.mj49Remove),1);renderNames();return;
 }
 if(el.hasAttribute("data-mj49-reset")){
  if(!confirm("بدء طلب جماعي جديد؟ سيُمسح نموذج الطلب الحالي من هذا الجهاز فقط."))return;
  localStorage.removeItem(STORAGE);names=[];requestId="";editToken="";
  const target=document.getElementById("mj49GroupRequest");
  if(target){target.outerHTML=groupForm();renderNames();updateExecFields();window.ManjazHijriPicker?.refresh?.()}
  return;
 }
 if(el.hasAttribute("data-mj49-preview")){
  try{names=unique(names,[]);renderNames();openPreview({...getData(),recipient_names:[...names]},true)}
  catch(err){message(err.message,true)}return;
 }
 if(el.hasAttribute("data-mj49-admin-refresh")){void refreshAdmin();return}
 if(el.hasAttribute("data-mj49-admin-preview")){
  const rec=adminList.find(r=>r.id===el.dataset.mj49AdminPreview);
  if(rec)try{openPreview(rec,false)}catch(err){adminStatus(err.message,true)}
  return;
 }
 if(el.hasAttribute("data-mj49-approve")||el.hasAttribute("data-mj49-reject")){
  const approve=el.hasAttribute("data-mj49-approve");
  void adminDecision(approve?el.dataset.mj49Approve:el.dataset.mj49Reject,approve?"approve":"reject");return;
 }
 if(el.hasAttribute("data-mj49-close")){document.getElementById("mj49PreviewDialog")?.close();return}
 if(el.hasAttribute("data-mj49-nav")){
  if(!previewState)return;
  const max=(previewState.row.recipient_names||names).length;
  previewState.index=Math.max(0,Math.min(max-1,previewState.index+Number(el.dataset.mj49Nav)));
  paintPreview();return;
 }
},true);
document.addEventListener("change",e=>{
 if(e.target.id==="mj49ExcelFile"){void loadExcel(e.target);return}
 if(e.target.matches("#mj49GroupForm [name=category]")){
  selectedCategory=e.target.value;updateExecFields();return;
 }
 if(e.target.matches("#mj49GroupForm [name=executionType]")){updateExecFields();return}
 if(e.target.matches("[data-mj49-name-index]")){
  const idx=Number(e.target.dataset.mj49NameIndex);
  if(Number.isInteger(idx)&&idx>=0&&idx<names.length){
   const n=clean(e.target.value);if(n)names[idx]=n;else names.splice(idx,1);
   renderNames();
  }return;
 }
 if(e.target.id==="mj34PowersSelect")queueMicrotask(maybeLoadAdmin);
});
document.addEventListener("submit",e=>{
 if(e.target.id!=="mj49GroupForm")return;
 e.preventDefault();e.stopImmediatePropagation();void submit();
},true);
document.addEventListener("manjaz:admin-session-changed",()=>queueMicrotask(maybeLoadAdmin));
window.addEventListener("resize",fitPreview,{passive:true});
function boot(){
 injectCSS(); // Public approved certificates need styled previews without visiting administration.
 const view=document.getElementById("view");
 if(view){
  let queued=false;
  new MutationObserver(()=>{
   if(queued)return;queued=true;
   queueMicrotask(()=>{queued=false;mount()});
  }).observe(view,{childList:true,subtree:false});
 }
 mount();addEventListener("hashchange",()=>queueMicrotask(mount));
}
window.ManjazGroupCertificateUI={openPreview,certificateData,categoryName};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();