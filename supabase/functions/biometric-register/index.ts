import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  createDuplicateAlerts,
  cosineSimilarity,
  decryptEmbedding,
  encryptEmbedding,
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
    const { embedding, anglesCompleted, liveness, consentText, profile } = await req.json();

    if (!Array.isArray(embedding) || embedding.length !== 128) {
      throw new Error("A valid face embedding is required");
    }

    if (!Array.isArray(anglesCompleted) || !["front", "turn_left", "turn_right"].every((angle) => anglesCompleted.includes(angle))) {
      throw new Error("Front, left, and right enrollment angles are required");
    }

    if (!hasRequiredChallenges(liveness, ["blink", "turn_left", "turn_right"])) {
      throw new Error("Liveness verification failed during enrollment");
    }

    const encrypted = await encryptEmbedding(embedding);

    const { error: profileError } = await admin.from("profiles").upsert({
      user_id: user.id,
      display_name: profile?.displayName ?? user.email?.split("@")[0] ?? "Protected User",
      username: profile?.username ?? null,
      social_link: profile?.socialLink ?? null,
      keywords: profile?.keywords ?? null,
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

    await createDuplicateAlerts(admin, user.id, duplicateMatches);

    return new Response(JSON.stringify({
      enrolled: true,
      duplicateMatches: duplicateMatches.length,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Enrollment failed";
    return new Response(JSON.stringify({ error: message }), {
      status: message === "Unauthorized" ? 401 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
