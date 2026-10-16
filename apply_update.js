/**
 * Manjaz reserve 3.2 – offline, reviewable patch.
 * Run from an extracted copy of the GitHub repository: node apply_update.js /path/to/repo
 * Does NOT access the network; does NOT touch Supabase or send WhatsApp messages.
 * Original daily-reserve.js, home-v3.js and index.html are copied into backup_before_3_2.
 */
'use strict';
const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'.');
const main=path.join(root,'daily-reserve.js'), home=path.join(root,'home-v3.js'), index=path.join(root,'index.html');
for(const f of [main,home,index])if(!fs.existsSync(f))throw Error('Required repository file missing: '+f);
let s=fs.readFileSync(main,'utf8'),h=fs.readFileSync(home,'utf8'),idx=fs.readFileSync(index,'utf8');
if(!s.includes('function publicWeeklyRows(referenceDate)')||!s.includes('function publicHTML()')||!s.includes('function bindPublic(){')||!s.includes('function manualTeacherLinksHTML(date)'))throw Error('Unexpected reserve source; do not attempt this update');
if(!h.includes('daily-reserve.js?v=3.2'))throw Error('Unexpected home loader. Review manually.');
function replaceOne(old,newer,label){const at=s.indexOf(old);if(at<0)throw Error('Cannot patch '+label);if(s.indexOf(old,at+1)>=0)throw Error('Ambiguous patch '+label);s=s.slice(0,at)+newer+s.slice(at+old.length)}
function replaceSection(start,end,replacement,label){const i=s.indexOf(start),j=s.indexOf(end,i+start.length);if(i<0||j<0)throw Error('Cannot locate '+label);s=s.slice(0,i)+replacement+'\n'+s.slice(j)}
// 1: Only the statistics card, not ranking/candidate logic, includes everyone.
replaceSection('function publicWeeklyRows(referenceDate){','function absencesOn(date)',`function publicWeeklyRows(referenceDate){
  const counts=assignmentCounts(referenceDate);
  const everyone=[...state.teachers,...MANUAL_SUPPORT_STAFF];
  return everyone.sort((a,b)=>clean(a.name).localeCompare(clean(b.name),'ar')).map(t=>({
    teacher:t,count:counts.get(String(t.id))||{week:0,term:0,days:{sun:0,mon:0,tue:0,wed:0,thu:0},dayState:{},maxDaily:0}
  }));
}`, 'All teachers in statistics');
// 2: The distinction stays within the center column, no gold frame or changes to scoring.
replaceOne('<tr><td><strong>${r.rank}</strong></td><td>${esc(r.teacher.name)}', '<tr class="reserve-excellence-ranked-row"><td class="reserve-excellence-rank-cell"><strong>${r.rank}</strong></td><td>${esc(r.teacher.name)}', 'Excellence row');
replaceOne('  .reserve-share-box{',`  #dailyReserveRoot .reserve-excellence .reserve-table tbody tr.reserve-excellence-ranked-row{border-bottom:1px solid #dce8e8!important}
  #dailyReserveRoot .reserve-excellence .reserve-table tbody tr.reserve-excellence-ranked-row:nth-child(even){background:#f6faf9}
  #dailyReserveRoot .reserve-excellence .reserve-table td.reserve-excellence-rank-cell{background:#e7f2f0!important;border:2px solid #21766e!important;color:#0b514b!important;text-align:center;font-weight:900}
  #dailyReserveRoot .reserve-excellence .reserve-table td.reserve-excellence-rank-cell strong{display:inline-block;min-width:28px}
  #dailyReserveRoot .reserve-group-item{border:1px solid #dbe8e7;background:#fafdfc;border-radius:11px;padding:13px;margin:9px 0}
  #dailyReserveRoot .reserve-group-item h4{margin:0 0 8px}
  #dailyReserveRoot .reserve-contact-panel{margin:12px 0;padding:12px;border:1px solid #c8dcd6;border-radius:12px;background:#f7fbfa}
  #dailyReserveRoot .reserve-contact-panel button{margin:4px}
  .reserve-share-box{`, 'Excellence + forms styling');
// 3: One actual teacher/day URL, including the separate capability token of each lesson.
const helper=`
// A group is a delivery unit, never a merged statistic/assignment record.
function reserveTeacherDayGroups(date){
  const buckets=new Map();
  for(const a of dailyPublicationRows(date)){
    if(!a.assignedTeacherId||!a.ackToken)continue;
    const key=String(a.assignedTeacherId)+'|'+a.date;
    if(!buckets.has(key))buckets.set(key,{teacherId:String(a.assignedTeacherId),teacherName:a.assignedTeacherName,date:a.date,assignments:[]});
    buckets.get(key).assignments.push(a);
  }
  return [...buckets.values()].map(group=>({...group,assignments:group.assignments.sort((a,b)=>Number(a.period)-Number(b.period))})).sort((a,b)=>clean(a.teacherName).localeCompare(clean(b.teacherName),'ar'));
}
function reserveCombinedTeacherLink(group){
  const url=new URL(location.pathname,location.origin);
  const tokens=[...new Set(group.assignments.map(a=>String(a.ackToken||'')).filter(Boolean))];
  url.searchParams.set('reserve_ack',tokens.join(','));
  url.hash='daily-reserve';
  return url.toString();
}
function reserveTeacherWhatsAppMessage(group){
  const lessons=group.assignments.map(a=>'الحصة '+a.period+' — '+(a.className||'بدون فصل')).join('\\n');
  return 'السلام عليكم ورحمة الله وبركاته،\\nتحية طيبة،\\nتُشعركم إدارة الثانوية الرابعة والتسعين – مسارات بتكليفكم بحصص الاحتياط ليوم '+dayName(group.date)+' الموافق '+fmtDate(group.date)+'.\\n\\nالمعلمة: '+group.teacherName+'\\nالحصص المسندة:\\n'+lessons+'\\n\\nيرجى فتح النموذج الموحد وتأكيد الاطلاع وكتابة موضوع كل حصة على حدة.\\n'+reserveCombinedTeacherLink(group)+'\\n\\nشاكرين تعاونكم.\\nإدارة الثانوية الرابعة والتسعين – مسارات';
}
// Contacts are uploaded locally by the authorized administrator. Never publish a telephone list in a public repository.
const reserveContacts=new Map();
function reserveNormalizeName(x){return clean(x).replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/\\s+/g,' ')}
function reserveNormalizePhone(x){
  const value=String(x||'').replace(/[^0-9]/g,'');
  if(/^9665\\d{8}$/.test(value))return value;
  if(/^05\\d{8}$/.test(value))return '966'+value.slice(1);
  if(/^5\\d{8}$/.test(value))return '966'+value;
  return '';
}
function reserveCsvRow(line){
  const items=[];let part='',quoted=false;
  for(let i=0;i<line.length;i++){const c=line[i];if(c==='"'){if(quoted&&line[i+1]==='"'){part+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){items.push(part);part=''}else part+=c}
  items.push(part);return items;
}
async function reserveLoadContactsFile(file){
  if(!file)return 0;
  const body=(await file.text()).replace(/^\\uFEFF/,'');
  const rows=body.split(/\\r?\\n/).filter(x=>x.trim()).map(reserveCsvRow);
  if(!rows.length)throw Error('الملف فارغ');
  const columns=rows.shift().map(x=>clean(x).toLowerCase());
  const nameCol=columns.findIndex(x=>['name','الاسم','اسم المعلمة'].includes(x));
  const phoneCol=columns.findIndex(x=>['phone','mobile','الجوال','رقم الجوال'].includes(x));
  if(nameCol<0||phoneCol<0)throw Error('يجب وجود عمودين: name و phone');
  reserveContacts.clear();
  for(const row of rows){
    const phone=reserveNormalizePhone(row[phoneCol]);
    const name=reserveNormalizeName(row[nameCol]);
    if(phone&&name)reserveContacts.set(name,phone);
  }
  return reserveContacts.size;
}
function reserveFindPhone(group){
  const key=reserveNormalizeName(group.teacherName);
  if(reserveContacts.has(key))return reserveContacts.get(key);
  const splitKey=name=>{const parts=name.split(/\s+/).filter(Boolean);return (parts[0]||'')+'|'+(parts[parts.length-1]||'').replace(/^ال/,'')};
  const candidates=[...reserveContacts.entries()].filter(([name])=>name===key||name.startsWith(key+' ')||key.startsWith(name+' ')||(splitKey(name)===splitKey(key)&&splitKey(key).includes('|')));
  return candidates.length===1?candidates[0][1]:''; // Never send to ambiguous names.
}
function reserveContactPanelHTML(date){
  const groups=reserveTeacherDayGroups(date);
  return '<section class="reserve-contact-panel"><strong>إشعارات المعلمات بعد النشر</strong><p class="reserve-public-note">كل معلمة تتلقى نموذجًا واحدًا لجميع حصص اليوم، مع حفظ كل حصة بصورة مستقلة. لا تُرسل الرسائل تلقائيًا من واتساب العادي.</p>'+ 
    '<label>تحميل قائمة الجوالات الخاصة بصيغة CSV (لا تُرفع للخادم): <input class="reserve-contacts-upload" type="file" accept=".csv,text/csv"></label>'+ 
    '<div class="reserve-actions"><button type="button" class="reserve-mini reserve-send-all-prep">إعداد إشعارات الجميع ('+groups.length+')</button></div>'+ 
    '<div class="reserve-contact-status" role="status"></div>'+
    '<div class="reserve-contact-queue"></div>'+ 
    '<div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>المعلمة</th><th>الحصص</th><th>إشعار</th></tr></thead><tbody>'+groups.map(g=>'<tr><td>'+esc(g.teacherName)+'</td><td>'+esc(g.assignments.map(a=>a.period).join('، '))+'</td><td><button type="button" class="reserve-mini reserve-send-teacher" data-teacher-id="'+esc(g.teacherId)+'">إرسال إشعار</button></td></tr>').join('')+'</tbody></table></div></section>';
}
function bindReserveContactPanel(){
  const panel=document.querySelector('.reserve-contact-panel');if(!panel)return;
  const report=text=>{const x=panel.querySelector('.reserve-contact-status');if(x)x.textContent=text};
  panel.querySelector('.reserve-contacts-upload')?.addEventListener('change',async e=>{
    try{report('تم تحميل '+(await reserveLoadContactsFile(e.target.files[0]))+' رقمًا صالحًا. الأرقام محفوظة في الذاكرة المؤقتة لهذه الصفحة فقط.')}catch(err){report(err.message)}
  });
  const deliver=(group)=>{
    const phone=reserveFindPhone(group);
    if(!phone){report('لا يوجد رقم مطابق ومؤكد للمعلمة '+group.teacherName+'. راجعي الملف.');return}
    const url='https://api.whatsapp.com/send?phone='+phone+'&text='+encodeURIComponent(reserveTeacherWhatsAppMessage(group));
    const popup=window.open(url,'_blank','noopener,noreferrer');
    if(!popup)report('قد يمنع المتصفح فتح واتساب؛ يُرجى السماح بالنوافذ المنبثقة.');
    else report('فُتحت رسالة '+group.teacherName+' في واتساب. يجب تأكيد إرسالها داخل التطبيق.');
  };
  panel.querySelectorAll('.reserve-send-teacher').forEach(b=>b.addEventListener('click',()=>{
    const group=reserveTeacherDayGroups(state.currentDate).find(g=>g.teacherId===b.dataset.teacherId);
    if(group)deliver(group);
  }));
  panel.querySelector('.reserve-send-all-prep')?.addEventListener('click',()=>{
    const groups=reserveTeacherDayGroups(state.currentDate);
    const queue=panel.querySelector('.reserve-contact-queue');
    queue.innerHTML='<p class="reserve-public-note">جهزت '+groups.length+' رسالة منفصلة. يُفتح واتساب لكل معلمة على حدة؛ لا يمكن إرسالها كلها بضغطة واحدة دون تكامل WhatsApp Business.</p>'+groups.map(g=>'<button type="button" class="reserve-mini reserve-queue-entry" data-teacher-id="'+esc(g.teacherId)+'">'+esc(g.teacherName)+' ('+g.assignments.length+' حصص)</button>').join('');
    queue.querySelectorAll('.reserve-queue-entry').forEach(btn=>btn.addEventListener('click',()=>{
      const g=groups.find(x=>x.teacherId===btn.dataset.teacherId);
      if(g)deliver(g);
    }));
    report('تم إعداد قائمة الإشعارات؛ لم تُرسل الرسائل بعد.');
  });
}
`;
replaceOne('function manualTeacherLinksHTML(date){',helper+'\nfunction manualTeacherLinksHTML(date){','Grouped notifications helpers');
// Manual links now present one row per teacher/day with one link and no duplicate notification action.
replaceSection('function manualTeacherLinksHTML(date){','function manualAdminHTML(){',`function manualTeacherLinksHTML(date){
  const groups=reserveTeacherDayGroups(date);
  if(!groups.length)return '<div class="empty-inline">بعد اعتماد التكليفات، تظهر روابط نماذج المعلمات.</div>';
  return '<p class="reserve-public-note">رابط واحد لكل معلمة يضم جميع حصصها لهذا اليوم.</p><div class="reserve-table-wrap"><table class="reserve-table"><thead><tr><th>معلمة الاحتياط</th><th>الحصص</th><th>الفصول</th><th>إجراء</th></tr></thead><tbody>'+
    groups.map(g=>'<tr data-manual-action="'+esc(g.assignments[0].id)+'"><td>'+esc(g.teacherName)+'</td><td>'+esc(g.assignments.map(a=>a.period).join('، '))+'</td><td>'+esc(g.assignments.map(a=>a.className).join('، '))+'</td><td><button type="button" class="reserve-mini reserve-manual-open-action">فتح النموذج الموحد</button></td></tr>').join('')+'</tbody></table></div>';
}`, 'Combined manual teacher rows');
// The common notification panel appears in both manual and automatic workspaces.
replaceOne('<div id="reserveManualTeacherLinks">${manualTeacherLinksHTML(date)}</div>','<div id="reserveManualTeacherLinks">${manualTeacherLinksHTML(date)}</div>\n      ${reserveContactPanelHTML(date)}','Manual contact panel');
replaceOne('<div id="reserveAssignmentsAdmin">${adminAssignmentsHTML(assign)}</div>','<div id="reserveAssignmentsAdmin">${adminAssignmentsHTML(assign)}</div>\n      ${reserveContactPanelHTML(date)}','Auto contact panel');
replaceOne('if(state.workspaceCard==="auto"){body.innerHTML=dayAdminHTML();bindDayAdmin();return}', 'if(state.workspaceCard==="auto"){body.innerHTML=dayAdminHTML();bindDayAdmin();bindReserveContactPanel();return}', 'Bind auto contacts');
replaceOne('body.innerHTML=manualAdminHTML();bindManualAdmin();','body.innerHTML=manualAdminHTML();bindManualAdmin();bindReserveContactPanel();','Bind manual contacts');
// Change manual link action to combined URL, preserves old "open form" action.
replaceOne('const url=`${location.origin}${location.pathname}?reserve_ack=${encodeURIComponent(a.ackToken)}#daily-reserve`;','const g=reserveTeacherDayGroups(a.date).find(x=>x.teacherId===String(a.assignedTeacherId));\n    if(!g)return;\n    const url=reserveCombinedTeacherLink(g);','Manual combined URL');
// The auto-assignment action now says "send notification" rather than "copy link".
replaceOne('>نسخ رابط المعلمة</button><button class="reserve-mini reserve-open-ack"','>إرسال إشعار</button><button class="reserve-mini reserve-open-ack"','Notification label');
// Auto action uses currently imported contacts and drafts a proper WhatsApp message.
replaceSection('  document.querySelectorAll(".reserve-copy-ack").forEach(b=>b.onclick=async()=>{','  document.querySelectorAll(".reserve-open-ack").forEach(b=>b.onclick=()=>{',`  document.querySelectorAll('.reserve-copy-ack').forEach(b=>b.onclick=()=>{
    const tr=b.closest('[data-assignment]'),a=state.assignments.find(x=>String(x.id)===String(tr?.dataset.assignment));
    if(!a)return;
    const g=reserveTeacherDayGroups(a.date).find(x=>x.teacherId===String(a.assignedTeacherId));
    if(!g)return;
    const phone=reserveFindPhone(g);
    if(!phone){const msg=byId('reserveDayMsg');if(msg)msg.textContent='حملي قائمة أرقام CSV في لوحة الإشعارات أولًا. يجب مطابقة رقم المعلمة.';return}
    window.open('https://api.whatsapp.com/send?phone='+phone+'&text='+encodeURIComponent(reserveTeacherWhatsAppMessage(g)),'_blank','noopener,noreferrer');
  });`, 'Auto individual notification');
// Reuse one grouped URL when testing a teacher's form.
replaceOne('const url=teacherActionUrl(a);\n    const opened=window.open(url,"_blank");', 'const g=reserveTeacherDayGroups(a.date).find(x=>x.teacherId===String(a.assignedTeacherId));\n    if(!g)return;\n    const url=reserveCombinedTeacherLink(g);\n    const opened=window.open(url,"_blank");','Grouped preview URL');
// 4: A group URL displays all its granted lesson tokens, but each action calls the existing per-lesson RPC.
replaceOne('  const ackToken=new URLSearchParams(location.search).get("reserve_ack")||"";\n  const ack=ackToken?state.assignments.find(x=>x.ackToken===ackToken&&x.published===true):null;',`  const ackTokens=(new URLSearchParams(location.search).get('reserve_ack')||'').split(',').filter(Boolean);
  const ackItems=ackTokens.map(t=>state.assignments.find(x=>x.ackToken===t&&x.published===true&&x.status!=='ملغي')).filter(Boolean);
  const samePerson=ackItems.length===ackTokens.length&&ackItems.every(a=>a.date===ackItems[0].date&&String(a.assignedTeacherId)===String(ackItems[0].assignedTeacherId));
  const ackRows=samePerson?ackItems.slice().sort((a,b)=>Number(a.period)-Number(b.period)):[];`,'Group tokens');
replaceSection('    ${ack?`<section class="reserve-ack reserve-no-print"','    <section class="surface panel reserve-main-toolbar',`    4{ackRows.length?60<section class="reserve-ack reserve-no-print" aria-label="النموذج الموحد لمعلمة الاحتياط">
      <strong>نموذج تكليف الاحتياط الموحد</strong>
      <p>4{esc(ackRows[0].assignedTeacherName)} — 4{esc(dayName(ackRows[0].date))} 4{esc(fmtDate(ackRows[0].date))}</p>
      <p>عدد الحصص: 4{ackRows.length} — لكل حصة تأكيد اطلاع وعنوان موضوع مستقل.</p>
      4{ackRows.map(a=>60<div class="reserve-group-item" data-ack-token="4{esc(a.ackToken)}">
        <h4>الحصة 4{esc(a.period)} — 4{esc(a.className||'—')}</h4>
        4{a.ackAt?60<span class="reserve-status">تم الاطلاع</span>60:60<button type="button" class="btn btn-primary reserve-group-ack">تأكيد الاطلاع</button>60}
        <div><label>موضوع الحصة<input type="text" class="reserve-group-title-input" maxlength="160" value="4{esc(a.activationTitle||'')}" 4{a.ackAt?'':'disabled'}></label>
        <button type="button" class="btn btn-primary reserve-group-title-save" 4{a.ackAt?'':'disabled'}>حفظ الموضوع</button></div>
        <small class="reserve-group-feedback" role="status"></small>
      </div>60).join('')}
    </section>60:''}

`, 'One page with multiple independent lesson actions'.replace('x','x'));
// Ensure $ escapes above are normalized to actual template symbols without the patcher interpreting them.
s=s.replace(/\u00024/g,'$').replace(/\u000260/g,'`');
replaceSection('  const ack=new URLSearchParams(location.search).get("reserve_ack")||"";\n  byId("reserveAckBtn")','function bindLogin(){',`  document.querySelectorAll('.reserve-group-item').forEach(item=>{
    const tok=item.dataset.ackToken,msg=item.querySelector('.reserve-group-feedback');
    item.querySelector('.reserve-group-ack')?.addEventListener('click',async e=>{
      const b=e.currentTarget;b.disabled=true;msg.textContent='جارٍ حفظ الاطلاع...';
      try{await reserveTeacherCloudAction(tok,'ack');await loadAll();msg.textContent='تم الحفظ';b.replaceWith(document.createTextNode('تم الاطلاع'));const input=item.querySelector('.reserve-group-title-input'),btn=item.querySelector('.reserve-group-title-save');input.disabled=false;btn.disabled=false}
      catch(err){console.error(err);msg.textContent='تعذر الحفظ';b.disabled=false}
    });
    item.querySelector('.reserve-group-title-save')?.addEventListener('click',async e=>{
      const title=clean(item.querySelector('.reserve-group-title-input')?.value||'');
      if(title.length<3||title.length>160){msg.textContent='عنوان الموضوع يجب أن يكون من 3 إلى 160 حرفًا';return}
      const b=e.currentTarget;b.disabled=true;msg.textContent='جارٍ الحفظ...';
      try{await reserveTeacherCloudAction(tok,'title',title);msg.textContent='تم الحفظ';await refreshAndRenderPublic()}
      catch(err){console.error(err);msg.textContent='تعذر الحفظ'}finally{b.disabled=false}
    });
  });
}`, 'Bind grouped individual actions');
// A successful HTTP status is not enough when RLS silently affected zero rows.
const weakConfirmation='const rows=await r.json(); return rows?.[0]?{id:String(rows[0].id),...(rows[0].data||{})}:data;';
if(s.split(weakConfirmation).length!==3)throw Error('Unexpected database writer implementation');
s=s.split(weakConfirmation).join('const rows=await r.json();if(!rows?.[0]?.id)throw new Error("لم يؤكد الخادم حفظ السجل");return {id:String(rows[0].id),...(rows[0].data||{})};');
replaceSection('async function deleteKind(kind,id,token){','function loadSession(){',`async function deleteKind(kind,id,token){
  const p=new URLSearchParams({id:'eq.'+id,kind:'eq.'+kind});
  const r=await fetch(RECORDS+'?'+p,{
    method:'DELETE',headers:{...baseHeaders(token),Prefer:'return=representation'}
  });
  if(!r.ok)throw new Error('تعذر الحذف ('+r.status+')');
  const rows=await r.json();
  if(!Array.isArray(rows)||rows.length!==1)throw new Error('لم يؤكد الخادم حذف السجل المطلوب');
}`, 'Verified delete result');
// 5: Explicit success confirmations only after the server acknowledged the operation.
replaceOne('if(done)done.textContent="تم حفظ واعتماد الحصص.', 'if(done)done.textContent="تم الحفظ بنجاح. تم حفظ واعتماد الحصص.', 'Manual success feedback');
replaceOne('after.textContent=generated\n        ?`تم توليد', 'after.textContent=generated\n        ?`تم الحفظ بنجاح. تم توليد', 'Auto success feedback');
replaceOne('byId("reserveDayMsg").textContent=`تم حفظ واعتماد ${saved}', 'byId("reserveDayMsg").textContent=`تم الحفظ بنجاح. تم حفظ واعتماد ${saved}', 'Auto approval feedback');
replaceOne('await deleteKind(K.absence,b.dataset.id,token());await loadAll();renderWorkspaceCard("auto");','await deleteKind(K.absence,b.dataset.id,token());await loadAll();renderWorkspaceCard("auto");byId("reserveDayMsg").textContent="تم الحذف بنجاح.";','Absence delete feedback');
replaceOne('refreshReserveStatisticsViews();renderWorkspaceCard("auto");\n  });\n  // The teacher link', 'refreshReserveStatisticsViews();renderWorkspaceCard("auto");byId("reserveDayMsg").textContent="تم الحذف بنجاح.";\n  });\n  // The teacher link', 'Assignment delete feedback');
// Secure local export; only source files changed, NOT a phone directory or deployed application.
if(!s.includes('reserve-group-title-save')||!s.includes('reserveTeacherDayGroups')||!s.includes('reserve-contact-panel'))throw Error('Verification failed');
try{new Function(s)}catch(err){throw Error('Generated reserve JS invalid: '+err.message)}
h=h.replace('daily-reserve.js?v=3.2','daily-reserve.js?v=3.2.1');
idx=idx.replace('home-v3.js?v=13.7.24','home-v3.js?v=13.7.25');
const backup=path.join(root,'backup_before_3_2');fs.mkdirSync(backup,{recursive:true});
for(const f of [main,home,index])fs.copyFileSync(f,path.join(backup,path.basename(f)));
fs.writeFileSync(main,s);fs.writeFileSync(home,h);fs.writeFileSync(index,idx);
console.log('Prepared local 3.2.1 patch. Backups:',backup,'/ Changes not published.');
