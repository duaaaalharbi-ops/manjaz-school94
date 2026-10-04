window.MANJAZ_COMMUNITY_SECTIONS_VERSION="3.4";
(function(){
"use strict";
const STORE="manjaz_public_section_submissions_v1";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
const read=()=>{try{const x=JSON.parse(localStorage.getItem(STORE)||"[]");return Array.isArray(x)?x:[]}catch{return[]}};
const save=x=>localStorage.setItem(STORE,JSON.stringify(x));
const uid=()=>`m${Date.now()}${Math.random().toString(36).slice(2,7)}`;

function injectFixStyle(){
  if(document.querySelector('link[data-manjaz-34]'))return;
  const l=document.createElement("link");l.rel="stylesheet";l.href="certificate-fixes.css?v=3.4";l.dataset.manjaz34="1";document.head.appendChild(l);
}

const configs={
 workshops:{title:"الورش التدريبية",add:"إضافة ورشة",fields:[['title','اسم الورشة','text'],['implementer','اسم المنفذة / المنفذات','text'],['date','التاريخ','date'],['duration','المدة','text'],['trainingType','نوع التدريب','select','مباشر|عن بعد - متزامن|عن بعد - غير متزامن']]},
 lessons:{title:"الدروس التطبيقية",add:"إضافة درس تطبيقي",fields:[['date','التاريخ','date'],['lessonName','اسم الدرس','text'],['strategies','الاستراتيجيات','text'],['grade','الصف','text'],['teacher','اسم المعلمة','text']]},
 knowledge:{title:"نماذج الإنتاج المعرفي القابلة للتطبيق",add:"إضافة نموذج",fields:[['title','اسم النموذج','text'],['owner','اسم المعدة / الفريق','text'],['date','التاريخ','date'],['description','وصف مختصر','textarea']]},
 programs:{title:"برامج قيد الإنشاء",add:"إضافة برنامج",fields:[['title','اسم البرنامج','text'],['owner','المنفذة / الفريق','text'],['date','تاريخ البدء','date'],['description','وصف مختصر','textarea']]}
};
function fieldHTML(f,value=""){const[n,l,t,opts]=f,v=esc(value);if(t==='select')return `<label>${l} *<select name="${n}" required><option value="">اختاري</option>${opts.split('|').map(x=>`<option ${String(value)===x?'selected':''}>${x}</option>`).join('')}</select></label>`;if(t==='textarea')return `<label class="wide">${l} *<textarea name="${n}" required>${v}</textarea></label>`;return `<label>${l} *<input name="${n}" type="${t}" value="${v}" required></label>`}
function rawBase(kind){if(kind==='lessons')return (window.MANJAZ_APPLIED_LESSONS||[]).map(x=>({...x,status:'معتمد',_base:true}));if(kind==='workshops')return (window.MANJAZ_CERTIFICATE_WORKSHOPS||[]).map(x=>({...x,status:'معتمد',_base:true,implementer:(x.implementers||[]).join('، ')}));return[]}
function items(kind){
 const saved=read(),tomb=new Set(saved.filter(x=>x.kind===kind&&x._deletedBase).map(x=>String(x.id)));
 const overrides=new Map(saved.filter(x=>x.kind===kind&&x._baseOverride).map(x=>[String(x.id),x]));
 const base=rawBase(kind).filter(x=>!tomb.has(String(x.id))).map(x=>overrides.has(String(x.id))?{...x,...overrides.get(String(x.id)),_base:true}:x);
 const added=saved.filter(x=>x.kind===kind&&!x._deletedBase&&!x._baseOverride);
 return [...base,...added];
}
function status(x){return x.status||'تحت المراجعة'}
function details(x,kind){return configs[kind].fields.map(([n,l])=>x[n]?`<div><b>${esc(l)}:</b> ${esc(x[n])}</div>`:'').join('')}
function openDetail(x,kind){let o=document.getElementById('communityDetail');if(!o){o=document.createElement('div');o.id='communityDetail';o.style.cssText='position:fixed;inset:0;z-index:99998;background:#0008;display:none;padding:24px;overflow:auto;direction:rtl';document.body.appendChild(o)}o.innerHTML=`<div class="surface panel" style="max-width:760px;margin:5vh auto"><div class="panel-head"><h3>${esc(x.title||x.lessonName||'التفاصيل')}</h3><button class="btn btn-ghost" id="communityClose">إغلاق</button></div><div style="display:grid;gap:12px">${details(x,kind)}<div><b>الحالة:</b> ${esc(status(x))}</div></div></div>`;o.style.display='block';o.querySelector('#communityClose').onclick=()=>o.style.display='none'}

function editRecord(x,kind){
 let o=document.getElementById("communityEditOverlay");if(!o){o=document.createElement("div");o.id="communityEditOverlay";o.className="community-edit-overlay";document.body.appendChild(o)}
 o.innerHTML=`<div class="community-edit-panel"><div class="panel-head"><h3>تعديل ${esc(configs[kind].title)}</h3><button type="button" class="btn btn-ghost c-edit-close">إغلاق</button></div><form id="communityEditForm"><div class="form-grid">${configs[kind].fields.map(f=>fieldHTML(f,x[f[0]]||"")).join("")}</div><div class="form-actions"><button class="btn btn-primary" type="submit">حفظ التعديلات</button><button class="btn btn-ghost c-edit-cancel" type="button">إلغاء</button></div></form></div>`;
 o.classList.add("open");const close=()=>o.classList.remove("open");o.querySelector(".c-edit-close").onclick=close;o.querySelector(".c-edit-cancel").onclick=close;
 o.querySelector("#communityEditForm").onsubmit=e=>{e.preventDefault();const fd=new FormData(e.currentTarget),all=read();let rec;
   if(x._base){rec=all.find(y=>y.kind===kind&&y._baseOverride&&String(y.id)===String(x.id));if(!rec){rec={id:x.id,kind,_baseOverride:true,status:x.status||"معتمد"};all.push(rec)}}
   else rec=all.find(y=>y.kind===kind&&!y._deletedBase&&String(y.id)===String(x.id));
   if(!rec)return;configs[kind].fields.forEach(([n])=>rec[n]=String(fd.get(n)||"").trim());
   if(kind==="workshops"){rec.implementers=rec.implementer.split(/[،,]/).map(s=>s.trim()).filter(Boolean);rec.durationText=rec.duration;rec.availability="available"}
   save(all);mergeApproved();close();wire(kind);
 };
}
function deleteRecord(x,kind){
 const title=x.lessonName||x.title||"البطاقة";if(!confirm(`هل أنتِ متأكدة من حذف «${title}»؟\nلا يمكن التراجع عن الحذف`))return;
 const all=read();
 if(x._base){const filtered=all.filter(y=>!(y.kind===kind&&y._baseOverride&&String(y.id)===String(x.id)));filtered.push({id:x.id,kind,_deletedBase:true});save(filtered)}
 else save(all.filter(y=>!(y.kind===kind&&String(y.id)===String(x.id))));
 mergeApproved();wire(kind);
}
function card(x,kind){const title=x.lessonName||x.title||'بدون عنوان',approved=status(x)==='معتمد';const cert=kind==='lessons'&&approved?`<button class="btn btn-primary c-cert">إصدار شهادة حضور</button>`:'';return `<article class="achievement-card community-card" data-id="${esc(x.id)}"><span class="badge">${esc(status(x))}</span><h3>${esc(title)}</h3><div class="meta">${details(x,kind)}</div><div class="form-actions"><button class="btn btn-ghost c-view">استعراض المنجز</button>${cert}</div><div class="community-manage-actions"><button class="btn c-edit" type="button">تعديل</button><button class="btn c-delete" type="button">حذف</button></div></article>`}
function page(kind){const c=configs[kind],arr=items(kind);return `<section class="page-intro"><div><span class="kicker">منجز</span><h2>${c.title}</h2><p>الاستعراض والإضافة متاحان من خلال القسم، وتُرسل الإضافات الجديدة للمراجعة قبل اعتمادها</p></div></section><div class="section-actions"><button class="btn btn-primary" id="communityAdd">${c.add}</button></div><form id="communityForm" class="surface form-card hidden-form"><div class="form-section-title">${c.add}</div><div class="form-grid">${c.fields.map(fieldHTML).join('')}</div><div class="form-actions"><button class="btn btn-primary" type="submit">إرسال للمراجعة</button><button class="btn btn-ghost" type="button" id="communityCancel">إلغاء</button></div><div id="communityMsg"></div></form><div id="communityList" class="achievement-list">${arr.map(x=>card(x,kind)).join('')}</div>${arr.length?'':'<div class="surface empty-state"><h3>لا توجد إضافات حتى الآن</h3></div>'}`}
function wire(kind){const view=document.getElementById('view');if(!view)return;view.innerHTML=page(kind);const form=document.getElementById('communityForm');document.getElementById('communityAdd').onclick=()=>form.style.display='block';document.getElementById('communityCancel').onclick=()=>form.style.display='none';form.onsubmit=e=>{e.preventDefault();const fd=new FormData(form),x={id:uid(),kind,status:'تحت المراجعة',createdAt:new Date().toISOString()};configs[kind].fields.forEach(([n])=>x[n]=String(fd.get(n)||'').trim());if(kind==='workshops'){x.implementers=x.implementer.split(/[،,]/).map(s=>s.trim()).filter(Boolean);x.durationText=x.duration;x.availability='available'}const all=read();all.push(x);save(all);document.getElementById('communityMsg').innerHTML='<strong>تم إرسال الإضافة للمراجعة بنجاح</strong>';setTimeout(()=>wire(kind),500)};
 view.querySelectorAll('.community-card').forEach(el=>{const x=items(kind).find(y=>String(y.id)===el.dataset.id);el.querySelector('.c-view').onclick=()=>openDetail(x,kind);el.querySelector('.c-edit').onclick=()=>editRecord(x,kind);el.querySelector('.c-delete').onclick=()=>deleteRecord(x,kind);el.querySelector('.c-cert')?.addEventListener('click',()=>window.openAppliedLessonCertificate?.(x))})}
function mergeApproved(){const subs=read().filter(x=>x.status==='معتمد'&&!x._deletedBase);const wa=window.MANJAZ_CERTIFICATE_WORKSHOPS||(window.MANJAZ_CERTIFICATE_WORKSHOPS=[]);subs.filter(x=>x.kind==='workshops'&&!x._baseOverride).forEach(x=>{if(!wa.some(y=>String(y.id)===String(x.id)))wa.push(x)});const la=window.MANJAZ_APPLIED_LESSONS||(window.MANJAZ_APPLIED_LESSONS=[]);subs.filter(x=>x.kind==='lessons'&&!x._baseOverride).forEach(x=>{if(!la.some(y=>String(y.id)===String(x.id)))la.push(x)})}
function enhanceAdmin(){if((location.hash||'').slice(1)!=='admin')return;const view=document.getElementById('view');if(!view||view.querySelector('#communityAdmin'))return;const pending=read().filter(x=>x.status==='تحت المراجعة'&&!x._deletedBase&&!x._baseOverride);const sec=document.createElement('section');sec.id='communityAdmin';sec.className='surface panel';sec.style.marginTop='18px';sec.innerHTML=`<div class="panel-head"><h3>طلبات الأقسام الجديدة</h3><span>${pending.length} تحت المراجعة</span></div><div class="admin-list">${pending.map(x=>`<article class="achievement-card" data-id="${esc(x.id)}"><span class="badge">${esc(configs[x.kind]?.title||x.kind)}</span><h3>${esc(x.lessonName||x.title||'إضافة جديدة')}</h3><div class="meta">${details(x,x.kind)}</div><button class="btn btn-primary approve-community">اعتماد</button></article>`).join('')||'<div class="empty-inline">لا توجد طلبات جديدة</div>'}</div>`;view.appendChild(sec);sec.querySelectorAll('.approve-community').forEach(b=>b.onclick=()=>{const el=b.closest('[data-id]'),all=read(),x=all.find(y=>String(y.id)===el.dataset.id);if(x)x.status='معتمد';save(all);mergeApproved();enhanceAdminRefresh()})}
function enhanceAdminRefresh(){document.getElementById('communityAdmin')?.remove();enhanceAdmin()}
function route(){mergeApproved();const r=(location.hash||'#home').slice(1);if(configs[r]){setTimeout(()=>wire(r),0);return}if(r==='admin')setTimeout(enhanceAdmin,80)}
let t;new MutationObserver(()=>{clearTimeout(t);t=setTimeout(()=>{const r=(location.hash||'#home').slice(1);if(configs[r]&&!document.getElementById('communityForm'))wire(r);if(r==='admin')enhanceAdmin()},60)}).observe(document.getElementById('view'),{childList:true,subtree:true});
injectFixStyle();window.addEventListener('hashchange',route);mergeApproved();route();
})();
