# Memory: ui/pipeline-improvements
Updated: just now

Melhorias implementadas na página Pipeline:

1. **Responsividade**: Colunas do Kanban adaptam-se para 288px em mobile e 320px em desktop.

2. **Scroll Behavior**: O scroll do mouse nas colunas não converte mais para horizontal quando está sobre o conteúdo interno dos cards. Atributo `data-card-scroll` identifica áreas com scroll interno.

3. **Edição de Temperatura**: No DealDetailsSheet, aba "Detalhes", há botões toggle para Quente/Morno/Frio com cores visuais distintas (verde/âmbar/azul).

4. **Layout dos Cards**: Temperatura e status "Parado" são exibidos em badges separados no canto superior direito do card, evitando conflito visual.

5. **Estágios Personalizados**: Botões de Editar/Excluir no menu dropdown funcionam corretamente com `onClick` em vez de `onSelect`.

6. **Reordenação de Estágios**: Dialog de reordenação salva a ordem no perfil do usuário (`pipeline_stage_order`) e persiste entre sessões.
