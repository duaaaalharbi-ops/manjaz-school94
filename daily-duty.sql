-- MANJAZ daily duty: isolated data model, manual + fair auto generation.
-- Apply ONCE in Supabase SQL Editor, after reviewing the administrator email.
-- Does not alter the existing records/reserve tables.
BEGIN;
CREATE TABLE IF NOT EXISTS public.mj_duty_people (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 full_name text NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 2 AND 160),
 role text NOT NULL CHECK (role IN ('teacher','administrative')),
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (full_name,role)
);
CREATE TABLE IF NOT EXISTS public.mj_duty_day (
 duty_date date PRIMARY KEY,
 published_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.mj_duty_assignments (
 duty_date date NOT NULL REFERENCES public.mj_duty_day(duty_date) ON DELETE CASCADE,
 slot text NOT NULL CHECK (slot IN ('morning','break','end')),
 position integer NOT NULL CHECK (position BETWEEN 1 AND 6),
 person_id uuid NOT NULL REFERENCES public.mj_duty_people(id),
 PRIMARY KEY (duty_date,slot,position),
 UNIQUE (duty_date,person_id)
);
CREATE TABLE IF NOT EXISTS public.mj_duty_links (
 duty_date date NOT NULL REFERENCES public.mj_duty_day(duty_date) ON DELETE CASCADE,
 person_id uuid NOT NULL REFERENCES public.mj_duty_people(id),
 link_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 viewed_at timestamptz,
 PRIMARY KEY(duty_date,person_id)
);
ALTER TABLE public.mj_duty_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mj_duty_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mj_duty_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mj_duty_links ENABLE ROW LEVEL SECURITY;
-- No public SELECT on link tokens, and no direct anon writes.
REVOKE ALL ON public.mj_duty_people, public.mj_duty_day, public.mj_duty_assignments, public.mj_duty_links FROM anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON public.mj_duty_people TO authenticated;
GRANT SELECT ON public.mj_duty_day, public.mj_duty_assignments, public.mj_duty_links TO authenticated;

DO $$ DECLARE t text; BEGIN
 FOR t IN SELECT unnest(ARRAY['mj_duty_people','mj_duty_day','mj_duty_assignments','mj_duty_links']) LOOP
  EXECUTE format('DROP POLICY IF EXISTS mj_duty_admin_select ON public.%I',t);
  EXECUTE format('CREATE POLICY mj_duty_admin_select ON public.%I FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL AND lower(coalesce(auth.jwt()->>''email'','''')) = ''munjz.s94@hotmail.com'')',t);
 END LOOP;
END $$;
DROP POLICY IF EXISTS mj_duty_admin_insert ON public.mj_duty_people;
DROP POLICY IF EXISTS mj_duty_admin_update ON public.mj_duty_people;
CREATE POLICY mj_duty_admin_insert ON public.mj_duty_people FOR INSERT TO authenticated
 WITH CHECK (auth.uid() IS NOT NULL AND lower(coalesce(auth.jwt()->>'email',''))='munjz.s94@hotmail.com');
CREATE POLICY mj_duty_admin_update ON public.mj_duty_people FOR UPDATE TO authenticated
 USING (auth.uid() IS NOT NULL AND lower(coalesce(auth.jwt()->>'email',''))='munjz.s94@hotmail.com')
 WITH CHECK (auth.uid() IS NOT NULL AND lower(coalesce(auth.jwt()->>'email',''))='munjz.s94@hotmail.com');

-- All security-definer RPCs check the server-side authenticated admin identity.
CREATE OR REPLACE FUNCTION public.mj_duty_require_admin() RETURNS void
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 BEGIN
 IF auth.uid() IS NULL OR lower(coalesce(auth.jwt()->>'email','')) <> 'munjz.s94@hotmail.com' THEN
 RAISE EXCEPTION 'ليس لديك صلاحية إدارة المناوبة'; END IF;
 END; $$;
REVOKE ALL ON FUNCTION public.mj_duty_require_admin() FROM PUBLIC,anon,authenticated;

-- Flexible schedule: 1..6 per period, maximum 18; do not store blank slots.
CREATE OR REPLACE FUNCTION public.mj_duty_save(p_date date,p_assignments jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE n int; distinct_places int; distinct_people int; valid_count int; period_count int; previous jsonb;
 BEGIN
 PERFORM public.mj_duty_require_admin();
 IF p_date IS NULL OR jsonb_typeof(p_assignments)<>'array' THEN RAISE EXCEPTION 'التاريخ أو الجدول غير صالح'; END IF;
 SELECT count(*), count(distinct (x.slot,x.position)), count(distinct x.person_id),
 count(*) FILTER (WHERE x.slot IN ('morning','break','end') AND x.position BETWEEN 1 AND 6 AND p.id IS NOT NULL)
 INTO n,distinct_places,distinct_people,valid_count
 FROM jsonb_to_recordset(p_assignments) x(slot text,position int,person_id uuid)
 LEFT JOIN public.mj_duty_people p ON p.id=x.person_id AND p.active;
 IF n<3 OR n>18 OR distinct_places<>n OR distinct_people<>n OR valid_count<>n
 THEN RAISE EXCEPTION 'جدول غير صالح: اختاري من ١ إلى ٦ منفذات مختلفات لكل فترة'; END IF;
 SELECT count(*) INTO period_count FROM (
 SELECT x.slot,count(*) ct FROM jsonb_to_recordset(p_assignments) x(slot text,position int,person_id uuid) GROUP BY x.slot
 ) z WHERE z.ct BETWEEN 1 AND 6;
 IF period_count<>3 THEN RAISE EXCEPTION 'يلزم اختيار منفذة واحدة على الأقل في كل فترة، وبحد أقصى ٦'; END IF;
 INSERT INTO public.mj_duty_day(duty_date) VALUES(p_date) ON CONFLICT(duty_date) DO NOTHING;
 -- Replace only this day's schedule. Invalidate changed personal links, retaining unchanged acknowledgments.
 SELECT coalesce(jsonb_agg(jsonb_build_object('slot',slot,'position',position,'person_id',person_id)),'[]'::jsonb)
 INTO previous FROM public.mj_duty_assignments WHERE duty_date=p_date;
 DELETE FROM public.mj_duty_assignments WHERE duty_date=p_date;
 INSERT INTO public.mj_duty_assignments(duty_date,slot,position,person_id)
 SELECT p_date,x.slot,x.position,x.person_id FROM jsonb_to_recordset(p_assignments) x(slot text,position int,person_id uuid);
 DELETE FROM public.mj_duty_links l WHERE l.duty_date=p_date AND NOT EXISTS(
 SELECT 1 FROM public.mj_duty_assignments a
 JOIN jsonb_to_recordset(previous) AS old(slot text,position int,person_id uuid)
 ON old.slot=a.slot AND old.position=a.position AND old.person_id=a.person_id
 WHERE a.duty_date=l.duty_date AND a.person_id=l.person_id);
 UPDATE public.mj_duty_day SET published_at=NULL,updated_at=now() WHERE duty_date=p_date;
 RETURN jsonb_build_object('saved',true,'date',p_date,'assignments',n);
 END; $$;

-- Automatic generation targets up to six per period, with an even split when fewer staff are eligible.
CREATE OR REPLACE FUNCTION public.mj_duty_generate(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE v_slot text; v_pos int; chosen uuid; administrators int; available int;
 break_target int; morning_target int; end_target int; target int; generated int:=0;
 BEGIN
 PERFORM public.mj_duty_require_admin();
 IF p_date IS NULL THEN RAISE EXCEPTION 'التاريخ مطلوب'; END IF;
 SELECT count(*) INTO administrators FROM public.mj_duty_people WHERE active AND role='administrative';
 SELECT count(*) INTO available FROM public.mj_duty_people WHERE active;
 IF administrators<1 OR available<3 THEN RAISE EXCEPTION 'يلزم وجود إدارية واحدة وثلاث منفذات نشطات على الأقل'; END IF;
 break_target := least(6,administrators,available-2);
 morning_target := least(6,ceil((available-break_target)::numeric/2)::int);
 end_target := least(6,available-break_target-morning_target);
 IF least(break_target,morning_target,end_target)<1 THEN RAISE EXCEPTION 'لا توجد أسماء كافية لكل الفترات'; END IF;
 INSERT INTO public.mj_duty_day(duty_date) VALUES(p_date) ON CONFLICT(duty_date) DO NOTHING;
 DELETE FROM public.mj_duty_links WHERE duty_date=p_date;
 DELETE FROM public.mj_duty_assignments WHERE duty_date=p_date;
 FOREACH v_slot IN ARRAY ARRAY['break','morning','end'] LOOP
  target := CASE v_slot WHEN 'break' THEN break_target WHEN 'morning' THEN morning_target ELSE end_target END;
  FOR v_pos IN 1..target LOOP
   SELECT p.id INTO chosen FROM public.mj_duty_people p
   WHERE p.active AND (v_slot<>'break' OR p.role='administrative')
   AND NOT EXISTS (SELECT 1 FROM public.mj_duty_assignments a WHERE a.duty_date=p_date AND a.person_id=p.id)
   ORDER BY
    (SELECT count(*) FROM public.mj_duty_assignments hist JOIN public.mj_duty_day used ON used.duty_date=hist.duty_date AND used.published_at IS NOT NULL WHERE hist.person_id=p.id AND hist.duty_date<p_date),
    (SELECT count(*) FROM public.mj_duty_assignments hist JOIN public.mj_duty_day used ON used.duty_date=hist.duty_date AND used.published_at IS NOT NULL WHERE hist.person_id=p.id AND hist.slot=v_slot AND hist.duty_date<p_date),
    COALESCE((SELECT max(hist.duty_date) FROM public.mj_duty_assignments hist JOIN public.mj_duty_day used ON used.duty_date=hist.duty_date AND used.published_at IS NOT NULL WHERE hist.person_id=p.id AND hist.duty_date<p_date),'2000-01-01'::date),random()
   LIMIT 1;
   IF chosen IS NULL THEN RAISE EXCEPTION 'تعذر إيجاد منفذة مؤهلة للفترة'; END IF;
   INSERT INTO public.mj_duty_assignments(duty_date,slot,position,person_id) VALUES(p_date,v_slot,v_pos,chosen);
   generated:=generated+1;
  END LOOP;
 END LOOP;
 UPDATE public.mj_duty_day SET published_at=NULL,updated_at=now() WHERE duty_date=p_date;
 RETURN jsonb_build_object('generated',true,'count',generated,'break_role','administrative');
 END; $$;

CREATE OR REPLACE FUNCTION public.mj_duty_publish(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE n int; periods int;
 BEGIN
 PERFORM public.mj_duty_require_admin();
 SELECT count(*),count(distinct slot) INTO n,periods FROM public.mj_duty_assignments WHERE duty_date=p_date;
 IF n<3 OR n>18 OR periods<>3 THEN RAISE EXCEPTION 'يلزم تكليف منفذة واحدة على الأقل لكل فترة قبل النشر'; END IF;
 INSERT INTO public.mj_duty_links(duty_date,person_id)
 SELECT p_date,a.person_id FROM public.mj_duty_assignments a WHERE a.duty_date=p_date
 ON CONFLICT(duty_date,person_id) DO NOTHING;
 UPDATE public.mj_duty_day SET published_at=coalesce(published_at,now()),updated_at=now() WHERE duty_date=p_date;
 RETURN jsonb_build_object('published',true,'date',p_date,'links',n);
 END; $$;

CREATE OR REPLACE FUNCTION public.mj_duty_delete_day(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 BEGIN
 PERFORM public.mj_duty_require_admin();
 DELETE FROM public.mj_duty_links WHERE duty_date=p_date;
 DELETE FROM public.mj_duty_assignments WHERE duty_date=p_date;
 UPDATE public.mj_duty_day SET published_at=NULL,updated_at=now() WHERE duty_date=p_date;
 RETURN jsonb_build_object('deleted',true,'date',p_date);
 END; $$;

-- Public published table without tokens or unpublished drafts.
CREATE OR REPLACE FUNCTION public.mj_duty_public_day(p_date date)
 RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('published',EXISTS(SELECT 1 FROM public.mj_duty_day d WHERE d.duty_date=p_date AND d.published_at IS NOT NULL),
 'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('slot',a.slot,'position',a.position,'name',p.full_name,'role',p.role,'viewed_at',l.viewed_at)
 ORDER BY CASE a.slot WHEN 'morning' THEN 1 WHEN 'break' THEN 2 ELSE 3 END,a.position)
 FROM public.mj_duty_assignments a
 JOIN public.mj_duty_day d ON d.duty_date=a.duty_date AND d.published_at IS NOT NULL
 JOIN public.mj_duty_people p ON p.id=a.person_id
 LEFT JOIN public.mj_duty_links l ON l.duty_date=a.duty_date AND l.person_id=a.person_id
 WHERE a.duty_date=p_date),'[]'::jsonb)); $$;

-- Published-only statistics: Hijri month boundary is computed by the client (Umm Al-Qura).
CREATE OR REPLACE FUNCTION public.mj_duty_public_stats(p_date date,p_month_start date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE out_json jsonb; week_start date; prev_start date;
 BEGIN
 IF p_date IS NULL OR p_month_start IS NULL OR p_month_start>p_date OR p_month_start<p_date-40
 THEN RAISE EXCEPTION 'تاريخ الإحصائيات غير صالح'; END IF;
 week_start:=p_date-extract(dow from p_date)::int;
 prev_start:=week_start-7;
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',q.full_name,'role',q.role,
   'day_count',q.day_count,'week_count',q.week_count,'previous_week_count',q.previous_week_count,
   'month_count',q.month_count,'total_count',q.total_count,'morning_count',q.morning_count,'break_count',q.break_count,'end_count',q.end_count)
   ORDER BY q.total_count DESC,q.full_name),'[]'::jsonb) INTO out_json
 FROM (
 SELECT p.full_name,p.role,
  count(*) FILTER (WHERE a.duty_date=p_date) AS day_count,
  count(*) FILTER (WHERE a.duty_date BETWEEN week_start AND p_date) AS week_count,
  count(*) FILTER (WHERE a.duty_date BETWEEN prev_start AND week_start-1) AS previous_week_count,
  count(*) FILTER (WHERE a.duty_date BETWEEN p_month_start AND p_date) AS month_count,
  count(*) AS total_count,
  count(*) FILTER (WHERE a.slot='morning') AS morning_count,
  count(*) FILTER (WHERE a.slot='break') AS break_count,
  count(*) FILTER (WHERE a.slot='end') AS end_count
 FROM public.mj_duty_assignments a
 JOIN public.mj_duty_day d ON d.duty_date=a.duty_date AND d.published_at IS NOT NULL
 JOIN public.mj_duty_people p ON p.id=a.person_id
 WHERE a.duty_date<=p_date
 GROUP BY p.full_name,p.role,p.id
 ) q;
 RETURN jsonb_build_object('rows',out_json);
 END; $$;

-- Original personal token view and acknowledgment, retained with no changes.
-- A private, one-person link: no list of other staff is exposed to its holder.
CREATE OR REPLACE FUNCTION public.mj_duty_link_view(p_token uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE result jsonb;
 BEGIN
 SELECT jsonb_build_object('date',l.duty_date,'name',p.full_name,
    'viewed_at',l.viewed_at,
    'slots',coalesce((SELECT jsonb_agg(jsonb_build_object('slot',a.slot,'position',a.position) ORDER BY a.slot)
       FROM public.mj_duty_assignments a WHERE a.duty_date=l.duty_date AND a.person_id=l.person_id),'[]'::jsonb))
 INTO result FROM public.mj_duty_links l
 JOIN public.mj_duty_day d ON d.duty_date=l.duty_date AND d.published_at IS NOT NULL
 JOIN public.mj_duty_people p ON p.id=l.person_id
 WHERE l.link_token=p_token;
 IF result IS NULL THEN RAISE EXCEPTION 'الرابط غير صالح أو انتهت صلاحيته'; END IF;
 RETURN result;
 END; $$;
CREATE OR REPLACE FUNCTION public.mj_duty_ack(p_token uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE saved timestamptz;
 BEGIN
 UPDATE public.mj_duty_links l SET viewed_at=coalesce(l.viewed_at,now())
 WHERE l.link_token=p_token AND EXISTS(
  SELECT 1 FROM public.mj_duty_day d WHERE d.duty_date=l.duty_date AND d.published_at IS NOT NULL)
 RETURNING l.viewed_at INTO saved;
 IF NOT FOUND THEN RAISE EXCEPTION 'الرابط غير صالح أو لم تنشر المناوبة'; END IF;
 RETURN jsonb_build_object('acknowledged',true,'at',saved);
 END; $$;


REVOKE ALL ON FUNCTION public.mj_duty_save(date,jsonb),public.mj_duty_generate(date),
 public.mj_duty_publish(date),public.mj_duty_delete_day(date),public.mj_duty_public_day(date),
 public.mj_duty_public_stats(date,date),public.mj_duty_link_view(uuid),public.mj_duty_ack(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mj_duty_save(date,jsonb),public.mj_duty_generate(date),
 public.mj_duty_publish(date),public.mj_duty_delete_day(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mj_duty_public_day(date),public.mj_duty_public_stats(date,date),
 public.mj_duty_link_view(uuid),public.mj_duty_ack(uuid) TO anon,authenticated;

INSERT INTO public.mj_duty_people (full_name, role, active)
VALUES
  ('ابتسام علي موسى العبدلي', 'administrative', true),
  ('امل حمدان حمدي الحربي', 'administrative', true),
  ('بيده علي زيدان الحارثي', 'administrative', true),
  ('خلود مانع عبدالعزيز الحربي', 'administrative', true),
  ('دلال بنت جندب بن ثابت المعلوي', 'administrative', true),
  ('دلال سفر سعيد قحطاني', 'administrative', true),
  ('ساره بنت حسن بن بخيت الزهراني', 'administrative', true),
  ('سعدى سعود عزيز الغامدي', 'administrative', true),
  ('صالحه عبدالله علي الزهراني', 'administrative', true),
  ('عائشه سعد مسعد المعبدي', 'administrative', true),
  ('عبير عبدالله عليوي المالكي', 'administrative', true),
  ('عزه حسن عبدالله العمري', 'administrative', true),
  ('فاطمة دليم سعيد قماش', 'administrative', true),
  ('فاطمة علي غرامة العمري', 'administrative', true),
  ('فاطمه عواض يحيى الزهراني', 'administrative', true),
  ('فايزه حسن صالح الحميري', 'administrative', true),
  ('مشاعل فالح فلاح العتيبي', 'administrative', true)
ON CONFLICT (full_name, role) DO NOTHING;

COMMIT;
