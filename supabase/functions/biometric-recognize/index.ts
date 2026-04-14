import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import {
  assertPostMethod,
  assertValidEmbedding,
  cosineSimilarity,
  createDuplicateAlerts,
  dedupeMatches,
  decryptEmbedding,
  getAdminClient,
  getAuthenticatedUser,
} from "../_shared/biometric.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    assertPostMethod(req);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const user = await getAuthenticatedUser(authHeader);
    const admin = getAdminClient();
    const { embedding } = await req.json();

    assertValidEmbedding(embedding);

    const { data: rows, error } = await admin
      .from("face_embeddings")
      .select("user_id, embedding_ciphertext, embedding_iv");
    if (error) throw error;

    let bestMatch: { userId: string; confidence: number } | null = null;

    for (const row of rows ?? []) {
      const candidate = await decryptEmbedding(row.embedding_ciphertext, row.embedding_iv);
      const confidence = cosineSimilarity(embedding, candidate);
      if (!bestMatch || confidence > bestMatch.confidence) {
        bestMatch = { userId: row.user_id, confidence };
      }
    }

    if (!bestMatch) {
      return new Response(JSON.stringify({ matchStatus: "no_enrollment", confidence: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const matchedToSelf = bestMatch.userId === user.id && bestMatch.confidence >= 0.86;
    const suspiciousDuplicate = bestMatch.userId !== user.id && bestMatch.confidence >= 0.92;

    if (suspiciousDuplicate) {
      await createDuplicateAlerts(admin, user.id, dedupeMatches([{ userId: bestMatch.userId, confidence: bestMatch.confidence }]));
    }

    return new Response(JSON.stringify({
      matchStatus: matchedToSelf ? "matched" : suspiciousDuplicate ? "duplicate" : "no_match",
      confidence: Number(bestMatch.confidence.toFixed(4)),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Recognition failed";
    return new Response(JSON.stringify({ error: message }), {
      status: message === "Unauthorized" ? 401 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
