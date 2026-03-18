import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BIOMETRIC_ENCRYPTION_KEY = Deno.env.get("BIOMETRIC_ENCRYPTION_KEY")!;

export type AppRole = "admin" | "user";

export interface LivenessPayload {
  blinkDetected: boolean;
  completedChallenges: string[];
  sampleCount: number;
}

export function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export function getUserClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });
}

async function getAesKey() {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(BIOMETRIC_ENCRYPTION_KEY));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function toBase64(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

export async function encryptEmbedding(embedding: number[]) {
  const key = await getAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = encoder.encode(JSON.stringify(embedding));
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded));

  return {
    embedding_ciphertext: toBase64(ciphertext),
    embedding_iv: toBase64(iv),
  };
}

export async function decryptEmbedding(ciphertext: string, iv: string) {
  const key = await getAesKey();
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(iv) },
    key,
    fromBase64(ciphertext),
  );

  return JSON.parse(decoder.decode(decrypted)) as number[];
}

export function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;

  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index];
    magnitudeA += a[index] ** 2;
    magnitudeB += b[index] ** 2;
  }

  if (!magnitudeA || !magnitudeB) return 0;
  return dot / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

export function hasRequiredChallenges(liveness: LivenessPayload, expectedChallenges: string[]) {
  if (!liveness?.blinkDetected || liveness.sampleCount < 2) return false;
  return expectedChallenges.every((challenge) => liveness.completedChallenges.includes(challenge));
}

export async function getAuthenticatedUser(authHeader: string) {
  const userClient = getUserClient(authHeader);
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return user;
}

export async function getUserRoles(adminClient: ReturnType<typeof getAdminClient>, userId: string): Promise<AppRole[]> {
  const { data, error } = await adminClient.from("user_roles").select("role").eq("user_id", userId);

  if (error) throw error;
  return (data ?? []).map((row: { role: AppRole }) => row.role);
}

export async function createDuplicateAlerts(
  adminClient: ReturnType<typeof getAdminClient>,
  userId: string,
  matches: Array<{ userId: string; confidence: number }>,
) {
  if (!matches.length) return;

  const rows = matches.flatMap((match) => [
    {
      user_id: userId,
      matched_user_id: match.userId,
      alert_type: "duplicate_identity",
      confidence: Number(match.confidence.toFixed(4)),
      message: "A similar biometric identity was detected in the protected database.",
    },
    {
      user_id: match.userId,
      matched_user_id: userId,
      alert_type: "duplicate_identity",
      confidence: Number(match.confidence.toFixed(4)),
      message: "A similar biometric identity was detected in the protected database.",
    },
  ]);

  const { error } = await adminClient.from("suspicious_activity_alerts").insert(rows);
  if (error) throw error;
}
