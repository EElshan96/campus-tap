ALTER TABLE public.attendance ALTER COLUMN on_class_network DROP DEFAULT;
ALTER TABLE public.attendance ALTER COLUMN user_agent_hash DROP DEFAULT;
ALTER TABLE public.attendance ALTER COLUMN ip_address DROP DEFAULT;
ALTER TABLE public.sessions ALTER COLUMN allowed_cidrs DROP DEFAULT;
ALTER TABLE public.teacher_settings ALTER COLUMN allowed_network_ranges DROP DEFAULT;