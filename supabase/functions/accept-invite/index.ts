import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { token } = await req.json();
    if (!token) throw new Error("Token is required");

    // Fetch invitation using service role (bypasses RLS)
    const { data: invitation, error: invErr } = await supabaseAdmin
      .from("organization_invitations")
      .select("*")
      .eq("token", token)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (invErr || !invitation) {
      throw new Error("Convite inválido, expirado ou já utilizado.");
    }

    // Verify email matches
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      throw new Error("O email da sua conta não corresponde ao email do convite.");
    }

    // Check if already a member
    const { data: existing } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("organization_owner_id", invitation.organization_owner_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      // Mark invitation as used anyway
      await supabaseAdmin
        .from("organization_invitations")
        .update({ used_at: new Date().toISOString() })
        .eq("id", invitation.id);
      
      throw new Error("Você já faz parte desta equipe.");
    }

    // Add user to organization
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_owner_id: invitation.organization_owner_id,
        user_id: user.id,
        role_label: invitation.role_label,
        permissions: invitation.permissions,
        is_active: true,
        accepted_at: new Date().toISOString(),
      });

    if (memberError) {
      if (memberError.code === "23505") {
        throw new Error("Você já faz parte desta equipe.");
      }
      throw memberError;
    }

    // Mark invitation as used
    await supabaseAdmin
      .from("organization_invitations")
      .update({ used_at: new Date().toISOString() })
      .eq("id", invitation.id);

    return new Response(
      JSON.stringify({ success: true, message: "Você foi adicionado à equipe com sucesso!" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
