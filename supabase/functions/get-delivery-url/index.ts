import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autenticado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { request_id } = await req.json();
    if (!request_id) {
      return new Response(JSON.stringify({ error: "request_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: request, error: reqError } = await supabaseAdmin
      .from("data_export_requests")
      .select("*")
      .eq("id", request_id)
      .single();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: "Solicitação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check permissions
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    const isOwner = request.organization_owner_id === user.id;
    const isSuperAdmin = profile?.is_super_admin === true;

    if (!isOwner && !isSuperAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "delivered") {
      return new Response(JSON.stringify({ error: "Exportação não está disponível para download" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (new Date(request.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Link expirado" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!request.delivery_file_path) {
      return new Response(JSON.stringify({ error: "Arquivo não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate signed URL (1 hour)
    const { data: urlData, error: urlError } = await supabaseAdmin.storage
      .from("client-deliveries")
      .createSignedUrl(request.delivery_file_path, 3600);

    if (urlError || !urlData?.signedUrl) {
      return new Response(JSON.stringify({ error: "Erro ao gerar URL" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Register download
    await supabaseAdmin.rpc("register_export_download", { p_request_id: request_id });

    return new Response(
      JSON.stringify({ url: urlData.signedUrl, expires_in: 3600 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-delivery-url error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
