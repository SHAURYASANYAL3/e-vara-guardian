import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const encoder = new TextEncoder();
const decoder = new TextDecoder();
function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const SUPABASE_URL = requireEnv("SUPABASE_URL");
const SUPABASE_ANON_KEY = requireEnv("SUPABASE_ANON_KEY");
const SUPABASE_SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
const BIOMETRIC_ENCRYPTION_KEY = requireEnv("BIOMETRIC_ENCRYPTION_KEY");

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


function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function assertValidEmbedding(embedding: unknown) {
  if (!Array.isArray(embedding) || embedding.length !== 128 || !embedding.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new Error("A valid face embedding is required");
  }
  return embedding as number[];
}

export function assertValidConsentText(value: unknown) {
  const consentText = cleanText(value, 500);
  if (!consentText) throw new Error("Consent text is required");
  return consentText;
}

export function parseProfileInput(input: unknown) {
  const profile = (input && typeof input === "object") ? input as Record<string, unknown> : {};
  const displayName = cleanText(profile.displayName, 80);
  const username = cleanText(profile.username, 32);
  const socialLink = cleanText(profile.socialLink, 300);
  const keywords = cleanText(profile.keywords, 300);

  if (socialLink) {
    try {
      const url = new URL(socialLink);
      if (!["http:", "https:"].includes(url.protocol)) throw new Error("invalid");
    } catch {
      throw new Error("A valid http(s) social link is required");
    }
  }

  if (username && !/^[a-zA-Z0-9._-]{3,32}$/.test(username)) {
    throw new Error("Username must be 3-32 characters and only use letters, numbers, dots, underscores, or hyphens");
  }

  return {
    display_name: displayName,
    username,
    social_link: socialLink,
    keywords,
  };
}

export function parseAlertId(value: unknown) {
  const alertId = cleanText(value, 64);
  if (!alertId || !/^[0-9a-fA-F-]{36}$/.test(alertId)) {
    throw new Error("A valid alert id is required");
  }
  return alertId;
}

export function parseAnglesCompleted(value: unknown) {
  const allowed = new Set(["front", "turn_left", "turn_right"]);
  if (!Array.isArray(value)) throw new Error("Front, left, and right enrollment angles are required");
  const unique = [...new Set(value.filter((item): item is string => typeof item === "string"))];
  if (!["front", "turn_left", "turn_right"].every((angle) => unique.includes(angle)) || unique.some((angle) => !allowed.has(angle))) {
    throw new Error("Front, left, and right enrollment angles are required");
  }
  return unique;
}
