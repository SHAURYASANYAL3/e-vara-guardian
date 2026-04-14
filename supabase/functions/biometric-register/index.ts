import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { secureHeaders, safeErrorMessage, errorStatus } from "../_shared/security-headers.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { requireEmbedding, requireAngles, requireLiveness, requireString, optionalString, ValidationError } from "../_shared/validation.ts";
import {
  assertPostMethod,
  assertValidConsentText,
  cosineSimilarity,
  createDuplicateAlerts,
  decryptEmbedding,
  encryptEmbedding,
  getAdminClient,
  getAuthenticatedUser,
  dedupeMatches,
  hasRequiredChallenges,
  sanitizeProfileInput,
} from "../_shared/biometric.ts";
import { logAuditEvent, getClientIp } from "../_shared/audit.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, "biometric-register", { maxRequests: 5, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

  try {
    assertPostMethod(req);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const user = await getAuthenticatedUser(authHeader);
    const admin = getAdminClient();
    const ip = getClientIp(req);
    const body = await req.json();

    const embedding = requireEmbedding(body.embedding);
    const anglesCompleted = requireAngles(body.anglesCompleted);
    const liveness = requireLiveness(body.liveness);
    const consentText = requireString(body.consentText, "consentText", 2000);
    const displayName = body.profile?.displayName
      ? requireString(body.profile.displayName, "displayName", 100)
      : user.email?.split("@")[0] ?? "Protected User";
    const username = optionalString(body.profile?.username, "username", 50);
    const socialLink = optionalString(body.profile?.socialLink, "socialLink", 500);
    const keywords = optionalString(body.profile?.keywords, "keywords", 500);

    if (!hasRequiredChallenges(liveness, ["blink", "turn_left", "turn_right"])) {
      throw new ValidationError("Liveness verification failed during enrollment");
    }

    const encrypted = await encryptEmbedding(embedding);
    const sanitizedProfile = sanitizeProfileInput(profile, user.email?.split("@")[0] ?? "Protected User");

    const { error: profileError } = await admin.from("profiles").upsert({
      user_id: user.id,
      display_name: displayName,
      username,
      social_link: socialLink,
      keywords,
    }, { onConflict: "user_id" });
    if (profileError) throw profileError;

    const { error: consentError } = await admin.from("biometric_consent_logs").insert({
      user_id: user.id,
      action: "registration",
      consent_text: consentText,
    });
    if (consentError) throw consentError;

    const { error: embeddingError } = await admin.from("face_embeddings").upsert({
      user_id: user.id,
      ...encrypted,
      angles_completed: anglesCompleted,
      consented_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (embeddingError) throw embeddingError;

    const { data: existingEmbeddings, error: existingError } = await admin
      .from("face_embeddings")
      .select("user_id, embedding_ciphertext, embedding_iv")
      .neq("user_id", user.id);
    if (existingError) throw existingError;

    const duplicateMatches: Array<{ userId: string; confidence: number }> = [];

    for (const row of existingEmbeddings ?? []) {
      const decrypted = await decryptEmbedding(row.embedding_ciphertext, row.embedding_iv);
      const confidence = cosineSimilarity(embedding, decrypted);
      if (confidence >= 0.92) {
        duplicateMatches.push({ userId: row.user_id, confidence });
      }
    }

    await createDuplicateAlerts(admin, user.id, dedupeMatches(duplicateMatches));

    await logAuditEvent(user.id, "biometric.enroll", {
      anglesCompleted,
      duplicateMatches: duplicateMatches.length,
    }, ip);

    if (duplicateMatches.length > 0) {
      await logAuditEvent(user.id, "biometric.duplicate_detected", {
        matchCount: duplicateMatches.length,
        matchedUserIds: duplicateMatches.map((m) => m.userId),
      }, ip);
    }

    return new Response(JSON.stringify({
      enrolled: true,
      duplicateMatches: duplicateMatches.length,
    }), {
      status: 200,
      headers: secureHeaders,
    });
  } catch (error) {
    const message = safeErrorMessage(error, "Enrollment failed");
    return new Response(JSON.stringify({ error: message }), {
      status: errorStatus(message),
      headers: secureHeaders,
    });
  }
});
