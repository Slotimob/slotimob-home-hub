import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function sanitizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('55') && cleaned.length >= 12) return cleaned;
  if (cleaned.length <= 11) cleaned = '55' + cleaned;
  return cleaned;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const evolutionApiUrl = (Deno.env.get('EVOLUTION_API_URL') ?? '').replace(/\/$/, '');
    const evolutionApiKey = Deno.env.get('EVOLUTION_API_KEY');

    if (!evolutionApiUrl || !evolutionApiKey) {
      return new Response(JSON.stringify({ error: 'Evolution API not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { persistSession: false },
    });

    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    let body: any;
    try { body = await req.json(); } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { transactionId } = body;
    if (!transactionId) {
      return new Response(JSON.stringify({ error: 'transactionId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch transaction using the user's JWT (respects RLS)
    const { data: transaction, error: txError } = await supabaseClient
      .from('financial_transactions')
      .select('id, description, amount, due_date, status, broker_id, contact_id, type')
      .eq('id', transactionId)
      .single();

    if (txError || !transaction) {
      console.error('Transaction fetch error:', txError);
      return new Response(JSON.stringify({ error: 'Transaction not found or access denied' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (transaction.status === 'paid') {
      return new Response(JSON.stringify({ error: 'Transaction already paid' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!transaction.contact_id) {
      return new Response(JSON.stringify({ error: 'No contact associated with this transaction' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch contact info (admin to bypass RLS since we already validated access)
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .select('name, phone, whatsapp')
      .eq('id', transaction.contact_id)
      .single();

    if (contactError || !contact) {
      return new Response(JSON.stringify({ error: 'Contact not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contactPhone = contact.whatsapp || contact.phone;
    if (!contactPhone) {
      return new Response(JSON.stringify({ error: 'Contact has no phone number' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sanitizedPhone = sanitizePhoneNumber(contactPhone);
    const formattedAmount = formatCurrency(transaction.amount);
    const dueDate = transaction.due_date
      ? new Date(transaction.due_date).toLocaleDateString('pt-BR')
      : 'não informado';

    // Build professional billing message
    const message = [
      `Olá, ${contact.name}! 👋`,
      '',
      'Gostaríamos de lembrar sobre o seguinte compromisso financeiro:',
      '',
      `📋 *${transaction.description}*`,
      `💰 Valor: *${formattedAmount}*`,
      `📅 Vencimento: *${dueDate}*`,
      '',
      'Caso já tenha efetuado o pagamento, por favor desconsidere esta mensagem.',
      '',
      'Qualquer dúvida, estamos à disposição! 😊',
    ].join('\n');

    // Find the WhatsApp connection for this broker
    const { data: connection, error: connError } = await supabaseAdmin
      .from('whatsapp_connections')
      .select('instance_name, status')
      .eq('broker_id', transaction.broker_id)
      .eq('status', 'connected')
      .limit(1)
      .maybeSingle();

    if (connError || !connection?.instance_name) {
      return new Response(JSON.stringify({ error: 'No active WhatsApp connection found' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send via Evolution API
    const evoUrl = `${evolutionApiUrl}/message/sendText/${connection.instance_name}`;
    console.log(`Billing message to ${sanitizedPhone} via ${connection.instance_name}`);

    const evoRes = await fetch(evoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': evolutionApiKey },
      body: JSON.stringify({ number: sanitizedPhone, text: message }),
    });

    const evoData = await evoRes.json();
    console.log('Evolution response status:', evoRes.status);

    if (!evoRes.ok) {
      console.error('Evolution error:', evoData);
      return new Response(JSON.stringify({ error: evoData?.message || 'Failed to send via WhatsApp' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update transaction with sent timestamp
    const { error: updateError } = await supabaseAdmin
      .from('financial_transactions')
      .update({ whatsapp_sent_at: new Date().toISOString() })
      .eq('id', transactionId);

    if (updateError) {
      console.error('Failed to update whatsapp_sent_at:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      contactName: contact.name,
      sentAt: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('whatsapp-billing error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
