# 🔍 Checklist de QA — SlotiMob (Ponta a Ponta)

> Última atualização: 2026-03-01
> Marque cada item com `[x]` conforme for validando.

---

## 1. [Visitante] — Landing Page & SEO

- [ ] LP carrega sem erros de console (zero Red logs)
- [ ] Pricing Section exibe preços dinâmicos (mensal/anual toggle)
- [ ] Badge "Early Adopter" aparece quando há vagas restantes no banco
- [ ] Badge desaparece quando vagas = 0 para o plano correspondente
- [ ] Contagem de vagas atualiza em tempo real (realtime subscription em `early_adopter_claims`)
- [ ] Meta tags `<title>`, `<meta description>`, Open Graph e JSON-LD estão presentes no source
- [ ] `robots.txt` e `sitemap.xml` acessíveis em `/robots.txt` e `/sitemap.xml`
- [ ] Links do header (Login, Cadastrar) redirecionam para `/auth`
- [ ] Footer links funcionais (Termos, Privacidade → `/legal`)
- [ ] LP 100% responsiva em 390x844 (iPhone) — sem scroll horizontal ou sobreposição
- [ ] Cards de preço legíveis em mobile sem truncamento de texto

---

## 2. [Autenticação] — Auth & OAuth

### 2.1 Cadastro por Email
- [ ] Formulário de cadastro valida campos obrigatórios (nome, email, senha)
- [ ] Cadastro cria registro em `profiles` e `subscriptions` no banco
- [ ] Novo usuário recebe `plan_id: pro`, `status: trialing`, `trial_ends_at: +14 dias`
- [ ] Redirect automático para `/dashboard` após cadastro
- [ ] Parâmetro `?trial=pro` na URL de auth é respeitado

### 2.2 Login por Email
- [ ] Login com credenciais válidas redireciona para `/dashboard`
- [ ] Login com senha incorreta exibe mensagem de erro clara
- [ ] "Esqueci minha senha" envia email de reset funcional

### 2.3 Google OAuth (Pop-up)
- [ ] Botão "Continuar com Google" abre pop-up centralizado (500x650)
- [ ] Após autenticação no pop-up, janela principal detecta sessão e redireciona para `/dashboard`
- [ ] Pop-up fecha automaticamente após sucesso
- [ ] Se pop-up for bloqueado, alerta aparece com opção de fallback (redirect padrão)
- [ ] Overlay "Conectando ao seu ambiente seguro..." aparece apenas durante processamento

### 2.4 Tracking de Origem (UTM)
- [ ] Acessar LP com `?utm_source=instagram&utm_medium=cpc` persiste params em `sessionStorage`
- [ ] Params UTM sobrevivem navegação LP → Auth
- [ ] Ao criar lead/cadastro, `utm_source`, `utm_medium`, `utm_campaign` são salvos no banco (`leads` table)
- [ ] TTL de 24h no sessionStorage funciona (params expiram após esse período)

---

## 3. [Onboarding / Trial] — Primeiros Passos

- [ ] Dashboard exibe banner de boas-vindas informando dias restantes do trial
- [ ] `TrialBanner` mostra contagem regressiva correta (ex: "12 dias restantes")
- [ ] Durante trial PRO, **todos** os módulos estão desbloqueados:
  - [ ] Chat IA — acessível sem overlay
  - [ ] WhatsApp — acessível sem overlay (1 instância liberada)
  - [ ] Relatórios (Semanal, Mensal, DRE) — acessíveis
  - [ ] Documentos — templates e edição de layout liberados
  - [ ] CRM Completo — histórico de atividades funcional
  - [ ] Pipeline — criação de estágios personalizados liberada
  - [ ] Financeiro Completo — fluxo de caixa e categorias editáveis
  - [ ] Gestão de Ativos — asset health tracking ilimitado
- [ ] Limite de unidades do plano base permanece (ex: 2 para free, 5 para start)
- [ ] Após 14 dias, `expire-trials` (cron 03:00 UTC) faz downgrade para `start` com `status: active`

---

## 4. [Planos & Limites] — Feature Gating

### 4.1 Plano Start (Gratuito pós-trial)
- [ ] Limite de 5 unidades — tentar criar a 6ª exibe `UpgradeModal`
- [ ] Limite de 1 usuário — `team_management: false`
- [ ] WhatsApp bloqueado — overlay "Recurso Exclusivo PRO" visível
- [ ] Chat IA bloqueado — overlay de FeatureGate visível
- [ ] Conciliação Bancária (OFX) bloqueada
- [ ] DRE bloqueado
- [ ] Edição de categorias financeiras bloqueada

### 4.2 Plano Essencial
- [ ] Limite de 10 unidades respeitado
- [ ] CRM básico liberado, CRM completo bloqueado
- [ ] Financeiro simples liberado, DRE bloqueado

### 4.3 Plano Pro
- [ ] Limite de 50 unidades respeitado
- [ ] Todos os módulos liberados (IA, WhatsApp 1 instância, DRE, relatórios)
- [ ] Pipeline com estágios personalizados funcional

### 4.4 Plano Business
- [ ] Limite de 80 unidades respeitado
- [ ] 3 usuários inclusos + gestão de equipe habilitada
- [ ] 3 instâncias de WhatsApp inclusas

### 4.5 Add-ons
- [ ] Adicionar "Usuário Extra" (+1) reflete em `subscriptions.extra_users_count`
- [ ] Adicionar "Pack de Unidades" (+50) reflete em `subscriptions.extra_unit_packs`
- [ ] Limites expandidos são aplicados imediatamente (sem necessidade de refresh)

---

## 5. [Checkout & Pagamento] — Stripe

### 5.1 Embedded Checkout
- [ ] Clicar em "Assinar" na LP navega para `/checkout?plan=pro&cycle=annual`
- [ ] Checkout Stripe renderiza inline (sem redirect para fora do domínio)
- [ ] Toggle mensal/anual na LP passa parâmetro `cycle` correto
- [ ] Após pagamento bem-sucedido, redirect para `/checkout/success`
- [ ] Plano no banco atualiza para `status: active` com `plan_id` correto
- [ ] Caches React Query invalidados (`trial-status`, `subscription-limits`, `subscription-details`)
- [ ] Early Adopter claim registrado em `early_adopter_claims` se elegível

### 5.2 Checkout via Settings
- [ ] Em Settings → "Plano e Faturamento", botão "Efetivar Assinatura PRO" navega para checkout
- [ ] Vagas Early Adopter exibidas no card de trial quando disponíveis
- [ ] Plano Start exibe botão "Upgrade para PRO"

### 5.3 Stripe Customer Portal
- [ ] Botão "Gerir Assinatura no Stripe" abre portal em nova aba
- [ ] Cancelamento via portal reflete `cancel_at_period_end: true` no banco
- [ ] Alteração de método de pagamento funcional

---

## 6. [CRM / Pipeline] — Operacional

- [ ] Criar novo deal com contato, valor estimado e estágio inicial
- [ ] Mover deal entre colunas no Kanban registra `deal_stage_history` com timestamp automático
- [ ] Histórico de atividades do deal registra tipo, data e descrição
- [ ] Filtros de pipeline (por estágio, responsável, temperatura) funcionam
- [ ] Criação de estágios personalizados (apenas Pro+)
- [ ] Reordenação de estágios via drag-and-drop funcional
- [ ] `DealDetailsSheet` exibe todas as informações do deal corretamente
- [ ] Bulk actions (selecionar múltiplos deals) funcional

---

## 7. [Contatos] — CRM Unificado

- [ ] Criar contato com categorias (Lead, Proprietário, Empresa)
- [ ] Busca por nome, email, telefone funcional
- [ ] Filtros avançados por categoria e período funcionam
- [ ] Importação de contatos via CSV/Excel funcional
- [ ] Exportação de contatos funcional
- [ ] Detalhes do contato exibem timeline de atividades
- [ ] Exclusão de contato com confirmação funcional

---

## 8. [Imóveis & Unidades]

- [ ] Criar propriedade com endereço, tipo e amenidades
- [ ] Criar unidade vinculada a uma propriedade
- [ ] Upload de fotos da unidade (galeria) funcional
- [ ] Edição de unidade atualiza dados no banco
- [ ] Visualização em Kanban e Tabela funcionam
- [ ] Tags de unidade (filtro) funcionais
- [ ] Limite de unidades por plano respeitado (UpgradeModal ao exceder)
- [ ] Importação de unidades via Excel funcional
- [ ] Exportação de unidades funcional

---

## 9. [Contratos & Locação]

- [ ] Gerar contrato em PDF para uma unidade
- [ ] Dados da organização (logo, CNPJ) corretos no cabeçalho do PDF
- [ ] Wizard de criação de lease funcional (inquilino, proprietário, valores)
- [ ] Reajuste de aluguel (IGPM/IPCA) calcula corretamente
- [ ] Timeline de evolução do aluguel exibe histórico
- [ ] Upload de contrato assinado funcional
- [ ] Rescisão de contrato com motivo registrado

---

## 10. [Financeiro]

### 10.1 Transações
- [ ] Criar transação (receita/despesa) com categoria, data e valor
- [ ] Transação aparece na listagem e nos gráficos
- [ ] Filtros por período, categoria, banco e status funcionam
- [ ] Edição e exclusão de transação funcional
- [ ] Bulk edit de múltiplas transações funcional
- [ ] Transações recorrentes geram parcelas corretamente

### 10.2 DRE (Demonstrativo de Resultado)
- [ ] Gráfico de DRE atualiza em tempo real ao criar transação
- [ ] Categorias mapeadas com `dre_type` correto (gross_revenue, admin_expense, etc.)
- [ ] Exportação de DRE em PDF/Excel funcional

### 10.3 Conciliação Bancária
- [ ] Importação de extrato OFX cria entries em `bank_statement_entries`
- [ ] Matcher automático sugere correspondências
- [ ] Reconciliação manual funcional
- [ ] Saldo do sistema vs saldo bancário exibido corretamente
- [ ] Histórico de reconciliação acessível

### 10.4 Contas Bancárias
- [ ] Criar conta bancária com saldo inicial
- [ ] Definir conta padrão funcional
- [ ] Saldo atualiza com transações pagas

---

## 11. [Documentos]

- [ ] Listar templates de documentos disponíveis
- [ ] Gerar documento preenchendo campos do template
- [ ] Histórico de documentos gerados acessível
- [ ] Envio de documento por email funcional
- [ ] Edição de layout de template (apenas Pro+)
- [ ] Templates customizados (criar/editar/excluir)

---

## 12. [Relatórios]

- [ ] Relatório overview com métricas gerais
- [ ] Relatório semanal gera PDF/envio por email
- [ ] Relatório mensal gera PDF/envio por email
- [ ] Filtro por período funcional
- [ ] Filtro por unidade funcional
- [ ] Relatório DIMOB com dados fiscais
- [ ] Exportação CSV funcional

---

## 13. [WhatsApp]

- [ ] Tela de WhatsApp carrega sem erros (apenas Pro+)
- [ ] Chat sidebar lista conversas
- [ ] Envio de mensagem funcional (instância conectada)
- [ ] Painel CRM contextual exibe dados do contato
- [ ] Nova conversa vincula a contato existente
- [ ] Uso de créditos WhatsApp exibido corretamente

---

## 14. [Chat IA]

- [ ] Tela de Chat IA carrega sem erros (apenas Pro+)
- [ ] Envio de mensagem e resposta da IA funcional
- [ ] Contador de créditos atualiza após cada interação
- [ ] Histórico de mensagens persiste entre sessões
- [ ] Compra de créditos adicionais funcional

---

## 15. [Agenda / Schedule]

- [ ] Calendário exibe atividades agendadas
- [ ] Criar atividade com tipo, data e horário
- [ ] Drag-and-drop de atividades no calendário funcional
- [ ] Navegação semanal e mensal funcional
- [ ] Sincronização com calendário externo (iCal) funcional
- [ ] Cards de negociação na agenda exibem dados do deal

---

## 16. [Configurações]

### 16.1 Perfil
- [ ] Alterar nome salva no banco
- [ ] Alterar telefone salva no banco
- [ ] Upload de avatar (JPG/PNG/WEBP, máx 5MB) funcional
- [ ] Upload de CRECI (JPG/PNG/PDF, máx 10MB) funcional
- [ ] Visualizar CRECI (signed URL) abre em nova aba

### 16.2 Segurança
- [ ] Usuário email/senha: botão "Alterar Senha" envia email de reset
- [ ] Usuário Google: exibe card "Conta Google vinculada" + botão "Criar senha de acesso"
- [ ] Criar senha envia email de `resetPasswordForEmail` com redirect para `/reset-password`

### 16.3 Plano e Faturamento
- [ ] Seção visível para owners (não para agents)
- [ ] **Trial ativo**: Banner "14 dias de Plano PRO Grátis" com dias restantes
- [ ] **Trial ativo**: Vagas Early Adopter exibidas quando disponíveis
- [ ] **Trial ativo**: Botão "Efetivar Assinatura PRO" navega para `/checkout?plan=pro&cycle=annual`
- [ ] **Plano Start**: Botão "Upgrade para PRO" visível
- [ ] **Plano pago**: Card de AI Usage com créditos utilizados/total e barra de progresso
- [ ] **Plano pago com Stripe**: Botão "Gerir Assinatura no Stripe" abre portal
- [ ] Add-ons (Usuários Extras, Pack de Unidades) incrementam/decrementam
- [ ] Compra de Créditos WhatsApp e IA funcional

### 16.4 Preferências
- [ ] Alternar tema (Claro/Escuro, Verde/Azul/Roxo) aplica imediatamente
- [ ] Tema persiste no localStorage e no banco

### 16.5 Notificações
- [ ] Configurações de notificação salvam preferências

### 16.6 Documentos Legais
- [ ] Link para Termos/Privacidade funciona
- [ ] Data de aceite dos termos exibida
- [ ] Admin: botões de gerenciar termos e usuários visíveis

---

## 17. [Gestão de Equipe] (Business+)

- [ ] Convidar membro por email funcional
- [ ] Membro aceita convite e acessa a conta
- [ ] Permissões por módulo configuráveis
- [ ] Agente herda limites do owner
- [ ] Remoção de membro funcional

---

## 18. [Admin / Cockpit Master]

- [ ] Acesso restrito a `super_admin`
- [ ] Gráfico de MRR soma valores de planos ativos corretamente
- [ ] Lista de usuários com filtros funcional
- [ ] Ações administrativas registradas em `admin_actions_logs`
- [ ] Configurações de GTM/Pixel refletem no `<head>` da LP
- [ ] Blog: criar/editar/publicar posts funcional
- [ ] Suporte: visualização de tickets/métricas

---

## 19. [Segurança & Infraestrutura]

- [ ] RLS habilitado em todas as tabelas com dados de usuário
- [ ] Políticas RLS filtram por `broker_id = auth.uid()`
- [ ] Edge Functions com `SUPABASE_SERVICE_ROLE_KEY` para operações privilegiadas
- [ ] Webhooks externos operam com `verify_jwt = false` (WhatsApp, Stripe)
- [ ] `early_adopter_claims` sem SELECT público (acesso via RPC)
- [ ] Zero API keys privadas expostas no código frontend
- [ ] CORS configurado corretamente nas Edge Functions
- [ ] ⚠️ **Pendente**: Ativar "Leaked Password Protection" no Supabase Dashboard
- [ ] ⚠️ **Pendente**: Monitorar atualização de `vite-plugin-pwa` (vulnerabilidade high)

---

## 20. [Responsividade & UI]

- [ ] Dashboard responsivo em 390x844 (iPhone 14)
- [ ] Pipeline/Kanban com scroll horizontal funcional em mobile
- [ ] Tabelas financeiras com scroll horizontal em mobile
- [ ] Bottom navigation visível e funcional em mobile
- [ ] Modals/Sheets não ultrapassam viewport em mobile
- [ ] Textos de abas de funcionalidades legíveis sem truncamento
- [ ] Cards de preço na LP legíveis em mobile
- [ ] Zero erros de console (Red logs) em todas as páginas

---

## 21. [Performance]

- [ ] Tempo de carregamento inicial < 3s
- [ ] Lazy loading de imagens funcional
- [ ] React Query com `staleTime` adequado (sem refetch excessivo)
- [ ] PWA: Service Worker registra e cacheia assets
- [ ] PWA: Prompt de atualização aparece quando há nova versão
- [ ] Offline indicator aparece quando sem conexão

---

> **Resultado Final**: Se todos os itens acima estiverem marcados com `[x]`, o sistema está **100% Homologado**. ✅
