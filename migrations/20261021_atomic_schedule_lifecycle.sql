-- Manjaz School 94: transaction-safe schedule lifecycle.
-- No existing schedule data is changed by installing these functions.
-- Deploy client before running the separate legacy-RPC revocation.
CREATE TABLE IF NOT EXISTS public.mj_duty_table_revision (
  duty_date date PRIMARY KEY,
  revision uuid NOT NULL DEFAULT gen_random_uuid(),
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.mj_duty_table_revision ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.mj_duty_table_revision FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.mj_duty_revision_get(p_date date)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE v_revision uuid;
BEGIN
  PERFORM public.mj_duty_require_admin();
  IF p_date IS NULL THEN RAISE EXCEPTION 'تاريخ المناوبة مطلوب'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('manjaz-duty:'||p_date::text, 0));
  INSERT INTO public.mj_duty_table_revision(duty_date) VALUES(p_date)
  ON CONFLICT(duty_date) DO NOTHING;
  SELECT revision INTO v_revision FROM public.mj_duty_table_revision WHERE duty_date=p_date;
  RETURN v_revision::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.mj_duty_mutate_v2(
  p_date date,p_action text,p_revision text,p_assignments jsonb DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE v_revision uuid; v_next uuid; v_result jsonb; v_assignments int; v_links int; v_days int;
BEGIN
  PERFORM public.mj_duty_require_admin();
  IF p_date IS NULL OR p_action NOT IN ('save','generate','delete','publish') OR
     p_revision IS NULL OR p_revision !~* '^[0-9a-f-]{36}$'
  THEN RAISE EXCEPTION 'بيانات أو نسخة جدول المناوبة غير صالحة.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('manjaz-duty:'||p_date::text,0));
  INSERT INTO public.mj_duty_table_revision(duty_date) VALUES(p_date)
  ON CONFLICT(duty_date) DO NOTHING;
  SELECT revision INTO v_revision FROM public.mj_duty_table_revision
  WHERE duty_date=p_date FOR UPDATE;
  IF v_revision::text <> p_revision THEN
    RAISE EXCEPTION 'نسخة الجدول قديمة بعد تعديل أو حذف سابق؛ أعيدي تحميل اليوم قبل تنفيذ أي إجراء.';
  END IF;
  IF p_action='save' THEN
    IF p_assignments IS NULL THEN RAISE EXCEPTION 'تكليفات المناوبة مطلوبة'; END IF;
    SELECT public.mj_duty_save(p_date,p_assignments) INTO v_result;
  ELSIF p_action='generate' THEN
    SELECT public.mj_duty_generate(p_date) INTO v_result;
  ELSIF p_action='publish' THEN
    SELECT public.mj_duty_publish(p_date) INTO v_result;
  ELSE
    -- A real deletion, including the parent day, rather than only unpublishing.
    DELETE FROM public.mj_duty_day WHERE duty_date=p_date;
    -- Child assignments and notification links are removed ON DELETE CASCADE.
    -- Administrative edit audit is retained solely as historical accountability.
    SELECT count(*) INTO v_days FROM public.mj_duty_day WHERE duty_date=p_date;
    SELECT count(*) INTO v_assignments FROM public.mj_duty_assignments WHERE duty_date=p_date;
    SELECT count(*) INTO v_links FROM public.mj_duty_links WHERE duty_date=p_date;
    IF v_days<>0 OR v_assignments<>0 OR v_links<>0 THEN
      RAISE EXCEPTION 'لم تُحذف جميع سجلات المناوبة. تم إلغاء المعاملة بالكامل.';
    END IF;
    v_result=jsonb_build_object('deleted',true,'date',p_date::text,
      'remainingDays',v_days,'remainingAssignments',v_assignments,'remainingLinks',v_links);
  END IF;
  UPDATE public.mj_duty_table_revision
  SET revision=gen_random_uuid(),changed_at=clock_timestamp()
  WHERE duty_date=p_date RETURNING revision INTO v_next;
  RETURN coalesce(v_result,'{}'::jsonb) || jsonb_build_object('revision',v_next::text);
END;
$$;

CREATE OR REPLACE FUNCTION public.manjaz_reserve_sync_auto_selection(
  p_date date,p_teacher_ids text[],p_expected_revision text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE v_revision uuid; v_next uuid; v_old text[]; v_wanted text[]; v_removed integer:=0;
  v_removed_drafts integer:=0; v_retained_shared integer:=0;
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
  SELECT revision INTO v_revision FROM public.manjaz_reserve_table_revision
    WHERE reserve_date=p_date AND creation_mode='auto' FOR UPDATE;
  IF v_revision::text IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'تغيرت نسخة جدول الاحتياط؛ أعيدي فتح اليوم قبل إعادة التوليد.';
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
$$;

REVOKE ALL ON FUNCTION public.mj_duty_revision_get(date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mj_duty_mutate_v2(date,text,text,jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.manjaz_reserve_sync_auto_selection(date,text[],text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mj_duty_revision_get(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mj_duty_mutate_v2(date,text,text,jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.manjaz_reserve_sync_auto_selection(date,text[],text) TO authenticated;
