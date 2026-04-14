import { getAdminClient } from "./biometric.ts";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

export interface LockoutStatus {
  isLocked: boolean;
  failedAttempts: number;
  lockedUntil: string | null;
  minutesRemaining: number;
}

export async function checkLockout(userId: string): Promise<LockoutStatus> {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from("account_lockouts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    return { isLocked: false, failedAttempts: 0, lockedUntil: null, minutesRemaining: 0 };
  }

  const now = new Date();
  if (data.locked_until && new Date(data.locked_until) > now) {
    const remaining = Math.ceil((new Date(data.locked_until).getTime() - now.getTime()) / 60_000);
    return {
      isLocked: true,
      failedAttempts: data.failed_attempts,
      lockedUntil: data.locked_until,
      minutesRemaining: remaining,
    };
  }

  // Lock expired — reset if it was locked
  if (data.locked_until) {
    await admin.from("account_lockouts").update({
      failed_attempts: 0,
      locked_until: null,
    }).eq("user_id", userId);
    return { isLocked: false, failedAttempts: 0, lockedUntil: null, minutesRemaining: 0 };
  }

  return {
    isLocked: false,
    failedAttempts: data.failed_attempts,
    lockedUntil: null,
    minutesRemaining: 0,
  };
}

export async function recordFailedAttempt(userId: string): Promise<LockoutStatus> {
  const admin = getAdminClient();
  const { data: existing } = await admin
    .from("account_lockouts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const newCount = (existing?.failed_attempts ?? 0) + 1;
  const shouldLock = newCount >= MAX_FAILED_ATTEMPTS;
  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_DURATION_MINUTES * 60_000).toISOString()
    : null;

  if (existing) {
    await admin.from("account_lockouts").update({
      failed_attempts: newCount,
      locked_until: lockedUntil,
      last_failed_at: new Date().toISOString(),
    }).eq("user_id", userId);
  } else {
    await admin.from("account_lockouts").insert({
      user_id: userId,
      failed_attempts: newCount,
      locked_until: lockedUntil,
      last_failed_at: new Date().toISOString(),
    });
  }

  return {
    isLocked: shouldLock,
    failedAttempts: newCount,
    lockedUntil,
    minutesRemaining: shouldLock ? LOCKOUT_DURATION_MINUTES : 0,
  };
}

export async function clearLockout(userId: string): Promise<void> {
  const admin = getAdminClient();
  await admin.from("account_lockouts").upsert({
    user_id: userId,
    failed_attempts: 0,
    locked_until: null,
    last_failed_at: null,
  }, { onConflict: "user_id" });
}
