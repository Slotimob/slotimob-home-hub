import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LEGACY_PATHS = [
  "9d79871f-fab9-4017-8d69-c7d6c4a6f672/4216ddd3-bdee-4f19-bfe1-982fefad9591/documents/1769748876015-CARTAO CNPJ.pdf",
  "9d79871f-fab9-4017-8d69-c7d6c4a6f672/ae1ad56a-808e-4442-ab2a-f8d55631646c/documents/1769748891291-CCMEI-50174942000164.pdf",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const results = [];

    for (const path of LEGACY_PATHS) {
      console.log(`[migrate-legacy-unit-documents] processando ${path}`);

      const targetFolder = path.substring(0, path.lastIndexOf("/"));
      const targetFileName = path.substring(path.lastIndexOf("/") + 1);
      const { data: already } = await supabase.storage.from("documents").list(targetFolder);
      const alreadyMigrated = already?.some((f) => f.name === targetFileName);

      if (alreadyMigrated) {
        results.push({ path, status: "already_migrated" });
        continue;
      }

      const { data: fileData, error: downloadError } = await supabase.storage
        .from("unit-media")
        .download(path);

      if (downloadError || !fileData) {
        results.push({ path, status: "source_missing", error: downloadError?.message });
        continue;
      }

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(path, fileData, { upsert: true });

      if (uploadError) {
        results.push({ path, status: "upload_failed", error: uploadError.message });
        continue;
      }

      const { error: removeError } = await supabase.storage
        .from("unit-media")
        .remove([path]);

      results.push({
        path,
        status: "migrated",
        removed_from_source: !removeError,
        remove_error: removeError?.message,
      });
    }

    console.log(`[migrate-legacy-unit-documents] resultado`, JSON.stringify(results));

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[migrate-legacy-unit-documents] erro", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  }
});
