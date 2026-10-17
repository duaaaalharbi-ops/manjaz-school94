#!/usr/bin/env python3
"""Install or upgrade the Manjaz 19.3 UI patch with original-file backups."""
from pathlib import Path
import datetime as dt
import shutil
import argparse
import sys

STYLE_HOOK='<link rel="stylesheet" href="manjaz-urgent18.css?v=18.1-quick">'
SCRIPT_HOOK='<script src="manjaz-urgent18.js?v=18.1-quick"></script>'
STYLE_192='<link rel="stylesheet" href="manjaz-part2.css?v=19.2">'
SCRIPT_192='<script src="manjaz-part2.js?v=19.2"></script>'
STYLE_193='<link rel="stylesheet" href="manjaz-part2.css?v=19.3">'
SCRIPT_193='<script src="manjaz-part2.js?v=19.3"></script>'
OLD_TITLE='طلبات اعتماد المنجزات'
NEW_TITLE='طلبات الاعتماد'


def install(target: Path):
    source=Path(__file__).resolve().parent
    target=target.resolve()
    index=target/'index.html'
    admin=target/'manjaz-task15.js'
    required_files=['manjaz-part2.css','manjaz-part2.js']
    if not index.is_file() or not admin.is_file():
        raise RuntimeError('يلزم مجلد منجز الأصلي وفيه index.html وmanjaz-task15.js؛ لم يتغير شيء.')
    if any(not (source/name).is_file() for name in required_files):
        raise RuntimeError('ملفات الحزمة غير مكتملة؛ لم يتغير شيء.')
    old=index.read_text(encoding='utf-8')
    admin_old=admin.read_text(encoding='utf-8')
    required=['id="addTpl"','id="achievementForm"','id="achievementsTpl"','id="awardsTpl"','id="adminTpl"','manjaz-task15.js']
    if any(marker not in old for marker in required):
        raise RuntimeError('هذه النسخة غير متوافقة مع تحديث منجز 19.3؛ لم يتغير شيء.')
    if old.count(STYLE_HOOK)!=1 or old.count(SCRIPT_HOOK)!=1:
        raise RuntimeError('علامات إدراج ملفات منجز غير متطابقة؛ لم يتغير شيء.')
    fresh=(STYLE_192 not in old and SCRIPT_192 not in old and STYLE_193 not in old and SCRIPT_193 not in old)
    old192=(old.count(STYLE_192)==1 and old.count(SCRIPT_192)==1)
    old193=(old.count(STYLE_193)==1 and old.count(SCRIPT_193)==1)
    if not (fresh or old192 or old193):
        raise RuntimeError('يوجد تركيب جزئي أو إصدار غير معروف؛ لم يتغير شيء.')
    if fresh:
        new=old.replace(STYLE_HOOK,STYLE_HOOK+'\n  '+STYLE_193,1)
        new=new.replace(SCRIPT_HOOK,SCRIPT_HOOK+'\n'+SCRIPT_193,1)
    elif old192:
        new=old.replace(STYLE_192,STYLE_193,1).replace(SCRIPT_192,SCRIPT_193,1)
    else:
        new=old
    # Bust the old cached dashboard script after renaming its source template.
    if '<script src="manjaz-task15.js?v=18.1-free-entry"></script>' in new:
        new=new.replace('<script src="manjaz-task15.js?v=18.1-free-entry"></script>',
                        '<script src="manjaz-task15.js?v=19.3-approvals"></script>',1)
    new=new.replace('الإصدار 18.1 – تحسينات الواجهات والشهادات','الإصدار 19.3 – الواجهات وطلبات الاعتماد')
    new=new.replace('الإصدار 19.2 – تحسينات الواجهات والاعتمادات','الإصدار 19.3 – الواجهات وطلبات الاعتماد')
    # Patch the literal first-card heading in its source, not any approval procedure.
    source_marker='</span>'+OLD_TITLE+'</summary>'
    target_marker='</span>'+NEW_TITLE+'</summary>'
    if source_marker in admin_old:
        if admin_old.count(source_marker)!=1:
            raise RuntimeError('عنوان بطاقة الإدارة غير متوقع؛ لم يُجر تعديل.')
        admin_new=admin_old.replace(source_marker,target_marker,1)
    elif target_marker in admin_old:
        admin_new=admin_old
    else:
        raise RuntimeError('لم يُعثر على عنوان الاعتماد الأصلي في ملف الإدارة؛ لم يُجر تعديل.')
    originals=[index,admin]+[target/name for name in required_files if (target/name).exists()]
    backups=target/('backup_before_part2_19_3_'+dt.datetime.now().strftime('%Y%m%d_%H%M%S_%f'))
    backups.mkdir()
    for file in originals:shutil.copy2(file,backups/file.name)
    try:
        for name in required_files:shutil.copy2(source/name,target/name)
        admin_temp=admin.with_name(admin.name+'.mj2-tmp')
        admin_temp.write_text(admin_new,encoding='utf-8')
        admin_temp.replace(admin)
        index_temp=index.with_name(index.name+'.mj2-tmp')
        index_temp.write_text(new,encoding='utf-8')
        index_temp.replace(index)
        check=index.read_text(encoding='utf-8')
        if check.count(STYLE_193)!=1 or check.count(SCRIPT_193)!=1:
            raise RuntimeError('فشل التحقق من روابط حزمة 19.3.')
        if admin.read_text(encoding='utf-8').count(target_marker)!=1:
            raise RuntimeError('فشل التحقق من عنوان بطاقة الاعتماد.')
    except Exception:
        for file in originals:shutil.copy2(backups/file.name,file)
        for name in required_files:
            if not (backups/name).exists(): (target/name).unlink(missing_ok=True)
        raise
    print('تم تجهيز نسخة منجز المحلية بالإصدار 19.3 بنجاح.')
    print('النسخة الاحتياطية:',backups)
    print('لا يوجد أي تغيير لبيانات Supabase أو وظائف الحفظ أو إجراءات الاعتماد.')

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('folder',help='المسار إلى مجلد نسخة منجز')
    args=parser.parse_args()
    try:install(Path(args.folder))
    except Exception as e:print('توقف التحديث: '+str(e),file=sys.stderr);sys.exit(1)
