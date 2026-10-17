#!/usr/bin/env python3
"""Non-destructive, idempotent installer for existing Manjaz GitHub checkout."""
from pathlib import Path
import sys,re,shutil
from datetime import datetime
HERE=Path(__file__).resolve().parent
PAT=r'(<script\s+src=["\']manjaz-urgent18\.js\?v=)[^"\']+(["\']\s*></script>)'

def install(folder):
    folder=Path(folder).expanduser().resolve()
    html=folder/'index.html'; js=folder/'manjaz-urgent18.js'
    if not html.is_file() or not js.is_file():
        raise RuntimeError('مجلد الموقع غير صحيح: يلزم وجود index.html و manjaz-urgent18.js')
    old=html.read_text(encoding='utf-8');updated,n=re.subn(PAT,lambda m:m.group(1)+'21.0-reserve-pattern'+m.group(2),old,count=1)
    if n!=1 or '<script src="app.js?' not in old:
        raise RuntimeError('ملف الموقع لا يطابق الإصدار المتوقع؛ توقّف بدون تعديل')
    new=(HERE/'manjaz-urgent18.js').read_text(encoding='utf-8')
    assert 'mj_duty_public_day' in new and 'mj19AwardEntry' in new and 'reserve-public-card' in new
    if js.read_text(encoding='utf-8')==new and old==updated:
        print('التحديث مثبت بالفعل؛ لم تُغير أي ملفات');return
    backup=folder/('BACKUP_MANJAZ_21_'+datetime.now().strftime('%Y%m%d_%H%M%S'))
    backup.mkdir(exist_ok=False)
    shutil.copy2(html,backup/html.name);shutil.copy2(js,backup/js.name)
    try:
        js.write_text(new,encoding='utf-8');html.write_text(updated,encoding='utf-8')
        assert '21.0-reserve-pattern' in html.read_text(encoding='utf-8')
    except Exception:
        shutil.copy2(backup/html.name,html);shutil.copy2(backup/js.name,js);raise
    print('تم تجهيز الرفع اليدوي: index.html و manjaz-urgent18.js')
    print('نسخة احتياطية:',backup)

if __name__=='__main__':
    try:install(sys.argv[1])
    except IndexError:raise SystemExit('الاستخدام: python install_update.py <مسار مجلد الموقع>')
    except Exception as e:raise SystemExit('لم يكتمل التحديث: '+str(e))
