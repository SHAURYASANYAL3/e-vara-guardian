import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { assertPostMethod, assertValidUuid, getAdminClient, getAuthenticatedUser, getUserRoles } from "../_shared/biometric.ts";

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
    const roles = await getUserRoles(admin, user.id);
    const isAdmin = roles.includes("admin");
    const { alertId } = await req.json();
    assertValidUuid(alertId, "alert id");

    const { data: alert, error: fetchError } = await admin
      .from("suspicious_activity_alerts")
      .select("user_id")
      .eq("id", alertId)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!alert) throw new Error("Alert not found");
    if (!isAdmin && alert.user_id !== user.id) throw new Error("Forbidden");

    const update = isAdmin ? { acknowledged_by_admin: true } : { acknowledged_by_user: true };
    const { error } = await admin.from("suspicious_activity_alerts").update(update).eq("id", alertId);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update alert";
    return new Response(JSON.stringify({ error: message }), {
      status: message === "Unauthorized" ? 401 : message === "Forbidden" ? 403 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
