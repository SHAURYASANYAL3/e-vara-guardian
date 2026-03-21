/**
 * Lightweight input validation helpers for edge functions.
 * Avoids pulling in a full library; keeps it lean for Deno edge runtime.
 */

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function requireString(value: unknown, field: string, maxLength = 500): string {
  if (typeof value !== "string") throw new ValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (!trimmed.length) throw new ValidationError(`${field} is required`);
  if (trimmed.length > maxLength) throw new ValidationError(`${field} exceeds max length of ${maxLength}`);
  return trimmed;
}

export function optionalString(value: unknown, field: string, maxLength = 500): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new ValidationError(`${field} must be a string`);
  const trimmed = value.trim();
  if (trimmed.length > maxLength) throw new ValidationError(`${field} exceeds max length of ${maxLength}`);
  return trimmed;
}

export function requireEmbedding(value: unknown): number[] {
  if (!Array.isArray(value) || value.length !== 128) {
    throw new ValidationError("A valid 128-dimension face embedding is required");
  }
  for (let i = 0; i < value.length; i++) {
    if (typeof value[i] !== "number" || !Number.isFinite(value[i])) {
      throw new ValidationError(`Embedding dimension ${i} must be a finite number`);
    }
  }
  return value as number[];
}

export function requireAngles(value: unknown): string[] {
  if (!Array.isArray(value)) throw new ValidationError("anglesCompleted must be an array");
  const required = ["front", "turn_left", "turn_right"];
  for (const angle of required) {
    if (!value.includes(angle)) throw new ValidationError(`Missing required angle: ${angle}`);
  }
  return value.filter((v): v is string => typeof v === "string" && required.includes(v));
}

export function requireLiveness(value: unknown): {
  blinkDetected: boolean;
  completedChallenges: string[];
  sampleCount: number;
} {
  if (!value || typeof value !== "object") {
    throw new ValidationError("Liveness payload is required");
  }
  const liveness = value as Record<string, unknown>;
  return {
    blinkDetected: Boolean(liveness.blinkDetected),
    completedChallenges: Array.isArray(liveness.completedChallenges)
      ? (liveness.completedChallenges as string[]).filter((c) => typeof c === "string")
      : [],
    sampleCount: typeof liveness.sampleCount === "number" ? liveness.sampleCount : 0,
  };
}

export function requireUUID(value: unknown, field: string): string {
  if (typeof value !== "string") throw new ValidationError(`${field} must be a string`);
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(value)) throw new ValidationError(`${field} must be a valid UUID`);
  return value;
}
