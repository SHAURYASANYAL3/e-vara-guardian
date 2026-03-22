import { getAdminClient } from "./biometric.ts";

export type AuditEventType =
  | "auth.login"
  | "auth.login_failed"
  | "auth.register"
  | "auth.logout"
  | "auth.social_login"
  | "biometric.enroll"
  | "biometric.enroll_failed"
  | "biometric.verify_success"
  | "biometric.verify_failed"
  | "biometric.lockout_triggered"
  | "biometric.lockout_cleared"
  | "biometric.duplicate_detected"
  | "admin.alert_acknowledged"
  | "admin.role_changed";

export async function logAuditEvent(
  userId: string | null,
  eventType: AuditEventType,
  details: Record<string, unknown> = {},
  ipAddress?: string,
) {
  const admin = getAdminClient();
  await admin.from("audit_logs").insert({
    user_id: userId,
    event_type: eventType,
    details,
    ip_address: ipAddress ?? null,
  });
}

export function getClientIp(req: Request): string | undefined {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}
