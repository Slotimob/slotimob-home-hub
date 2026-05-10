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

## Vulnerabilidades aceitas (build-time only)

Após `npm audit fix`, restam vulnerabilidades em ferramentas de
build/desenvolvimento (vite, esbuild, rollup, workbox-build, exceljs,
serialize-javascript). Nenhuma afeta código que roda em produção
para o usuário final. Aceitas como risco controlado.

## Vulnerabilidades aceitas (impacto build-time / dev-time)

Após `npm audit fix --legacy-peer-deps`, restam 7 vulnerabilidades em 
ferramentas de build e desenvolvimento. Nenhuma afeta código que roda 
em produção para o usuário final.

| Pacote | Severidade | Onde atua | Por que aceitamos |
|---|---|---|---|
| `esbuild` | moderate | dev server | Vetor exige expor `npm run dev` à internet pública, que nunca fazemos. |
| `vite` | moderate | dev server | Depende do esbuild acima, mesmo cenário. |
| `serialize-javascript` (RCE) | high | build pipeline | Vetor exige rodar build de código não confiável; build é sempre executado por nós ou pela esteira do Lovable. |
| `serialize-javascript` (DoS) | moderate | build pipeline | Mesmo cenário acima. |
| `@rollup/plugin-terser` | high | build pipeline | Depende do `serialize-javascript`, mesmo cenário. |
| `workbox-build` | high | build pipeline | Depende do `@rollup/plugin-terser`, mesmo cenário. |
| `uuid` (via exceljs) | moderate | runtime | Atinge apenas `uuid.v3/v5/v6` com buffer customizado, que não usamos. Atualizar exigiria downgrade de exceljs (breaking). |

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
