
-- Classes table
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own classes"
  ON public.classes FOR ALL
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ,
  token_secret TEXT NOT NULL,
  allowed_cidrs TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage sessions of their classes"
  ON public.sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = sessions.class_id
      AND classes.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.classes
      WHERE classes.id = sessions.class_id
      AND classes.teacher_id = auth.uid()
    )
  );

-- Attendance table (public insert for students, read for teachers)
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL,
  student_name TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  on_class_network BOOLEAN DEFAULT false,
  user_agent_hash TEXT,
  UNIQUE(session_id, student_id)
);

ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Teachers can read attendance for their sessions
CREATE POLICY "Teachers can view attendance for their sessions"
  ON public.attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.classes c ON c.id = s.class_id
      WHERE s.id = attendance.session_id
      AND c.teacher_id = auth.uid()
    )
  );

-- Anyone can insert (via edge function with service role, but we add a permissive policy for anon too)
CREATE POLICY "Allow attendance insert via service"
  ON public.attendance FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Teacher settings
CREATE TABLE public.teacher_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  retention_days INTEGER NOT NULL DEFAULT 90,
  allowed_network_ranges TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teacher_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers can manage their own settings"
  ON public.teacher_settings FOR ALL
  TO authenticated
  USING (auth.uid() = teacher_id)
  WITH CHECK (auth.uid() = teacher_id);

-- Enable realtime for attendance (live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance;
