#!/usr/bin/env python3
"""Upgrade Manjaz from original/v19.2/v19.3 to one tested v19.4 package.
No database statements; keeps existing element IDs and original app action functions.
"""
from pathlib import Path
import argparse
import datetime
import re
import shutil
import sys
import tempfile

VERSION='19.4'
SOURCES=('manjaz-part2.js','manjaz-part2.css')
REQUIRED=('index.html','manjaz-task15.js','manjaz-urgent18.js')


def one(s,old,new,label):
    count=s.count(old)
    if count!=1:
        raise ValueError(f'{label}: expected 1 source marker, found {count}; nothing written')
    return s.replace(old,new,1)


def upgrade_index(s):
    # Delete the card element while retaining the three inputs and counters hidden
    # to preserve app.js's existing wireAchievements() event handlers.
    if 'class="mj20-filter-compat"' not in s:
        pattern=r'<details\s+class="mj18-utility-card"\s*>\s*<summary>البحث والتصفية والإحصاءات</summary>(.*?)</details>'
        matches=list(re.finditer(pattern,s,flags=re.S))
        if len(matches)!=1:
            raise ValueError(f'achievement filter card: expected 1, got {len(matches)}')
        content=matches[0].group(1)
        for marker in ('id="searchAchievements"','id="filterCategory"','id="filterStatus"','id="aTotal"','id="aReview"','id="aApproved"'):
            if marker not in content:raise ValueError('missing compatibility control '+marker)
        s=s[:matches[0].start()]+ '<div class="mj20-filter-compat" hidden aria-hidden="true">'+content+'</div>' +s[matches[0].end():]

    # Native expandable award-entry card: enclose the original form, not a clone.
    if 'id="mj20AwardEntry"' not in s:
        pattern=r'(<div\s+class="mj18-award-admin-controls"\s+hidden>.*?</div>\s*<form\s+id="awardForm".*?</form>)'
        matches=list(re.finditer(pattern,s,flags=re.S))
        if len(matches)!=1:raise ValueError(f'award form section: expected 1, got {len(matches)}')
        original=matches[0].group(1)
        wrapper='''<details class="mj20-award-entry-card" id="mj20AwardEntry">
      <summary>إضافة تكريم</summary>
      <div class="mj20-award-entry-body">
      '''+original+'''
      </div>
    </details>'''
        s=s[:matches[0].start()]+wrapper+s[matches[0].end():]

    # A single activated CSS/JS pair; replace prior 19.x hooks instead of stacking.
    s=re.sub(r'\s*<link rel="stylesheet" href="manjaz-part2\.css\?v=19\.[23]">','',s)
    s=re.sub(r'\s*<script src="manjaz-part2\.js\?v=19\.[23]"></script>','',s)
    style_anchor='<link rel="stylesheet" href="manjaz-urgent18.css?v=18.1-quick">'
    script_anchor='<script src="manjaz-urgent18.js?v=18.1-quick"></script>'
    # Accept prior bumped resource stamp for idempotency.
    if '<link rel="stylesheet" href="manjaz-part2.css?v=19.4">' not in s:
        s=one(s,style_anchor,style_anchor+'\n<link rel="stylesheet" href="manjaz-part2.css?v=19.4">','part2 CSS')
    if '<script src="manjaz-part2.js?v=19.4"></script>' not in s:
        existing=re.search(r'<script src="manjaz-urgent18\.js\?v=[^"]+"></script>',s)
        if not existing:raise ValueError('missing urgent18 script anchor')
        s=s[:existing.end()]+'\n<script src="manjaz-part2.js?v=19.4"></script>'+s[existing.end():]
    # Changed source files must bypass browser cache after deployment.
    s=re.sub(r'manjaz-task15\.js\?v=[^" ]+', 'manjaz-task15.js?v=19.4',s)
    s=re.sub(r'manjaz-urgent18\.js\?v=[^" ]+', 'manjaz-urgent18.js?v=19.4',s)
    s=re.sub(r'manjaz-urgent18\.css\?v=[^" ]+', 'manjaz-urgent18.css?v=19.4',s)
    s=re.sub(r'الإصدار (?:18\.1|19\.[234]) – [^<]*','الإصدار 19.4 – واجهات المنجزات والاعتمادات والتكريمات',s)
    assert s.count('id="mj20AwardEntry"')==1
    assert s.count('class="mj20-filter-compat"')==1
    assert s.count('manjaz-part2.js?v=19.4')==1
    assert s.count('manjaz-part2.css?v=19.4')==1
    assert s.count('id="awardForm"')==1
    for idname in ('searchAchievements','filterCategory','filterStatus','achievementList','awardList','adminList'):
        assert f'id="{idname}"' in s, idname
    return s


def upgrade_dashboard(s):
    legacy='</span>طلبات اعتماد المنجزات</summary>'
    replacement='</span>طلبات الاعتماد</summary>'
    if legacy in s:
        s=one(s,legacy,replacement,'dashboard heading')
    if s.count(replacement)!=1:raise ValueError('admin approval heading not found')
    return s


def upgrade_gallery(s):
    # Older release was hiding the edit/delete actions after app.js created them.
    legacy='''    if(isAwards){
     for(const b of card.querySelectorAll('.record-edit-btn,.record-delete-btn'))b.hidden=true;
    }'''
    if legacy in s:
        s=one(s,legacy,'    // Edit/delete visibility is now limited to the verified admin through the 19.4 UI.','award actions visibility')
    if "b.hidden=true" in s:raise ValueError('a legacy award-hiding command remains')
    return s


def validate_outputs(source):
    for key in ['#mj20AwardEntry','mj20-can-manage-awards','verifiedAdminToken()']:
        if key not in source['manjaz-part2.js']:raise ValueError('missing award upgrade '+key)
    if '.mj20-filter-compat' not in source['manjaz-part2.css']:
        raise ValueError('filter card style absent')


def install(folder):
    folder=Path(folder).resolve()
    here=Path(__file__).resolve().parent
    needed=REQUIRED+SOURCES
    for fn in REQUIRED:
        if not (folder/fn).is_file():raise ValueError('not a valid Manjaz root: missing '+fn)
    for fn in SOURCES:
        if not (here/fn).is_file():raise ValueError('incomplete update package: '+fn)
    src={name:(folder/name).read_text(encoding='utf-8') for name in REQUIRED}
    patch={
      'index.html':upgrade_index(src['index.html']),
      'manjaz-task15.js':upgrade_dashboard(src['manjaz-task15.js']),
      'manjaz-urgent18.js':upgrade_gallery(src['manjaz-urgent18.js']),
      'manjaz-part2.js':(here/'manjaz-part2.js').read_text(encoding='utf-8'),
      'manjaz-part2.css':(here/'manjaz-part2.css').read_text(encoding='utf-8')
    }
    validate_outputs(patch)
    now=datetime.datetime.now().strftime('%Y%m%d_%H%M%S_%f')
    backup=folder/f'backup_before_manjaz_19_4_{now}'
    backup.mkdir()
    before={p:(folder/p).exists() for p in patch}
    try:
        for name,exists in before.items():
            if exists:shutil.copy2(folder/name,backup/name)
        for name,data in patch.items():
            with tempfile.NamedTemporaryFile('w',encoding='utf-8',dir=folder,prefix='.mj20_',delete=False) as tmp:
                tmp.write(data); temp=Path(tmp.name)
            temp.replace(folder/name)
        if 'id="mj20AwardEntry"' not in (folder/'index.html').read_text(encoding='utf-8'):
            raise RuntimeError('post-install validation failed')
    except BaseException:
        for name,exists in before.items():
            if exists:shutil.copy2(backup/name,folder/name)
            else:(folder/name).unlink(missing_ok=True)
        raise
    print('Manjaz v19.4 installed in the local checkout (NOT published).')
    print('Backup:',backup)
    print('Updated files:',', '.join(patch))
    return backup

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('folder',help='original Manjaz repository directory')
    args=parser.parse_args()
    try:install(args.folder)
    except Exception as exc:
        print('No update completed:',exc,file=sys.stderr)
        sys.exit(1)
