

## Ajuste da Duração das Notificações para 3 Segundos

O sistema usa **dois sistemas de toast** em paralelo: o **Sonner** e o **Radix Toast** (via `use-toast`). O Radix Toast ja esta configurado com 3 segundos, mas o **Sonner esta com 5 segundos**. A correção e simples:

### Alteração

**Arquivo:** `src/components/ui/sonner.tsx`
- Alterar `duration={5000}` para `duration={3000}`

Isso garante que ambos os sistemas de notificação usem 3 segundos de forma consistente.

### Detalhes Técnicos

| Sistema | Arquivo | Valor Atual | Novo Valor |
|---------|---------|-------------|------------|
| Sonner | `src/components/ui/sonner.tsx` | 5000ms | 3000ms |
| Radix Toast | `src/hooks/use-toast.ts` | 3000ms | Sem alteração |
| Notifications util | `src/utils/notifications.ts` | 3000ms | Sem alteração |

