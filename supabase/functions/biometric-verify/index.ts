import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { secureHeaders, safeErrorMessage, errorStatus } from "../_shared/security-headers.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { requireEmbedding, requireLiveness, requireString, ValidationError } from "../_shared/validation.ts";
import {
  assertPostMethod,
  assertValidConsentText,
  assertValidEmbedding,
  cosineSimilarity,
  decryptEmbedding,
  getAdminClient,
  getAuthenticatedUser,
  hasRequiredChallenges,
} from "../_shared/biometric.ts";
import { checkLockout, recordFailedAttempt, clearLockout } from "../_shared/lockout.ts";
import { logAuditEvent, getClientIp } from "../_shared/audit.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, "biometric-verify", { maxRequests: 10, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

  try {
    assertPostMethod(req);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const user = await getAuthenticatedUser(authHeader);
    const admin = getAdminClient();
    const ip = getClientIp(req);

    // Check account lockout
    const lockout = await checkLockout(user.id);
    if (lockout.isLocked) {
      await logAuditEvent(user.id, "biometric.verify_failed", {
        reason: "account_locked",
        minutesRemaining: lockout.minutesRemaining,
      }, ip);

      return new Response(JSON.stringify({
        error: `Account temporarily locked due to too many failed attempts. Try again in ${lockout.minutesRemaining} minute(s).`,
        locked: true,
        minutesRemaining: lockout.minutesRemaining,
      }), { status: 429, headers: secureHeaders });
    }

    const body = await req.json();

    const embedding = requireEmbedding(body.embedding);
    const liveness = requireLiveness(body.liveness);
    const consentText = requireString(body.consentText, "consentText", 2000);

    if (!hasRequiredChallenges(liveness, ["blink"])) {
      throw new ValidationError("Liveness verification failed");
    }

    const { data: stored, error: storedError } = await admin
      .from("face_embeddings")
      .select("embedding_ciphertext, embedding_iv")
      .eq("user_id", user.id)
      .maybeSingle();
    if (storedError) throw storedError;
    if (!stored) throw new Error("No biometric enrollment found for this account");

    const storedEmbedding = await decryptEmbedding(stored.embedding_ciphertext, stored.embedding_iv);
    const confidence = cosineSimilarity(embedding, storedEmbedding);
    const verified = confidence >= 0.86;

    const { error: consentError } = await admin.from("biometric_consent_logs").insert({
      user_id: user.id,
      action: "login",
      consent_text: consentText,
    });
    if (consentError) throw consentError;

    const { error: loginAttemptError } = await admin.from("login_attempts").insert({
      user_id: user.id,
      status: verified ? "success" : "failed_match",
      confidence: Number(confidence.toFixed(4)),
      details: {
        blinkDetected: Boolean(liveness.blinkDetected),
        completedChallenges: liveness.completedChallenges,
        sampleCount: liveness.sampleCount,
      },
    });
    if (loginAttemptError) throw loginAttemptError;

    // Handle lockout tracking
    if (verified) {
      await clearLockout(user.id);
      await logAuditEvent(user.id, "biometric.verify_success", {
        confidence: Number(confidence.toFixed(4)),
      }, ip);
    } else {
      const lockoutResult = await recordFailedAttempt(user.id);
      await logAuditEvent(user.id, "biometric.verify_failed", {
        confidence: Number(confidence.toFixed(4)),
        failedAttempts: lockoutResult.failedAttempts,
        lockoutTriggered: lockoutResult.isLocked,
      }, ip);

      if (lockoutResult.isLocked) {
        await logAuditEvent(user.id, "biometric.lockout_triggered", {
          failedAttempts: lockoutResult.failedAttempts,
          lockedUntil: lockoutResult.lockedUntil,
        }, ip);
      }
    }

    return new Response(JSON.stringify({
      verified,
      confidence: Number(confidence.toFixed(4)),
    }), {
      status: 200,
      headers: secureHeaders,
    });
  } catch (error) {
    const message = safeErrorMessage(error, "Verification failed");
    return new Response(JSON.stringify({ error: message }), {
      status: errorStatus(message),
      headers: secureHeaders,
    });
  }
});
