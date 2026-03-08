
-- Drop all existing RESTRICTIVE policies and recreate as PERMISSIVE

-- attendance policies
DROP POLICY IF EXISTS "Teachers can view attendance for their sessions" ON public.attendance;
DROP POLICY IF EXISTS "Teachers can delete attendance for their sessions" ON public.attendance;

CREATE POLICY "Teachers can view attendance for their sessions"
ON public.attendance FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN classes c ON c.id = s.class_id
    WHERE s.id = attendance.session_id AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete attendance for their sessions"
ON public.attendance FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    JOIN classes c ON c.id = s.class_id
    WHERE s.id = attendance.session_id AND c.teacher_id = auth.uid()
  )
);

-- classes policies
DROP POLICY IF EXISTS "Teachers can manage their own classes" ON public.classes;

CREATE POLICY "Teachers can select their own classes"
ON public.classes FOR SELECT TO authenticated
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own classes"
ON public.classes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own classes"
ON public.classes FOR UPDATE TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own classes"
ON public.classes FOR DELETE TO authenticated
USING (auth.uid() = teacher_id);

-- sessions policies
DROP POLICY IF EXISTS "Teachers can manage sessions of their classes" ON public.sessions;

CREATE POLICY "Teachers can select sessions of their classes"
ON public.sessions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = sessions.class_id AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can insert sessions for their classes"
ON public.sessions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = sessions.class_id AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can update sessions of their classes"
ON public.sessions FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = sessions.class_id AND classes.teacher_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = sessions.class_id AND classes.teacher_id = auth.uid()
  )
);

CREATE POLICY "Teachers can delete sessions of their classes"
ON public.sessions FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM classes WHERE classes.id = sessions.class_id AND classes.teacher_id = auth.uid()
  )
);

-- teacher_settings policies
DROP POLICY IF EXISTS "Teachers can manage their own settings" ON public.teacher_settings;

CREATE POLICY "Teachers can select their own settings"
ON public.teacher_settings FOR SELECT TO authenticated
USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can insert their own settings"
ON public.teacher_settings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their own settings"
ON public.teacher_settings FOR UPDATE TO authenticated
USING (auth.uid() = teacher_id)
WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete their own settings"
ON public.teacher_settings FOR DELETE TO authenticated
USING (auth.uid() = teacher_id);
