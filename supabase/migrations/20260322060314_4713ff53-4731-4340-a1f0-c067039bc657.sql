-- Fix overly permissive INSERT policy on audit_logs
DROP POLICY "Service role can insert audit logs" ON public.audit_logs;

-- Only allow inserting audit logs for the authenticated user's own ID or by admins
CREATE POLICY "Authenticated users can insert own audit logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));