-- Manjaz v30 | Use in Supabase SQL Editor before testing full-cadre support.
-- Important: existing published assignments remain unchanged.
-- This migration replaces ONLY the automatic assignment guard and does not delete records.
CREATE OR REPLACE FUNCTION public.mj_reserve_enforce_auto_v29()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $fn$
DECLARE
  t public.records%ROWTYPE;
  v_date date;
  v_period int;
  v_id text;
  v_name text;
  v_load int;
  v_full boolean;
  v_support boolean := false;
  v_day text;
  v_schedule jsonb;
  v_week date;
  v_week_count int;
BEGIN
  IF NEW.kind<>'reserve_assignment' OR COALESCE(NEW.data->>'manual','false')<>'false'
    OR COALESCE(NEW.data->>'source','auto')<>'auto' THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND OLD.kind=NEW.kind AND
    (OLD.data->>'date',OLD.data->>'period',OLD.data->>'className',OLD.data->>'absentTeacherId',
     OLD.data->>'assignedTeacherId',OLD.data->>'manual',OLD.data->>'source',
     OLD.data->>'published',OLD.data->>'fullCadreEnabled',OLD.status)
    IS NOT DISTINCT FROM
    (NEW.data->>'date',NEW.data->>'period',NEW.data->>'className',NEW.data->>'absentTeacherId',
     NEW.data->>'assignedTeacherId',NEW.data->>'manual',NEW.data->>'source',
     NEW.data->>'published',NEW.data->>'fullCadreEnabled',NEW.status)
  THEN RETURN NEW; END IF;
  v_full:=COALESCE(NEW.data->>'fullCadreEnabled','false')='true';
  v_id:=COALESCE(NEW.data->>'assignedTeacherId','');
  IF v_id='' THEN
    IF COALESCE(NEW.data->>'published','false')='true' THEN
      RAISE EXCEPTION 'لا يجوز نشر حصة آلية بلا مكلفة';
    END IF;
    RETURN NEW;
  END IF;
  IF v_id IN ('reserve_support_1','reserve_support_2','reserve_support_3') THEN
    IF NOT v_full THEN RAISE EXCEPTION 'المساندات يتطلبن تفعيل الكادر الكامل'; END IF;
    v_support:=true;
    v_name:=CASE v_id WHEN 'reserve_support_1' THEN 'دخيلة المالكي'
       WHEN 'reserve_support_2' THEN 'مها العتيبي' ELSE 'نجلاء هوساوي' END;
  ELSE
    IF v_id !~ '^[0-9]+$' THEN RAISE EXCEPTION 'معرف معلمة غير صالح'; END IF;
    SELECT * INTO t FROM public.records WHERE kind='reserve_teacher' AND id=v_id::bigint;
    IF NOT FOUND OR COALESCE(t.data->>'active','true')='false' THEN
      RAISE EXCEPTION 'المعلمة غير نشطة';
    END IF;
    v_name:=COALESCE(t.data->>'name','');
    v_load:=CASE WHEN t.data->>'workload' ~ '^[0-9]+$'
      THEN (t.data->>'workload')::int ELSE 100 END;
    IF NOT v_full AND (
      COALESCE(t.data->>'excluded','false')='true' OR
      COALESCE(t.data->>'absoluteExcluded','false')='true' OR
      COALESCE(t.data->>'permanentExcluded','false')='true' OR v_load>=20 OR
      v_name IN ('عبير المولد','عايدة الصاعدي','نجوى الغامدي','عواطف الحربي',
         'لمياء البلادي','لمياء البالدي','نورة العنزي','أفراح الجدعاني',
         'بدرية الحربي','بدريه الحربي')
    ) THEN RAISE EXCEPTION 'مخالفة ضوابط الاستبعاد بدون الكادر الكامل'; END IF;
  END IF;
  IF COALESCE(NEW.data->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' OR
      COALESCE(NEW.data->>'period','') !~ '^[1-7]$' THEN
    RAISE EXCEPTION 'تاريخ أو حصة غير صالحين';
  END IF;
  v_date:=(NEW.data->>'date')::date;
  v_period:=(NEW.data->>'period')::int;
  v_day:=CASE EXTRACT(DOW FROM v_date)::int
     WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
     WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' ELSE '' END;
  IF v_day='' THEN RAISE EXCEPTION 'الاحتياط الآلي في أيام الدراسة فقط'; END IF;
  IF v_id=NEW.data->>'absentTeacherId' OR EXISTS (
    SELECT 1 FROM public.records a WHERE a.kind='reserve_absence'
     AND a.data->>'date'=v_date::text AND a.data->>'teacherId'=v_id
  ) THEN RAISE EXCEPTION 'المعلمة غائبة اليوم'; END IF;
  IF v_name='ريم الحربي' AND (
    (v_day IN ('sun','mon') AND v_period=7) OR
    (v_day IN ('tue','wed','thu') AND v_period=6)
  ) THEN RAISE EXCEPTION 'ساعة الرضاعة تمنع تكليف ريم الحربي'; END IF;
  IF NOT v_support THEN
    SELECT data->'timetable'->v_day INTO v_schedule FROM public.records
      WHERE kind='reserve_schedule' AND data->>'teacherId'=v_id
      ORDER BY id DESC LIMIT 1;
    IF v_schedule IS NULL THEN RAISE EXCEPTION 'لا يوجد جدول أصلي'; END IF;
    IF NULLIF(BTRIM(COALESCE(v_schedule->>(v_period-1),'')),'') IS NOT NULL
      THEN RAISE EXCEPTION 'لدى المعلمة حصة أصلية في هذه الفترة'; END IF;
    IF (v_period>1 AND NULLIF(BTRIM(COALESCE(v_schedule->>(v_period-2),'')),'') IS NOT NULL)
      OR (v_period<7 AND NULLIF(BTRIM(COALESCE(v_schedule->>v_period,'')),'') IS NOT NULL)
      THEN RAISE EXCEPTION 'تكليف متصل بحصة أصلية'; END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.records a WHERE a.kind='reserve_assignment'
      AND a.id<>COALESCE(NEW.id,-1) AND a.data->>'date'=v_date::text
      AND a.data->>'assignedTeacherId'=v_id
      AND COALESCE(a.data->>'status','')<>'ملغي'
      AND (a.data->>'period'=v_period::text OR
          (COALESCE(NEW.data->>'className','')<>'' AND
            a.data->>'className'=NEW.data->>'className')))
    THEN RAISE EXCEPTION 'تعارض مع احتياط آخر أو نفس الفصل'; END IF;
  v_week:=v_date - EXTRACT(DOW FROM v_date)::int;
  SELECT count(*) INTO v_week_count FROM public.records a
    WHERE a.kind='reserve_assignment' AND a.id<>COALESCE(NEW.id,-1)
    AND a.data->>'assignedTeacherId'=v_id
    AND a.data->>'date' BETWEEN v_week::text AND v_date::text
    AND COALESCE(a.data->>'status','')<>'ملغي';
  IF v_week_count>=20 THEN RAISE EXCEPTION 'تجاوز حد الاحتياط الأسبوعي'; END IF;
  RETURN NEW;
END;
$fn$;
-- Trigger name and table remain unchanged from v29.
