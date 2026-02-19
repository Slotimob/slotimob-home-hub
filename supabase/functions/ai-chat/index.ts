import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Service client for checks
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check subscription: must be Pro or Business
    const { data: planData } = await serviceClient.rpc("get_user_plan_features", {
      p_user_id: userId,
    });

    const plan = (planData as any)?.plan || "free";
    const features = (planData as any)?.features;
    const aiChatEnabled = features?.ai_chat === true;

    // Check trial status for free users
    let trialActive = false;
    if (plan === "free") {
      const { data: trialData } = await serviceClient.rpc("get_user_trial_status", {
        p_user_id: userId,
      });
      trialActive = (trialData as any)?.is_trial_active === true;
    }

    if (!aiChatEnabled && !trialActive) {
      return new Response(
        JSON.stringify({ error: "Upgrade para o plano Pro para acessar o Chat IA." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check member permissions (if invited user)
    const { data: membership } = await serviceClient
      .from("organization_members")
      .select("permissions, is_active")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) {
      const perms = membership.permissions as Record<string, Record<string, boolean>> | null;
      if (perms?.chat?.use !== true) {
        return new Response(
          JSON.stringify({ error: "Você não tem permissão para usar o Chat IA. Solicite ao administrador." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check AI credits balance
    const { data: creditsData } = await serviceClient.rpc("get_ai_credits_balance", {
      p_user_id: userId,
    });

    const totalAvailable = (creditsData as any)?.total_available ?? 0;

    // Block if no credits at all (plan + bonus)
    if (totalAvailable <= 0 && !trialActive) {
      return new Response(
        JSON.stringify({ error: "Saldo de Créditos IA esgotado. Recarregue no seu painel." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      console.error("ANTHROPIC_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Serviço de IA não configurado." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Mensagens inválidas." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate messages
    const validatedMessages = messages
      .filter((m: any) => m.role && m.content && typeof m.content === "string")
      .map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content.slice(0, 10000),
      }));

    // Call Anthropic WITHOUT streaming so we can capture usage
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: `Você é o assistente IA da SlotiMob, uma plataforma de gestão imobiliária. Ajude corretores com:
- Dúvidas sobre gestão de imóveis, contratos e locações
- Cálculos financeiros (aluguel, taxas, comissões)
- Estratégias de vendas e negociação
- Redação de textos para anúncios de imóveis
- Dicas de atendimento ao cliente
- Análises de mercado imobiliário

Seja conciso, profissional e útil. Responda sempre em português brasileiro.`,
        messages: validatedMessages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Claude API error:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao processar sua mensagem." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();

    // Calculate consumed credits from usage
    const usage = result.usage;
    const consumedTokens = (usage?.input_tokens || 0) + (usage?.output_tokens || 0);
    const consumedCredits = Math.ceil(consumedTokens / 1000);

    // Deduct credits: first from plan quota, then from bonus
    const planRemaining = (creditsData as any)?.remaining ?? 0;

    if (consumedCredits <= planRemaining) {
      // All from plan quota
      await serviceClient
        .from("subscriptions")
        .update({ ai_credits_used: ((creditsData as any)?.used ?? 0) + consumedCredits })
        .eq("user_id", userId);
    } else {
      // Use remaining plan credits + bonus
      const fromPlan = planRemaining;
      const fromBonus = consumedCredits - fromPlan;

      if (fromPlan > 0) {
        await serviceClient
          .from("subscriptions")
          .update({ ai_credits_used: ((creditsData as any)?.limit ?? 0) })
          .eq("user_id", userId);
      }

      // Deduct from bonus credits (FIFO from ai_credits table)
      if (fromBonus > 0) {
        let remaining = fromBonus;
        const { data: bonusPacks } = await serviceClient
          .from("ai_credits")
          .select("id, credits_remaining")
          .eq("broker_id", userId)
          .gt("credits_remaining", 0)
          .order("created_at", { ascending: true });

        if (bonusPacks) {
          for (const pack of bonusPacks) {
            if (remaining <= 0) break;
            const deduct = Math.min(remaining, pack.credits_remaining);
            await serviceClient
              .from("ai_credits")
              .update({ credits_remaining: pack.credits_remaining - deduct })
              .eq("id", pack.id);
            remaining -= deduct;
          }
        }
      }
    }

    // Get updated balance
    const { data: updatedCredits } = await serviceClient.rpc("get_ai_credits_balance", {
      p_user_id: userId,
    });

    // Extract assistant text
    const assistantText = result.content
      ?.filter((c: any) => c.type === "text")
      .map((c: any) => c.text)
      .join("") || "";

    return new Response(
      JSON.stringify({
        content: assistantText,
        credits: updatedCredits,
        usage: {
          input_tokens: usage?.input_tokens || 0,
          output_tokens: usage?.output_tokens || 0,
          credits_consumed: consumedCredits,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("AI chat error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
