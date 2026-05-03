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
