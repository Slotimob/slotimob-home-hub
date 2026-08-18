# Fase A.7 — Mapeamento (sem código)

## Ponto 1 — CSS do submenu de tabs

### 1. Como está hoje (`src/pages/gestao/AlugueiDetalhe.tsx`, linhas 622-636)

```tsx
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
    <TabsTrigger value="obligations" className="text-xs">Obrigações</TabsTrigger>
    <TabsTrigger value="fiscal" className="text-xs">Fiscal</TabsTrigger>
    <TabsTrigger value="activities" className="text-xs">Atividades</TabsTrigger>
  </TabsList>
```

Nenhum override de cor local. Todo o visual vem do shadcn base em `src/components/ui/tabs.tsx`:

- `TabsList`: `inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground`
- `TabsTrigger`: `... rounded-sm px-3 py-1.5 text-sm font-medium ... data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm ...`

Não há variant customizada de Tabs no projeto — só o componente base.

### 2. Comparação com outros lugares

| Local | Classes do `TabsList` |
|---|---|
| `src/pages/gestao/ContratoDetalhe.tsx:478` | `grid w-full grid-cols-6` |
| `src/pages/PropertyDetalhe.tsx:409` | `grid w-full grid-cols-6` |
| `src/pages/UnitDetalhe.tsx:475` | `grid w-full grid-cols-7/8` |
| `src/components/assets/AssetDetailDialog.tsx:717` | `grid w-full grid-cols-4` |
| `src/pages/Training.tsx:291` | `inline-flex h-auto p-1 bg-muted/50` |
| `src/components/ui/view-mode-tabs.tsx:29` | `h-10 p-1 bg-muted/50` |

Ou seja: o padrão dominante nas páginas de detalhe é exatamente o mesmo que `AlugueiDetalhe.tsx` usa (`grid w-full grid-cols-N`, sem cor local). A única variação existente no sistema é `bg-muted/50` (Training / view-mode-tabs), que é *mais* claro, não mais contrastado.

### 3. Causa exata da diferença

Não é classe faltando nem override local nem cor hardcoded — o `AlugueiDetalhe` segue o padrão. A causa é de **tokens do design system** em `src/index.css`:

- `--background: 0 0% 97%` (foi escurecido de 100% para 97% numa mudança anterior)
- `--muted: 246 30% 96%`
- `--card: 0 0% 100%`

O fundo do `TabsList` (`bg-muted`, L=96%) ficou a ~1% de luminância do fundo da página (`bg-background`, L=97%) → a faixa some. Pior: o trigger ativo é `data-[state=active]:bg-background`, ou seja, também 97% — o ativo tem quase o mesmo tom da faixa, restando só o `shadow-sm` para diferenciar.

Por que "outras páginas parecem certas": em telas onde as tabs ficam sobre um `Card` branco (`--card: 100%`) ou sobre superfícies mais escuras, a mesma faixa 96% aparece nítida. Em `/gestao/alugueis` (detalhe) as tabs ficam direto sobre o fundo 97% da página, sem card, então o contraste efetivo é quase zero.

Fixes possíveis (a decidir na implementação):
- **Global (recomendado)**: escurecer levemente `--muted` (ex.: L 92-93%) e trocar o ativo para `bg-card` (branco 100%) no `TabsTrigger` base — corrige o sistema inteiro de uma vez.
- **Local**: adicionar `bg-muted border border-border` no `TabsList` desta página e `data-[state=active]:bg-card` nos triggers — resolve só aqui, mas cria divergência do padrão.

## Ponto 2 — Botão "Como funciona?"

### 1. Onde fica

- Botão: `src/pages/gestao/AtivosEmGestao.tsx:269-272` (`variant="outline"`, ícone `BookOpen`, label "Como funciona?"), abre estado `guideOpen`.
- Conteúdo: `src/components/assets/AssetManagementGuide.tsx` — Dialog com array `steps` **hardcoded** (4 passos + dica final).

### Texto atual completo

Título: `📖 Como funciona a Gestão de Ativos?`

**1. Configure suas Obrigações**
- Abra o card do ativo e clique em "Configurar".
- Ative as obrigações que deseja acompanhar (Aluguel, IPTU, Condomínio...).
- Defina o dia de vencimento e o responsável pelo pagamento.

**2. Financeiro vs. Gerencial** — badge "Gerencial"
- Financeiro — lê os lançamentos do seu caixa real (DRE).
- Gerencial — apenas conferência de recibos de terceiros, sem impacto no fluxo de caixa.

**3. Faça os Lançamentos**
- Receitas e despesas financeiras → aba Financeiro.
- Conferências gerenciais → aba Gerencial.
- O sistema identifica automaticamente o tipo pelo período de competência.

**4. Conciliação e Vínculo Manual**
- O semáforo fica verde quando o match é automático.
- Se o valor ou data divergirem, use o botão "Vincular" para ensinar o sistema.
- A partir do vínculo, o status atualiza instantaneamente.

Rodapé (dica verde): "Dica: Quanto mais lançamentos vinculados, mais preciso fica o semáforo de saúde do ativo."

### 2. O que está desatualizado

| Trecho | Problema | Origem |
|---|---|---|
| Passo 1, bullet 1: 'clique em "Configurar"' | Botão não existe mais; obrigações se editam dentro de "Gerenciar" → aba Obrigações | (a) |
| Passo 1 em geral | Não menciona que a config de obrigações do imóvel agora **sincroniza nos dois sentidos** com o contrato ativo, nem o aviso/atalho de regenerar o PDF quando o contrato fica desatualizado | (d) |
| Passos 3 e 4 ("aba Financeiro" / "aba Gerencial") | As abas de Gerenciar hoje são **Visão Geral / Obrigações / Fiscal / Atividades** — não existem abas com esses nomes; a distinção Financeiro vs Gerencial continua válida como conceito, mas a navegação descrita está errada | reorganização das abas |
| Ausente | Fluxo "Nova Locação" agora abre a tela cheia de contrato pré-preenchida (`/gestao/contratos/novo` com unidade e inquilino), não popup | (b) |
| Ausente | Aba Fiscal usa o CIB unificado do imóvel (`units.cib`) como fonte única | (c) |
| Ausente | Aba Atividades passou a usar o mesmo padrão de `/gestao/manutencoes` (mesmos filtros, tabela e ações) + card colapsável de histórico comercial (CRM) | (e) |

Restam corretos e podem ser mantidos: passo 2 (Financeiro vs Gerencial), a lógica do semáforo e o "Vincular" da conciliação, e a dica final.
