# Investigação — 3 sintomas de tema/cache (leitura, sem alterações)

## Sintoma A — `/auth` com fundo cinza

**Evidência**
- `rg -n "useForceLightTheme" src/` → `src/pages/Auth.tsx:22` (import) e `src/pages/Auth.tsx:219` (chamada), além de `Checkout.tsx:29/128`.
- `src/hooks/useForceLightTheme.ts:14` → `document.documentElement.setAttribute('data-theme', 'light')`.
- `src/index.css:11-14` → `:root[data-theme="light"] { --background: 246 20% 94% }` (cinza).
- `src/index.css:100-101` → `:root[data-theme="site"] { --background: 0 0% 100% }` (branco).
- `src/pages/Auth.tsx:998` e `:1048` usam `bg-background`.

**Veredito: hipótese confirmada.** `/auth` é montada dentro de `site(<Auth />)` (`App.tsx:147`), que grava `data-theme="site"`, e logo em seguida o próprio `Auth.tsx` chama `useForceLightTheme()`, que sobrescreve o mesmo atributo do `<html>` para `light`. Os dois escrevem no mesmo lugar; o último a rodar vence, e é o hook da página. Resultado: `--background: 246 20% 94%`, o cinza do app. O `Checkout.tsx` tem exatamente o mesmo conflito (`App.tsx:158` também usa `site(...)`).

Agravante do cleanup: ao sair de `/auth`, o `useForceLightTheme` restaura o tema do `localStorage`, não o `site` — então a página seguinte também pode herdar o tema errado.

## Sintoma B — preço errado em `/` e `/planos`, certo no checkout

**Evidência**
- O código atual **não tem mais nenhuma referência a early adopter**: `rg` em `PricingSection.tsx`, `Plans.tsx` e `usePlanPricing.ts` só encontra `price_original` e `price_annual`. O cálculo é `p.price_annual / 12` (`PricingSection.tsx:120,133,143`), nunca `* 12`.
- `public/sw.js` (56 linhas) é **só** o handler de push: "This file is loaded by the Workbox-generated SW via importScripts. It ONLY handles push notifications — all caching is managed by Workbox."
- `vite.config.ts:17-19` → `VitePWA({ registerType: "autoUpdate" })`; `:49-55` → `globPatterns: ["**/*.{js,css,ico,png,svg,woff2}"]`, `cleanupOutdatedCaches: true`, `skipWaiting: true`, `clientsClaim: true`, `navigateFallback: null`.
- `vite.config.ts:57-61` → navegação (`request.mode === 'navigate'`, ou seja o HTML) é `NetworkOnly`. JS/CSS não têm regra de runtime: são servidos do **precache** do Workbox (revisionado por build).
- `src/main.tsx:6-19` apaga, a cada boot, todo cache cujo nome comece com `workbox-precache` ou `workbox-runtime`.
- `PWAUpdatePrompt.tsx` usa `useRegisterSW`, chama `registration.update()` a cada 60s e mostra o banner "Nova versão disponível" só quando `needRefresh` fica true; o reload é manual (`updateServiceWorker(true)` + `window.location.reload()`).
- Erros de runtime do preview: `Failed to update a ServiceWorker ... /sw.js: A bad HTTP response code (500)`.

**Veredito: cache/service worker, sim — e com uma causa concreta identificável.** Há uma **colisão de nome de arquivo**: o VitePWA em modo `generateSW` emite `dist/sw.js`, e o projeto também tem um `public/sw.js` (o handler de push), que é copiado para `dist/` com o mesmo nome. Um sobrescreve o outro no build. Se o `/sw.js` servido for o arquivo de push, ele não tem precache nem `skipWaiting` reais; se o build falhar nessa disputa, é exatamente o 500 registrado nos erros de runtime. Em qualquer dos casos o ciclo de atualização do Workbox não fecha, o `needRefresh` nunca dispara e o cliente fica preso no bundle antigo — enquanto o checkout, que lê o preço em outro caminho de código, mostra o valor certo do banco.

Contribui também `src/main.tsx:6-19`: apagar `workbox-precache-*` a cada boot deixa o SW com um manifesto que aponta para um cache inexistente, estado em que ele pode servir respostas velhas ou falhar.

Confirmação prática (não executada, é do usuário): se o valor anual exibido for absurdo tipo `22.608`, é bundle antigo com o cálculo `* 12`; nenhum código atual produz esse número.

## Sintoma C — bloco de Planos volta a ficar cinza ao navegar

**Evidência**
- `src/App.tsx:96` → `const site = (element) => <SiteThemeProvider>{element}</SiteThemeProvider>`, aplicado **por rota** (`:144-162`). Cada rota pública cria a **sua própria instância** do provider; não há um provider compartilhado envolvendo o grupo.
- Todas as páginas públicas são `React.lazy` (`App.tsx:23-86`) sob um único `<Suspense>` (`:141`).
- `SiteThemeProvider.tsx:16-25` (cleanup) → ao desmontar, lê `localStorage['slotimob-theme']` e restaura **o tema do app** (`light`/`dark`), removendo o `site`.
- `src/index.css:114` → `--section: 246 60% 97%` está definido **somente** dentro de `:root[data-theme="site"]`. Não existe em `light` nem em `dark`.
- `LandingPage.tsx:244` → a seção de planos usa `bg-section`.

**Veredito: hipótese 2, corrida do tema — e é a mesma raiz do sintoma A.** Como `--section` só existe no escopo `site`, qualquer instante em que o `<html>` não esteja com `data-theme="site"` faz `bg-section` virar cor inválida e a seção aparecer com o fundo cinza do body. Ao navegar `/planos` → `/`, o cleanup do provider de `/planos` restaura o tema salvo do app, e o provider da nova rota só reescreve `site` depois que o chunk lazy resolve — janela em que o Suspense e a primeira pintura acontecem sob o tema errado. `shift+F5` resolve porque no boot só existe uma instância, sem cleanup concorrente.

Cache **não** é a causa aqui: o CSS atual já tem `--section` e `bg-section` corretos.

## Causa comum

**A e C têm a mesma causa raiz**: o `data-theme` do `<html>` é um recurso global disputado por três escritores independentes — `SiteThemeProvider` (por rota), `useForceLightTheme` (por página) e a restauração via `localStorage` — sem nenhuma arbitragem. Quem escreve por último vence, e o cleanup de um desfaz o efeito do outro. Some-se a isso que o token `--section` existe em um único tema, o que transforma qualquer milissegundo de tema errado em cinza visível.

**B é independente**: é ciclo de vida do service worker / bundle velho, agravado pela colisão entre `public/sw.js` e o `sw.js` gerado pelo VitePWA, e pela limpeza agressiva de caches no `main.tsx`.

Nada foi alterado.
