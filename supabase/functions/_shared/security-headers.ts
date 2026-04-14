import { corsHeaders } from "./cors.ts";

/** Standard secure response headers applied to every edge function response. */
export const secureHeaders: Record<string, string> = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store",
};

/**
 * Build a safe error message for client consumption.
 * Never leaks stack traces or internal details.
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    // Allow known domain errors through
    const safe = [
      "Unauthorized",
      "Forbidden",
      "Alert not found",
      "Liveness verification failed",
      "No biometric enrollment found",
    ];
    if (safe.includes(error.message)) return error.message;
    if (error.name === "ValidationError") return error.message;
  }
  return fallback;
}

export function errorStatus(message: string): number {
  if (message === "Unauthorized") return 401;
  if (message === "Forbidden") return 403;
  return 400;
}
