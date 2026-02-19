import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function deductCredits(
  serviceClient: any,
  userId: string,
  consumedCredits: number,
  creditsData: any
) {
  try {
    const planRemaining = creditsData?.remaining ?? 0;

    if (consumedCredits <= planRemaining) {
      await serviceClient
        .from("subscriptions")
        .update({ ai_credits_used: (creditsData?.used ?? 0) + consumedCredits })
        .eq("user_id", userId);
    } else {
      const fromPlan = planRemaining;
      const fromBonus = consumedCredits - fromPlan;

      if (fromPlan > 0) {
        await serviceClient
          .from("subscriptions")
          .update({ ai_credits_used: creditsData?.limit ?? 0 })
          .eq("user_id", userId);
      }

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
  } catch (err) {
    console.error("Error deducting credits:", err);
  }
}

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

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check subscription
    const { data: planData } = await serviceClient.rpc("get_user_plan_features", {
      p_user_id: userId,
    });
    const plan = (planData as any)?.plan || "free";
    const features = (planData as any)?.features;
    const aiChatEnabled = features?.ai_chat === true;

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

    // Check member permissions
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

    // Check AI credits
    const { data: creditsData } = await serviceClient.rpc("get_ai_credits_balance", {
      p_user_id: userId,
    });

    const totalAvailable = (creditsData as any)?.total_available ?? 0;
    if (totalAvailable <= 0 && !trialActive) {
      return new Response(
        JSON.stringify({ error: "Saldo de Créditos IA esgotado. Recarregue no seu painel." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
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

    const validatedMessages = messages
      .filter((m: any) => m.role && m.content && typeof m.content === "string")
      .map((m: any) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content.slice(0, 10000),
      }));

    // RAG: Fetch user's units using their JWT for tenant isolation
    let unitsData: any[] = [];
    try {
      const { data, error } = await supabase
        .from("units")
        .select("id, title, price, status, city, neighborhood, area, bedrooms, bathrooms, parking_spots")
        .order("updated_at", { ascending: false })
        .limit(20);

      console.log("RAG units count:", data?.length ?? 0);
      if (error) console.error("RAG Error:", error);

      if (data && data.length > 0) {
        unitsData = data;
      }
    } catch (err) {
      console.error("RAG fetch exception:", err);
    }

    const portfolioJson = JSON.stringify(unitsData);

    const systemPrompt = `Você é o assistente virtual especialista do sistema SlotiMob. Seu objetivo é ajudar o corretor imobiliário.

Abaixo estão os dados dos imóveis ativos na carteira deste corretor no momento:

<carteira_imoveis>
${portfolioJson}
</carteira_imoveis>

REGRAS DE COMPORTAMENTO OBRIGATÓRIAS:
- NUNCA diga que você não tem acesso ao banco de dados ou ao sistema. Os dados dentro da tag <carteira_imoveis> SÃO o seu acesso ao banco de dados em tempo real.
- Se a tag <carteira_imoveis> estiver vazia (ex: [] ou nula) e o corretor perguntar sobre seus imóveis, responda educadamente: "Analisando sua carteira atual, não encontrei nenhum imóvel cadastrado que corresponda a essa busca (ou sua carteira está vazia no momento). Que tal cadastrarmos novos imóveis no sistema?"
- Baseie suas respostas sobre valores, localizações e características EXCLUSIVAMENTE nos dados fornecidos na tag <carteira_imoveis>. Se a informação não estiver lá, diga que não tem esse dado específico daquele imóvel.
- Responda sempre em português brasileiro. Use formatação Markdown (negrito, listas, títulos) para organizar suas respostas.
- Seja conciso, profissional e útil.
- Ajude também com: cálculos financeiros (aluguel, taxas, comissões), estratégias de vendas e negociação, redação de anúncios, dicas de atendimento ao cliente e análises de mercado imobiliário.`;

    // Call Anthropic WITH streaming
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
        system: systemPrompt,
        messages: validatedMessages,
        stream: true,
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

    // Stream SSE to the client, track tokens from events
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let inputTokens = 0;
    let outputTokens = 0;

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim() || line.startsWith(":")) continue;

              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === "[DONE]") continue;

                try {
                  const event = JSON.parse(jsonStr);

                  // Track input tokens from message_start
                  if (event.type === "message_start" && event.message?.usage) {
                    inputTokens = event.message.usage.input_tokens || 0;
                  }

                  // Track output tokens from message_delta
                  if (event.type === "message_delta" && event.usage) {
                    outputTokens = event.usage.output_tokens || 0;
                  }

                  // Forward text deltas to the client
                  if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
                    );
                  }
                } catch {
                  // skip malformed JSON
                }
              }
            }
          }

          // Send done signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          console.error("Stream processing error:", err);
          controller.error(err);
        }

        // Background: deduct credits after stream ends
        const consumedTokens = inputTokens + outputTokens;
        const consumedCredits = Math.ceil(consumedTokens / 1000);

        if (consumedCredits > 0) {
          deductCredits(serviceClient, userId, consumedCredits, creditsData as any);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("AI chat error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
