# Diagnóstico: "Erro no upload. Invalid key: nome do arquivo.pdf"

## 1. Qual componente renderiza a aba "Documentos" nas duas rotas

Ambas as rotas caem no **mesmo componente**:

- `/units?id=...` e `/real-estate?id=...` são resolvidas em `src/App.tsx:94-109` — `UnitsRoute` e `RealEstateRoute` renderizam **ambas** `UnitDetalhe` quando há `?id`.
- `src/pages/UnitDetalhe.tsx:582-583` renderiza a aba: `<AssetDocuments assetType="unit" assetId={unit.id} userId={effectiveBrokerId} />`.
- `src/pages/PropertyDetalhe.tsx` (empreendimento) hoje tem só 3 abas: Detalhes, Financeiro, Atividades. **Não tem aba Documentos.**

Sobre a nota do vault (2026-07-30): a divergência ainda **existe no código legado**, mas não está no caminho do bug:
- `src/components/PropertyDocuments.tsx` → tabela `property_documents` + bucket `property-documents`.
- `src/components/units/UnitDocuments.tsx` → tabela `documents` + bucket `documents` (não `unit-media`), usado só nos diálogos legados `UnitDetailsDialog.tsx` e `EditUnitDialog.tsx`.
- O componente novo `AssetDocuments.tsx` unificou: tabela `documents` + bucket `documents`, alternando só a coluna (`unit_id` / `property_id`) e o `document_type`.

## 2. Trecho que monta a key

`src/components/assets/AssetDocuments.tsx:159-164`:

```text
const timestamp = Date.now();
const filePath = `${userId}/${assetId}/documents/${timestamp}-${file.name}`;
await supabase.storage.from('documents').upload(filePath, file);
```

Mesmo padrão nos legados:
- `src/components/PropertyDocuments.tsx:145` → `${userId}/${propertyId}/${timestamp}-${file.name}`
- `src/components/units/UnitDocuments.tsx:160` → `${userId}/${unitId}/documents/${timestamp}-${file.name}`

Em todos, `file.name` entra **cru**, sem sanitização.

## 3. Causa confirmada

É exatamente isso. O Supabase Storage valida a key do objeto contra um conjunto restrito de caracteres; espaços, acentos, cedilha, parênteses e `#`/`?` disparam `Invalid key: <path>`. Como o arquivo se chamava `nome do arquivo.pdf` (espaços), a key final ficou `.../1770.../1770...-nome do arquivo.pdf` → rejeitada antes de qualquer RLS. A mensagem que o usuário viu vem do `catch` em `AssetDocuments.tsx` (`toast 'Erro no upload'` + `err.message`).

É **um único bug, um único componente** para as duas rotas (`AssetDocuments.tsx`), com dois clones legados com o mesmo defeito.

## 4. Existe utilitário de sanitização reaproveitável?

**Não.** Busca por `sanitizeFileName`, `slugify`, `normalize('NFD')` retorna apenas:
- `slugify` em `src/components/cockpit/CockpitBlogTab.tsx:59` — local, para slug de post de blog, não exportado nem adequado a nome de arquivo (come a extensão).
- `normalize('NFD')` em `src/pages/BlogPost.tsx:90` — normalização de cidade.

Os demais uploads **evitam** o problema em vez de resolvê-lo: geram nome sintético e descartam o original.
- `PropertyGalleryUpload.tsx:103`, `UnitGalleryUpload.tsx:99`, `AssetImageUpload.tsx`, `PropertyImageUpload.tsx:116` → `${Date.now()}_${random}.${ext}`
- `WhatsApp.tsx:296` → hash SHA-256 + extensão
- `UploadSignedContractDialog.tsx:92`, `LeaseJourneyTab.tsx:282`, `CreateProposalSheet.tsx:354` → nome fixo/derivado do id
- Exceção: `CreateProposalDialog.tsx:145` monta o nome com `lead.name.replace(/\s+/g,'-')` — cobre espaço mas não acento/cedilha, então também pode quebrar com nome acentuado.

Ou seja: não há nada para reaproveitar — o correto é criar um utilitário compartilhado.

## Correção proposta (quando aprovado)

1. Criar `sanitizeStorageFileName(name)` em `src/lib/utils.ts` (ou `src/lib/storage-utils.ts`): separa base + extensão, aplica `normalize('NFD')` + remoção de diacríticos, troca tudo que não for `[a-zA-Z0-9._-]` por `-`, colapsa hifens, corta o tamanho (~80 chars), e cai num fallback (`arquivo`) se sobrar vazio. Extensão em minúsculas.
2. Aplicar em `AssetDocuments.tsx:160` (o bug reportado).
3. Aplicar também nos dois clones legados — `PropertyDocuments.tsx:145` e `units/UnitDocuments.tsx:160` — e no `CreateProposalDialog.tsx:145`, que têm o mesmo defeito.
4. O título exibido continua usando o `file.name` original (só a key do storage é sanitizada), então nada muda para o usuário na UI.
5. Rodar typecheck e build ao final.

Fora de escopo (não mexer agora): unificar `property_documents`/`property-documents` com `documents`, e adicionar aba Documentos ao `PropertyDetalhe.tsx`.
