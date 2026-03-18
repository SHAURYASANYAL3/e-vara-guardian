import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
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

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const user = await getAuthenticatedUser(authHeader);
    const admin = getAdminClient();
    const { embedding, liveness, consentText } = await req.json();

    if (!Array.isArray(embedding) || embedding.length !== 128) {
      throw new Error("A valid face embedding is required");
    }

    if (!hasRequiredChallenges(liveness, ["blink"])) {
      throw new Error("Liveness verification failed");
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
        blinkDetected: Boolean(liveness?.blinkDetected),
        completedChallenges: liveness?.completedChallenges ?? [],
        sampleCount: liveness?.sampleCount ?? 0,
      },
    });
    if (loginAttemptError) throw loginAttemptError;

    return new Response(JSON.stringify({
      verified,
      confidence: Number(confidence.toFixed(4)),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Verification failed";
    return new Response(JSON.stringify({ error: message }), {
      status: message === "Unauthorized" ? 401 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
