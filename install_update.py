#!/usr/bin/env python3
"""Install Manjaz 22.0 into an existing local GitHub checkout with backup/rollback."""
from pathlib import Path
import sys, re, shutil
from datetime import datetime
HERE=Path(__file__).resolve().parent
SCRIPT_PATTERN=r'(<script\s+src=["\']manjaz-urgent18\.js\?v=)[^"\']+(["\']\s*></script>)'

def install(folder):
    folder=Path(folder).expanduser().resolve()
    html=folder/'index.html'
    js=folder/'manjaz-urgent18.js'
    if not html.is_file() or not js.is_file():
        raise RuntimeError('ملف index.html أو manjaz-urgent18.js غير موجود في المجلد المختار')
    old_html=html.read_text(encoding='utf-8')
    updated,amount=re.subn(SCRIPT_PATTERN,lambda m:m.group(1)+'22.0-hijri-sync'+m.group(2),old_html,count=1)
    if amount!=1:raise RuntimeError('لم أعثر على رابط السكربت المتوقع؛ أوقف التركيب ولا تغير شيئًا')
    new_script=(HERE/'manjaz-urgent18.js').read_text(encoding='utf-8')
    assert all(s in new_script for s in ('mj_duty_public_stats','dutyDateTrigger','mj19AwardEntry','refreshSequence'))
    if old_html==updated and js.read_text(encoding='utf-8')==new_script:
        print('التحديث مثبت مسبقًا؛ لم تُغير أي ملفات');return
    backup=folder/('BACKUP_MANJAZ_22_'+datetime.now().strftime('%Y%m%d_%H%M%S'))
    backup.mkdir()
    for f in [html,js]:shutil.copy2(f,backup/f.name)
    try:
        js.write_text(new_script,encoding='utf-8')
        html.write_text(updated,encoding='utf-8')
    except Exception:
        for f in [html,js]:shutil.copy2(backup/f.name,f)
        raise
    print('تم تعديل:',html,js,'\nالنسخة الاحتياطية:',backup)

if __name__=='__main__':
    try:install(sys.argv[1])
    except IndexError:raise SystemExit('الاستخدام: python install_update.py <مجلد الموقع>')
    except Exception as e:raise SystemExit('فشل التركيب دون فقد النسخة السابقة: '+str(e))
