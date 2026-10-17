/* MANJAZ 15 — admin dashboard and governed certificate request workflow.
 * Preserves legacy certificate templates, audit panels, and previously issued records.
 */
(()=>{"use strict";
const BASE="https://idkjuqfxcweqekdkcktk.supabase.co";
const KEY="sb_publishable_3yW3waOwoT0m5XtTCi1lyQ_6DGfXtIL";
const SK="manjaz_admin_auth_session_v1", OWN="manjaz_certificate_own_requests_v14";
const TYPES=[
 ["execution_teacher","شهادات التنفيذ – معلمات","تنفيذ","اسم المعلمة","عنوان الورشة أو الدرس أو البرنامج","وصف التنفيذ وأثره"],
 ["thanks_student","شهادات الشكر – طالبات","شكر","اسم الطالبة","عنوان التميز أو التكريم","سبب الشكر والتميز"],
 ["thanks_teacher","شهادات الشكر – معلمات","شكر","اسم المعلمة","عنوان الإنجاز","سبب الشكر والأثر"],
 ["parents","شهادات أولياء الأمور","شكر","اسم ولي الأمر","عنوان المشاركة أو الشراكة","سبب التقدير والمساهمة"],
 ["execution_staff","شهادات الهيكل الإداري – تنفيذ","تنفيذ","اسم الموظفة الإدارية","عنوان العمل أو البرنامج","وصف التنفيذ والأثر"],
 ["thanks_staff","شهادات الهيكل الإداري – شكر","شكر","اسم الموظفة الإدارية","عنوان الإنجاز أو التكريم","سبب الشكر والأثر"]
];
const T=k=>TYPES.find(t=>t[0]===k)||TYPES[0];
const H=s=>String(s??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const urlParam=(k)=>new URLSearchParams(location.search).get(k)||"";
const own=()=>{try{const v=JSON.parse(localStorage.getItem(OWN)||'[]');return Array.isArray(v)?v:[]}catch(_){return []}};
const store=r=>{const list=own().filter(v=>v.id!==r.id);list.unshift(r);localStorage.setItem(OWN,JSON.stringify(list.slice(0,80)))};
const rand=()=>{const a=new Uint8Array(32);crypto.getRandomValues(a);return [...a].map(n=>n.toString(16).padStart(2,'0')).join('')};
const hijri=iso=>{try{return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura',{day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Riyadh'}).format(new Date(iso+'T12:00:00+03:00'))}catch(_){return iso}};
const ownCurrent=()=>state.requestId?own().find(r=>r.id===state.requestId):null;
let state={category:TYPES[0][0],requestId:'',adminList:[],selected:'',loading:false,ready:false};
function CSS(){if(document.getElementById('mj15Css'))return;const el=document.createElement('style');el.id='mj15Css';el.textContent=`
 /* Task16: admin route shows only the five cards. Preserve all existing DOM data and listeners. */
 #view.mj16-admin-only>:not(#mj15Dashboard){display:none!important}
 #view.mj16-admin-only #mj15Dashboard{margin:0 0 24px;gap:12px}
 #view.mj16-admin-only #mj15Dashboard .mj15-panel{width:100%;box-sizing:border-box}
 #view.mj16-admin-only #mj15Dashboard select,
 #view.mj16-admin-only #mj15Dashboard .manjaz-hijri-trigger{
   height:46px!important;min-height:46px!important;width:100%!important;max-width:100%;min-width:0;
   box-sizing:border-box;border:1px solid #9ac7c9;border-radius:10px;background:#fff;
   color:#0b4955;box-shadow:0 1px 4px rgba(8,73,80,.06);padding:9px 12px;
   font-family:inherit;font-size:14px;line-height:1.35;text-align:right;direction:rtl;
 }
 #view.mj16-admin-only #mj15Dashboard select:focus-visible,
 #view.mj16-admin-only #mj15Dashboard .manjaz-hijri-trigger:focus-visible{
  outline:2px solid #0f7776;outline-offset:2px;border-color:#0f7776
 }
 #view.mj16-admin-only #mj15Dashboard .form-grid:not(.mj15-form-grid){
   display:grid;grid-template-columns:minmax(0,1fr)!important;gap:12px;align-items:stretch
 }
 #view.mj16-admin-only #mj15Dashboard .form-grid:not(.mj15-form-grid)>label{min-width:0;max-width:100%;box-sizing:border-box}
 #view.mj16-admin-only #mj15Dashboard .form-grid:not(.mj15-form-grid)>label.wide{grid-column:auto}
 #view.mj16-admin-only #mj15Dashboard .mj13-card{width:100%;max-width:100%;box-sizing:border-box}
 #view.mj16-admin-only #mj15Dashboard .mj15-form-grid{grid-template-columns:minmax(0,1fr)!important}
 #view.mj16-admin-only #mj15Dashboard .mj15-form-grid .wide{grid-column:1/-1}
 .mj15-paper.certificate-paper .mj16-watermark-layer{
   position:absolute!important;inset:0!important;z-index:999!important;display:flex!important;
   align-items:center;justify-content:center;pointer-events:none!important;
   color:rgba(8,83,91,.30)!important;font:900 170px/1 Tahoma,Arial,sans-serif!important;
   letter-spacing:12px;transform:rotate(-24deg);transform-origin:50% 50%;
   background:transparent!important;user-select:none;white-space:nowrap
 }
 .mj15-paper.certificate-paper .mj16-watermark-layer::after{content:'معاينة فقط';position:absolute;top:68%;font:900 37px/1.3 Tahoma,Arial,sans-serif;letter-spacing:1px}
 .mj15-paper-frame .mj15-paper:not(.mj15-watermark) .mj16-watermark-layer{display:none!important}
 @media(max-width:650px){#view.mj16-admin-only #mj15Dashboard .form-grid:not(.mj15-form-grid){grid-template-columns:minmax(0,1fr)!important}}
 #mj15Dashboard{direction:rtl;display:grid;gap:12px;margin:17px 0 26px}
 .mj15-panel{background:#fff;border:1px solid #cfe0e3;border-radius:15px;box-shadow:0 4px 12px rgba(16,45,55,.04);overflow:hidden}
 .mj15-panel>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:18px;color:#133847;font-weight:800;font-size:17px;outline-offset:-3px}
 .mj15-panel>summary::-webkit-details-marker{display:none}
 .mj15-panel>summary::after{content:'⌄';margin-inline-start:auto;font-size:22px;color:#4c7980}
 .mj15-panel[open]>summary::after{content:'⌃'}
 .mj15-number{display:grid;place-items:center;min-width:34px;height:34px;background:#e9f3f4;border-radius:10px;color:#14646c}
 .mj15-body{border-top:1px solid #e1ecef;padding:16px;display:grid;gap:12px}
 .mj15-body .mj13-cards{margin:0;grid-template-columns:1fr}
 .mj15-body .mj13-card{box-shadow:none}
 .mj15-body .mj14-types,.mj15-body #mj14CertificateRequestWorkspace{display:none!important}
 .mj15-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
 .mj15-choice{cursor:pointer;min-height:69px;padding:10px;border:1px solid #cbdcde;background:white;border-radius:11px;color:#234852;font:inherit;font-size:13px;font-weight:700}
 .mj15-choice[aria-pressed="true"]{background:#eaf6f3;border:2px solid #126965}
 .mj15-form{display:grid;gap:11px}
 .mj15-form label{display:grid;gap:5px;color:#244b57;font-size:13px;font-weight:700}
 .mj15-form input,.mj15-form textarea,.mj15-form select{width:100%;min-height:43px;box-sizing:border-box;border:1px solid #c1d4d7;border-radius:9px;background:white;padding:9px 11px;color:#133847;font:inherit}
 .mj15-form textarea{min-height:80px;resize:vertical}
 .mj15-form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
 .mj15-form-grid .wide{grid-column:1/-1}
 .mj15-actions{display:flex;gap:8px;flex-wrap:wrap}
 .mj15-actions button,.mj15-actions a{border:1px solid #12605d;background:#0c5e65;color:white;border-radius:9px;padding:10px 14px;font:inherit;font-weight:700;cursor:pointer;text-decoration:none;min-height:42px}
 .mj15-actions .secondary{background:white;color:#165962}
 .mj15-actions button:disabled{opacity:.55;cursor:not-allowed}
 .mj15-status{font-size:13px;line-height:1.7;color:#17646d;white-space:pre-wrap}
 .mj15-records{display:grid;gap:7px}
 .mj15-record{padding:11px;border:1px solid #e1ecee;border-radius:9px;background:#f9fbfb;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;align-items:center}
 .mj15-record button{border:1px solid #aac9c8;border-radius:8px;color:#176368;background:white;padding:7px 10px;font:inherit;cursor:pointer}
 .mj15-preview{direction:rtl;margin:10px 0;overflow:hidden;border:1px solid #d7e4e5;border-radius:10px;background:#eaf0f1;padding:12px;box-sizing:border-box;max-width:100%}
 .mj15-paper-frame{position:relative;width:100%;height:auto;overflow:hidden}
 .mj15-preview .mj15-paper.certificate-paper{position:absolute!important;inset:0 0 auto auto;width:1123px!important;height:794px!important;min-width:1123px!important;max-width:none!important;min-height:794px!important;aspect-ratio:auto;margin:0;transform:scale(var(--mj15-scale,.3));transform-origin:top right;box-sizing:border-box;background-size:100% 100%;box-shadow:none}
 .mj15-paper .cert-final-attendance{font-size:var(--mj15-text-size,18px)}
 .mj15-paper .cert-final-workshop{font-size:var(--mj15-title-size,25px)}
 .mj15-paper .cert-final-name{font-size:var(--mj15-name-size,34px)}
 .mj15-watermark::after{content:none; /* replaced by visible watermark layer */position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:166px;font-weight:900;letter-spacing:.1em;color:rgba(12,77,85,.16);transform:rotate(-27deg);pointer-events:none;z-index:25}
 .mj15-note{font-size:12px;color:#587079;line-height:1.8;margin:0}
 .mj15-hint{padding:10px 12px;background:#f2f8f8;border-radius:9px;color:#365960;font-size:13px}
 .mj15-loading{opacity:.7}
 @media(max-width:650px){.mj15-choices{grid-template-columns:1fr 1fr}.mj15-panel>summary{font-size:14px;padding:13px}.mj15-body{padding:11px}.mj15-form-grid{grid-template-columns:1fr}}
 @media print{.mj15-paper .cert-final-attendance{font-size:var(--mj15-text-size,18px)}
 .mj15-paper .cert-final-workshop{font-size:var(--mj15-title-size,25px)}
 .mj15-paper .cert-final-name{font-size:var(--mj15-name-size,34px)}
 .mj15-watermark::after{content:'منجز';}}

 /* MANJAZ Task16 corrected – official Manjaz palette, same-sized controls and one field per row. */
 #view.mj16-admin-only #mj15Dashboard{
  --mj16-navy:#0b3047;--mj16-petrol:#0b5960;--mj16-turquoise:#0f5f59;
  --mj16-line:#a4caca;--mj16-paper:#fff;--mj16-field-size:46px;
 }
 #view.mj16-admin-only #mj15Dashboard .mj15-body,
 #view.mj16-admin-only #mj15Dashboard .mj13-card,
 #view.mj16-admin-only #mj15Dashboard .surface.panel{
  min-width:0;max-width:100%;box-sizing:border-box
 }
 #view.mj16-admin-only #mj15Dashboard :is(.form-grid,.mj15-form-grid,.mj14-form-grid){
  display:grid!important;grid-template-columns:minmax(0,1fr)!important;
  gap:10px!important;align-items:stretch!important;min-width:0;
 }
 #view.mj16-admin-only #mj15Dashboard :is(.form-grid,.mj15-form-grid,.mj14-form-grid)>:is(label,.wide){
  grid-column:1/-1!important;min-width:0;width:100%;max-width:100%;
 }
 #view.mj16-admin-only #mj15Dashboard :is(.form-grid,.mj15-form-grid,.mj14-request-form,.mj13-card,.mj15-form) label{
  display:grid!important;grid-template-columns:minmax(102px,29%) minmax(0,1fr)!important;
  column-gap:12px!important;row-gap:4px!important;align-items:center!important;
  width:100%!important;max-width:100%!important;min-width:0!important;
  margin:0!important;padding:0!important;box-sizing:border-box!important;
  color:var(--mj16-navy)!important;font-size:13px!important;font-weight:700!important;line-height:1.55!important;
 }
 #view.mj16-admin-only #mj15Dashboard :is(input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]),select,textarea,.manjaz-hijri-trigger){
  display:block;box-sizing:border-box!important;
  width:100%!important;max-width:100%!important;min-width:0!important;
  min-height:var(--mj16-field-size)!important;height:var(--mj16-field-size)!important;
  border:1px solid var(--mj16-line)!important;border-radius:10px!important;
  background:var(--mj16-paper)!important;color:var(--mj16-navy)!important;
  padding:9px 12px!important;text-align:right!important;direction:rtl!important;
  font:500 14px/1.4 Tahoma,"Segoe UI",Arial,sans-serif!important;
  box-shadow:0 1px 4px rgba(11,48,71,.045)!important;
  color-scheme:light;
 }
 #view.mj16-admin-only #mj15Dashboard :is(textarea){
  height:auto!important;min-height:94px!important;resize:vertical!important;
 }
 #view.mj16-admin-only #mj15Dashboard :is(input,select,textarea):focus-visible,
 #view.mj16-admin-only #mj15Dashboard .manjaz-hijri-trigger:focus-visible{
  border-color:var(--mj16-turquoise)!important;outline:2px solid #1d9390!important;
  outline-offset:1px!important;
 }
 #view.mj16-admin-only #mj15Dashboard :is(input,select,textarea):disabled{
  background:#edf5f5!important;color:#4d6570!important;opacity:1!important;
 }
 #view.mj16-admin-only #mj15Dashboard select option{background:#fff;color:var(--mj16-navy)}
 #view.mj16-admin-only #mj15Dashboard :is(.mj15-actions,.section-actions,.form-actions,.mj14-form-actions){
  display:flex!important;flex-wrap:wrap!important;gap:9px!important;
  align-items:center!important;min-width:0!important;
 }
 #view.mj16-admin-only #mj15Dashboard :is(.mj15-actions,.section-actions,.form-actions,.mj14-form-actions) :is(button,a),
 #view.mj16-admin-only #mj15Dashboard .mj13-card>button{
  min-height:46px!important;box-sizing:border-box!important;
  border:1px solid var(--mj16-petrol)!important;border-radius:10px!important;
  padding:9px 14px!important;
  background:var(--mj16-petrol)!important;color:#fff!important;
  font:700 14px/1.45 Tahoma,"Segoe UI",Arial,sans-serif!important;
 }
 #view.mj16-admin-only #mj15Dashboard :is(.mj15-actions,.section-actions,.form-actions,.mj14-form-actions) :is(.secondary,.btn-ghost){
  background:#f5faf9!important;color:var(--mj16-petrol)!important;
 }
 #view.mj16-admin-only #mj15Dashboard :is(.mj13-card h3,.mj15-body h3){color:var(--mj16-navy);line-height:1.5}
 #view.mj16-admin-only #mj15Dashboard .mj15-choice[aria-pressed="true"]{
  background:#e1f2f0!important;color:var(--mj16-petrol)!important;
  border-color:var(--mj16-turquoise)!important;
 }
 #view.mj16-admin-only #mj15Dashboard .mj15-choice{
  border-color:var(--mj16-line);color:var(--mj16-navy);
 }
 #view.mj16-admin-only #mj15Dashboard :is(.mj15-record button,.mj15-choice,.mj13-admin-link){
  box-sizing:border-box;min-height:46px;border-radius:10px;
  font:700 13px/1.4 Tahoma,"Segoe UI",Arial,sans-serif;
 }
 #view.mj16-admin-only #mj15Dashboard .mj15-record button{
  border:1px solid var(--mj16-line);background:#f5faf9;color:var(--mj16-petrol);
 }
 #view.mj16-admin-only #mj15Dashboard .mj13-card>label{display:grid!important}
 #view.mj16-admin-only #mj15Dashboard .mj13-card :is(select,.manjaz-hijri-trigger){flex:1;max-width:100%}
 #view.mj16-admin-only #mj15Dashboard .mj13-card :is(p,h3){width:100%;box-sizing:border-box}
 /* Explicit beneficiary preview, with full official certificate inside a fitted viewport. */
 #view.mj16-admin-only #mj15Dashboard .mj16-preview-control{
  display:flex;align-items:center;justify-content:space-between;gap:10px;
  flex-wrap:wrap;min-width:0;color:var(--mj16-navy);
 }
 #view.mj16-admin-only #mj15Dashboard .mj16-preview-control button{
  min-height:46px;border:1px solid var(--mj16-turquoise);border-radius:10px;
  background:var(--mj16-petrol);color:#fff;padding:10px 16px;
  font:700 14px Tahoma,Arial,sans-serif;cursor:pointer;
 }
 .mj16-certificate-dialog{
  direction:rtl;box-sizing:border-box;width:min(96vw,1200px);max-width:96vw;
  max-height:95dvh;overflow:auto;border:1px solid #a4caca;border-radius:15px;
  background:#f3f8f8;color:#0b3047;padding:12px;
  box-shadow:0 12px 48px rgba(8,38,56,.2)
 }
 .mj16-certificate-dialog::backdrop{background:rgba(4,29,43,.72)}
 .mj16-certificate-dialog .mj16-dialog-header{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px}
 .mj16-certificate-dialog .mj16-dialog-header strong{font-size:15px}
 .mj16-certificate-dialog .mj16-dialog-close{border:1px solid #0b5960;background:#fff;border-radius:8px;min-height:42px;padding:8px 12px;color:#0b5960;cursor:pointer;font:700 14px Tahoma,Arial,sans-serif}
 .mj16-certificate-dialog .mj15-preview{margin:0;padding:8px;max-width:100%;overflow:hidden}
 .mj16-certificate-dialog .mj15-paper-frame{width:100%;overflow:hidden}
 .mj16-certificate-dialog .mj15-paper.certificate-paper{position:absolute!important;inset:0 0 auto auto;width:1123px!important;min-width:1123px!important;height:794px!important;max-width:none!important;min-height:794px!important;transform:scale(var(--mj15-scale,.3));transform-origin:top right}
 .mj16-certificate-dialog p{font-size:12px;color:#37525a;margin:8px 2px}
 @media(max-width:650px){
  #view.mj16-admin-only #mj15Dashboard :is(.mj15-actions,.section-actions,.form-actions,.mj14-form-actions)>:is(button,a){flex:1 1 145px}
  #view.mj16-admin-only #mj15Dashboard :is(.form-grid,.mj15-form-grid)>label{grid-column:1/-1!important}
  #view.mj16-admin-only #mj15Dashboard :is(.form-grid,.mj15-form-grid,.mj14-request-form,.mj13-card,.mj15-form) label{
   grid-template-columns:minmax(88px,32%) minmax(0,1fr)!important;gap:8px!important;font-size:12px!important;
  }
  .mj16-certificate-dialog{padding:7px;max-height:95dvh}
  .mj16-certificate-dialog .mj15-preview{padding:4px}
 }
 `;document.head.appendChild(el)}
function certData(form){const f=new FormData(form);return Object.fromEntries([...f.entries()].map(([k,v])=>[k,String(v).trim()]));}
function certHTML(cat,d={},watermark=true){
 const t=T(cat),exec=t[2]==='تنفيذ',type=d.executionType||'برنامج',date=d.date?hijri(d.date):'التاريخ الهجري';
 const who=cat==='thanks_student'?'الطالبة':cat==='parents'?'ولي الأمر':cat.endsWith('_staff')?'الموظفة الإدارية':'المعلمة';
 const title=exec?'شهادة تنفيذ':'شهادة شكر وتقدير';
 const activity=exec?`${H(type)} «${H(d.title||'عنوان التنفيذ')}»`:H(d.title||'عنوان التكريم');
 const testimony=exec?`تشهد الثانوية الرابعة والتسعون - مسارات بأن ${who}`:`تتقدم الثانوية الرابعة والتسعون - مسارات بخالص الشكر والتقدير إلى ${who}`;
 const body=exec?`قد ${who==='المعلمة'||who==='الموظفة الإدارية'?'نفذت':'نفذ'} ${H(type)} بعنوان «${H(d.title||'عنوان التنفيذ')}» بتاريخ ${H(date)}${d.duration?`، بواقع ${H(d.duration)}`:''}. ${H(d.description||'وصف الإنجاز')}`:`تقديرًا ${H(d.description||'سبب الشكر والتقدير')}، ضمن «${H(d.title||'عنوان الإنجاز')}» بتاريخ ${H(date)}${d.duration?`، بواقع ${H(d.duration)}`:''}`;
 const descLen=String(d.description||'').length, titleLen=String(d.title||'').length, nameLen=String(d.name||'').length;
 const fitStyle=`--mj15-text-size:${descLen>360?'12':descLen>260?'14':descLen>160?'16':'18'}px;--mj15-title-size:${titleLen>65?'19':'25'}px;--mj15-name-size:${nameLen>48?'25':'34'}px;`;
 return `<div class="certificate-paper cert-final mj15-paper ${watermark?'mj15-watermark':''}" style="background-image:url('manjaz-certificate-background.png');${fitStyle}" aria-label="معاينة شهادة ${H(title)}">
 <header class="cert-final-header"><div class="cert-final-org"><strong>وزارة التعليم</strong><span>إدارة تعليم جدة</span><span>الثانوية الرابعة والتسعون - مسارات</span></div><div class="cert-final-ministry"><img src="ministry-logo.png" alt="شعار وزارة التعليم"></div><div class="cert-final-manjaz"><img src="manjaz-logo.png" alt="شعار منجز"></div></header>
 <main class="cert-final-main"><div class="cert-final-title">${title}</div><div class="cert-final-workshop">${activity}</div><div class="cert-final-testimony">${testimony}</div><div class="cert-final-name">${H(d.name||'اسم المستفيدة')}</div><div class="cert-final-attendance">${body}</div><div class="cert-final-wish">${exec?'متمنين لها دوام التوفيق ومزيدًا من التميز والعطاء':'سائلين الله لها دوام التوفيق ومزيدًا من التميز والعطاء'}</div></main>
 <footer class="cert-final-footer"><div class="cert-final-principal"><strong>مديرة المدرسة</strong><span>زينب ناصر علي حكمي</span></div><div class="cert-final-stamp"><img src="official-school-stamp.png" alt="الختم الرسمي للمدرسة"></div></footer>${watermark?'<div class="mj16-watermark-layer" aria-hidden="true">منجز</div>':''}</div>`;
}
function formHTML(cat,values={},admin=false,readonly=false){const t=T(cat),exec=t[2]==='تنفيذ';const v=k=>H(values[k]||'');return `<form class="mj15-form" data-mj15-form="${admin?'admin':'public'}">
 <div class="mj15-form-grid"><label class="wide">${H(t[3])} *<input name="name" required minlength="2" maxlength="160" value="${v('name')}" ${readonly?'disabled':''}></label>
 <label class="wide">${H(t[4])} *<input name="title" required minlength="2" maxlength="220" value="${v('title')}" ${readonly?'disabled':''}></label>
 ${exec?`<label class="wide">نوع التنفيذ <select name="executionType" ${readonly?'disabled':''}>${['ورشة تدريبية','درس تطبيقي','برنامج','مبادرة','دورة','لقاء','فعالية','أخرى'].map(x=>`<option ${values.executionType===x?'selected':''}>${x}</option>`).join('')}</select></label>`:''}
 <label class="wide">${H(t[5])} *<textarea name="description" minlength="2" maxlength="1200" required ${readonly?'disabled':''}>${v('description')}</textarea></label>
 <label>التاريخ الهجري *<input name="date" type="date" value="${v('date')}" required ${readonly?'disabled':''}></label>
 <label>المدة (إن وجدت)<input name="duration" maxlength="150" value="${v('duration')}" ${readonly?'disabled':''}></label>
 <label class="wide">البريد الإلكتروني لاستلام الشهادة *<input name="email" type="email" required maxlength="254" autocomplete="email" value="${v('email')}" ${readonly?'disabled':''}></label>
 </div>
 <div class="mj16-preview-control"><strong>معاينة الشهادة للمستفيدة</strong><button type="button" data-mj16-preview-open aria-label="معاينة الشهادة كاملة بالقالب الرسمي وعلامة منجز">◉ معاينة الشهادة كاملة</button></div>
 <div class="mj15-preview" data-mj15-preview="1" aria-label="معاينة الشهادة الرسمية مع علامة منجز"><div class="mj15-paper-frame">${certHTML(cat,values,true)}</div></div>
 <p class="mj15-note">المعاينة بالقالب الرسمي وبعلامة مائية «منجز». لا يمكن إصدار أو تنزيل شهادة رسمية من حساب المستفيدة.</p>
 ${admin?`<p class="mj15-note">حفظ أي تعديل إداري يلغي الاعتماد السابق، ويلزم إعادة الاعتماد قبل الإصدار.</p><div class="mj15-actions"><button type="submit">حفظ التعديل الإداري</button>${values._status==='معتمد'?'':'<button type="button" class="secondary" data-mj15-approve>اعتماد الطلب</button>'}</div>`:
 `<div class="mj15-actions"><button type="submit" ${readonly?'disabled':''}>${state.requestId?'حفظ التعديل':'إرسال طلب إصدار الشهادة'}</button><button type="button" class="secondary" data-mj15-edit ${!readonly?'disabled':''}>✎ تعديل</button><button type="button" class="secondary" data-mj15-new>+ طلب جديد</button></div>`}
 <div class="mj15-status" role="status" data-mj15-status></div></form>`;
}
function publicMarkup(){const t=T(state.category),r=ownCurrent(),vals=r?.fields||{};return `<div class="mj15-choices" role="group" aria-label="اختيار فئة الشهادة">${TYPES.map(x=>`<button class="mj15-choice" data-mj15-cat="${x[0]}" aria-pressed="${x[0]===state.category}">${H(x[1])}</button>`).join('')}</div><h3 style="margin:8px 0">${H(t[1])}</h3><p class="mj15-note">المعاينة كاملة بالقالب الرسمي وعلامة مائية «منجز». لا يحق للمستفيدة إصدار شهادة رسمية.</p><div id="mj15PublicForm">${formHTML(state.category,vals,false,!!r)}</div><div class="mj15-records">${own().filter(r=>r.category===state.category).map(r=>`<div class="mj15-record"><span>${H(r.fields?.name||'')} — ${H(r.fields?.title||'')}</span><button data-mj15-own="${H(r.id)}">فتح وتعديل</button></div>`).join('')}</div>`}
function fitPreviews(){
 // Fit the unchanged 1123x794 official paper to every viewport, including open mobile dialogs.
 document.querySelectorAll('.mj15-preview .mj15-paper-frame').forEach(frame=>{
  const paper=frame.querySelector('.mj15-paper');
  if(!paper)return;
  const width=Math.max(0,frame.getBoundingClientRect().width);
  if(width<1)return;
  const scale=Math.min(1,width/1123);
  frame.style.height=Math.ceil(794*scale)+'px';
  paper.style.setProperty('--mj15-scale',String(scale));
  paper.style.transformOrigin='top right';
 });
}
function uiField(root){const f=root.closest('form');if(!f)return;const cat=f.dataset.category||state.category;const content=certHTML(cat,certData(f),true);const preview=f.querySelector('[data-mj15-preview]');if(preview){preview.querySelector('.mj15-paper-frame').innerHTML=content;fitPreviews()}
 const dialog=document.getElementById('mj16CertificatePreviewDialog');if(dialog?.open&&dialog._sourceForm===f){const target=dialog.querySelector('.mj15-paper-frame');if(target){target.innerHTML=content;fitPreviews()}}
}
function openBeneficiaryPreview(button){const form=button.closest('form[data-mj15-form]');if(!form)return;
 let dialog=document.getElementById('mj16CertificatePreviewDialog');
 if(!dialog){dialog=document.createElement('dialog');dialog.id='mj16CertificatePreviewDialog';dialog.className='mj16-certificate-dialog';dialog.innerHTML=`<div class="mj16-dialog-header"><strong>معاينة الشهادة كاملة – علامة مائية «منجز»</strong><button type="button" class="mj16-dialog-close" data-mj16-close aria-label="إغلاق معاينة الشهادة">إغلاق ×</button></div><div class="mj15-preview"><div class="mj15-paper-frame"></div></div><p>هذه نسخة للمعاينة فقط. الإصدار الرسمي متاح للإدارة بعد الاعتماد.</p>`;document.body.appendChild(dialog);
 dialog.addEventListener('click',e=>{if(e.target.closest('[data-mj16-close]'))dialog.close()});
 dialog.addEventListener('close',()=>{dialog._sourceForm=null});}
 dialog._sourceForm=form;
 dialog.querySelector('.mj15-paper-frame').innerHTML=certHTML(form.dataset.category||state.category,certData(form),true);
 dialog.showModal();fitPreviews();
 requestAnimationFrame(()=>{fitPreviews();requestAnimationFrame(fitPreviews)});
 // Watch width changes from fonts, orientation and responsive panels, not only window resize.
 if(!dialog._mj17ResizeObserver && typeof ResizeObserver==='function'){
  dialog._mj17ResizeObserver=new ResizeObserver(()=>{if(dialog.open)requestAnimationFrame(fitPreviews)});
  dialog._mj17ResizeObserver.observe(dialog.querySelector('.mj15-preview'));
 }

}

function token(){let s;try{s=JSON.parse(sessionStorage.getItem(SK)||'null')}catch(_){s=null};if(!s?.access_token)throw Error('يجب تسجيل الدخول من «الصلاحيات الإدارية» أولًا.');if(s.expires_at&&Number(s.expires_at)<Date.now()/1000)throw Error('انتهت الجلسة الإدارية؛ سجّلي الدخول مرة أخرى.');return s.access_token}
async function verifiedToken(){let b=token();const r=await fetch(BASE+'/auth/v1/user',{headers:{apikey:KEY,Authorization:'Bearer '+b},cache:'no-store'});if(!r.ok)throw Error('تعذر التحقق من الحساب الإداري.');const u=await r.json();if(String(u.email||'').toLowerCase()!=='munjz.s94@hotmail.com')throw Error('هذا الحساب غير مخوّل لإدارة طلبات الشهادات.');return b}
async function rpc(name,body,bearer=null){const resp=await fetch(`${BASE}/rest/v1/rpc/${name}`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${bearer||KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!resp.ok){const err=await resp.json().catch(()=>({}));throw Error(err.message||`تعذر الحفظ (${resp.status}).`)}return resp.json().catch(()=>null)}
function getValues(r){return {name:r.name||'',title:r.title||'',description:r.short_description||'',date:r.date_iso||'',duration:r.duration||'',email:r.recipient_email||'',executionType:r.execution_type||''}}
async function submitPublic(form){if(!form.reportValidity())return;let b=form.querySelector('button[type="submit"]'),m=form.querySelector('[data-mj15-status]');const values=certData(form),rec=ownCurrent(),id=rec?.id||null,k=rec?.editToken||rand();b.disabled=true;m.textContent='جارٍ تسجيل الطلب...';try{const out=await rpc('manjaz_certificate_request_save_v15',{p_category:state.category,p_name:values.name,p_title:values.title,p_description:values.description,p_date_iso:values.date,p_date_display:hijri(values.date),p_duration:values.duration||'',p_edit_token:k,p_request_id:id,p_email:values.email,p_execution_type:values.executionType||''});const saved=Array.isArray(out)?out[0]:out;if(!saved?.request_id)throw Error('لم تؤكد قاعدة البيانات الحفظ.');const row={id:saved.request_id,category:state.category,editToken:k,fields:values,updatedAt:saved.saved_at};store(row);state.requestId=row.id;const place=document.getElementById('mj15PublicArea');if(place){place.innerHTML=publicMarkup();place.querySelector('[data-mj15-status]').textContent=id?'تم حفظ التعديل.':'تم تسجيل الطلب وإرساله للمراجعة. لن تصدر الشهادة إلا بعد موافقة الإدارة.';window.ManjazHijriPicker?.refresh?.();}}
 catch(e){m.textContent=e.message}finally{if(b.isConnected)b.disabled=false}}
async function fetchAll(){const auth=await verifiedToken(),all=[];for(let offset=0;offset<100000;offset+=500){const search=new URLSearchParams({select:'id,category,name,title,short_description,date_iso,display_date,duration,recipient_email,execution_type,status,created_at,approved_at,issued_at,email_sent_at,email_error',order:'created_at.desc',limit:'500',offset:String(offset)});const r=await fetch(`${BASE}/rest/v1/manjaz_certificate_requests?${search}`,{headers:{apikey:KEY,Authorization:'Bearer '+auth},cache:'no-store'});if(!r.ok)throw Error(`تعذر تحميل الطلبات (${r.status}).`);const part=await r.json();all.push(...part);if(part.length<500)break}state.adminList=all;return all}
function adminSummary(rows){return `${rows.length} طلبًا مسجلًا، منها ${rows.filter(x=>x.status==='مستلم').length} بانتظار الاعتماد و${rows.filter(x=>x.status==='معتمد').length} معتمد للإصدار.`}
function adminListMarkup(mode){const rows=state.adminList.filter(x=>mode==='approve'?x.status==='مستلم'||x.status==='معتمد':x.status==='معتمد'||x.status==='تم الإصدار'||x.status==='تم الإرسال');return `<p class="mj15-hint">${H(adminSummary(state.adminList))}</p>${rows.length?rows.map(x=>`<div class="mj15-record"><span><strong>${H(x.name)}</strong><br><small>${H(T(x.category)[1])} · ${H(x.status)} · ${H(x.title)}${x.email_error?' · البريد: تعذر الإرسال':''}</small></span><button data-mj15-open="${H(x.id)}" data-mj15-mode="${mode}">${mode==='approve'?'مراجعة وتعديل':'معاينة وإصدار'}</button></div>`).join(''):'<p class="mj15-note">لا توجد طلبات في هذا القسم حاليًا.</p>'}`}
function adminSelection(id,mode){const x=state.adminList.find(q=>q.id===id);if(!x)return '';const data=getValues(x);const paper=certHTML(x.category,data,true);return `<div class="mj15-hint"><strong>${H(T(x.category)[1])}</strong> — الحالة: ${H(x.status)}<br>البريد: ${H(x.recipient_email||'غير مسجل')}</div>
 ${mode==='approve' && ['مستلم','معتمد'].includes(x.status)?formHTML(x.category,{...data,_status:x.status},true,false):`<div class="mj15-preview" id="mj15IssuedPreview"><div class="mj15-paper-frame">${paper}</div></div><div class="mj15-actions"><button data-mj15-issue="${H(x.id)}" ${!['معتمد','تم الإصدار'].includes(x.status)?'disabled':''}>${x.status==='معتمد'?'إصدار وإرسال الشهادة':x.status==='تم الإصدار'?'إعادة محاولة الإرسال / تنزيل PDF':x.status==='تم الإرسال'?'تم إصدار الشهادة وإرسالها':'بانتظار اعتماد الطلب'}</button></div><p class="mj15-note">الإصدار متاح للإدارة فقط؛ يرسل PDF تلقائيًا عند اكتمال إعداد خدمة البريد.</p><div class="mj15-status" data-mj15-status></div>`}`;}
function printMessages(id,mode){const area=document.getElementById(mode==='approve'?'mj15ApprovalDetail':'mj15IssueDetail');if(!area)return;const x=state.adminList.find(r=>r.id===id);if(!x)return;state.selected=id;area.dataset.mode=mode;area.dataset.id=id;area.innerHTML=adminSelection(id,mode);area.querySelector('[data-mj15-form]')?.setAttribute('data-category',x.category);window.ManjazHijriPicker?.refresh?.();fitPreviews()}
async function refreshAdmin(){await fetchAll();const a=document.getElementById('mj15ApprovalList'),b=document.getElementById('mj15IssueList');if(a)a.innerHTML=adminListMarkup('approve');if(b)b.innerHTML=adminListMarkup('issue')}
async function adminAction(id,action,fields=null,err=''){const bearer=await verifiedToken();const args={p_request_id:id,p_action:action};if(fields)Object.assign(args,{p_name:fields.name,p_title:fields.title,p_description:fields.description,p_date_iso:fields.date,p_date_display:hijri(fields.date),p_duration:fields.duration||'',p_email:fields.email,p_execution_type:fields.executionType||''});if(err)args.p_error=err;await rpc('manjaz_certificate_admin_action',args,bearer);await refreshAdmin()}
async function previewPdf(paper){const load=(url,key)=>new Promise((resolve,reject)=>{if(window[key])return resolve();const el=document.createElement('script');el.src=url;el.onload=resolve;el.onerror=()=>reject(Error('تعذر تحميل أداة PDF.'));document.head.appendChild(el)});await load('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','html2canvas');await load('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js','jspdf');if(document.fonts?.ready)await document.fonts.ready;await Promise.all([...paper.querySelectorAll('img')].map(img=>new Promise(done=>{if(img.complete)return done();img.addEventListener('load',done,{once:true});img.addEventListener('error',done,{once:true})})));const canvas=await window.html2canvas(paper,{scale:Math.min(5,Math.max(3,3300/Math.max(paper.offsetWidth,1))),useCORS:true,allowTaint:false,backgroundColor:'#ffffff'});const pdf=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});const ratio=Math.min(297/canvas.width,210/canvas.height);const w=canvas.width*ratio,h=canvas.height*ratio;pdf.addImage(canvas.toDataURL('image/png'),'PNG',(297-w)/2,(210-h)/2,w,h);return pdf}
const base64=async blob=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(',')[1]);r.onerror=()=>reject(Error('تعذرت قراءة PDF'));r.readAsDataURL(blob)});
async function issue(id,host){const m=host.querySelector('[data-mj15-status]');const row=state.adminList.find(x=>x.id===id);if(!row||!['معتمد','تم الإصدار'].includes(row.status)){m.textContent='هذه الشهادة غير متاحة للإصدار.';return}const btn=host.querySelector('[data-mj15-issue]');btn.disabled=true;try{
 const auth=await verifiedToken();m.textContent='جارٍ تجهيز الشهادة الرسمية وفق القالب المعتمد...';const hidden=document.createElement('div');hidden.style.cssText='position:fixed;left:-10000px;top:0;width:1060px;z-index:-1;';hidden.innerHTML=certHTML(row.category,getValues(row),false);document.body.appendChild(hidden);
 let pdf;try{await document.fonts?.ready;const main=hidden.querySelector('.cert-final-main');if(main&&main.scrollHeight>main.clientHeight+14)throw Error('نص الشهادة طويل ولا يتسع للقالب الرسمي؛ يلزم اختصار الوصف قبل الإصدار.');pdf=await previewPdf(hidden.firstElementChild)}finally{hidden.remove()}
 await adminAction(id,'issue');pdf.save(`منجز_${T(row.category)[2]}_${row.name}.pdf`);m.textContent='تم إصدار الشهادة وتحميل PDF. جارٍ محاولة إرسال البريد الإلكتروني...';
 try{const body={request_id:id,pdf_base64:await base64(pdf.output('blob'))};const r=await fetch(`${BASE}/functions/v1/manjaz-send-certificate`,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+auth,'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.message||data.error||`خدمة البريد غير جاهزة (${r.status})`);m.textContent=data.already_sent?'تم إرسال هذه الشهادة سابقًا.':'تم إصدار الشهادة وإرسالها إلى البريد المسجل.';await refreshAdmin();}catch(err){m.textContent=`تم إصدار PDF وحفظه بنجاح. لم يُؤكَّد الإرسال بالبريد: ${err.message}. يمكن للإدارة إعادة المحاولة.`;try{await adminAction(id,'send_error',null,String(err.message).slice(0,150))}catch(_){}}
 }catch(e){m.textContent='تعذر إصدار الشهادة: '+e.message}finally{btn.disabled=false}}
function display(){const root=document.getElementById('mj15Dashboard');if(!root)return;const zone=document.getElementById('mj15PublicArea');if(zone && !zone.hasChildNodes())zone.innerHTML=publicMarkup()}
function mount(){const view=document.getElementById('view');if((location.hash||'').slice(1).split('&')[0]!=='admin'){view?.classList.remove('mj16-admin-only');return}const list=document.getElementById('adminList');if(!view||!list)return;CSS();view.classList.add('mj16-admin-only');let dash=document.getElementById('mj15Dashboard');if(!dash){dash=document.createElement('div');dash.id='mj15Dashboard';dash.innerHTML=`
 <details class="mj15-panel"><summary><span class="mj15-number">١</span>طلبات اعتماد المنجزات</summary><div class="mj15-body" id="mj15Achievements"></div></details>
 <details class="mj15-panel" id="mj15Requests"><summary><span class="mj15-number">٢</span>طلبات إصدار الشهادات الجديدة</summary><div class="mj15-body" id="mj15PublicArea"></div></details>
 <details class="mj15-panel" id="mj15Issuance"><summary><span class="mj15-number">٣</span>إصدار الشهادات المعتمدة</summary><div class="mj15-body"><p class="mj15-note">متاح للإدارة فقط؛ الإصدار شهادة واحدة في كل مرة بعد الاعتماد.</p><div class="mj15-actions"><button type="button" data-mj15-refresh>عرض الشهادات المعتمدة</button></div><div class="mj15-status" id="mj15IssueMsg"></div><div id="mj15IssueList"></div><div id="mj15IssueDetail"></div></div></details>
 <details class="mj15-panel"><summary><span class="mj15-number">٤</span>إصدار كشوف مطابقة الحضور</summary><div class="mj15-body" id="mj15Attendance"><p class="mj15-note">قواعد بيانات شهادات الورش والدروس التطبيقية السابقة وملفات Excel الأصلية دون تغيير.</p></div></details>
 <details class="mj15-panel" id="mj15Powers"><summary><span class="mj15-number">٥</span>الصلاحيات الإدارية</summary><div class="mj15-body"><p class="mj15-hint">الأدوات التالية محمية بتسجيل الدخول الإداري.</p><a class="mj13-admin-link" href="#admin-permissions">الدخول إلى الصلاحيات الإدارية وأدوات الشهادات السابقة</a><div id="mj15ReservePowers"><h3>إصدار كشوف إحصائيات الاحتياط اليومي</h3></div><div id="mj15CertificatePowers"><h3>اعتماد طلبات الشهادات</h3><div class="mj15-actions"><button type="button" data-mj15-refresh>عرض طلبات الاعتماد</button></div><div class="mj15-status" id="mj15ApproveMsg"></div><div id="mj15ApprovalList"></div><div id="mj15ApprovalDetail"></div></div></div></details>`;const intro=view.querySelector('.page-intro');if(intro)intro.after(dash);else view.prepend(dash);}
 const stats=view.querySelector('.stat-grid'),adminPanel=list.closest('.surface.panel')||list.parentElement;const achieve=document.getElementById('mj15Achievements');if(stats&&stats.parentElement!==achieve)achieve.appendChild(stats);if(adminPanel&&adminPanel.parentElement!==achieve)achieve.appendChild(adminPanel);
 const attend=document.getElementById('mj15Attendance');for(const id of ['workshopAuditPanel','lessonAuditPanel']){const e=document.getElementById(id);if(e&&e.parentElement!==attend)attend.appendChild(e)}
 const cards=document.getElementById('mj13ExportCards');if(cards){const reserve=cards.querySelector('#mj13ReserveDownload')?.closest('.mj13-card');const exports=cards.querySelector('#mj13CertificateDownload')?.closest('.mj13-card');const power=document.getElementById('mj15ReservePowers'),certPower=document.getElementById('mj15CertificatePowers');if(reserve&&reserve.parentElement!==power)power.appendChild(reserve);if(exports&&exports.parentElement!==certPower)certPower.appendChild(exports);cards.style.display='none';if(cards.parentElement!==power)power.appendChild(cards)}
 display();fitPreviews();const reqid=urlParam('cert_request_id');if(reqid&&/^[0-9a-f-]{36}$/.test(reqid)&&!state.selected){state.selected=reqid;document.getElementById('mj15Powers').open=true;const panel=document.getElementById('mj15Requests');panel.open=true;fetchAll().then(()=>{refreshAdmin();const mode=urlParam('cert_action')==='issue'?'issue':'approve';printMessages(reqid,mode);const el=document.getElementById(mode==='issue'?'mj15Issuance':'mj15Powers');el.open=true}).catch(()=>{});}}
let observing=false;
function boot(){const view=document.getElementById('view');if(!view)return;const ob=new MutationObserver(()=>{if(observing)return;observing=true;try{mount()}finally{observing=false}});ob.observe(view,{childList:true,subtree:true});mount();addEventListener('hashchange',()=>queueMicrotask(mount));addEventListener('resize',fitPreviews,{passive:true});document.addEventListener('toggle',e=>{if(e.target.matches?.('.mj15-panel')&&e.target.open)requestAnimationFrame(fitPreviews)},true)}
document.addEventListener('click',async e=>{const previewBtn=e.target.closest('[data-mj16-preview-open]');if(previewBtn){openBeneficiaryPreview(previewBtn);return}const cat=e.target.closest('[data-mj15-cat]');if(cat){document.getElementById('mj16CertificatePreviewDialog')?.close();state.category=cat.dataset.mj15Cat;state.requestId='';const z=document.getElementById('mj15PublicArea');if(z){z.innerHTML=publicMarkup();window.ManjazHijriPicker?.refresh?.()}return}
 const v=e.target.closest('[data-mj15-own]');if(v){state.requestId=v.dataset.mj15Own;document.getElementById('mj15PublicArea').innerHTML=publicMarkup();window.ManjazHijriPicker?.refresh?.();fitPreviews();return}
 const edit=e.target.closest('[data-mj15-edit]');if(edit){const x=ownCurrent();if(x){document.getElementById('mj15PublicForm').innerHTML=formHTML(state.category,x.fields,false,false)}else{const box=document.getElementById('mj15PublicForm');if(box)box.innerHTML=formHTML(state.category,{},false,false)}window.ManjazHijriPicker?.refresh?.();fitPreviews();return}
 if(e.target.closest('[data-mj15-new]')){state.requestId='';document.getElementById('mj15PublicArea').innerHTML=publicMarkup();window.ManjazHijriPicker?.refresh?.();fitPreviews();return}
 if(e.target.closest('[data-mj15-refresh]')){const button=e.target;button.disabled=true;const msg=document.getElementById(button.closest('details')?.id==='mj15Issuance'?'mj15IssueMsg':'mj15ApproveMsg');if(msg)msg.textContent='جارٍ التحقق من الصلاحيات وتحميل الطلبات...';try{await refreshAdmin();if(msg)msg.textContent='تم تحديث قائمة الطلبات.'}catch(err){if(msg)msg.textContent=err.message}finally{button.disabled=false}return}
 const open=e.target.closest('[data-mj15-open]');if(open){const mode=open.dataset.mj15Mode;printMessages(open.dataset.mj15Open,mode);return}
 const approve=e.target.closest('[data-mj15-approve]');if(approve){const host=approve.closest('[data-mode="approve"]');if(!host)return;approve.disabled=true;const msg=host.querySelector('[data-mj15-status]');try{await adminAction(host.dataset.id,'approve');msg.textContent='تم اعتماد الطلب؛ أصبح متاحًا في القسم الثالث للإصدار.';host.innerHTML='<p class="mj15-hint">تم الاعتماد. انتقلي إلى القسم الثالث للإصدار.</p>'}catch(err){msg.textContent=err.message}finally{if(approve.isConnected)approve.disabled=false}return}
 const issueBtn=e.target.closest('[data-mj15-issue]');if(issueBtn){const host=issueBtn.closest('[data-mode="issue"]');if(host)issue(issueBtn.dataset.mj15Issue,host);return}
});
document.addEventListener('input',e=>{const form=e.target.closest('form[data-mj15-form]');if(form)uiField(e.target)});
document.addEventListener('change',e=>{const form=e.target.closest('form[data-mj15-form]');if(form)uiField(e.target)});
document.addEventListener('submit',async e=>{const form=e.target.closest('[data-mj15-form]');if(!form)return;e.preventDefault();if(form.dataset.mj15Form==='public')return submitPublic(form);const host=form.closest('[data-mode="approve"]');if(!host||!form.reportValidity())return;const b=form.querySelector('button[type="submit"]'),msg=form.querySelector('[data-mj15-status]');b.disabled=true;try{await adminAction(host.dataset.id,'edit',certData(form));host.innerHTML='<p class="mj15-hint">تم حفظ التعديلات. أعيدي فتح الطلب ثم اعتمديه.</p>'}catch(err){msg.textContent=err.message}finally{b.disabled=false}});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.ManjazTask15={certHTML,types:TYPES};
})();
