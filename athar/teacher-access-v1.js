
/* Athar teacher self-service, isolated to "إدارة الملفات". No public view edits. */
(function(){
"use strict";
var bridge=window.ATHAR_ACCESS_BRIDGE;
var gate=document.getElementById("authGate"),adminTools=document.getElementById("adminTools");
var host=document.querySelector("#adminView .admin-content");
if(!bridge||!gate||!adminTools||!host)return;
var client=bridge.client;
var esc=function(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})};
var $=function(id){return document.getElementById(id)};
var categories={achievements:"المنجزات والممارسات",development:"التطوير المهني",certificates:"الشهادات والتكريمات",evidence:"الأدلة والمرفقات"};
var member=null,user=null,busy=false,queued=false,editing=null,rows=[];
var st=document.createElement("style");
st.textContent=[
"#atharTeacherEntry,#atharTeacherArea .athar-access-panel,#atharAccessAdmin{margin:14px 0;padding:18px;border:1px solid #e3e7df;background:#fffdf8;border-radius:17px;}",
"#atharTeacherEntry h3,#atharTeacherArea h3,#atharAccessAdmin h3{margin:0 0 12px;color:#263b36;font-size:17px}",
"#atharTeacherEntry p,#atharTeacherArea p,#atharAccessAdmin p{font-size:12px;color:#607168;line-height:1.9}",
"#atharTeacherArea .athar-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}",
"#atharTeacherArea .wide{grid-column:1/-1}",
"#atharTeacherArea label,#atharTeacherEntry label{display:flex;flex-direction:column;gap:5px;font-weight:700}",
"#atharTeacherArea input,#atharTeacherArea textarea,#atharTeacherArea select,#atharTeacherEntry input,#atharTeacherArea button{font:inherit}",
"#atharTeacherArea input,#atharTeacherArea textarea,#atharTeacherArea select,#atharTeacherEntry input{width:100%;padding:11px;border:1px solid #cddbd2;border-radius:9px;background:white}",
"#atharTeacherArea textarea{min-height:84px}",
"#atharTeacherArea .athar-actions,#atharAccessAdmin .athar-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}",
"#atharTeacherArea .athar-record,#atharAccessAdmin .athar-record{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 0;border-bottom:1px solid #e4e8df}",
"#atharTeacherArea .athar-record small,#atharAccessAdmin .athar-record small{display:block;color:#718078;font-size:11px}",
"#atharTeacherArea .athar-msg,#atharAccessAdmin .athar-msg,#atharTeacherEntry .athar-msg{min-height:20px;font-size:12px;font-weight:700}",
"@media(max-width:650px){#atharTeacherArea .athar-grid{grid-template-columns:1fr}#atharTeacherArea .wide{grid-column:auto}#atharTeacherEntry,#atharTeacherArea .athar-access-panel,#atharAccessAdmin{padding:13px}}"
].join("");
document.head.appendChild(st);
var entry=document.createElement("section");
entry.id="atharTeacherEntry";entry.innerHTML=
'<h3>تفعيل حسابي | دخول المعلمة</h3><p>أدخلي بريدك لاستقبال رابط دخول آمن. بعد التحقق تختارين ملفك، وتعتمد الإدارة الربط مرة واحدة فقط.</p>'+
'<form id="atharSignIn"><label>البريد الإلكتروني<input id="atharLoginEmail" type="email" autocomplete="email" required></label>'+
'<div class="athar-actions"><button class="btn primary" type="submit" id="atharEmailSend">إرسال رابط الدخول</button></div>'+
'<p id="atharLoginMsg" class="athar-msg" role="status"></p></form>';
gate.appendChild(entry);
var area=document.createElement("section");area.id="atharTeacherArea";area.hidden=true;host.appendChild(area);
var queue=document.createElement("section");queue.id="atharAccessAdmin";queue.hidden=true;adminTools.appendChild(queue);
var message=function(id,msg,error){var e=$(id);if(e){e.textContent=msg;e.style.color=error?"#a14e49":"#487d64"}};
var failure=function(e){return e&&e.message?e.message:"تعذر إكمال الإجراء"};
var safeUrl=function(v){if(!v)return true;try{return new URL(v).protocol==="https:"}catch(e){return false}};
async function exit(){var r=await client().auth.signOut();if(r.error)alert(failure(r.error));else{user=null;member=null;await refresh()}}
$("atharSignIn").onsubmit=async function(e){
 e.preventDefault();var b=$("atharEmailSend");b.disabled=true;message("atharLoginMsg","جارٍ إرسال رابط التحقق...");
 try{var email=$("atharLoginEmail").value.trim().toLowerCase();var r=await client().auth.signInWithOtp({email:email,options:{shouldCreateUser:true,emailRedirectTo:location.origin+location.pathname}});if(r.error)throw r.error;
 message("atharLoginMsg","تم طلب إرسال رابط التحقق. افتحيه من بريدك، ثم ادخلي إلى إدارة الملفات.");}
 catch(err){message("atharLoginMsg","تعذر إرسال الرابط: "+failure(err),true)}
 finally{b.disabled=false}
};
function outButton(){var b=$("atharSelfLogout");if(b)b.onclick=exit}
function requestUI(){
 var teachers=bridge.teachers().filter(function(t){return t.published}).sort(function(a,b){return a.full_name.localeCompare(b.full_name,"ar")});
 area.innerHTML='<div class="athar-access-panel"><h3>طلب ربط ملف الإنجاز</h3>'+
 '<p>تم التحقق من البريد: '+esc(user.email)+'. اختاري اسمك ثم أرسلي طلب الربط للإدارة.</p>'+
 '<form id="atharRequest"><label>اسم المعلمة<select required id="atharProfileSelect"><option value="">اختاري اسمك</option>'+
 teachers.map(function(t){return '<option value="'+esc(t.id)+'">'+esc(t.full_name)+'</option>'}).join("")+
 '</select></label><div class="athar-actions"><button type="submit" class="btn primary">إرسال الطلب</button>'+
 '<button type="button" class="btn outline" id="atharSelfLogout">خروج</button></div></form>'+
 '<p id="atharRequestMsg" class="athar-msg" role="status"></p></div>';
 outButton();
 $("atharRequest").onsubmit=async function(e){
  e.preventDefault();var b=e.submitter;b.disabled=true;
  try{
   var profile_id=$("atharProfileSelect").value;if(!profile_id)throw Error("اختاري اسمك");
   var result=await client().from("athar_teacher_access").insert({user_id:user.id,profile_id:profile_id,email:user.email.toLowerCase(),status:"pending"}).select("user_id");
   if(result.error)throw result.error;if(!result.data||!result.data.length)throw Error("لم يُسجّل الطلب");
   await refresh();
  }catch(err){message("atharRequestMsg","تعذر تسجيل الطلب: "+failure(err),true)}
  finally{b.disabled=false}
 }
}
function statusUI(){
 var status=member.status;
 var label=status==="pending"?"طلبك بانتظار اعتماد الإدارة":status==="disabled"?"تم إيقاف الحساب":"لم تتم الموافقة على الطلب";
 area.innerHTML='<div class="athar-access-panel"><h3>'+label+'</h3>'+
 '<p>يمكن للإدارة مراجعة ربط البريد '+esc(member.email)+' بملفك. لا يمكنك تعديل أي ملف قبل الموافقة.</p>'+
 '<button type="button" class="btn outline" id="atharSelfLogout">تسجيل الخروج</button></div>';
 outButton();
}
function itemFormClear(){
 editing=null;$("atharOwnItem").reset();$("atharItemHeading").textContent="إضافة منجز أو شاهد";
 $("atharItemVisible").checked=true;message("atharItemMsg","");
}
async function ownUI(){
 var c=client();
 var response=await Promise.all([
  c.from("athar_teacher_profiles").select("id,full_name,about,vision,mission,photo_url").eq("id",member.profile_id).maybeSingle(),
  c.from("athar_portfolio_items").select("id,profile_id,category,title,summary,external_url,visible").eq("profile_id",member.profile_id).order("created_at",{ascending:false})
 ]);
 if(response[0].error||response[1].error)throw response[0].error||response[1].error;
 var p=response[0].data;if(!p)throw Error("ملفك غير موجود");rows=response[1].data||[];
 area.innerHTML='<div class="athar-access-panel"><h3>ملفي | '+esc(p.full_name)+'</h3>'+
 '<p>تُحفظ تعديلاتك مباشرة في ملفك فقط، دون الحاجة إلى اعتماد جديد.</p>'+
 '<form id="atharOwnProfile"><div class="athar-grid">'+
 '<label class="wide">النبذة التعريفية<textarea maxlength="2500" id="atharOwnAbout">'+esc(p.about)+'</textarea></label>'+
 '<label>الرؤية المهنية<textarea maxlength="1500" id="atharOwnVision">'+esc(p.vision)+'</textarea></label>'+
 '<label>الرسالة المهنية<textarea maxlength="1500" id="atharOwnMission">'+esc(p.mission)+'</textarea></label>'+
 '<label class="wide">رابط الصورة (اختياري)<input type="url" id="atharOwnPhoto" value="'+esc(p.photo_url)+'"></label>'+
 '</div><div class="athar-actions"><button type="submit" class="btn primary">حفظ بياناتي</button>'+
 '<button type="button" class="btn outline" id="atharSelfLogout">تسجيل الخروج</button></div></form>'+
 '<p id="atharProfileMsg" role="status" class="athar-msg"></p></div>'+
 '<div class="athar-access-panel"><h3 id="atharItemHeading">إضافة منجز أو شاهد</h3>'+
 '<form id="atharOwnItem"><div class="athar-grid">'+
 '<label>القسم<select id="atharItemCategory">'+Object.entries(categories).map(function(v){return '<option value="'+v[0]+'">'+v[1]+'</option>'}).join("")+'</select></label>'+
 '<label>العنوان<input id="atharItemTitle" maxlength="180" required></label>'+
 '<label class="wide">الوصف<textarea id="atharItemSummary" maxlength="2000"></textarea></label>'+
 '<label class="wide">رابط الشاهد (اختياري)<input id="atharItemUrl" type="url" placeholder="https://"></label>'+
 '<label class="wide"><span><input id="atharItemVisible" type="checkbox" checked style="width:auto"> إظهار البطاقة للزائرات</span></label>'+
 '</div><div class="athar-actions"><button type="submit" class="btn primary">حفظ الشاهد</button>'+
 '<button type="button" id="atharItemCancel" class="btn outline">إلغاء التعديل</button></div></form>'+
 '<p id="atharItemMsg" role="status" class="athar-msg"></p></div>'+
 '<div class="athar-access-panel"><h3>الشواهد المسجلة</h3><div id="atharOwnList">'+
 (rows.length?rows.map(function(row){return '<div class="athar-record"><div><strong>'+esc(row.title)+'</strong>'+
 '<small>'+esc(categories[row.category]||row.category)+' · '+(row.visible?"منشور":"مخفي")+'</small></div>'+
 '<div class="athar-actions"><button type="button" class="btn outline" data-athar-edit="'+esc(row.id)+'">تعديل</button>'+
 '<button type="button" class="btn outline" data-athar-delete="'+esc(row.id)+'">حذف</button></div></div>'}).join(""):'<p>لا توجد شواهد مضافة بعد.</p>')+
 '</div></div>';
 outButton();
 $("atharOwnProfile").onsubmit=async function(e){
  e.preventDefault();var b=e.submitter;b.disabled=true;
  try{
   var photo=$("atharOwnPhoto").value.trim();if(!safeUrl(photo))throw Error("رابط الصورة يجب أن يبدأ بـ https");
   var result=await c.rpc("athar_update_my_profile",{p_about:$("atharOwnAbout").value.trim(),p_vision:$("atharOwnVision").value.trim(),p_mission:$("atharOwnMission").value.trim(),p_photo_url:photo});
   if(result.error)throw result.error;await bridge.reload();message("atharProfileMsg","تم حفظ بياناتك مباشرة.");
  }catch(err){message("atharProfileMsg",failure(err),true)}finally{b.disabled=false}
 };
 $("atharOwnItem").onsubmit=async function(e){
  e.preventDefault();var b=e.submitter;b.disabled=true;
  try{
   var url=$("atharItemUrl").value.trim();if(!safeUrl(url))throw Error("رابط الشاهد يجب أن يبدأ بـ https");
   var row={profile_id:member.profile_id,category:$("atharItemCategory").value,title:$("atharItemTitle").value.trim(),summary:$("atharItemSummary").value.trim(),external_url:url,visible:$("atharItemVisible").checked};
   var q=editing?c.from("athar_portfolio_items").update(row).eq("id",editing).eq("profile_id",member.profile_id).select("id"):
    c.from("athar_portfolio_items").insert(row).select("id");
   var result=await q;if(result.error)throw result.error;if(!result.data||!result.data.length)throw Error("لم تحفظ البطاقة");
   editing=null;await bridge.reload();await ownUI();message("atharItemMsg","تم حفظ الشاهد مباشرة.");
  }catch(err){message("atharItemMsg",failure(err),true)}finally{b.disabled=false}
 };
 $("atharItemCancel").onclick=itemFormClear;
 $("atharOwnList").onclick=async function(e){
  var edit=e.target.closest("[data-athar-edit]"),del=e.target.closest("[data-athar-delete]");
  if(edit){
   var r=rows.find(function(o){return o.id===edit.dataset.atharEdit});if(!r)return;
   editing=r.id;$("atharItemCategory").value=r.category;$("atharItemTitle").value=r.title;
   $("atharItemSummary").value=r.summary||"";$("atharItemUrl").value=r.external_url||"";
   $("atharItemVisible").checked=!!r.visible;$("atharItemHeading").textContent="تعديل الشاهد";
   $("atharOwnItem").scrollIntoView({behavior:"smooth",block:"start"});
  }
  if(del){
   var item=rows.find(function(o){return o.id===del.dataset.atharDelete});
   if(!item||!confirm("حذف الشاهد «"+item.title+"» نهائيًا؟"))return;
   del.disabled=true;
   try{
    var result=await c.from("athar_portfolio_items").delete().eq("id",item.id).eq("profile_id",member.profile_id).select("id");
    if(result.error)throw result.error;if(!result.data||!result.data.length)throw Error("لم يتم الحذف");
    await bridge.reload();await ownUI();
   }catch(err){alert("تعذر الحذف: "+failure(err));del.disabled=false}
  }
 };
}
async function queueUI(){
 var res=await client().from("athar_teacher_access").select("user_id,profile_id,email,status,created_at").order("created_at",{ascending:false});
 if(res.error)throw res.error;
 var names=new Map(bridge.teachers().map(function(t){return [t.id,t.full_name]}));
 queue.innerHTML='<h3>طلبات تفعيل حسابات المعلمات</h3><p>تتحقق الإدارة من هوية المعلمة وبريدها قبل اعتماد الربط مرة واحدة.</p>'+
 (res.data&&res.data.length?res.data.map(function(a){
  var buttons=a.status==="pending"?'<button type="button" class="btn primary" data-role-action="approved" data-role-uid="'+esc(a.user_id)+'">اعتماد</button><button type="button" class="btn outline" data-role-action="rejected" data-role-uid="'+esc(a.user_id)+'">رفض</button>':
   a.status==="approved"?'<button type="button" class="btn outline" data-role-action="disabled" data-role-uid="'+esc(a.user_id)+'">إيقاف</button>':
   '<button type="button" class="btn outline" data-role-action="approved" data-role-uid="'+esc(a.user_id)+'">إعادة التفعيل</button>';
  return '<div class="athar-record"><div><strong>'+esc(names.get(a.profile_id)||"ملف المعلمة")+'</strong>'+
   '<small>'+esc(a.email)+' · '+esc({pending:"قيد المراجعة",approved:"مفعّل",rejected:"مرفوض",disabled:"موقوف"}[a.status]||a.status)+'</small></div>'+
   '<div class="athar-actions">'+buttons+'</div></div>';
 }).join(""):'<p>لا توجد طلبات حتى الآن.</p>')+'<p id="atharAdminAccessMsg" class="athar-msg"></p>';
 queue.onclick=async function(e){
  var button=e.target.closest("[data-role-action]");if(!button)return;
  var status=button.dataset.roleAction,uid=button.dataset.roleUid;
  if(!confirm(status==="approved"?"هل تحققتِ من تطابق البريد وصاحبة الملف؟":"تأكيد تغيير صلاحية الحساب؟"))return;
  button.disabled=true;
  try{
   var r=await client().from("athar_teacher_access").update({status:status,reviewed_by:user.id,reviewed_at:new Date().toISOString()}).eq("user_id",uid).select("user_id");
   if(r.error)throw r.error;if(!r.data||!r.data.length)throw Error("لم تُحفظ الصلاحية");
   await queueUI();
  }catch(err){message("atharAdminAccessMsg",failure(err),true);button.disabled=false}
 };
}
async function refresh(){
 if(busy){queued=true;return}
 busy=true;
 try{
  var c=client();if(!c)return;
  var auth=await c.auth.getUser();if(auth.error)throw auth.error;
  user=auth.data.user||null;
  if(!user){area.hidden=true;queue.hidden=true;entry.hidden=false;gate.hidden=false;return}
  var ar=await c.from("athar_admin_users").select("user_id").eq("user_id",user.id).maybeSingle();
  if(ar.error)throw ar.error;
  if(ar.data){area.hidden=true;queue.hidden=false;entry.hidden=true;await queueUI();return}
  var access=await c.from("athar_teacher_access").select("user_id,profile_id,email,status").eq("user_id",user.id).maybeSingle();
  if(access.error)throw access.error;member=access.data||null;
  // These panels exist exclusively inside management; directory and published profile markup are untouched.
  gate.hidden=true;adminTools.hidden=true;area.hidden=false;queue.hidden=true;
  if(!member)requestUI();else if(member.status!=="approved")statusUI();else await ownUI();
 }catch(err){
  console.warn("Athar teacher access",err);
  if(user){area.hidden=false;area.innerHTML='<div class="athar-access-panel"><h3>تعذر التحقق من الصلاحية</h3><p>'+esc(failure(err))+'</p></div>'}
 }finally{busy=false;if(queued){queued=false;setTimeout(refresh,70)}}
}
client()?.auth.onAuthStateChange(function(){setTimeout(refresh,100)});
window.addEventListener("athar:admin-rendered",function(){setTimeout(refresh,50)});
document.querySelector('[data-view="admin"]')?.addEventListener("click",function(){setTimeout(refresh,80)});
setTimeout(refresh,180);
})();
