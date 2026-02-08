# Memory: features/crm-integration
Updated: just now

Os módulos de Agenda e Pipeline estão agora sincronizados. A Agenda exibe automaticamente:
1. **Atividades de Negociação** (deal_activities) com data agendada (scheduled_at)
2. **Tarefas de Negociação** (deal_tasks) com data de vencimento (due_date)
3. **Previsões de Fechamento** (expected_close_date) das negociações ativas

Cada item de negociação na Agenda possui um indicador visual distintivo (badge "Negociação" + stripe azul) que permite fácil identificação. A nomenclatura foi padronizada de "Deal" para "Negociação" em toda a interface do usuário.

O hook `useNegotiationScheduleItems` centraliza a busca de todos os itens relacionados a negociações para exibição na Agenda, e o componente `NegotiationScheduleCard` fornece a visualização diferenciada.
