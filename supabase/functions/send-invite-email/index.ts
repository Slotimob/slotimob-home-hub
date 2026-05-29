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

    // Authenticate the calling user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) throw new Error("Not authenticated");

    const { email, role_label, permissions, member_name } = await req.json();

    if (!email || !email.includes("@")) {
      throw new Error("Email inválido");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // --- Business rule: only the subscription owner can invite ---
    // Check if user is a member of someone else's organization (members can't invite)
    const { data: membership } = await supabaseAdmin
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) {
      throw new Error("Apenas o assinante (owner) pode convidar membros.");
    }

    // --- Check if user is on Business plan ---
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan_id, extra_users_count")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!sub || sub.plan_id !== "business") {
      throw new Error("Convites de equipe estão disponíveis apenas no plano Business.");
    }

    // --- Check users limit (base + add-ons) ---
    const { data: planData } = await supabaseAdmin
      .from("subscription_plans")
      .select("features")
      .eq("id", "business")
      .single();

    const baseUsersLimit = (planData?.features as any)?.users_limit ?? 3;
    const extraUsers = sub.extra_users_count ?? 0;
    const totalLimit = baseUsersLimit + extraUsers;

    // Count current active members
    const { count: activeMembers } = await supabaseAdmin
      .from("organization_members")
      .select("id", { count: "exact", head: true })
      .eq("organization_owner_id", user.id)
      .eq("is_active", true);

    // Owner counts as 1 seat
    const currentTotal = 1 + (activeMembers ?? 0);

    if (currentTotal >= totalLimit) {
      throw new Error(
        `Limite de ${totalLimit} usuários atingido (${currentTotal} vagas ocupadas). Adquira add-ons de usuários para expandir.`
      );
    }

    // --- Check if user already exists in profiles ---
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    let targetUserId: string;
    let isExistingUser = false;

    if (existingProfile) {
      // User already exists — check if already active in this org
      const { data: existingMember } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("organization_owner_id", user.id)
        .eq("user_id", existingProfile.id)
        .eq("is_active", true)
        .maybeSingle();

      if (existingMember) {
        throw new Error("Este utilizador já faz parte da sua equipa.");
      }

      targetUserId = existingProfile.id;
      isExistingUser = true;
    } else {
      // New user — invite via Supabase Auth
      const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: {
            full_name: member_name || role_label || "Agente",
            invited_by: user.id,
            role_label: role_label || "Agente",
          },
          redirectTo: `${Deno.env.get('SITE_URL') ?? 'https://app.slotimob.com.br'}/reset-password`,

        }
      );

      if (inviteError) {
        throw new Error(inviteError.message || "Erro ao enviar convite");
      }

      if (!authData?.user?.id) {
        throw new Error("Erro inesperado: utilizador não criado pelo convite.");
      }

      targetUserId = authData.user.id;
    }

    // --- Add to organization_members ---
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_owner_id: user.id,
        user_id: targetUserId,
        role_label: role_label || "Agente",
        permissions: permissions || {},
        is_active: true,
        accepted_at: isExistingUser ? new Date().toISOString() : null,
      });

    if (memberError) {
      if (memberError.code === "23505") {
        throw new Error("Este utilizador já faz parte da sua equipa.");
      }
      console.error("Error inserting member:", memberError);
      throw new Error("Erro ao vincular membro à organização.");
    }

    const message = isExistingUser
      ? "Utilizador adicionado à equipa com sucesso! Ele já pode aceder ao seu Workspace."
      : "Convite enviado com sucesso! O utilizador receberá um e-mail com o link de acesso.";

    return new Response(
      JSON.stringify({ success: true, message }),
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
