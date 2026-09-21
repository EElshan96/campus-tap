REVOKE SELECT ON public.attendance FROM authenticated;
GRANT SELECT (id, session_id, student_id, student_name, submitted_at) ON public.attendance TO authenticated;
GRANT DELETE ON public.attendance TO authenticated;
GRANT ALL ON public.attendance TO service_role;