import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { getAdminClient, getAuthenticatedUser, getUserRoles } from "../_shared/biometric.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!["GET", "POST"].includes(req.method)) throw new Error("Method not allowed");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const user = await getAuthenticatedUser(authHeader);
    const admin = getAdminClient();
    const roles = await getUserRoles(admin, user.id);

    const [{ data: profile }, { data: embedding }, { data: alerts }, { data: attempts }] = await Promise.all([
      admin.from("profiles").select("display_name, username, social_link, keywords").eq("user_id", user.id).maybeSingle(),
      admin.from("face_embeddings").select("id").eq("user_id", user.id).maybeSingle(),
      admin
        .from("suspicious_activity_alerts")
        .select("id, alert_type, message, confidence, acknowledged_by_user, acknowledged_by_admin, created_at, matched_user_id")
        .or(`user_id.eq.${user.id},matched_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("login_attempts")
        .select("status, confidence, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return new Response(JSON.stringify({
      profile: profile ?? null,
      isEnrolled: Boolean(embedding),
      isAdmin: roles.includes("admin"),
      alerts: alerts ?? [],
      loginAttempts: attempts ?? [],
      email: user.email ?? "",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to fetch biometric state";
    return new Response(JSON.stringify({ error: message }), {
      status: message === "Unauthorized" ? 401 : message === "Method not allowed" ? 405 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
