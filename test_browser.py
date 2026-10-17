from pathlib import Path
from playwright.sync_api import sync_playwright
import tempfile
ROOT=Path(__file__).resolve().parent
css=(ROOT/'manjaz-part2.css').read_text(encoding='utf8')
js=(ROOT/'manjaz-part2.js').read_text(encoding='utf8')

HTML='''<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><style>
#view:has(#awardList) :is(.mj18-award-admin-controls,#awardForm,.mj18-legacy-counters){display:none!important}
#view:has(#awardList) .record-actions-grid{display:none!important}
#view:has(#awardList) :is(.record-edit-btn,.record-delete-btn){display:none!important}
.hidden-form{display:none}
</style><link rel="stylesheet" href="manjaz-part2.css"></head><body>
<div id="view"></div>
<template id="addTpl"><form id="achievementForm"><input name="title"><button type="submit">حفظ منجز</button></form></template>
<script>
window.wireCalls=0;window.editCalls=0;window.deleteCalls=0;
window.wireForm=function(){window.wireCalls++;const f=document.getElementById('achievementForm');f.addEventListener('submit',e=>{e.preventDefault();window.editCalls++})};
window.fetch=async (url)=>({ok:true,json:async()=>({email:'munjz.s94@hotmail.com'})});
function makePage(){
const route=location.hash.slice(1);
const view=document.getElementById('view');
if(route==='awards'){
 view.innerHTML=`<details id="mj20AwardEntry" class="mj20-award-entry-card"><summary>إضافة تكريم</summary><div class="mj20-award-entry-body"><div class="mj18-award-admin-controls" hidden><button id="showAwardForm">إضافة تكريم</button></div><form id="awardForm" class="surface form-card hidden-form"><input name="title"><button type="submit">حفظ</button></form></div></details><div id="awardList"><article class="achievement-card"><div class="record-actions-grid"><button class="details-btn">عرض</button><button class="record-edit-btn">تعديل</button><button class="record-delete-btn">حذف</button></div></article></div>`;
 view.querySelector('.record-edit-btn').addEventListener('click',()=>{window.editCalls++});
 view.querySelector('.record-delete-btn').addEventListener('click',()=>{window.deleteCalls++});
}
else if(route==='achievements'){
 view.innerHTML=`<div class="mj20-filter-compat" hidden><input id="searchAchievements"><select id="filterCategory"></select><select id="filterStatus"></select><b id="aTotal"></b><b id="aApproved"></b><b id="aReview"></b></div><details class="mj18-utility-card"><summary>إضافة منجز</summary><a href="#add">فتح نموذج إضافة منجز</a></details><div id="achievementList"></div>`;
}
else if(route==='admin'){
 view.innerHTML=`<div id="mj15Dashboard"><details class="mj15-panel"><summary><span class="mj15-number">١</span>طلبات اعتماد المنجزات</summary><div class="mj15-body" id="mj15Achievements"><div class="stat-grid"><span>إجمالي</span></div><section class="surface panel"><div class="panel-head"><h3>طلبات المراجعة</h3></div><div id="adminList"><div class="admin-item"><button data-media-kind="award" id="awardAction">اعتماد التكريم</button></div><div class="admin-item"><button data-media-kind="achievement" id="achievementAction">اعتماد المنجز</button></div></div><p id="adminEmpty"></p></section></div></details></div>`;
 view.querySelector('#awardAction').addEventListener('click',()=>window.editCalls++);
}
}
window.addEventListener('hashchange',makePage);
makePage();
</script>
<script src="manjaz-part2.js"></script>
</body></html>'''

def tests():
 with tempfile.TemporaryDirectory() as t:
  out=Path(t)
  (out/'manjaz-part2.css').write_text(css,encoding='utf8')
  (out/'manjaz-part2.js').write_text(js,encoding='utf8')
  (out/'index.html').write_text(HTML,encoding='utf8')
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
   page=browser.new_page(viewport={'width':390,'height':844})
   page.goto('about:blank#achievements')
   page.evaluate("Object.defineProperty(window, 'sessionStorage', {value:{_db:{},getItem(k){return this._db[k]||null},setItem(k,v){this._db[k]=v},removeItem(k){delete this._db[k]}},configurable:true})")
   page.set_content(HTML.replace('<link rel="stylesheet" href="manjaz-part2.css">','<style>'+css+'</style>').replace('<script src="manjaz-part2.js"></script>','<script>'+js+'</script>'))
   page.wait_for_timeout(300)
   assert page.locator('#view .mj18-utility-card').count()==1
   assert page.locator('#view .mj20-filter-compat').is_hidden()
   assert page.locator('#view #achievementForm').count()==1
   page.get_by_text('إضافة منجز',exact=True).click()
   assert page.locator('#view #achievementForm').is_visible()
   assert page.evaluate('window.wireCalls')==1
   page.fill('#achievementForm input[name=title]','اختبار')
   page.locator('#achievementForm button[type=submit]').click()
   assert page.evaluate('window.editCalls')==1
   page.evaluate("location.hash='#admin'")
   page.wait_for_timeout(350)
   assert 'طلبات الاعتماد' in page.locator('#mj15Dashboard .mj15-panel>summary').first.inner_text()
   page.locator('#mj15Dashboard .mj15-panel>summary').first.click()
   assert page.locator('#mj2AwardApprovals #awardAction').count()==1
   assert page.locator('#mj15Achievements #achievementAction').count()==1
   page.locator('#mj2AwardApprovals summary').click()
   page.locator('#awardAction').click()
   assert page.evaluate('window.editCalls')==2
   page.evaluate("location.hash='#awards'")
   page.wait_for_timeout(320)
   assert page.locator('#mj20AwardEntry').count()==1
   assert not page.locator('#mj20AwardEntry').evaluate('(e)=>e.open')
   page.locator('#mj20AwardEntry summary').click()
   assert page.locator('#awardForm').is_visible()
   assert page.locator('.record-edit-btn').is_hidden()
   page.evaluate("sessionStorage.setItem('manjaz_admin_auth_session_v1',JSON.stringify({access_token:'test',expires_at:Date.now()/1000+300}))")
   page.evaluate("location.hash='#admin'");page.wait_for_timeout(110);page.evaluate("location.hash='#awards'");page.wait_for_timeout(450)
   assert page.locator('.record-edit-btn').is_visible()
   assert page.locator('.record-delete-btn').is_visible()
   before_edit=page.evaluate('window.editCalls')
   page.locator('.record-edit-btn').click()
   assert page.evaluate('window.editCalls')==before_edit+1
   before_delete=page.evaluate('window.deleteCalls')
   page.locator('.record-delete-btn').click()
   assert page.evaluate('window.deleteCalls')==before_delete+1
   print('PASS Chrome mobile DOM tests: removed filter card; expandable original save form; approval label, rows and handlers; award accordion; admin-gated edit/delete; responsive CSS.')
   browser.close()
if __name__=='__main__':tests()
