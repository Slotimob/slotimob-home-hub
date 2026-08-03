# Vulnerabilidades conhecidas e mitigadas

## jsPDF — PDF Object Injection (GHSA-w7c4-...)

Status: mitigado via sanitização de input.

A versão `jspdf@4.x` em uso ainda contém a vulnerabilidade reportada
(não há patch upstream disponível). Mitigação aplicada:

- Helper `src/utils/pdfSafeText.ts` sanitiza todo conteúdo dinâmico
  antes de passar para o jspdf.
- Caracteres de escape PDF (`\`, `(`, `)`, `<`, `>`, null bytes) são
  substituídos por equivalentes Unicode visualmente similares.
- Comprimento de texto limitado a 5000 caracteres por campo.

Esta mitigação reduz drasticamente a superfície de ataque. Reavaliar
quando jspdf publicar versão com fix oficial.

## Vulnerabilidades aceitas

Última auditoria real (`npm audit`): 2026-08-03. 18 vulnerabilidades corrigidas via `npm audit fix --legacy-peer-deps` (commit `29706da0`), 6 remanescentes listadas abaixo, todas com fix disponível apenas via breaking change.

| Pacote | Severidade | Onde atua | Por que aceitamos |
|---|---|---|---|---|
| `esbuild` | moderate | dev server | Vetor exige expor `npm run dev` à internet pública, que nunca fazemos. Fix exige `vite@8.x` (breaking). |
| `vite` | moderate | dev server | Depende do esbuild acima, mesmo cenário. Hoje travado em `^5.4.19` por compatibilidade com o resto do projeto. |
| `serialize-javascript` / `@rollup/plugin-terser` / `workbox-build` | high | build pipeline | Corrigidas em 2026-08-03 via `npm audit fix --legacy-peer-deps`. Se reaparecerem em auditoria futura, mesmo raciocínio: vetor exige build de código não confiável. |
| `uuid` (via `exceljs`) | moderate | runtime | Atinge apenas `uuid.v3/v5/v6` com buffer customizado, que não usamos. Corrigir exigiria downgrade de `exceljs` pra `3.x` (breaking). |
| `react-router` / `react-router-dom` | moderate | runtime | Fix só existe a partir da `7.18.0` (major, hoje o projeto está em `^6.30.1`). Avaliar upgrade pra v7 como item de roadmap separado, não como hotfix de dependência. |

Monitoramento contínuo via Dependabot. Reavaliar quando upstream 
publicar patches sem breaking changes.
## Política de buckets de Storage

- **proposals**: privado, signed URL 30 dias (corretor compartilha
  com cliente externo).
- **whatsapp-media**: privado, signed URL 1 hora (visualização
  interna).
- **property-documents**: privado, signed URL 1 hora (matrícula,
  IPTU, contratos e demais documentos sensíveis vinculados a
  imóveis).
- **property-media**: semi-público (intencional). Armazena APENAS
  fotos comerciais de imóveis (capa, galeria). URLs públicas para
  suportar exibição em listas e futuro "Cardápio de Imóveis".
  INSERT/UPDATE/DELETE restritos ao broker dono via RLS. Fotos NÃO
  contêm dados sensíveis.
