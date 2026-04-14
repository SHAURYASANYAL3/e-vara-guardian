import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { secureHeaders, safeErrorMessage, errorStatus } from "../_shared/security-headers.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { requireString, optionalString } from "../_shared/validation.ts";
import { getAdminClient, getAuthenticatedUser } from "../_shared/biometric.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, "biometric-profile", { maxRequests: 15, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

  try {
    assertPostMethod(req);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const user = await getAuthenticatedUser(authHeader);
    const admin = getAdminClient();
    const body = await req.json();

    const displayName = requireString(body.displayName, "displayName", 100);
    const username = optionalString(body.username, "username", 50);
    const socialLink = optionalString(body.socialLink, "socialLink", 500);
    const keywords = optionalString(body.keywords, "keywords", 500);

    const { error } = await admin.from("profiles").upsert({
      user_id: user.id,
      display_name: displayName,
      username,
      social_link: socialLink,
      keywords,
    }, { onConflict: "user_id" });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: secureHeaders,
    });
  } catch (error) {
    const message = safeErrorMessage(error, "Unable to save profile");
    return new Response(JSON.stringify({ error: message }), {
      status: errorStatus(message),
      headers: secureHeaders,
    });
  }
});
