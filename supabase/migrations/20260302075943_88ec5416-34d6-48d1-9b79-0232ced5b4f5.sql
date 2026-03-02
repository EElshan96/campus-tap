
-- Remove the overly permissive insert policy
DROP POLICY "Allow attendance insert via service" ON public.attendance;

-- Edge function uses service_role key which bypasses RLS, so no anon insert policy needed
-- Add a policy for authenticated users (teachers) to delete attendance if needed
CREATE POLICY "Teachers can delete attendance for their sessions"
  ON public.attendance FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sessions s
      JOIN public.classes c ON c.id = s.class_id
      WHERE s.id = attendance.session_id
      AND c.teacher_id = auth.uid()
    )
  );
