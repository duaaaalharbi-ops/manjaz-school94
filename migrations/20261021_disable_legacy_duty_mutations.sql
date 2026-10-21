-- Disable unfenced legacy mutations after GitHub Pages deployed the revision-aware client.
-- Retain functions for v2 SECURITY DEFINER internal delegation, not callable by browsers.
REVOKE EXECUTE ON FUNCTION public.mj_duty_save(date,jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mj_duty_generate(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mj_duty_delete_day(date) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mj_duty_publish(date) FROM PUBLIC, anon, authenticated;