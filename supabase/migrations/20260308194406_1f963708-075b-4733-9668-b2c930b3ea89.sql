
-- Re-grant table-level access for authenticated role on sessions
-- The previous REVOKE ALL removed table-level privileges needed for RLS to work
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;

-- Now restrict token_secret at column level by revoking SELECT on that specific column
REVOKE SELECT (token_secret) ON public.sessions FROM authenticated;
