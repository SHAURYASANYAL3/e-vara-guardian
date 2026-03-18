CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.biometric_action AS ENUM ('registration', 'login');
CREATE TYPE public.liveness_challenge_type AS ENUM ('blink', 'turn_left', 'turn_right');
CREATE TYPE public.login_attempt_status AS ENUM ('success', 'failed_liveness', 'failed_match', 'duplicate_detected');
CREATE TYPE public.alert_type AS ENUM ('duplicate_identity', 'failed_login_pattern');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT,
  username TEXT,
  social_link TEXT,
  keywords TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

CREATE TABLE public.face_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  embedding_ciphertext TEXT NOT NULL,
  embedding_iv TEXT NOT NULL,
  embedding_version TEXT NOT NULL DEFAULT 'v1',
  angles_completed TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  consented_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.biometric_consent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action public.biometric_action NOT NULL,
  consent_text TEXT NOT NULL,
  consented_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.liveness_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_type public.liveness_challenge_type NOT NULL,
  instruction TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  success BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  status public.login_attempt_status NOT NULL,
  confidence NUMERIC(5,4),
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.suspicious_activity_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  matched_user_id UUID,
  alert_type public.alert_type NOT NULL,
  message TEXT NOT NULL,
  confidence NUMERIC(5,4),
  acknowledged_by_user BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_face_embeddings_user_id ON public.face_embeddings(user_id);
CREATE INDEX idx_biometric_consent_logs_user_id ON public.biometric_consent_logs(user_id);
CREATE INDEX idx_liveness_challenges_user_id ON public.liveness_challenges(user_id);
CREATE INDEX idx_login_attempts_user_id ON public.login_attempts(user_id);
CREATE INDEX idx_suspicious_activity_alerts_user_id ON public.suspicious_activity_alerts(user_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.liveness_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suspicious_activity_alerts ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.has_biometric_consent(_user_id UUID, _action public.biometric_action)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.biometric_consent_logs
    WHERE user_id = _user_id AND action = _action
  );
$$;

CREATE OR REPLACE FUNCTION public.validate_liveness_challenge()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.expires_at <= NEW.created_at THEN
    RAISE EXCEPTION 'expires_at must be after created_at';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_face_embeddings_updated_at
BEFORE UPDATE ON public.face_embeddings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER validate_liveness_challenge_trigger
BEFORE INSERT OR UPDATE ON public.liveness_challenges
FOR EACH ROW
EXECUTE FUNCTION public.validate_liveness_challenge();

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own embeddings"
ON public.face_embeddings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own embeddings with consent"
ON public.face_embeddings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND public.has_biometric_consent(auth.uid(), 'registration'));

CREATE POLICY "Users can update their own embeddings with consent"
ON public.face_embeddings
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND public.has_biometric_consent(auth.uid(), 'registration'));

CREATE POLICY "Users can view their own consent logs"
ON public.biometric_consent_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own consent logs"
ON public.biometric_consent_logs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own liveness challenges"
ON public.liveness_challenges
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own liveness challenges"
ON public.liveness_challenges
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own liveness challenges"
ON public.liveness_challenges
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own login attempts"
ON public.login_attempts
FOR SELECT
TO authenticated
USING ((user_id IS NOT NULL AND auth.uid() = user_id) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert login attempts"
ON public.login_attempts
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can view relevant alerts"
ON public.suspicious_activity_alerts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR auth.uid() = matched_user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can acknowledge their alerts"
ON public.suspicious_activity_alerts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can create alerts"
ON public.suspicious_activity_alerts
FOR INSERT
TO authenticated
WITH CHECK (true);