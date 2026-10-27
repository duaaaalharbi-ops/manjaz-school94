-- Fix first-day revisions, atomic absence extraction, dropdown edits and independent reduced-load teacher.
CREATE OR REPLACE FUNCTION public.manjaz_reserve_sync_auto_selection(p_date date, p_teacher_ids text[], p_expected_revision text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE v_revision uuid; v_next uuid; v_old text[]; v_wanted text[]; v_removed integer:=0;
  v_removed_drafts integer:=0; v_retained_shared integer:=0; v_created integer:=0;
BEGIN
  IF auth.uid() IS NULL OR lower(coalesce(auth.jwt()->>'email','')) <> 'munjz.s94@hotmail.com'
  THEN RAISE EXCEPTION 'يلزم الدخول الإداري المعتمد.'; END IF;
  IF p_date IS NULL OR p_teacher_ids IS NULL OR array_length(p_teacher_ids,1) IS NULL
     OR coalesce(p_expected_revision,'')=''
  THEN RAISE EXCEPTION 'اختاري المعلمات الغائبات والتاريخ أولًا.'; END IF;
  IF EXISTS(SELECT 1 FROM unnest(p_teacher_ids) x WHERE x IS NULL OR btrim(x)='')
  THEN RAISE EXCEPTION 'اختيار غير صالح لمعلمة غائبة.'; END IF;
  -- Identical lock order as hard deletion; no stale writes can cross a revision boundary.
  PERFORM pg_advisory_xact_lock(hashtextextended('manjaz-reserve:'||p_date::text||':auto',0));
  PERFORM pg_advisory_xact_lock(hashtextextended('manjaz-reserve:'||p_date::text||':manual',0));
  INSERT INTO public.manjaz_reserve_table_revision(reserve_date,creation_mode)
  VALUES (p_date,'auto') ON CONFLICT (reserve_date,creation_mode) DO NOTHING;
  GET DIAGNOSTICS v_created=ROW_COUNT;
  SELECT revision INTO v_revision FROM public.manjaz_reserve_table_revision
    WHERE reserve_date=p_date AND creation_mode='auto' FOR UPDATE;
  IF v_revision::text IS DISTINCT FROM p_expected_revision
     AND NOT (v_created=1 AND p_expected_revision='legacy') THEN
    RAISE EXCEPTION 'تغيرت نسخة جدول الاحتياط؛ أعيدي فتح اليوم قبل إعادة التوليد.';
  END IF;
  -- Only the transaction that initialized the day can adopt a legacy revision.
  -- Existing published rows keep their contents and receive the initial fence.
  IF v_created=1 THEN
    UPDATE public.records SET data=jsonb_set(data,'{reserveRevision}',to_jsonb(v_revision::text),true)
    WHERE data->>'date'=p_date::text AND
      ((kind='reserve_absence' AND data->>'source'='auto') OR
       (kind='reserve_assignment' AND data->>'manual' IS DISTINCT FROM 'true'))
      AND coalesce(data->>'reserveRevision','legacy')='legacy';
  END IF;
  SELECT coalesce(array_agg(k ORDER BY k),ARRAY[]::text[]) INTO v_old FROM (
    SELECT DISTINCT data->>'teacherId' k FROM public.records
    WHERE kind='reserve_absence' AND data->>'date'=p_date::text AND data->>'source'='auto'
  ) old_ids;
  SELECT coalesce(array_agg(k ORDER BY k),ARRAY[]::text[]) INTO v_wanted FROM (
    SELECT DISTINCT btrim(x) k FROM unnest(p_teacher_ids) x
  ) selected_ids;
  IF v_old IS NOT DISTINCT FROM v_wanted THEN
    RETURN jsonb_build_object('ok',true,'changed',false,'revision',v_revision::text);
  END IF;
  -- Never silently replace an already published/approved automatic table.
  IF EXISTS (SELECT 1 FROM public.records WHERE kind='reserve_assignment'
      AND data->>'date'=p_date::text AND data->>'manual' IS DISTINCT FROM 'true'
      AND (data->>'published'='true' OR status='معتمد')) THEN
    RAISE EXCEPTION 'يوجد احتياط آلي معتمد لهذا اليوم؛ لا يمكن استبداله من اختيار الغياب. راجعي الجدول أو استخدمي حذفه الصريح.';
  END IF;
  DELETE FROM public.records
  WHERE kind='reserve_assignment' AND data->>'date'=p_date::text
    AND data->>'manual' IS DISTINCT FROM 'true';
  GET DIAGNOSTICS v_removed_drafts=ROW_COUNT;

  -- If an absence is shared by surviving manual assignments, preserve it as
  -- a manual absence; other automatic absences are physically removed.
  UPDATE public.records a SET data=jsonb_set(
    jsonb_set(a.data,'{source}',to_jsonb('manual'::text),true),
    '{reserveRevision}',to_jsonb(coalesce((
      SELECT rr.revision::text FROM public.manjaz_reserve_table_revision rr
      WHERE rr.reserve_date=p_date AND rr.creation_mode='manual'),'legacy')),true),
    updated_at=clock_timestamp()
  WHERE a.kind='reserve_absence' AND a.data->>'date'=p_date::text AND
    a.data->>'source'='auto' AND EXISTS (
      SELECT 1 FROM public.records a2 WHERE a2.kind='reserve_assignment' AND
      a2.data->>'date'=p_date::text AND a2.data->>'manual'='true' AND
      a2.data->>'absentTeacherId'=a.data->>'teacherId'
    );
  GET DIAGNOSTICS v_retained_shared=ROW_COUNT;
  DELETE FROM public.records
  WHERE kind='reserve_absence' AND data->>'date'=p_date::text AND data->>'source'='auto';
  GET DIAGNOSTICS v_removed=ROW_COUNT;
  UPDATE public.manjaz_reserve_table_revision
  SET revision=gen_random_uuid(),changed_at=clock_timestamp()
  WHERE reserve_date=p_date AND creation_mode='auto' RETURNING revision INTO v_next;
  IF EXISTS (SELECT 1 FROM public.records
    WHERE data->>'date'=p_date::text AND (
      (kind='reserve_absence' AND data->>'source'='auto') OR
      (kind='reserve_assignment' AND data->>'manual' IS DISTINCT FROM 'true'))) THEN
    RAISE EXCEPTION 'تعذر تصفير المسودة السابقة؛ تم التراجع عن العملية.';
  END IF;
  RETURN jsonb_build_object('ok',true,'changed',true,'revision',v_next::text,
    'removedDrafts',v_removed_drafts,'removedAbsences',v_removed,
    'preservedManualAbsences',v_retained_shared);
END;
$function$;

CREATE OR REPLACE FUNCTION public.mj_reserve_enforce_auto_v50()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_teacher public.records%ROWTYPE;
  v_manual_pick boolean := false;
  v_previous date;
  v_date date;
  v_week date;
  v_day text;
  v_id text;
  v_name text;
  v_role text;
  v_class text;
  v_period integer;
  v_full boolean;
  v_support boolean := false;
  v_workload integer := 0;
  v_orig_today integer := 0;
  v_week_ceiling integer := 24;
  v_daily_ceiling integer;
  v_daily_used integer := 0;
  v_week_used integer := 0;
  v_schedule jsonb;
BEGIN
  IF NEW.kind<>'reserve_assignment'
     OR coalesce(NEW.data->>'manual','false')<>'false'
     OR coalesce(NEW.data->>'source','auto')<>'auto' THEN RETURN NEW; END IF;

  -- Manual dropdown choices keep their auto table's identity and revision.
  -- Only the authenticated school administrator may set this provenance.
  v_manual_pick := NEW.data->>'assigneeSelection'='manual'
    AND auth.uid() IS NOT NULL
    AND lower(coalesce(auth.jwt()->>'email',''))='munjz.s94@hotmail.com';
  v_manual_pick := coalesce(v_manual_pick,false);

  -- Leave historical acknowledgment and activation-only updates unchanged.
  IF TG_OP='UPDATE' AND OLD.kind=NEW.kind AND
    (OLD.data->>'date',OLD.data->>'period',OLD.data->>'className',
     OLD.data->>'absentTeacherId',OLD.data->>'assignedTeacherId',
     OLD.data->>'manual',OLD.data->>'source',
     OLD.data->>'published',OLD.data->>'fullCadreEnabled',OLD.data->>'assigneeSelection',OLD.status)
    IS NOT DISTINCT FROM
    (NEW.data->>'date',NEW.data->>'period',NEW.data->>'className',
     NEW.data->>'absentTeacherId',NEW.data->>'assignedTeacherId',
     NEW.data->>'manual',NEW.data->>'source',
     NEW.data->>'published',NEW.data->>'fullCadreEnabled',NEW.data->>'assigneeSelection',NEW.status)
  THEN RETURN NEW; END IF;

  BEGIN
    v_id := coalesce(NEW.data->>'assignedTeacherId','');
    IF v_id='' THEN
      IF coalesce(NEW.data->>'published','false')='true' THEN
        RAISE EXCEPTION 'لا يجوز نشر تكليف احتياط دون معلمة مسندة';
      END IF;
      RETURN NEW;
    END IF;
    IF coalesce(NEW.data->>'date','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
       OR coalesce(NEW.data->>'period','') !~ '^[1-7]$' THEN
      RAISE EXCEPTION 'تاريخ الاحتياط أو الحصة غير صالح';
    END IF;

    v_date:=(NEW.data->>'date')::date;
    v_period:=(NEW.data->>'period')::integer;
    v_class:=coalesce(NEW.data->>'className','');
    v_full:=v_manual_pick OR coalesce(NEW.data->>'fullCadreEnabled','false')='true';
    v_day:=CASE extract(dow from v_date)::integer
      WHEN 0 THEN 'sun' WHEN 1 THEN 'mon' WHEN 2 THEN 'tue'
      WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' ELSE '' END;
    IF v_day='' THEN RAISE EXCEPTION 'الترشيح الآلي مخصص لأيام الدراسة'; END IF;
    v_previous:=v_date-CASE WHEN v_day='sun' THEN 3 ELSE 1 END;
    v_daily_ceiling:=CASE WHEN EXISTS(
      SELECT 1 FROM public.records a WHERE a.kind='reserve_absence'
        AND a.data->>'teacherId'=v_id AND a.data->>'date'=v_previous::text
        AND jsonb_array_length(coalesce(a.data->'periods','[]'::jsonb))>0
    ) THEN 5 ELSE 4 END;

    IF v_id IN ('reserve_support_1','reserve_support_2','reserve_support_3') THEN
      v_support:=true;
      v_name:=CASE v_id
        WHEN 'reserve_support_1' THEN 'دخيلة المالكي'
        WHEN 'reserve_support_2' THEN 'مها العتيبي'
        ELSE 'نجلاء هوساوي' END;
      IF NOT v_full THEN RAISE EXCEPTION 'الكادر المساند لا يدخل دون تفعيل الكادر الكامل'; END IF;
    ELSE
      IF v_id !~ '^[0-9]+$' THEN RAISE EXCEPTION 'معرف المعلمة غير صالح'; END IF;
      SELECT * INTO v_teacher FROM public.records
        WHERE kind='reserve_teacher' AND id=v_id::bigint;
      IF NOT FOUND OR coalesce(v_teacher.data->>'active','true')='false' THEN
        RAISE EXCEPTION 'المعلمة غير مسجلة ضمن الكادر النشط';
      END IF;
      v_name:=coalesce(v_teacher.data->>'name','');
      v_role:=concat_ws(' ',v_teacher.data->>'role',
        v_teacher.data->>'jobTitle',v_teacher.data->>'position');
      v_support:=coalesce(v_teacher.data->>'supportStaff','false')='true'
        OR v_role~'مرشد|إرشاد|ارشاد|توجيه طلاب|محضر.*مختبر|مختبر'
        OR v_name IN ('دخيلة المالكي','مها العتيبي','نجلاء هوساوي');
      IF v_support AND NOT v_full THEN
        RAISE EXCEPTION 'الكادر المساند لا يدخل دون تفعيل الكادر الكامل';
      END IF;
      IF NOT v_support THEN
        IF coalesce(v_teacher.data->>'workload','') !~ '^[0-9]+$' THEN
          RAISE EXCEPTION 'النصاب الأصلي غير موثق';
        END IF;
        v_workload:=(v_teacher.data->>'workload')::integer;
        IF v_name IN ('دعاء الحربي','عوالي السبيعي','حصة المنتشري',
          'عايدة الصاعدي','عواطف الحربي','ريم القحطاني',
          'بدرية الحربي','بدريه الحربي','حنان المجنوني') THEN
          v_week_ceiling:=22;
        ELSE v_week_ceiling:=24;
        END IF;
      END IF;
    END IF;

    IF v_name IN ('دخنة الشهري','دخنه الشهري') OR (NOT v_manual_pick AND v_name='نورة الهودان') THEN
      RAISE EXCEPTION 'المعلمة مستثناة بصورة دائمة من الاحتياط الآلي';
    END IF;

    IF NOT v_manual_pick AND NOT v_support AND coalesce(v_teacher.data->>'absoluteExcluded','false')='true' THEN
      RAISE EXCEPTION 'المعلمة مستثناة من الاحتياط الآلي';
    END IF;

    IF NOT v_full AND NOT v_support AND (
      coalesce(v_teacher.data->>'excluded','false')='true'
      OR coalesce(v_teacher.data->>'permanentExcluded','false')='true'
      OR v_name IN ('أفراح الجدعاني','إيمان الجدعاني','أيمان الجدعاني',
        'حصة المنتشري','عبير المولد','لمياء البلادي','لمياء البالدي',
        'نجوى الغامدي','نورة العنزي','عايدة الصاعدي','عواطف الحربي',
        'بدرية الحربي','بدريه الحربي')
    ) THEN RAISE EXCEPTION 'الترشيح الآلي غير متاح لهذه المعلمة دون تفعيل الكادر الكامل'; END IF;

    IF NOT v_manual_pick AND v_name IN ('رية الحربي','ريه الحربي','ريه الجربي')
       AND v_class !~ '^(أول|اول)' THEN
      RAISE EXCEPTION 'رية الحربي لا تُرشح إلا للصف الأول الثانوي';
    END IF;

    IF v_id=coalesce(NEW.data->>'absentTeacherId','') OR EXISTS(
      SELECT 1 FROM public.records a WHERE a.kind='reserve_absence'
        AND a.data->>'date'=v_date::text AND a.data->>'teacherId'=v_id
    ) THEN RAISE EXCEPTION 'المعلمة غائبة في اليوم المطلوب'; END IF;

    IF v_name='ريم الحربي' AND
      ((v_day IN ('sun','mon') AND v_period=7)
       OR (v_day IN ('tue','wed','thu') AND v_period=6)) THEN
      RAISE EXCEPTION 'ساعة الرضاعة تمنع الترشيح لهذه الحصة';
    END IF;

    IF NOT v_support THEN
      SELECT a.data->'timetable'->v_day INTO v_schedule
      FROM public.records a WHERE a.kind='reserve_schedule'
        AND a.data->>'teacherId'=v_id ORDER BY a.id DESC LIMIT 1;
      IF v_schedule IS NULL OR jsonb_typeof(v_schedule)<>'array' THEN
        RAISE EXCEPTION 'لا يوجد جدول أصلي معتمد للمعلمة';
      END IF;
      IF nullif(btrim(coalesce(v_schedule->>(v_period-1),'')),'') IS NOT NULL THEN
        RAISE EXCEPTION 'تعارض مع حصة أصلية أو نشاط';
      END IF;
      SELECT count(*) INTO v_orig_today
      FROM jsonb_array_elements_text(v_schedule) AS x(cell)
      WHERE btrim(x.cell)<>'';
    END IF;

    IF EXISTS(
      SELECT 1 FROM public.records a WHERE a.kind='reserve_assignment'
        AND a.id<>coalesce(NEW.id,-1)
        AND a.data->>'date'=v_date::text
        AND a.data->>'assignedTeacherId'=v_id
        AND coalesce(a.data->>'status',a.status,'')<>'ملغي'
        AND a.data->>'period'=v_period::text
    ) THEN RAISE EXCEPTION 'احتياطان متزامنان للمعلمة نفسها'; END IF;

    SELECT count(*) INTO v_daily_used FROM public.records a
      WHERE a.kind='reserve_assignment' AND a.id<>coalesce(NEW.id,-1)
        AND a.data->>'date'=v_date::text
        AND a.data->>'assignedTeacherId'=v_id
        AND coalesce(a.data->>'status',a.status,'')<>'ملغي';

    IF (v_orig_today=0 AND v_daily_used+1>3) OR v_orig_today+v_daily_used+1>v_daily_ceiling THEN
      RAISE EXCEPTION 'تجاوز السقف اليومي: أربع حصص إجمالًا أو خمس لتسديد غياب سابق، وثلاث احتياط عند عدم وجود حصص أصلية';
    END IF;

    v_week:=v_date-extract(dow from v_date)::integer;
    SELECT count(*) INTO v_week_used FROM public.records a
      WHERE a.kind='reserve_assignment' AND a.id<>coalesce(NEW.id,-1)
        AND a.data->>'assignedTeacherId'=v_id
        AND a.data->>'date' BETWEEN v_week::text AND (v_week+4)::text
        AND coalesce(a.data->>'status',a.status,'')<>'ملغي';

    IF v_name IN ('رية الحربي','ريه الحربي','ريه الجربي') AND v_week_used+1>2 THEN
      RAISE EXCEPTION 'رية الحربي: الحد الأسبوعي حصتا احتياط';
    END IF;
    RETURN NEW;
  EXCEPTION WHEN raise_exception THEN
    IF NOT v_manual_pick AND coalesce(NEW.data->>'published','false')<>'true'
      AND coalesce(NEW.data->>'date','') ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      AND coalesce(NEW.data->>'period','') ~ '^[1-7]$' THEN
      NEW.data:=NEW.data||jsonb_build_object(
        'assignedTeacherId','','assignedTeacherName','',
        'candidates','[]'::jsonb,'draftAutoCandidateNote',SQLERRM);
      RETURN NEW;
    END IF;
    RAISE;
  END;
END
$function$;

-- Register the full selected absence set and its extracted periods atomically.
CREATE OR REPLACE FUNCTION public.manjaz_reserve_register_absences(
  p_date date,p_teacher_ids text[],p_expected_revision text,p_reason text DEFAULT 'غياب'
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog','public'
AS $$
DECLARE
  v_result jsonb; v_id text; v_teacher public.records%ROWTYPE;
  v_existing public.records%ROWTYPE; v_timetable jsonb; v_periods jsonb;
  v_day text; v_inserted integer:=0; v_period_count integer:=0;
BEGIN
  IF auth.uid() IS NULL OR lower(coalesce(auth.jwt()->>'email',''))<>'munjz.s94@hotmail.com'
  THEN RAISE EXCEPTION 'يلزم الدخول الإداري المعتمد.'; END IF;
  v_day:=CASE extract(dow from p_date)::integer WHEN 0 THEN 'sun' WHEN 1 THEN 'mon'
    WHEN 2 THEN 'tue' WHEN 3 THEN 'wed' WHEN 4 THEN 'thu' ELSE '' END;
  IF v_day='' OR v_day IS NULL THEN RAISE EXCEPTION 'اختاري يومًا دراسيًا صحيحًا.'; END IF;
  -- This rotates the revision and clears obsolete drafts in this transaction.
  -- Any invalid teacher or write failure rolls back the whole selection.
  v_result:=public.manjaz_reserve_sync_auto_selection(p_date,p_teacher_ids,p_expected_revision);
  FOR v_id IN SELECT DISTINCT btrim(x) FROM unnest(p_teacher_ids) x LOOP
    SELECT * INTO v_teacher FROM public.records
      WHERE kind='reserve_teacher' AND id::text=v_id
        AND coalesce(data->>'active','true')<>'false';
    IF NOT FOUND THEN RAISE EXCEPTION 'إحدى الغائبات غير موجودة في سجل الكادر النشط.'; END IF;
    SELECT data->'timetable'->v_day INTO v_timetable FROM public.records
      WHERE kind='reserve_schedule' AND data->>'teacherId'=v_id ORDER BY id DESC LIMIT 1;
    IF v_timetable IS NULL OR jsonb_typeof(v_timetable)<>'array'
    THEN RAISE EXCEPTION 'لا يوجد جدول أصلي للمعلمة %.',v_teacher.data->>'name'; END IF;
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'period',ord,'className',btrim(split_part(cell,'|',1)),
      'activity',position('|نشاط' in cell)>0) ORDER BY ord),'[]'::jsonb)
    INTO v_periods FROM jsonb_array_elements_text(v_timetable) WITH ORDINALITY slots(cell,ord)
    WHERE ord BETWEEN 1 AND 7 AND btrim(split_part(cell,'|',1))<>'';
    SELECT * INTO v_existing FROM public.records WHERE kind='reserve_absence'
      AND data->>'date'=p_date::text AND data->>'teacherId'=v_id ORDER BY id DESC LIMIT 1;
    IF FOUND THEN
      UPDATE public.records SET data=v_existing.data||jsonb_build_object(
        'teacherName',v_teacher.data->>'name','periods',v_periods,
        'reason',coalesce(nullif(btrim(p_reason),''),'غياب')),
        updated_at=clock_timestamp() WHERE id=v_existing.id;
    ELSE
      INSERT INTO public.records(kind,data,status,updated_at) VALUES('reserve_absence',
        jsonb_build_object('date',p_date::text,'dayKey',v_day,'teacherId',v_id,
          'teacherName',v_teacher.data->>'name','reason',coalesce(nullif(btrim(p_reason),''),'غياب'),
          'periods',v_periods,'source','auto','reserveRevision',v_result->>'revision',
          'createdAt',clock_timestamp()),'معتمد',clock_timestamp());
      v_inserted:=v_inserted+1;
    END IF;
    v_period_count:=v_period_count+jsonb_array_length(v_periods);
  END LOOP;
  RETURN v_result||jsonb_build_object('insertedCount',v_inserted,'periodCount',v_period_count,
    'teacherCount',(SELECT count(DISTINCT btrim(x)) FROM unnest(p_teacher_ids) x));
END;
$$;
REVOKE ALL ON FUNCTION public.manjaz_reserve_register_absences(date,text[],text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manjaz_reserve_register_absences(date,text[],text,text) TO authenticated;

-- A real teacher row with its own timetable, not a synthetic support-staff ID.
DO $$
DECLARE v_teacher_id bigint; v_schedule_id bigint; v_leila_id text; v_awatif_id text;
  v_empty jsonb:='{"sun":["","","","","","",""],"mon":["","","","","أول4","",""],"tue":["","","","","","",""],"wed":["","","","","","",""],"thu":["","","","أول2","","أول3",""]}'::jsonb;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('manjaz-reserve-teacher:reduced-load',0));
  SELECT id INTO v_teacher_id FROM public.records WHERE kind='reserve_teacher'
    AND data->>'name'='تخفيض نصاب' ORDER BY id LIMIT 1;
  IF v_teacher_id IS NULL THEN
    INSERT INTO public.records(kind,data,status,updated_at) VALUES('reserve_teacher',
      jsonb_build_object('name','تخفيض نصاب','subject','','workload',3,'active',true,
        'excluded',false,'supportStaff',false,'independentTeacher',true,
        'sourceVersion','v6-1448-04-27','createdAt',clock_timestamp()),'معتمد',clock_timestamp())
      RETURNING id INTO v_teacher_id;
  ELSE
    UPDATE public.records SET data=data||jsonb_build_object('active',true,'supportStaff',false,
      'independentTeacher',true,'workload',3,'sourceVersion','v6-1448-04-27'),updated_at=clock_timestamp()
      WHERE id=v_teacher_id;
  END IF;
  SELECT id INTO v_schedule_id FROM public.records WHERE kind='reserve_schedule'
    AND data->>'teacherId'=v_teacher_id::text ORDER BY id DESC LIMIT 1;
  IF v_schedule_id IS NULL THEN
    INSERT INTO public.records(kind,data,status,updated_at) VALUES('reserve_schedule',
      jsonb_build_object('teacherId',v_teacher_id::text,'teacherName','تخفيض نصاب',
        'timetable',v_empty,'sourceVersion','v6-1448-04-27'), 'معتمد',clock_timestamp());
  ELSE
    UPDATE public.records SET data=jsonb_set(data,'{timetable}',v_empty),updated_at=clock_timestamp()
      WHERE id=v_schedule_id;
  END IF;
  SELECT id::text INTO v_leila_id FROM public.records WHERE kind='reserve_teacher'
    AND data->>'name'='ليلى مجرشي' ORDER BY id LIMIT 1;
  SELECT id::text INTO v_awatif_id FROM public.records WHERE kind='reserve_teacher'
    AND data->>'name'='عواطف الحربي' ORDER BY id LIMIT 1;
  UPDATE public.records SET data=jsonb_set(jsonb_set(jsonb_set(data,
    '{timetable,mon,4}','""'),'{timetable,thu,3}','""'),'{timetable,thu,5}','""'),updated_at=clock_timestamp()
    WHERE kind='reserve_schedule' AND data->>'teacherId'=v_leila_id;
  UPDATE public.records SET data=jsonb_set(data,'{timetable,wed,6}','"أول1"'),updated_at=clock_timestamp()
    WHERE kind='reserve_schedule' AND data->>'teacherId'=v_awatif_id;
  UPDATE public.records t SET data=jsonb_set(t.data,'{workload}',to_jsonb((
    SELECT count(*)::integer FROM public.records s,
      LATERAL jsonb_each(s.data->'timetable') days(day,cells),
      LATERAL jsonb_array_elements_text(days.cells) cell
    WHERE s.id=(SELECT id FROM public.records z WHERE z.kind='reserve_schedule'
      AND z.data->>'teacherId'=t.id::text ORDER BY id DESC LIMIT 1) AND btrim(cell)<>''
  ))),updated_at=clock_timestamp() WHERE t.kind='reserve_teacher' AND t.id::text IN(v_leila_id,v_awatif_id);
END;
$$;
