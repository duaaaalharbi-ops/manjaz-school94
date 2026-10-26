-- Enforce the sixth-edition class-stage restriction for Fatima Hassan.
-- Applies to new and edited assignments; historical rows are left untouched.
CREATE OR REPLACE FUNCTION public.mj_reserve_fatima_class_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_teacher_name text;
  v_teacher_id bigint;
  v_class text;
BEGIN
  IF NEW.kind <> 'reserve_assignment' THEN
    RETURN NEW;
  END IF;

  -- Preserve acknowledgments and other updates to existing assignment details.
  IF TG_OP='UPDATE' AND OLD.kind=NEW.kind
     AND OLD.data->>'assignedTeacherId' IS NOT DISTINCT FROM NEW.data->>'assignedTeacherId'
     AND OLD.data->>'className' IS NOT DISTINCT FROM NEW.data->>'className' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.data->>'assignedTeacherId','') !~ '^[0-9]+$' THEN
    RETURN NEW;
  END IF;

  v_teacher_id := (NEW.data->>'assignedTeacherId')::bigint;
  SELECT r.data->>'name'
    INTO v_teacher_name
    FROM public.records AS r
   WHERE r.kind='reserve_teacher'
     AND r.id=v_teacher_id
     AND COALESCE(r.data->>'active','true')='true'
   ORDER BY r.id DESC
   LIMIT 1;

  IF v_teacher_name IS DISTINCT FROM 'فاطمة حسن' THEN
    RETURN NEW;
  END IF;

  v_class := btrim(COALESCE(NEW.data->>'className',''));
  IF v_class !~ '^(أول|اول|الأول|ثاني|الثاني)' THEN
    RAISE EXCEPTION 'فاطمة حسن تُكلف بالاحتياط في فصول الأول أو الثاني الثانوي فقط';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS mj_reserve_fatima_class_guard ON public.records;
CREATE TRIGGER mj_reserve_fatima_class_guard
BEFORE INSERT OR UPDATE ON public.records
FOR EACH ROW
EXECUTE FUNCTION public.mj_reserve_fatima_class_guard();
