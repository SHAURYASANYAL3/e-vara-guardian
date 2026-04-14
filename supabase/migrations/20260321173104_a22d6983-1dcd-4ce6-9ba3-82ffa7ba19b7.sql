
-- Add a trigger to prevent non-admin privilege escalation on user_roles
-- Only the handle_new_user trigger (SECURITY DEFINER) can insert 'user' role.
-- This trigger blocks any INSERT of 'admin' role unless the invoker is already an admin.
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow 'user' role insertions (from handle_new_user trigger)
  IF NEW.role = 'user' THEN
    RETURN NEW;
  END IF;

  -- For 'admin' role, verify the caller is already an admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Only existing admins can grant admin roles';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_prevent_role_escalation
  BEFORE INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();
