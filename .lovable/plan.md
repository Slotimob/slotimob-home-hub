# Editor de projeção inline no reajuste

## Implementação
- Extrair de `ConfirmLeaseProjectionDialog` o estado, cálculos, seleção, totais e persistência para um `LeaseProjectionEditor` reutilizável e sem `Dialog`.
- Manter `ConfirmLeaseProjectionDialog` como casca fina para o fluxo de criação/finalização de contrato, preservando ações, callbacks, deduplicação e datas.
- Substituir o resumo somente-leitura da calculadora pelo editor em modo `postAdjustment`, usando a mesma âncora e o novo aluguel.
- Fazer “Confirmar reajuste” aplicar primeiro o reajuste existente e depois pedir ao editor que lance exatamente as parcelas selecionadas; em falha parcial, manter o reajuste e permitir nova tentativa do lançamento.
- Remover da calculadora os estados e a renderização do segundo diálogo.

## Validação
- Executar o typecheck com `tsgo`.
- Abrir o fluxo real no preview, conferir campos e parcelas marcadas, alterar o número de parcelas e capturar screenshots desktop e mobile.

## Detalhes técnicos
- O editor exporá ao pai a quantidade selecionada, estado de envio e uma ação imperativa de confirmação, evitando duplicar o caminho de persistência.
- `resolveFirstAdjustedCompetency`, cascade, dedup e `issueDate` permanecem inalterados.
