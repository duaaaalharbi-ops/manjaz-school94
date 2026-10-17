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

CREATE OR REPLACE FUNCTION public.mj_duty_save(p_date date,p_assignments jsonb)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE n integer; distinct_positions integer; distinct_people integer; bad_count integer; previous jsonb;
 BEGIN
 PERFORM public.mj_duty_require_admin();
 IF p_date IS NULL OR jsonb_typeof(p_assignments)<>'array' THEN RAISE EXCEPTION 'التاريخ أو الجدول غير صالح'; END IF;
 SELECT count(*),count(distinct (r.slot,r.position)),count(distinct r.person_id::text)
 INTO n,distinct_positions,distinct_people
 FROM jsonb_to_recordset(p_assignments) AS r(slot text,position integer,person_id uuid);
 IF n<>18 OR distinct_positions<>18 OR distinct_people<>18 THEN
  RAISE EXCEPTION 'يجب تحديد ١٨ منفذة مختلفة، ٦ لكل فترة'; END IF;
 SELECT count(*) INTO bad_count FROM jsonb_to_recordset(p_assignments) AS r(slot text,position integer,person_id uuid)
 LEFT JOIN public.mj_duty_people p ON p.id=r.person_id AND p.active
 WHERE r.slot NOT IN ('morning','break','end') OR r.slot IS NULL OR r.position NOT BETWEEN 1 AND 6 OR p.id IS NULL;
 IF bad_count>0 THEN RAISE EXCEPTION 'أسماء أو فترات غير صالحة'; END IF;
 -- Exact 18 distinct valid positions across three periods means 6 each.
 INSERT INTO public.mj_duty_day(duty_date) VALUES(p_date) ON CONFLICT(duty_date) DO NOTHING;
 SELECT coalesce(jsonb_agg(jsonb_build_object('slot',slot,'position',position,'person_id',person_id)),'[]'::jsonb)
 INTO previous FROM public.mj_duty_assignments WHERE duty_date=p_date;
 DELETE FROM public.mj_duty_assignments WHERE duty_date=p_date;
 INSERT INTO public.mj_duty_assignments(duty_date,slot,position,person_id)
 SELECT p_date,r.slot,r.position,r.person_id FROM jsonb_to_recordset(p_assignments) AS r(slot text,position integer,person_id uuid);
 -- Preserve existing links and acknowledgment for unchanged assignments only.
 DELETE FROM public.mj_duty_links l WHERE l.duty_date=p_date AND NOT EXISTS (
  SELECT 1 FROM public.mj_duty_assignments a,
    jsonb_to_recordset(previous) AS oldrow(slot text,position integer,person_id uuid)
  WHERE a.duty_date=l.duty_date AND a.person_id=l.person_id
  AND oldrow.person_id=a.person_id AND oldrow.slot=a.slot AND oldrow.position=a.position
 );
 UPDATE public.mj_duty_day SET published_at=NULL,updated_at=now() WHERE duty_date=p_date;
 RETURN jsonb_build_object('saved',true,'date',p_date,'assignments',18);
 END; $$;

CREATE OR REPLACE FUNCTION public.mj_duty_generate(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE v_slot text; v_pos int; chosen uuid; elig int; total int;
 BEGIN
 PERFORM public.mj_duty_require_admin();
 IF p_date IS NULL THEN RAISE EXCEPTION 'التاريخ مطلوب';END IF;
 SELECT count(*) INTO elig FROM public.mj_duty_people WHERE active AND role='administrative';
 IF elig<6 THEN RAISE EXCEPTION 'يلزم وجود ٦ إداريات نشطات على الأقل لمناوبة الفسحة'; END IF;
 SELECT count(*) INTO total FROM public.mj_duty_people WHERE active;
 IF total<18 THEN RAISE EXCEPTION 'يلزم وجود ١٨ منفذة نشطة على الأقل دون تكرار يومي';END IF;
 INSERT INTO public.mj_duty_day(duty_date) VALUES(p_date) ON CONFLICT(duty_date) DO NOTHING;
 DELETE FROM public.mj_duty_links WHERE duty_date=p_date;
 DELETE FROM public.mj_duty_assignments WHERE duty_date=p_date;
 -- Break runs FIRST so it is guaranteed to be reserved for administrators.
 FOREACH v_slot IN ARRAY ARRAY['break','morning','end'] LOOP
  FOR v_pos IN 1..6 LOOP
   SELECT p.id INTO chosen FROM public.mj_duty_people p
   WHERE p.active AND (v_slot<>'break' OR p.role='administrative')
    AND NOT EXISTS (SELECT 1 FROM public.mj_duty_assignments current_day
      WHERE current_day.duty_date=p_date AND current_day.person_id=p.id)
   ORDER BY
      (SELECT count(*) FROM public.mj_duty_assignments hist WHERE hist.person_id=p.id AND hist.duty_date < p_date),
      (SELECT count(*) FROM public.mj_duty_assignments hist WHERE hist.person_id=p.id AND hist.slot=v_slot AND hist.duty_date < p_date),
      COALESCE((SELECT max(hist.duty_date) FROM public.mj_duty_assignments hist WHERE hist.person_id=p.id AND hist.duty_date<p_date),'2000-01-01'::date),
      random()
   LIMIT 1;
   IF chosen IS NULL THEN RAISE EXCEPTION 'عدد المنفذات المؤهلات غير كافٍ للتوليد الآلي'; END IF;
   INSERT INTO public.mj_duty_assignments(duty_date,slot,position,person_id)
   VALUES(p_date,v_slot,v_pos,chosen);
  END LOOP;
 END LOOP;
 UPDATE public.mj_duty_day SET published_at=NULL,updated_at=now() WHERE duty_date=p_date;
 RETURN jsonb_build_object('generated',true,'date',p_date,'count',18,'break_role','administrative');
 END; $$;

CREATE OR REPLACE FUNCTION public.mj_duty_publish(p_date date)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
 DECLARE total int;
 BEGIN
 PERFORM public.mj_duty_require_admin();
 SELECT count(*) INTO total FROM public.mj_duty_assignments WHERE duty_date=p_date;
 IF total<>18 THEN RAISE EXCEPTION 'لا يمكن النشر قبل اكتمال ١٨ تكليفًا'; END IF;
 INSERT INTO public.mj_duty_links(duty_date,person_id)
 SELECT p_date,a.person_id FROM public.mj_duty_assignments a WHERE a.duty_date=p_date
 ON CONFLICT (duty_date,person_id) DO NOTHING;
 UPDATE public.mj_duty_day SET published_at=coalesce(published_at,now()),updated_at=now() WHERE duty_date=p_date;
 RETURN jsonb_build_object('published',true,'links',18,'date',p_date);
 END; $$;

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

REVOKE ALL ON FUNCTION public.mj_duty_save(date,jsonb),public.mj_duty_generate(date),public.mj_duty_publish(date),public.mj_duty_link_view(uuid),public.mj_duty_ack(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mj_duty_save(date,jsonb),public.mj_duty_generate(date),public.mj_duty_publish(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mj_duty_link_view(uuid),public.mj_duty_ack(uuid) TO anon,authenticated;
COMMIT;
