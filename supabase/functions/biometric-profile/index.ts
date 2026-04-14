import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { assertPostMethod, getAdminClient, getAuthenticatedUser, sanitizeProfileInput } from "../_shared/biometric.ts";

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
    const payload = await req.json();
    const profile = sanitizeProfileInput(payload, user.email?.split("@")[0] ?? "Protected User");

    const { error } = await admin.from("profiles").upsert({
      user_id: user.id,
      ...profile,
    }, { onConflict: "user_id" });

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save profile";
    return new Response(JSON.stringify({ error: message }), {
      status: message === "Unauthorized" ? 401 : 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
