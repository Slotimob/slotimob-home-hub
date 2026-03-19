import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'AI gateway not configured' }), {
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
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { messages, contactName } = await req.json();
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

    const systemPrompt = `Você é um assistente especializado em atendimento imobiliário. Sua tarefa é sugerir uma resposta educada, profissional e persuasiva para o corretor enviar ao cliente via WhatsApp.

Contexto:
- Nome do contato: ${contactName || 'Cliente'}
- Você está ajudando o corretor a responder ao cliente
- Mantenha o tom cordial e profissional
- Seja conciso (máximo 2-3 parágrafos)
- Use emojis com moderação
- Foque em avançar a negociação

Responda APENAS com a mensagem sugerida, sem explicações adicionais.`;

    // Call AI gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...recentMessages,
          { role: 'user', content: 'Sugira uma resposta profissional para eu enviar ao cliente.' },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limited, tente novamente em instantes.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados na plataforma.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.error('AI gateway error:', status, await aiResponse.text());
      return new Response(JSON.stringify({ error: 'Erro ao gerar sugestão' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await aiResponse.json();
    const suggestion = aiData.choices?.[0]?.message?.content || '';

    // Deduct 1 AI credit
    // First try bonus credits, then plan credits
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
      // Deduct from plan credits
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
