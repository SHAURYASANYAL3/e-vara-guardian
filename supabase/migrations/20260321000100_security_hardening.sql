ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.face_embeddings
  ADD CONSTRAINT face_embeddings_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.biometric_consent_logs
  ADD CONSTRAINT biometric_consent_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.liveness_challenges
  ADD CONSTRAINT liveness_challenges_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.login_attempts
  ADD CONSTRAINT login_attempts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT login_attempts_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

ALTER TABLE public.suspicious_activity_alerts
  ADD CONSTRAINT suspicious_activity_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT suspicious_activity_alerts_matched_user_id_fkey FOREIGN KEY (matched_user_id) REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT suspicious_activity_alerts_confidence_range CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1));

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique
ON public.profiles (lower(username))
WHERE username IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at
ON public.login_attempts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_suspicious_activity_alerts_created_at
ON public.suspicious_activity_alerts (created_at DESC);
