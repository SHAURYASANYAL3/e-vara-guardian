import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { secureHeaders, safeErrorMessage, errorStatus } from "../_shared/security-headers.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limit.ts";
import { requireUUID } from "../_shared/validation.ts";
import { assertPostMethod, getAdminClient, getAuthenticatedUser, getUserRoles } from "../_shared/biometric.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const rl = checkRateLimit(req, "biometric-ack-alert", { maxRequests: 20, windowMs: 60_000 });
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs, corsHeaders);

  try {
    assertPostMethod(req);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const user = await getAuthenticatedUser(authHeader);
    const admin = getAdminClient();
    const roles = await getUserRoles(admin, user.id);
    const isAdmin = roles.includes("admin");
    const body = await req.json();

    const alertId = requireUUID(body.alertId, "alertId");

    const { error } = await admin.rpc("acknowledge_alert", {
      _alert_id: alertId,
      _is_admin: isAdmin,
    });
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: secureHeaders,
    });
  } catch (error) {
    const message = safeErrorMessage(error, "Unable to update alert");
    return new Response(JSON.stringify({ error: message }), {
      status: errorStatus(message),
      headers: secureHeaders,
    });
  }
});
