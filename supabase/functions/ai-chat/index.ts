import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

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

Deno.Deno.serve(async (req) => {
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

    // Resolve effective broker (Master) for members
    const { data: effectiveId } = await serviceClient.rpc("get_effective_broker_id", {
      p_user_id: userId,
    });
    const billingUserId = (effectiveId as string) || userId;

    // Check subscription using the effective (Master) user
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

    // Check AI credits against the Master (billing user)
    const { data: creditsData } = await serviceClient.rpc("get_ai_credits_balance", {
      p_user_id: billingUserId,
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

    const { messages, selected_assets } = await req.json();
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

    // RAG: Fetch only selected assets (if any)
    let unitsData: any[] = [];
    const assets = Array.isArray(selected_assets) ? selected_assets.slice(0, 5) : [];

    if (assets.length > 0) {
      try {
        const propertyIds = assets.filter((a: any) => a.type === "property").map((a: any) => a.id);
        const unitIds = assets.filter((a: any) => a.type === "unit" || a.type === "standalone").map((a: any) => a.id);

        if (propertyIds.length > 0) {
          const { data: propData } = await serviceClient
            .from("properties")
            .select("id, name, city, state, address, total_units, status, amenities, description")
            .in("id", propertyIds);

          if (propData) {
            unitsData.push(...propData.map((p: any) => ({
              tipo: "empreendimento",
              id: p.id,
              nome: p.name,
              cidade: p.city,
              estado: p.state,
              endereco: p.address,
              total_unidades: p.total_units,
              status: p.status,
              amenidades: p.amenities,
              descricao: p.description,
            })));
          }
        }

        if (unitIds.length > 0) {
          const { data: unitData } = await serviceClient
            .from("units")
            .select(`
              id, unit_number, price, bedrooms, bathrooms, area, city, neighborhood,
              status, is_standalone, address, market_value, rent_price, description,
              intent_type, property:properties(name)
            `)
            .in("id", unitIds);

          if (unitData) {
            unitsData.push(...unitData.map((u: any) => ({
              tipo: u.is_standalone ? "imovel_avulso" : "unidade",
              id: u.id,
              numero: u.unit_number,
              preco: u.price,
              valor_mercado: u.market_value,
              aluguel: u.rent_price,
              area_m2: u.area,
              quartos: u.bedrooms,
              banheiros: u.bathrooms,
              cidade: u.city,
              bairro: u.neighborhood,
              endereco: u.address,
              status: u.status,
              tipo_intencao: u.intent_type,
              descricao: u.description,
              empreendimento: u.property?.name,
            })));
          }
        }

        console.log("RAG Selected Assets:", unitsData.length);
      } catch (err) {
        console.error("RAG fetch exception:", err);
      }
    }

    const portfolioJson = JSON.stringify(unitsData);

    const hasContext = unitsData.length > 0;
    const portfolioSection = hasContext
      ? `\n\nAbaixo estão os dados dos imóveis que o corretor anexou para esta conversa:\n\n<carteira_imoveis>\n${portfolioJson}\n</carteira_imoveis>\n\n- NUNCA diga que você não tem acesso ao banco de dados. Os dados dentro da tag <carteira_imoveis> SÃO o seu acesso em tempo real.\n- Baseie suas respostas sobre valores, localizações e características EXCLUSIVAMENTE nos dados fornecidos na tag <carteira_imoveis>. Se a informação não estiver lá, diga que não tem esse dado específico.`
      : `\n\nO corretor NÃO anexou nenhum imóvel a esta conversa. Se ele perguntar sobre imóveis específicos, oriente-o a usar o botão de clipe (📎) para anexar imóveis ao contexto da conversa.`;

    const systemPrompt = `Você é o assistente virtual especialista do sistema SlotiMob. Seu objetivo é ajudar o corretor imobiliário.
${portfolioSection}

REGRAS DE COMPORTAMENTO OBRIGATÓRIAS:
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
          deductCredits(serviceClient, billingUserId, consumedCredits, creditsData as any);
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
