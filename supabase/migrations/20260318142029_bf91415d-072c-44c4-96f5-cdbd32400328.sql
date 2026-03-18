DROP POLICY IF EXISTS "Service can insert login attempts" ON public.login_attempts;
DROP POLICY IF EXISTS "Authenticated users can create alerts" ON public.suspicious_activity_alerts;

CREATE POLICY "Users can insert their own login attempts"
ON public.login_attempts
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create alerts"
ON public.suspicious_activity_alerts
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));