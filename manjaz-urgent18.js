/* MANJAZ – awards expandable add card, 19.5.
   Upload this file IN PLACE OF manjaz-urgent18.js.
   Keeps original approved-gallery filtering and original award form & save handlers.
   No other sections, database operations, or certificate logic are modified.
*/
(()=>{'use strict';
 const view=document.getElementById('view');
 if(!view)return;

 // Preserve the original 18.1 gallery filtering, including its existing action visibility.
 let working=false, verifiedAdmin=false, adminChecked='';
 function checkAdmin(){
  const raw=sessionStorage.getItem('manjaz_admin_auth_session_v1')||'';
  if(raw===adminChecked)return;adminChecked=raw;verifiedAdmin=false;
  let session;try{session=JSON.parse(raw)}catch(_){}
  if(!session?.access_token)return;
  fetch('https://idkjuqfxcweqekdkcktk.supabase.co/auth/v1/user',{headers:{apikey:'sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL',Authorization:'Bearer '+session.access_token},cache:'no-store'}).then(async r=>{
   if(!r.ok)return;const user=await r.json();
   verifiedAdmin=String(user.email||'').toLowerCase()==='munjz.s94@hotmail.com';
   queue();
  }).catch(()=>{});
 }
 function filterGallery(){
  if(working)return;
  working=true;
  try{
   checkAdmin();
   view.classList.toggle('mj19-admin-awards',verifiedAdmin);
   const isAchievements=!!view.querySelector('#achievementList');
   const isAwards=!!view.querySelector('#awardList');
   if(!isAchievements&&!isAwards)return;
   const container=view.querySelector(isAchievements?'#achievementList':'#awardList');
   if(!container)return;
   for(const card of container.querySelectorAll('.achievement-card')){
    const state=card.querySelector('.badge')?.textContent?.trim();
    const approved=state==='معتمد';
    if(card.hidden!==!approved)card.hidden=!approved;
    if(isAwards){
     for(const b of card.querySelectorAll('.record-edit-btn,.record-delete-btn'))b.hidden=!verifiedAdmin;
    }
   }
  }finally{working=false;}
 }

 // Styles are installed from this already-referenced script: no index.html change needed.
 function ensureStyle(){
  if(document.getElementById('mj19AwardEntryCSS'))return;
  const sheet=document.createElement('style');
  sheet.id='mj19AwardEntryCSS';
  sheet.textContent=`
   #view.mj19-admin-awards:has(#awardList) .record-actions-grid{display:grid!important}
   #view.mj19-admin-awards:has(#awardList) .record-edit-btn,
   #view.mj19-admin-awards:has(#awardList) .record-delete-btn{display:block!important}
   #view:has(#awardList) #mj19AwardEntry{
    display:block;margin:0 0 16px;background:var(--white,#fff);
    border:1px solid var(--line,#d4e3e5);border-radius:16px;
    box-shadow:0 8px 22px rgba(11,48,71,.05);overflow:hidden;
    color:var(--ink,#173345);direction:rtl
   }
   #view:has(#awardList) #mj19AwardEntry>summary{
    display:flex;align-items:center;gap:12px;cursor:pointer;
    padding:16px 18px;min-height:64px;box-sizing:border-box;
    font:800 17px/1.5 Tahoma,Arial,sans-serif;color:var(--navy,#0b3047);
    list-style:none
   }
   #mj19AwardEntry>summary::-webkit-details-marker{display:none}
   #mj19AwardEntry>summary::before{
    content:'+';display:grid;place-items:center;width:34px;height:34px;flex:none;
    border-radius:10px;background:var(--teal-soft,#e7f4f2);
    color:var(--teal,#0f8b8d);font:800 25px/1 Tahoma,Arial,sans-serif
   }
   #mj19AwardEntry[open]>summary::before{content:'−'}
   #mj19AwardEntry>summary:focus-visible{outline:2px solid var(--teal,#0f8b8d);outline-offset:-3px}
   #mj19AwardEntry>.mj19-award-entry-body{padding:0 16px 18px;border-top:1px solid var(--line,#d4e3e5)}
   /* Override only the old display:none!important for this existing award form. */
   #view:has(#awardList) #mj19AwardEntry[open] #awardForm{
    display:block!important;visibility:visible!important;
    margin:14px 0 0;max-width:100%;box-sizing:border-box;
    box-shadow:none;border:0;background:transparent;padding:0
   }
   #view:has(#awardList) #mj19AwardEntry:not([open]) #awardForm{display:none!important}
   #mj19AwardEntry #awardForm :is(input,select,textarea){max-width:100%;box-sizing:border-box}
   @media(max-width:650px){
    #view:has(#awardList) #mj19AwardEntry>summary{font-size:15px;padding:13px 12px}
    #mj19AwardEntry>.mj19-award-entry-body{padding:0 10px 14px}
   }
  `;
  document.head.appendChild(sheet);
 }

 function mountAwardCard(){
  const list=view.querySelector('#awardList');
  const form=view.querySelector('#awardForm');
  if(!list||!form)return;
  let card=view.querySelector('#mj19AwardEntry');
  if(!card){
   card=document.createElement('details');
   card.id='mj19AwardEntry';
   const summary=document.createElement('summary');
   summary.textContent='إضافة تكريم';
   const body=document.createElement('div');
   body.className='mj19-award-entry-body';
   card.append(summary,body);
   list.parentElement.insertBefore(card,list);
   card.addEventListener('toggle',()=>{
    if(card.open){
     // Invoke the EXISTING show button's click listener; do not replace award cloud save.
     const show=view.querySelector('#showAwardForm');
     if(show)show.click();
     else form.style.display='block';
    }else if(form.dataset.busy!=='1'&&form.dataset.awardCloudBusy!=='1'){
     form.style.display='none';
    }
   });
   // Cancel keeps original reset behavior, then collapses this single added card.
   card.addEventListener('click',event=>{
    if(!event.target.closest('#cancelAward'))return;
    queueMicrotask(()=>{if(card.isConnected)card.open=false;});
   });
  }
  const body=card.querySelector('.mj19-award-entry-body');
  if(body&&form.parentElement!==body)body.appendChild(form);
 }

 let queued=false;
 function apply(){filterGallery();ensureStyle();mountAwardCard();}
 function queue(){
  if(queued)return;
  queued=true;
  queueMicrotask(()=>{queued=false;apply();});
 }
 const observer=new MutationObserver(queue);
 observer.observe(view,{childList:true,subtree:true});
 window.addEventListener('hashchange',queue);
 queue();
})();


/* Daily duty stylesheet is deliberately bundled with the entry script */
(()=>{const id="mjDailyDutyCss20";if(document.getElementById(id))return;const s=document.createElement("style");s.id=id;s.textContent="/* Independent Manjaz daily duty section, fully RTL and printable */\n.mj-duty{direction:rtl;color:var(--ink,#173345);display:grid;gap:16px;max-width:1100px;margin:0 auto 22px;font:inherit}\n.mj-duty-head{border-radius:16px;background:linear-gradient(100deg,var(--navy,#0b3047),#0c636b);color:#fff;padding:22px 26px}\n.mj-duty-head span{opacity:.9;font-size:13px}.mj-duty-head h2{margin:8px 0;font-size:25px;color:#fff}.mj-duty-head p{margin:0;color:#f2faf9}\n.mj-duty-toolbar{display:flex;align-items:end;gap:12px;flex-wrap:wrap;padding:14px;background:#fff;border:1px solid var(--line,#d4e3e5);border-radius:14px}\n.mj-duty-toolbar label{display:grid;gap:5px;flex:1 1 180px;font-weight:700}\n.mj-duty button,.mj-duty input,.mj-duty select{font:inherit;box-sizing:border-box}\n.mj-duty button{border:0;background:var(--teal,#0d7779);color:#fff;padding:10px 15px;min-height:44px;border-radius:9px;font-weight:700;cursor:pointer}\n.mj-duty button.secondary{background:#fff;border:1px solid #a6c6c7;color:#195d65}.mj-duty button:disabled{opacity:.55;cursor:not-allowed}\n.mj-duty input,.mj-duty select{border:1px solid #bdcfd4;border-radius:9px;background:#fff;color:var(--ink,#173345);padding:10px 12px;min-width:0;width:100%;height:46px;text-align:right;direction:rtl}\n.mj-duty-policy{background:#eff8f7;padding:12px 16px;border-right:4px solid #14847d;border-radius:9px;line-height:1.9}\n#dutyStatus:not(:empty){padding:10px 12px;border-radius:9px;background:#ecf7f5;color:#155a52}#dutyStatus.error{background:#fff1ef;color:#8c2424}\n.mj-duty-panel{border:1px solid var(--line,#d4e3e5);background:#fff;border-radius:15px;overflow:hidden}\n.mj-duty-panel summary{font-weight:800;cursor:pointer;list-style:none;min-height:60px;padding:18px;box-sizing:border-box;color:var(--navy,#0b3047)}\n.mj-duty-panel summary::before{content:'+';margin-left:12px;color:var(--teal,#0d7779);font-size:23px}.mj-duty-panel[open] summary::before{content:'−'}\n.mj-duty-body{padding:16px;border-top:1px solid var(--line,#d4e3e5)}\n.mj-duty-auto-actions{display:flex;gap:10px;flex-wrap:wrap}.mj-duty-hint{color:#58757b;font-size:13px;line-height:1.8}\n.mj-duty-slots{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}\n.mj-duty-slot{border:1px solid #d5e6e6;border-radius:12px;overflow:hidden;background:#fbfefe;min-width:0}\n.mj-duty-slot h3{padding:14px;margin:0;background:#eaf5f3;font-size:16px;color:#16545d}\n.mj-duty-slot h3 small{font-size:12px;opacity:.8;margin-inline-start:4px}\n.mj-duty-six{padding:12px;display:grid;gap:9px}.mj-duty-six label{display:flex;gap:8px;align-items:center;min-width:0}\n.mj-duty-six label>span{border-radius:6px;background:#e3eff0;padding:8px;color:#175a5c;min-width:16px;text-align:center}\n.mj-duty-six label>select{flex:1;font-size:12px}\n#dutyPersonForm{display:grid;grid-template-columns:2fr 1fr auto;align-items:end;gap:10px;margin-bottom:15px}\n#dutyPersonForm label{display:grid;gap:5px;font-size:13px;font-weight:700}\n.mj-duty-people{display:grid;gap:6px}.mj-duty-people>div,.mj-duty-share>div{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:9px 11px;border:1px solid #e1eaec;border-radius:9px}\n.mj-duty-people small,.mj-duty-share small{color:#5d7279;font-size:12px}\n.mj-duty-share{display:grid;gap:7px;margin-top:12px}.mj-duty-share>div span{display:grid;gap:4px}\n.mj-duty-stats-wrap{overflow-x:auto}.mj-duty-stats-wrap table{width:100%;border-collapse:collapse;font-size:13px;white-space:nowrap}\n.mj-duty-stats-wrap th,.mj-duty-stats-wrap td{border-bottom:1px solid #dfeaec;padding:10px 12px;text-align:right}\n.mj-duty-stats-wrap th{background:#eaf5f3;color:#123e48}\n.mj-duty-public{max-width:700px;margin:28px auto;padding:20px;background:#fff;border:1px solid #cfe0e3;border-radius:14px}.mj-duty-public h2{margin:0}\n.mj-duty-notice{padding:15px;border:1px solid #cfe0e3;border-radius:10px;margin-bottom:13px}\n.mj-duty-home{padding:16px 20px}.mj-duty-home .panel-head{margin-bottom:12px}.mj-duty-home a{display:inline-block;margin-top:9px}\n@media(max-width:900px){.mj-duty-slots{grid-template-columns:1fr}}\n@media(max-width:600px){.mj-duty-head{padding:16px}.mj-duty-body{padding:10px}#dutyPersonForm{grid-template-columns:1fr}.mj-duty-six label>select{font-size:13px}}\n@media print{\n body :is(#nav,.mobile-nav,.sidebar,.header,.topbar,.mj-duty-toolbar,.mj-duty-auto-actions,#dutyPersonForm,#dutyPeople,#dutyPublish,#dutyStats,.mj-duty-people,.mj-duty-policy,#dutyStatus){display:none!important}\n .mj-duty-panel:not(:first-of-type){display:none!important}.mj-duty{max-width:none}.mj-duty-panel{border:0}.mj-duty-panel .mj-duty-body{display:block!important}.mj-duty-panel summary{display:none!important}\n .mj-duty-slot{break-inside:avoid;print-color-adjust:exact}.mj-duty-slots{grid-template-columns:repeat(3,minmax(0,1fr))}\n }\n";document.head.appendChild(s)})();

/* MANJAZ DAILY DUTY 1.0 — isolated from the reserve module.
   Requires daily-duty.sql to be installed in Supabase before first use. */
(()=>{'use strict';
const URL='https://idkjuqfxcweqekdkcktk.supabase.co';
const API='sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL';
const KEY='manjaz_admin_auth_session_v1';
const ROUTE='#daily-duty', SHARED='#duty-view?token=';
const SLOTS=[['morning','مناوبة الصباح'],['break','مناوبة الفسحة'],['end','مناوبة نهاية الدوام']];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date(Date.now()+3*3600000).toISOString().slice(0,10);
let roster=[], assignments=[], links=[], dutyDate=today(), busy=false, currentRoute='';
const root=()=>document.getElementById('view');
const adminSession=()=>{try{const x=JSON.parse(sessionStorage.getItem(KEY)||'null');return x?.access_token&&(!x.expires_at||x.expires_at>Date.now()/1000)?x:null}catch(_){return null}};
const h=(admin=false)=>({apikey:API,Authorization:'Bearer '+(adminSession()?.access_token||API),'Content-Type':'application/json'});
async function request(path,{method='GET',body=null,admin=false}={}){
 if(admin&&!adminSession())throw Error('سجلي الدخول إلى الصلاحيات الإدارية قبل إدارة المناوبة');
 const res=await fetch(URL+'/rest/v1/'+path,{method,headers:h(admin),...(body?{body:JSON.stringify(body)}:{}),cache:'no-store'});
 const txt=await res.text();let payload;
 try{payload=txt?JSON.parse(txt):null}catch{payload=txt}
 if(!res.ok)throw Error(payload?.message||payload?.hint||'تعذر الاتصال بقاعدة البيانات ('+res.status+')');
 return payload;
}
const rpc=(name,data,admin=true)=>request('rpc/'+name,{method:'POST',body:data,admin});
const slotLabel=code=>SLOTS.find(([k])=>k===code)?.[1]||code;
function notify(message,isError=false){const p=document.getElementById('dutyStatus');if(p){p.textContent=message;p.classList.toggle('error',isError);p.setAttribute('role','status')}}
function home(){
 const v=root();if(!v || !/^#home(?:$|\?)/.test(location.hash||'#home') || v.querySelector('#mjDutyHomeCard'))return;
 const section=document.createElement('section');section.className='surface panel mj-duty-home';section.id='mjDutyHomeCard';
 section.innerHTML='<div class="panel-head"><h3>المناوبة اليومية</h3><span>الصباح • الفسحة • نهاية الدوام</span></div><p>إنشاء جدول المناوبة، النشر الفردي، تأكيد الاطلاع والإحصائيات.</p><a class="btn btn-primary" href="#daily-duty">إدارة المناوبة اليومية</a>';
 v.appendChild(section);
}
function nav(){const nav=document.getElementById('nav');if(nav&&!nav.querySelector('[data-route="daily-duty"]')){
 const a=document.createElement('a');a.href=ROUTE;a.dataset.route='daily-duty';a.innerHTML='<span class="icon">▦</span><span>المناوبة اليومية</span>';
 const reserve=nav.querySelector('a[href*="reserve"]'); if(reserve)reserve.after(a);else nav.appendChild(a);
 }const n=document.querySelector('.mobile-nav');if(n&&!n.querySelector('[href="#daily-duty"]')){
 const a=document.createElement('a');a.href=ROUTE;a.innerHTML='<span>▦</span><small>المناوبة</small>';n.appendChild(a);
 }}
function pageMarkup(){return `<div id="mjDutyRoot" class="mj-duty" dir="rtl">
<header class="mj-duty-head"><span>منجز | الثانوية الرابعة والتسعون – مسارات</span><h2>المناوبة اليومية</h2><p>إنشاء يدوي أو توليد آلي متوازن، نشر الجدول، وروابط الاطلاع الفردية. <strong id="dutyPrintDate">${esc(dutyDate)}</strong></p></header>
<div class="mj-duty-toolbar"><label>اليوم والتاريخ <input id="dutyDate" type="date" value="${esc(dutyDate)}"></label><button id="dutyReload" type="button">عرض الجدول</button><button id="dutyPrint" type="button" class="secondary">طباعة / حفظ PDF</button></div>
<div id="dutyStatus" role="status" aria-live="polite"></div>
<div class="mj-duty-policy">التوليد الآلي: <strong>الفسحة للإداريات فقط</strong>، والصباح ونهاية الدوام للمعلمات والإداريات. ٦ منفذات لكل فترة، دون تكرار الاسم في اليوم، مع موازنة الأعداد وتدوير الفترات.</div>
<details class="mj-duty-panel" open><summary>إنشاء جدول المناوبة</summary><div class="mj-duty-body" id="dutyBoard"><p>جارٍ تحميل البيانات...</p></div></details>
<details class="mj-duty-panel"><summary>قائمة المنفذات (معلمات وإداريات)</summary><div class="mj-duty-body"><form id="dutyPersonForm"><label>الاسم<input id="dutyPersonName" required minlength="2" maxlength="160" placeholder="الاسم الكامل"></label><label>الفئة<select id="dutyPersonRole"><option value="teacher">معلمة</option><option value="administrative">إدارية</option></select></label><button type="submit">إضافة منفذة</button></form><div id="dutyPeople"></div></div></details>
<details class="mj-duty-panel"><summary>نشر المناوبة وروابط الاطلاع</summary><div class="mj-duty-body" id="dutyPublish"><p>يظهر بعد حفظ الجدول.</p></div></details>
<details class="mj-duty-panel"><summary>إحصائيات المناوبة والعدالة</summary><div class="mj-duty-body" id="dutyStats"><p>جارٍ تحميل الإحصائيات...</p></div></details>
</div>`}
function entryListMarkup(slot){
 return `<section class="mj-duty-slot"><h3>${slotLabel(slot)} <small>٦ منفذات</small></h3><div class="mj-duty-six">${Array.from({length:6},(_,i)=>{
  const old=assignments.find(a=>a.slot===slot&&a.position===i+1);
  return `<label><span>${i+1}</span><select data-slot="${slot}" data-position="${i+1}" aria-label="${slotLabel(slot)}، المنفذة ${i+1}"><option value="">اختاري الاسم</option>${roster.filter(p=>p.active).map(p=>`<option value="${esc(p.id)}" ${p.id===old?.person_id?'selected':''}>${esc(p.full_name)} — ${p.role==='administrative'?'إدارية':'معلمة'}</option>`).join('')}</select></label>`}).join('')}</div></section>`;
}
function board(){const p=document.getElementById('dutyBoard');if(!p)return;
 p.innerHTML=`<div class="mj-duty-auto-actions"><button type="button" id="dutyGenerate">توليد آلي عادل</button><button type="button" id="dutySave">حفظ الجدول / التعديلات اليدوية</button></div>
 <p class="mj-duty-hint">يمكن تغيير أي اسم بعد التوليد من القائمة المنسدلة ثم حفظ الجدول. لا تتغير بيانات الاحتياط.</p>
 <div class="mj-duty-slots">${SLOTS.map(x=>entryListMarkup(x[0])).join('')}</div>`;
 p.querySelector('#dutyGenerate').onclick=()=>action(async()=>{if(!confirm('توليد جدول جديد سيستبدل تكليفات هذا التاريخ ويلغي روابطه السابقة. هل تستمرين؟'))return;
 await rpc('mj_duty_generate',{p_date:dutyDate});await load();notify('تم توليد ١٨ تكليفًا بعدالة، ومناوبة الفسحة للإداريات فقط.')});
 p.querySelector('#dutySave').onclick=()=>action(async()=>{
 const rows=[...p.querySelectorAll('select[data-slot]')].map(x=>({slot:x.dataset.slot,position:Number(x.dataset.position),person_id:x.value}));
 if(rows.some(r=>!r.person_id)){throw Error('اختاري ٦ منفذات لكل فترة قبل الحفظ')}
 if(new Set(rows.map(r=>r.person_id)).size!==18)throw Error('لا يمكن إسناد أكثر من مناوبة في اليوم إلى المنفذة نفسها');
 if(!confirm('حفظ التعديلات سيُلغي روابط النشر القديمة، ويمكن نشر الجدول مجددًا. هل تستمرين؟'))return;
 await rpc('mj_duty_save',{p_date:dutyDate,p_assignments:rows});await load();notify('تم حفظ الجدول والتعديلات. يجب النشر لتفعيل الروابط الفردية.')});
}
function people(){const e=document.getElementById('dutyPeople');if(!e)return;
 if(!roster.length){e.innerHTML='<p>لا توجد أسماء بعد. أضيفي المعلمات والإداريات من النموذج أعلاه.</p>';return;}
 e.innerHTML=`<div class="mj-duty-people">${roster.map(p=>`<div><span>${esc(p.full_name)} <small>(${p.role==='administrative'?'إدارية':'معلمة'})</small></span></div>`).join('')}</div>`;
}
const SHARE=()=>location.href.split('#')[0]+SHARED;
function publish(){const e=document.getElementById('dutyPublish');if(!e)return;
 let html=`<p>الجدول يحتوي على ${assignments.length} من ١٨ تكليفًا.</p><button id="dutyPublishBtn" type="button" ${assignments.length!==18?'disabled':''}>نشر جدول اليوم وإنشاء روابط فردية</button>`;
 if(links.length){html+=`<div class="mj-duty-share">${links.map(l=>{
 const name=roster.find(p=>p.id===l.person_id)?.full_name||'المنفذة';
 return `<div><span><strong>${esc(name)}</strong><small>${l.viewed_at?'تم الاطلاع':'لم تطلع بعد'}</small></span><button type="button" data-copy="${esc(SHARE()+encodeURIComponent(l.link_token))}">نسخ رابط فردي</button></div>`}).join('')}</div>`}
 e.innerHTML=html;
 e.querySelector('#dutyPublishBtn').onclick=()=>action(async()=>{await rpc('mj_duty_publish',{p_date:dutyDate});await load();notify('تم نشر الجدول وتجهيز الروابط الفردية، ولم يتم إرسال أي رسائل تلقائيًا.')});
 e.querySelectorAll('[data-copy]').forEach(b=>b.onclick=async()=>{const url=b.dataset.copy;try{await navigator.clipboard.writeText(url);notify('تم نسخ الرابط الفردي.')}catch(_){prompt('انسخي الرابط الفردي:',url)}});
}
function stats(rows){const e=document.getElementById('dutyStats');if(!e)return;
 const sorted=roster.filter(p=>p.active).map(p=>{
 const own=rows.filter(r=>r.person_id===p.id);
 return {p,total:own.length,morning:own.filter(x=>x.slot==='morning').length,break:own.filter(x=>x.slot==='break').length,end:own.filter(x=>x.slot==='end').length}
 }).sort((a,b)=>b.total-a.total||a.p.full_name.localeCompare(b.p.full_name,'ar'));
 e.innerHTML=sorted.length?`<p>الإحصائيات تشمل التكليفات المحفوظة، مع احتساب مناوبة الفسحة للإداريات فقط عند التوليد الآلي.</p><div class="mj-duty-stats-wrap"><table><thead><tr><th>المنفذة</th><th>الفئة</th><th>الصباح</th><th>الفسحة</th><th>النهاية</th><th>الإجمالي</th></tr></thead><tbody>${sorted.map(x=>`<tr><td>${esc(x.p.full_name)}</td><td>${x.p.role==='administrative'?'إدارية':'معلمة'}</td><td>${x.morning}</td><td>${x.break}</td><td>${x.end}</td><td><strong>${x.total}</strong></td></tr>`).join('')}</tbody></table></div>`:'<p>أضيفي أسماء المنفذات لإظهار الإحصائيات.</p>';
}
async function fetchHistory(){
 const all=[];
 for(let offset=0;offset<50000;offset+=1000){
  const part=await request('mj_duty_assignments?select=duty_date,slot,person_id&order=duty_date.desc&limit=1000&offset='+offset,{admin:true});
  all.push(...part);
  if(part.length<1000)return all;
 }
 throw Error('تجاوز عدد السجلات الحد المسموح للإحصائيات؛ يلزم تصدير أرشيف سابق');
}
async function load(){
 const [ps,as,ls,all]=await Promise.all([
 request('mj_duty_people?select=id,full_name,role,active&order=full_name.asc',{admin:true}),
 request('mj_duty_assignments?select=duty_date,slot,position,person_id&duty_date=eq.'+encodeURIComponent(dutyDate)+'&order=slot.asc,position.asc',{admin:true}),
 request('mj_duty_links?select=duty_date,person_id,link_token,viewed_at&duty_date=eq.'+encodeURIComponent(dutyDate),{admin:true}),
 fetchHistory()
 ]);
 roster=ps||[];assignments=as||[];links=ls||[];const d=document.getElementById('dutyPrintDate');if(d)d.textContent=dutyDate;board();people();publish();stats(all||[]);
}
async function action(fn){if(busy)return;busy=true;
 const buttons=[...document.querySelectorAll('#mjDutyRoot button')];buttons.forEach(b=>b.disabled=true);
 try{await fn()}catch(err){notify(err.message||'تعذر تنفيذ العملية',true)}finally{busy=false;buttons.forEach(b=>{if(b.isConnected && !b.closest('[hidden]'))b.disabled=false});
  const pb=document.getElementById('dutyPublishBtn');if(pb)pb.disabled=assignments.length!==18;
 }}
function initPage(){
 const v=root();if(!v)return;v.innerHTML=pageMarkup();
 document.getElementById('dutyDate').onchange=e=>{dutyDate=e.target.value||today();action(async()=>{await load();notify('تم عرض جدول التاريخ المحدد.')})};
 document.getElementById('dutyReload').onclick=()=>action(async()=>{dutyDate=document.getElementById('dutyDate').value;await load();notify('تم تحديث بيانات اليوم.')});
 document.getElementById('dutyPrint').onclick=()=>window.print();
 document.getElementById('dutyPersonForm').onsubmit=e=>{e.preventDefault();action(async()=>{
 const name=document.getElementById('dutyPersonName').value.trim();const role=document.getElementById('dutyPersonRole').value;
 if(name.length<2)throw Error('أدخلي الاسم الكامل');
 await request('mj_duty_people',{method:'POST',admin:true,body:{full_name:name,role,active:true}});await load();notify('تمت إضافة المنفذة إلى القائمة.');document.getElementById('dutyPersonName').value='';
 })};
 if(!adminSession()){notify('يجب تسجيل الدخول من «الصلاحيات الإدارية» قبل إدارة المناوبة.',true);
  const p=document.getElementById('dutyBoard');p.innerHTML='<a class="btn btn-primary" href="#admin-permissions">فتح الصلاحيات الإدارية لتسجيل الدخول</a>';
  return;
 }
 action(async()=>{await load();notify('الجدول جاهز للتعديل اليدوي أو التوليد الآلي.')});
}
async function publicPage(token){const v=root();if(!v)return;
 v.innerHTML='<div class="mj-duty mj-duty-public" dir="rtl"><h2>إشعار المناوبة اليومية</h2><p id="dutyPublicMessage">جارٍ التحقق من الرابط...</p><div id="dutyPublicControls"></div></div>';
 const msg=document.getElementById('dutyPublicMessage'),panel=document.getElementById('dutyPublicControls');
 try{
  const data=await rpc('mj_duty_link_view',{p_token:token},false);
  if(!msg.isConnected)return;
  msg.textContent='الثانوية الرابعة والتسعون – مسارات | '+data.name+' | '+data.date;
  panel.innerHTML='<div class="mj-duty-notice">'+data.slots.map(x=>`<p><strong>${esc(slotLabel(x.slot))}</strong> — تكليف رقم ${Number(x.position)}</p>`).join('')+'</div><button type="button" id="dutyAcknowledge" '+(data.viewed_at?'disabled':'')+'>'+(data.viewed_at?'تم الاطلاع':'تم الاطلاع')+'</button><p id="dutyAckStatus">'+(data.viewed_at?'سبق تأكيد الاطلاع.':'')+'</p>';
  const button=document.getElementById('dutyAcknowledge');button.onclick=async()=>{button.disabled=true;
   try{await rpc('mj_duty_ack',{p_token:token},false);document.getElementById('dutyAckStatus').textContent='تم تسجيل الاطلاع بنجاح في سجل المناوبة.'}
   catch(err){button.disabled=false;document.getElementById('dutyAckStatus').textContent=err.message}}
 }catch(err){msg.textContent=err.message||'الرابط غير صالح';panel.innerHTML=''}
}
function route(){nav();const hash=location.hash||'#home';if(hash==='#daily-duty'){
 if(currentRoute!=='daily-duty'||!document.getElementById('mjDutyRoot')){currentRoute='daily-duty';initPage()}
 }else if(hash.startsWith('#duty-view?token=')){
 if(currentRoute!==hash || !document.querySelector('.mj-duty-public')){currentRoute=hash;publicPage(decodeURIComponent(hash.slice('#duty-view?token='.length)))}
 }else {currentRoute='';if(hash==='#home'||hash==='')home()}}
let scheduled=false;
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;route()})}
function boot(){nav();const v=root();if(v)new MutationObserver(schedule).observe(v,{childList:true,subtree:false});window.addEventListener('hashchange',schedule);schedule()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
