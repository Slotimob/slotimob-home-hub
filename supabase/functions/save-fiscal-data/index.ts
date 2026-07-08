import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOG = '[save-fiscal-data]';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authClient = createClient(SUPABASE_URL, ANON);
    const { data: userData, error: userErr } = await authClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      console.error(LOG, 'JWT inválido', userErr);
      return new Response(JSON.stringify({ error: 'Sessão inválida. Faça login novamente.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userData.user.id;

    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Payload inválido.' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cpf_cnpj = String(body?.cpf_cnpj ?? '').replace(/\D/g, '');
    const phone = String(body?.phone ?? '').replace(/\D/g, '');
    const cep = String(body?.cep ?? '').replace(/\D/g, '');
    const street = String(body?.street ?? '').trim();
    const number = String(body?.number ?? '').trim();
    const neighborhood = String(body?.neighborhood ?? '').trim();
    const city = String(body?.city ?? '').trim();
    const uf = String(body?.uf ?? '').trim().toUpperCase();

    if (cpf_cnpj.length !== 11 && cpf_cnpj.length !== 14) {
      return new Response(JSON.stringify({ error: 'CPF inválido (11 dígitos) ou CNPJ inválido (14 dígitos).' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!phone) {
      return new Response(JSON.stringify({ error: 'Telefone é obrigatório.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (cep.length !== 8) {
      return new Response(JSON.stringify({ error: 'CEP é obrigatório e deve ter 8 dígitos.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!street || !number || !neighborhood || !city || uf.length !== 2) {
      return new Response(JSON.stringify({ error: 'Preencha endereço completo (rua, número, bairro, cidade, UF).' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const isCpf = cpf_cnpj.length === 11;
    const column = isCpf ? 'cpf' : 'cnpj';
    const personType = isCpf ? 'fisica' : 'juridica';

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: dup, error: dupErr } = await admin
      .from('profiles')
      .select('id')
      .eq(column, cpf_cnpj)
      .neq('id', userId)
      .maybeSingle();

    if (dupErr) {
      console.error(LOG, 'erro checando duplicata', dupErr);
      return new Response(JSON.stringify({ error: 'Não foi possível validar seus dados fiscais. Tente novamente.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (dup) {
      const tipo = isCpf ? 'CPF' : 'CNPJ';
      return new Response(JSON.stringify({
        error: `Este ${tipo} já está cadastrado em outra conta. Use outro ${tipo} ou entre na conta existente.`,
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const update: Record<string, string | null> = {
      cpf: isCpf ? cpf_cnpj : null,
      cnpj: !isCpf ? cpf_cnpj : null,
      person_type: personType,
      phone,
      address_cep: cep,
      address_street: street,
      address_number: number,
      address_neighborhood: neighborhood,
      address_city: city,
      address_uf: uf,
    };

    const { error: updErr } = await admin
      .from('profiles')
      .update(update)
      .eq('id', userId);

    if (updErr) {
      console.error(LOG, 'erro no update', updErr);
      return new Response(JSON.stringify({ error: 'Não foi possível salvar seus dados fiscais. Tente novamente.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(LOG, 'ok', userId);
    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(LOG, 'erro inesperado', e);
    return new Response(JSON.stringify({ error: 'Erro inesperado. Tente novamente.' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
