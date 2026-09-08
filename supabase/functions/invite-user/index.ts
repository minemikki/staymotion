import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return json({ error: "Server configuration missing" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;
  if (userError || !user) return json({ error: "Unauthorized" }, 401);

  let body: { email?: string; locationId?: string; redirectTo?: string };
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const email = String(body.email || "").trim().toLowerCase();
  const locationId = String(body.locationId || "").trim();
  const redirectTo = String(body.redirectTo || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !locationId) return json({ error: "Email and location are required" }, 400);

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: callerMemberships, error: callerError } = await admin
    .from("memberships")
    .select("role,organization_id,location_id,active")
    .eq("user_id", user.id)
    .eq("active", true);
  if (callerError) return json({ error: "Could not verify access" }, 500);

  const managerRoles = new Set(["owner", "hq", "regional_manager", "location_manager"]);
  const canManage = (callerMemberships || []).some((m: any) => managerRoles.has(m.role) && (
    m.role === "owner" || m.role === "hq" || m.role === "regional_manager" || m.location_id === locationId
  ));
  if (!canManage) return json({ error: "Forbidden" }, 403);

  const { data: pending, error: pendingError } = await admin
    .from("memberships")
    .select("id,location_id,invited_name,invited_email,user_id,active")
    .eq("location_id", locationId)
    .eq("active", true)
    .ilike("invited_email", email)
    .maybeSingle();
  if (pendingError) return json({ error: "Could not verify invitation" }, 500);
  if (!pending) return json({ error: "No pending membership for this email" }, 404);
  if (pending.user_id) return json({ ok: true, alreadyRegistered: true });

  const options: Record<string, unknown> = { data: { full_name: pending.invited_name || email } };
  if (redirectTo && /^https:\/\//i.test(redirectTo)) options.redirectTo = redirectTo;

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, options as any);
  if (error) {
    const message = error.message || "Could not send invitation";
    return json({ error: message }, /rate limit/i.test(message) ? 429 : 400);
  }

  return json({ ok: true, userId: data.user?.id || null });
});
