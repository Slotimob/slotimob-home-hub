import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const JSON_H = { ...CORS, "Content-Type": "application/json" };
const ASAAS = "https://api.asaas.com/v3";

function resp(body: object) {
  return new Response(JSON.stringify(body), { status: 200, headers: JSON_H });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return resp({ error: "Não autorizado" });

    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return resp({ error: "Token inválido" });

    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .maybeSingle();

    if (membership) {
      return resp({ error: "Você é um usuário convidado. A configuração da conta Asaas deve ser feita pelo administrador (proprietário) da conta principal." });
    }

    const body = await req.json();
    const { name, email, cpfCnpj, mobilePhone, companyType, address, addressNumber, province, postalCode, city, state } = body;

    if (!name || !cpfCnpj) return resp({ error: "Nome e CPF/CNPJ são obrigatórios." });

    const { data: existing } = await supabase
      .from("asaas_accounts")
      .select("id, asaas_account_id, status")
      .eq("broker_id", user.id)
      .maybeSingle();

    if (existing?.status === "active") {
      return resp({ success: true, asaas_account_id: existing.asaas_account_id, already_exists: true });
    }

    const masterKey = Deno.env.get("ASAAS_API_KEY")!;
    const cleanCpf = cpfCnpj.replace(/\D/g, "");
    const isIndividual = cleanCpf.length === 11;

    const payload: Record<string, unknown> = {
      name,
      email,
      cpfCnpj: cleanCpf,
      companyType: isIndividual ? "INDIVIDUAL" : (companyType || "MEI"),
    };
    if (mobilePhone) payload.mobilePhone = mobilePhone.replace(/\D/g, "");
    if (address) payload.address = address;
    if (addressNumber) payload.addressNumber = addressNumber;
    if (province) payload.province = province;
    if (postalCode) payload.postalCode = postalCode.replace(/\D/g, "");
    if (city) payload.city = city;
    if (state) payload.state = state;

    const asaasRes = await fetch(`${ASAAS}/accounts`, {
      method: "POST",
      headers: { "access_token": masterKey, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const asaasData = await asaasRes.json();
    console.log("[setup-asaas-account] Asaas response:", JSON.stringify(asaasData));

    if (!asaasRes.ok) {
      const msg = asaasData?.errors?.[0]?.description || asaasData?.message || "Erro ao criar subconta no Asaas";
      return resp({ error: msg });
    }

    const { id: asaasAccountId, apiKey: subKey, walletId } = asaasData;

    let encryptedKey: string | null = null;
    if (subKey) {
      const { data: encData, error: encryptErr } = await supabase.rpc("encrypt_asaas_api_key", { p_plain: subKey });
      if (encryptErr || !encData) {
        console.error("[setup-asaas-account] Encrypt error:", encryptErr);
        return resp({ error: "Subconta criada no Asaas mas erro ao proteger a chave: " + (encryptErr?.message || "erro desconhecido") });
      }
      encryptedKey = encData as string;
    }

    if (existing) {
      await supabase.from("asaas_accounts").update({
        asaas_account_id: asaasAccountId,
        asaas_api_key_encrypted: encryptedKey,
        wallet_id: walletId ?? null,
        status: "active",
        cpf_cnpj: cleanCpf,
      }).eq("id", existing.id);
    } else {
      const { error: insertErr } = await supabase.from("asaas_accounts").insert({
        broker_id: user.id,
        asaas_account_id: asaasAccountId,
        asaas_api_key_encrypted: encryptedKey,
        wallet_id: walletId ?? null,
        status: "active",
        cpf_cnpj: cleanCpf,
      });
      if (insertErr) {
        console.error("[setup-asaas-account] DB error:", insertErr);
        return resp({ error: "Subconta criada no Asaas mas erro ao salvar no banco: " + insertErr.message });
      }
    }

    if (subKey) {
      const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
      const webhookUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/asaas-webhook`;
      fetch(`${ASAAS}/webhooks`, {
        method: "POST",
        headers: { "access_token": subKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          email,
          apiVersion: 3,
          enabled: true,
          interrupted: false,
          sendType: "SEQUENTIALLY",
          events: ["PAYMENT_CREATED", "PAYMENT_RECEIVED", "PAYMENT_CONFIRMED", "PAYMENT_OVERDUE", "PAYMENT_CANCELLED", "PAYMENT_UPDATED"],
          authToken: webhookToken,
        }),
      }).catch(e => console.warn("[setup-asaas-account] Webhook reg failed:", e));
    }

    console.log(`[setup-asaas-account] Sub-account ${asaasAccountId} created for broker ${user.id}`);
    return resp({ success: true, asaas_account_id: asaasAccountId, already_exists: false });

  } catch (err) {
    console.error("[setup-asaas-account] Unexpected error:", err);
    return resp({ error: "Erro inesperado: " + (err as Error).message });
  }
});
