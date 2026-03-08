
-- Revoke all column privileges on sessions from authenticated, then grant only non-sensitive columns
REVOKE ALL ON public.sessions FROM authenticated;
GRANT SELECT (id, class_id, name, starts_at, ends_at, allowed_cidrs, created_at) ON public.sessions TO authenticated;
GRANT INSERT (id, class_id, name, starts_at, ends_at, allowed_cidrs, created_at, token_secret) ON public.sessions TO authenticated;
GRANT UPDATE (id, class_id, name, starts_at, ends_at, allowed_cidrs, created_at) ON public.sessions TO authenticated;
GRANT DELETE ON public.sessions TO authenticated;
