import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const { email, role_label, permissions } = await req.json();

    if (!email || !email.includes("@")) {
      throw new Error("Email inválido");
    }

    const normalizedEmail = email.trim().toLowerCase();

    // --- Business rule: only the subscription owner (no role = subscriber) can invite ---
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    if (roles && roles.length > 0) {
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

    // --- Check if user is already a member ---
    const { data: existingMemberByEmail } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingMemberByEmail) {
      const { data: existingMember } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("organization_owner_id", user.id)
        .eq("user_id", existingMemberByEmail.id)
        .eq("is_active", true)
        .maybeSingle();

      if (existingMember) {
        throw new Error("Este usuário já faz parte da sua equipe.");
      }
    }

    // --- Invite user via Supabase Auth native method ---
    const { data: authData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        data: {
          invited_by: user.id,
          role_label: role_label || "Agente",
        },
        redirectTo: "https://slotimob.com.br/reset-password",
      }
    );

    if (inviteError) {
      // If user already exists in auth, it means they already have an account
      if (inviteError.message?.includes("already been registered") || inviteError.message?.includes("already exists")) {
        throw new Error("Este email já possui uma conta. O usuário pode fazer login e ser adicionado manualmente.");
      }
      throw new Error(inviteError.message || "Erro ao enviar convite");
    }

    if (!authData?.user?.id) {
      throw new Error("Erro inesperado: usuário não criado pelo convite.");
    }

    // --- Add to organization_members directly ---
    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert({
        organization_owner_id: user.id,
        user_id: authData.user.id,
        role_label: role_label || "Agente",
        permissions: permissions || {},
        is_active: true,
        accepted_at: null, // Will be set when user actually logs in
      });

    if (memberError) {
      if (memberError.code === "23505") {
        throw new Error("Este usuário já faz parte da sua equipe.");
      }
      console.error("Error inserting member:", memberError);
      throw new Error("Erro ao vincular membro à organização.");
    }

    return new Response(
      JSON.stringify({ success: true, message: "Convite enviado com sucesso! O usuário receberá um e-mail com o link de acesso." }),
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
