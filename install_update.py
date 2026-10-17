#!/usr/bin/env python3
"""Manjaz: install daily duty + award add card in an existing repository checkout.
Changes ONLY index.html and manjaz-urgent18.js. Makes backups. No database actions.
"""
from pathlib import Path
from datetime import datetime
import shutil
import re
import sys

SOURCE = Path(__file__).resolve().parent
MARKER = r'(<script\s+src=["\']manjaz-urgent18\.js\?v=)[^"\']+(["\']\s*></script>)'

def install(destination):
    destination = Path(destination).expanduser().resolve()
    html_path=destination/'index.html'
    js_path=destination/'manjaz-urgent18.js'
    if not html_path.is_file() or not js_path.is_file():
        raise RuntimeError('المجلد غير صحيح؛ يجب وجود index.html و manjaz-urgent18.js في الجذر')
    html=html_path.read_text(encoding='utf-8')
    if 'app.js?' not in html or not re.search(MARKER, html):
        raise RuntimeError('نسخة index.html مختلفة عن المصدر المتوقع؛ توقف التثبيت دون تعديل')
    src=(SOURCE/'manjaz-urgent18.js').read_text(encoding='utf-8')
    if 'mj_duty_generate' not in src or 'mj19AwardEntry' not in src:
        raise RuntimeError('ملف التحديث غير مكتمل')
    updated,count=re.subn(MARKER,lambda m:m.group(1)+'20.0-daily-duty'+m.group(2),html,count=1)
    if count!=1:
        raise RuntimeError('تعذر تحديث إصدار ملف JavaScript')
    stamp=datetime.now().strftime('%Y%m%d_%H%M%S')
    backup=destination/('BACKUP_BEFORE_DAILY_DUTY_'+stamp)
    backup.mkdir()
    shutil.copy2(html_path,backup/'index.html')
    shutil.copy2(js_path,backup/'manjaz-urgent18.js')
    try:
        js_path.write_text(src,encoding='utf-8')
        html_path.write_text(updated,encoding='utf-8')
        assert 'manjaz-urgent18.js?v=20.0-daily-duty' in html_path.read_text(encoding='utf-8')
    except Exception:
        shutil.copy2(backup/'index.html',html_path)
        shutil.copy2(backup/'manjaz-urgent18.js',js_path)
        raise
    print('تم تجهيز ملفات الرفع: index.html و manjaz-urgent18.js')
    print('نسخة الاسترجاع:',backup)
    print('مهم: يلزم تشغيل daily-duty.sql مرة واحدة في Supabase SQL Editor لتفعيل الحفظ والروابط.')

if __name__=='__main__':
    if len(sys.argv)!=2: sys.exit('الاستخدام: python install_update.py /path/to/manjaz-school94')
    try:install(sys.argv[1])
    except Exception as e:sys.exit('لم يكتمل التثبيت: '+str(e))
