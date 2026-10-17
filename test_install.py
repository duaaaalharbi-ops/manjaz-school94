from pathlib import Path
import tempfile, subprocess, sys, re, json
BASE=Path(__file__).resolve().parent
INSTALLER=BASE/'install_manjaz_19_4.py'
INDEX='''<!doctype html><html lang="ar" dir="rtl"><head>
<link rel="stylesheet" href="manjaz-urgent18.css?v=18.1-quick">
</head><body>
<template id="addTpl"><form id="achievementForm"></form></template>
<template id="achievementsTpl">
<details class="mj18-utility-card"><summary>البحث والتصفية والإحصاءات</summary>
<div class="stat-grid"><b id="aTotal">0</b><b id="aApproved">0</b><b id="aReview">0</b></div>
<div class="filters"><input id="searchAchievements"><select id="filterCategory"></select><select id="filterStatus"></select></div>
</details>
<details class="mj18-utility-card"><summary>إضافة منجز</summary><a href="#add">فتح نموذج</a></details>
<div id="achievementList"></div><div id="emptyState"></div>
</template>
<template id="awardsTpl"><div class="mj18-award-admin-controls" hidden><button id="showAwardForm">إضافة تكريم</button></div>
<form id="awardForm" class="surface form-card hidden-form"><input name="title"><div id="awardMsg"></div><button type="submit">حفظ</button><button type="button" id="cancelAward">إلغاء</button></form>
<div id="awardList"></div></template>
<template id="adminTpl"><div id="adminList"></div><div id="adminEmpty"></div></template>
<script src="manjaz-task15.js?v=18.1-free-entry"></script>
<script src="manjaz-urgent18.js?v=18.1-quick"></script>
</body></html>'''
ADMIN='''function mount(){let dash=document.getElementById('mj15Dashboard');dash.innerHTML=`
<details class="mj15-panel"><summary><span class="mj15-number">١</span>طلبات اعتماد المنجزات</summary><div id="mj15Achievements"></div></details>`}'''
URGENT='''const view=document.getElementById('view');
for(const card of container.querySelectorAll('.achievement-card')){
    const approved=true;
    if(card.hidden!==!approved)card.hidden=!approved;
    if(isAwards){
     for(const b of card.querySelectorAll('.record-edit-btn,.record-delete-btn'))b.hidden=true;
    }
}'''

def run():
  with tempfile.TemporaryDirectory() as td:
    root=Path(td)
    for name,c in [('index.html',INDEX),('manjaz-task15.js',ADMIN),('manjaz-urgent18.js',URGENT)]: (root/name).write_text(c,encoding='utf-8')
    for i in range(2):
      proc=subprocess.run([sys.executable,str(INSTALLER),str(root)],capture_output=True,text=True)
      assert proc.returncode==0,proc.stderr
      updated=(root/'index.html').read_text(encoding='utf-8')
      assert '<summary>البحث والتصفية والإحصاءات</summary>' not in updated
      assert updated.count('class="mj20-filter-compat"')==1
      assert updated.count('id="mj20AwardEntry"')==1
      assert updated.count('id="awardForm"')==1
      assert updated.count('manjaz-part2.js?v=19.4')==1
      assert updated.count('manjaz-part2.css?v=19.4')==1
      assert '</span>طلبات الاعتماد</summary>' in (root/'manjaz-task15.js').read_text(encoding='utf-8')
      assert 'b.hidden=true' not in (root/'manjaz-urgent18.js').read_text(encoding='utf-8')
      assert all((root/name).is_file() for name in ['manjaz-part2.js','manjaz-part2.css'])
    assert len(list(root.glob('backup_before_manjaz_19_4_*')))==2
    assert (root/'manjaz-part2.js').read_text()==(BASE/'manjaz-part2.js').read_text()
    print('PASS direct-card removal, native award accordion, approval title, JS hooks, script cache busting, idempotent install, backups')
if __name__=='__main__':run()
