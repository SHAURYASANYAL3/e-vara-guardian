import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { secureHeaders, safeErrorMessage, errorStatus } from "../_shared/security-headers.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { requireEmbedding, requireLiveness, requireString, ValidationError } from "../_shared/validation.ts";
import {
  assertValidConsentText,
  assertValidEmbedding,
  cosineSimilarity,
  decryptEmbedding,
  getAdminClient,
  getAuthenticatedUser,
  hasRequiredChallenges,
} from "../_shared/biometric.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Stricter limit: 10 attempts per minute to prevent brute-force
  const rl = checkRateLimit(req, "biometric-verify", { maxRequests: 10, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const user = await getAuthenticatedUser(authHeader);
    const admin = getAdminClient();
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
