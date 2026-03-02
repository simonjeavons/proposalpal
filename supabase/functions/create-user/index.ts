import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const token = authHeader.replace("Bearer ", "");
  const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !callerUser) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
  }

  const { data: callerProfile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", callerUser.id)
    .single();

  if (!callerProfile || callerProfile.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), { status: 403, headers: corsHeaders });
  }

  const { email, password, full_name, role, job_title, phone_number } = await req.json();

  if (!email || !password) {
    return new Response(JSON.stringify({ error: "email and password are required" }), { status: 400, headers: corsHeaders });
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name || "" },
  });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }

  if (data.user) {
    await supabaseAdmin
      .from("profiles")
      .update({ role: role === "admin" ? "admin" : "user", full_name: full_name || "", job_title: job_title || "", phone_number: phone_number || "" })
      .eq("id", data.user.id);
  }

  return new Response(
    JSON.stringify({ user: { id: data.user?.id, email: data.user?.email } }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
