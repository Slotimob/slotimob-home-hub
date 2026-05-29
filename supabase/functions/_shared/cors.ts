// supabase/functions/_shared/cors.ts
// Configuração centralizada de CORS para todas as Edge Functions

// Para funções chamadas pelo frontend (browser) — mantém * por segurança
export const corsHeadersFrontend = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Para webhooks chamados por serviços externos (Stripe, WhatsApp, Facebook)
// Webhooks são server-to-server — não precisam de CORS
export const corsHeadersWebhook = {
  "Content-Type": "application/json",
};

// Alias para compatibilidade — usar corsHeadersFrontend em novos arquivos
export const corsHeaders = corsHeadersFrontend;
