
## Diagnóstico

Verifiquei a aplicação pelo browser e a landing page (`/`) está funcionando normalmente. O dev server não mostra erros de runtime.

Existe um **erro de build no TypeScript** no arquivo `src/components/PropertyDocuments.test.tsx`:
- `screen` e `waitFor` não são encontrados como exports de `@testing-library/react`
- Isso pode estar interferindo com o hot-reload do Vite e causando telas brancas em certas condições

## Plano

1. **Corrigir o arquivo de teste** `src/components/PropertyDocuments.test.tsx` -- atualizar os imports de `@testing-library/react` para serem compatíveis com a versão instalada, ou ajustar a versão do pacote.

Se o problema de tela branca persistir após a correção, investigaremos mais a fundo as rotas autenticadas (`/dashboard`, `/pipeline`, etc.).
