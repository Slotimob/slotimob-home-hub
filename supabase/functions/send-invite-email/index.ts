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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

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

    // --- Check users limit (base 3 + add-ons) ---
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

    // Count pending invitations
    const { count: pendingInvites } = await supabaseAdmin
      .from("organization_invitations")
      .select("id", { count: "exact", head: true })
      .eq("organization_owner_id", user.id)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString());

    const currentTotal = (activeMembers ?? 0) + (pendingInvites ?? 0);

    if (currentTotal >= totalLimit) {
      throw new Error(
        `Limite de ${totalLimit} usuários atingido (${activeMembers ?? 0} ativos + ${pendingInvites ?? 0} convites pendentes). Adquira add-ons de usuários para expandir.`
      );
    }

    // --- Check if user is already a member ---
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      const { data: existingMember } = await supabaseAdmin
        .from("organization_members")
        .select("id")
        .eq("organization_owner_id", user.id)
        .eq("user_id", existingProfile.id)
        .eq("is_active", true)
        .maybeSingle();

      if (existingMember) {
        throw new Error("Este usuário já faz parte da sua equipe.");
      }
    }

    // --- Check for existing pending invitation ---
    const { data: existingInvite } = await supabaseAdmin
      .from("organization_invitations")
      .select("id")
      .eq("organization_owner_id", user.id)
      .eq("email", email.trim().toLowerCase())
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existingInvite) {
      throw new Error("Já existe um convite pendente para este email.");
    }

    // --- Get inviter name ---
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const inviterName = profile?.full_name || "Um assinante";

    // --- Create invitation ---
    const { data: invitation, error: insertError } = await supabaseAdmin
      .from("organization_invitations")
      .insert({
        email: email.trim().toLowerCase(),
        organization_owner_id: user.id,
        role_label: role_label || "Agente",
        permissions: permissions || {},
        invited_by_name: inviterName,
      })
      .select("token")
      .single();

    if (insertError) throw insertError;

    // --- Send email via Resend ---
    const inviteUrl = `https://slotimob.com.br/auth?token=${invitation.token}`;

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "SlotiMob <noreply@slotimob.com.br>",
        to: [email.trim().toLowerCase()],
        subject: `${inviterName} convidou você para a equipe da SlotiMob`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">SlotiMob</h1>
              <p style="color: #666; font-size: 14px; margin-top: 4px;">Sistema de Gestão de Ativos Imobiliários</p>
            </div>
            <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center;">
              <h2 style="color: #1a1a2e; font-size: 20px; margin-top: 0;">Você foi convidado!</h2>
              <p style="color: #444; font-size: 16px; line-height: 1.6;">
                Olá! <strong>${inviterName}</strong> convidou você para a equipe da SlotiMob.
                Clique no botão abaixo para configurar a sua conta.
              </p>
              <a href="${inviteUrl}" 
                 style="display: inline-block; background: #6366f1; color: white; padding: 14px 32px; 
                        border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; margin-top: 16px;">
                Aceitar Convite
              </a>
              <p style="color: #888; font-size: 12px; margin-top: 24px;">
                Este link expira em 48 horas. Se você não reconhece este convite, ignore este email.
              </p>
            </div>
            <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 24px;">
              © ${new Date().getFullYear()} SlotiMob — slotimob.com.br
            </p>
          </div>
        `,
      }),
    });

    if (!emailResponse.ok) {
      const errorBody = await emailResponse.text();
      console.error("Resend error:", errorBody);
      // Still return success since invitation was created
    }

    return new Response(
      JSON.stringify({ success: true, message: "Convite enviado com sucesso" }),
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
