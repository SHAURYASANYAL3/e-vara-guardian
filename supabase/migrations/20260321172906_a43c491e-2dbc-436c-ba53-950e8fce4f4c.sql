
-- ============================================================
-- FIX 1: Prevent users from self-approving liveness challenges
-- Remove permissive INSERT/UPDATE policies and replace with
-- admin-only or security-definer controlled access.
-- ============================================================

-- Drop existing permissive policies on liveness_challenges
DROP POLICY IF EXISTS "Users can insert their own liveness challenges" ON public.liveness_challenges;
DROP POLICY IF EXISTS "Users can update their own liveness challenges" ON public.liveness_challenges;

-- Only server (service_role via edge functions) should insert/update liveness challenges.
-- Users can still SELECT their own.
CREATE POLICY "Only admins can insert liveness challenges"
ON public.liveness_challenges
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update liveness challenges"
ON public.liveness_challenges
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- FIX 2: Prevent users from setting acknowledged_by_admin on alerts
-- Replace the broad UPDATE policy with a security definer function
-- ============================================================

-- Drop the existing broad UPDATE policy
DROP POLICY IF EXISTS "Users can acknowledge their alerts" ON public.suspicious_activity_alerts;

-- Create a security definer function for acknowledging alerts safely
CREATE OR REPLACE FUNCTION public.acknowledge_alert(_alert_id uuid, _is_admin boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _alert_user_id uuid;
BEGIN
  SELECT user_id INTO _alert_user_id
  FROM public.suspicious_activity_alerts
  WHERE id = _alert_id;

  IF _alert_user_id IS NULL THEN
    RAISE EXCEPTION 'Alert not found';
  END IF;

  IF _is_admin AND has_role(auth.uid(), 'admin'::app_role) THEN
    UPDATE public.suspicious_activity_alerts
    SET acknowledged_by_admin = true
    WHERE id = _alert_id;
  ELSIF NOT _is_admin AND auth.uid() = _alert_user_id THEN
    UPDATE public.suspicious_activity_alerts
    SET acknowledged_by_user = true
    WHERE id = _alert_id;
  ELSE
    RAISE EXCEPTION 'Forbidden';
  END IF;
END;
$$;

-- No UPDATE policy for regular users on this table anymore.
-- All acknowledgments go through the security definer function.
-- Admins still need an UPDATE policy for the edge function (service_role bypasses RLS anyway).
