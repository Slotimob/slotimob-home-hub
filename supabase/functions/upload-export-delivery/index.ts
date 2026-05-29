import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

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

    // Verify super admin
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_super_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_super_admin) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const formData = await req.formData();
    const requestId = formData.get("request_id") as string;
    const file = formData.get("file") as File;

    if (!requestId || !file) {
      return new Response(JSON.stringify({ error: "request_id e file são obrigatórios" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate request exists and status
    const { data: request, error: reqError } = await supabaseAdmin
      .from("data_export_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (reqError || !request) {
      return new Response(JSON.stringify({ error: "Solicitação não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (request.status !== "in_preparation") {
      return new Response(JSON.stringify({ error: "Status inválido para entrega" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const filePath = `${request.organization_owner_id}/${requestId}/slotimob-export.zip`;

    // Upload to storage
    const fileBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabaseAdmin.storage
      .from("client-deliveries")
      .upload(filePath, fileBuffer, {
        contentType: "application/zip",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(JSON.stringify({ error: "Erro ao fazer upload: " + uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update request
    const { error: updateError } = await supabaseAdmin
      .from("data_export_requests")
      .update({
        status: "delivered",
        delivery_file_path: filePath,
        delivery_file_size: file.size,
        delivered_at: new Date().toISOString(),
        delivered_by: user.id,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", requestId);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Erro ao atualizar solicitação" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If account_closure, generate 30-day signed URL for email
    let signedUrl: string | null = null;
    if (request.reason === "account_closure") {
      const { data: urlData } = await supabaseAdmin.storage
        .from("client-deliveries")
        .createSignedUrl(filePath, 30 * 24 * 60 * 60); // 30 days
      signedUrl = urlData?.signedUrl || null;
    }

    // Send notification email
    const { data: ownerProfile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, email")
      .eq("id", request.organization_owner_id)
      .single();

    if (ownerProfile?.email) {
      await supabaseAdmin.from("email_notifications").insert({
        broker_id: request.organization_owner_id,
        email_to: ownerProfile.email,
        email_subject: "Sua exportação de dados está pronta!",
        email_body: `Olá ${ownerProfile.full_name || ""},\n\nSua solicitação de exportação de dados foi concluída e está disponível para download.\n\nAcesse o painel em: ${Deno.env.get('SITE_URL') ?? 'https://app.slotimob.com.br'}/settings/data-export\n\n${signedUrl ? `Como esta exportação é referente ao encerramento de conta, segue link direto de download válido por 30 dias:\n${signedUrl}\n\n` : ""}O arquivo ficará disponível por 30 dias.\n\nEquipe SLOTIMOB`,

        email_type: "data_export_delivered",
      });
    }

    return new Response(
      JSON.stringify({ success: true, file_path: filePath, file_size: file.size, signed_url: signedUrl }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("upload-export-delivery error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
