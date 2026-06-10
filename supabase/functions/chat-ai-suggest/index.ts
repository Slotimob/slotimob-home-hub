import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');

    if (!anthropicApiKey) {
      return new Response(JSON.stringify({ error: 'Serviço de IA não configurado.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) {
      safeWarn('JWT inválido ou expirado: %s', userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      return new Response(JSON.stringify({ error: 'Invalid user context' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { messages, contactName, propertyContext } = body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages array is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get effective broker id for credit deduction
    const { data: effectiveId } = await supabaseAdmin.rpc('get_effective_broker_id', { p_user_id: userId });
    const brokerId = effectiveId || userId;

    // Check AI credits balance
    const { data: balance } = await supabaseAdmin.rpc('get_ai_credits_balance', { p_user_id: brokerId });
    if (!balance || balance.total_available <= 0) {
      return new Response(JSON.stringify({ error: 'NO_CREDITS', message: 'Sem créditos de IA disponíveis' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build conversation context (last 10 messages)
    const recentMessages = messages.slice(-10).map((m: any) => ({
      role: m.direction === 'outgoing' ? 'assistant' : 'user',
      content: m.content || `[${m.message_type}]`,
    }));

    // Build property context section
    let propertySection = '';
    if (propertyContext) {
      try {
        const contextStr = typeof propertyContext === 'string'
          ? propertyContext
          : JSON.stringify(propertyContext, null, 2);
        propertySection = `\n\nDados do imóvel em negociação:\n${contextStr}\n\nUse estas informações para contextualizar sua sugestão de resposta.`;
      } catch {
        // Ignore serialization errors
      }
    }

    const systemPrompt = `Você é um assistente especializado em atendimento imobiliário. Sua tarefa é sugerir uma resposta educada, profissional e persuasiva para o corretor enviar ao cliente via WhatsApp.

Contexto:
- Nome do contato: ${contactName || 'Cliente'}
- Você está ajudando o corretor a responder ao cliente
- Mantenha o tom cordial e profissional
- Seja conciso (máximo 2-3 parágrafos)
- Use emojis com moderação
- Foque em avançar a negociação
${propertySection}

Responda APENAS com a mensagem sugerida, sem explicações adicionais, sem aspas, sem markdown.`;

    // Call Claude API (same model as ai-chat)
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicApiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          ...recentMessages,
          { role: 'user', content: 'Sugira uma resposta profissional para eu enviar ao cliente.' },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const errorText = await aiResponse.text();
      console.error('Claude API error:', status, errorText);

      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, tente novamente em instantes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Erro ao gerar sugestão' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    // Claude returns content as array of content blocks
    const suggestion = aiData.content?.[0]?.text || aiData.choices?.[0]?.message?.content || '';

    // Deduct 1 AI credit
    const { data: bonusCredits } = await supabaseAdmin
      .from('ai_credits')
      .select('id, credits_remaining')
      .eq('broker_id', brokerId)
      .gt('credits_remaining', 0)
      .or('expires_at.is.null,expires_at.gt.now()')
      .order('created_at', { ascending: true })
      .limit(1);

    if (bonusCredits && bonusCredits.length > 0) {
      await supabaseAdmin
        .from('ai_credits')
        .update({ credits_remaining: bonusCredits[0].credits_remaining - 1 })
        .eq('id', bonusCredits[0].id);
    } else {
      await supabaseAdmin
        .from('subscriptions')
        .update({ ai_credits_used: (balance.used || 0) + 1 })
        .eq('user_id', brokerId);
    }

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('chat-ai-suggest error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
