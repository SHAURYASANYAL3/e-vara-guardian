alter table public.profiles
  add constraint profiles_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.profiles validate constraint profiles_user_id_fkey;

alter table public.user_roles
  add constraint user_roles_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.user_roles validate constraint user_roles_user_id_fkey;

alter table public.face_embeddings
  add constraint face_embeddings_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.face_embeddings validate constraint face_embeddings_user_id_fkey;

alter table public.biometric_consent_logs
  add constraint biometric_consent_logs_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.biometric_consent_logs validate constraint biometric_consent_logs_user_id_fkey;

alter table public.liveness_challenges
  add constraint liveness_challenges_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.liveness_challenges validate constraint liveness_challenges_user_id_fkey;

alter table public.login_attempts
  add constraint login_attempts_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null not valid;
alter table public.login_attempts validate constraint login_attempts_user_id_fkey;

alter table public.suspicious_activity_alerts
  add constraint suspicious_activity_alerts_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade not valid;
alter table public.suspicious_activity_alerts validate constraint suspicious_activity_alerts_user_id_fkey;

alter table public.suspicious_activity_alerts
  add constraint suspicious_activity_alerts_matched_user_id_fkey
  foreign key (matched_user_id) references auth.users(id) on delete set null not valid;
alter table public.suspicious_activity_alerts validate constraint suspicious_activity_alerts_matched_user_id_fkey;

alter table public.login_attempts
  add constraint login_attempts_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1));

alter table public.suspicious_activity_alerts
  add constraint suspicious_activity_alerts_confidence_range check (confidence is null or (confidence >= 0 and confidence <= 1));

alter table public.face_embeddings
  add constraint face_embeddings_angles_completed_check check (
    angles_completed <@ array['front', 'turn_left', 'turn_right']::text[]
  );

create unique index if not exists profiles_username_unique_ci
  on public.profiles (lower(username))
  where username is not null;

create index if not exists idx_login_attempts_created_at
  on public.login_attempts (created_at desc);

create index if not exists idx_suspicious_activity_alerts_created_at
  on public.suspicious_activity_alerts (created_at desc);

drop policy if exists "Users can insert their own login attempts" on public.login_attempts;
