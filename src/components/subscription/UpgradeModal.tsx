import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Rocket, Building2, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAddonCheckout } from '@/hooks/useAddonCheckout';
import { useNavigate } from 'react-router-dom';
import { MemberFeatureDenied } from './MemberFeatureDenied';


interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlan?: 'essencial' | 'pro' | 'business';
  feature?: string;
}

// Benefícios Business para usuários que estão no Start (mostrar tudo)
const businessBenefitsFromStart = [
  'Tudo do Plano Pro incluído',
  'Gestão de Equipe — convide até 3 agentes adicionais',
  'Permissões por usuário (master, agente, somente leitura)',
  'Até 150 unidades gerenciadas (3× mais que o Pro)',
  '750 créditos de IA/mês (3× mais que o Pro)',
  'WhatsApp oficial para múltiplas instâncias',
  'Marketplace Asaas — emita boletos e PIX para inquilinos',
  'Suporte prioritário + onboarding dedicado',
];

// Benefícios Business para usuários Pro (mostrar apenas o que muda/adiciona)
const businessBenefitsFromPro = [
  'Gestão de Equipe — convide até 3 agentes adicionais',
  'Permissões por usuário (master, agente, somente leitura)',
  'Até 150 unidades (agora você tem 50) — 3× mais espaço',
  '750 créditos de IA/mês (agora você tem 250) — 3× mais',
  'WhatsApp para múltiplas instâncias simultâneas',
  'Suporte prioritário + onboarding dedicado',
];

// Benefícios Pro (para usuários no Start)
const proBenefits = [
  'Gestão completa de Ativos e Contratos',
  'Financeiro completo: DRE, OFX e Conciliação Bancária',
  'Relatórios Avançados (CRM, Ativos, Financeiro)',
  'Até 50 unidades gerenciadas',
  '250 créditos de IA/mês com Chat IA',
  'WhatsApp oficial integrado',
  'Marketplace Asaas — emita boletos e PIX para inquilinos',
  'Suporte via chat prioritário',
];

export const UpgradeModal = ({ open, onOpenChange, targetPlan: targetPlanProp, feature }: UpgradeModalProps) => {
  const { plan: currentPlan } = useSubscriptionLimits();
  const { isMember, isLoading: isWorkspaceLoading } = useWorkspace();
  const navigate = useNavigate();
  const { buyAddon, loadingAddonId } = useAddonCheckout();


  // Enquanto o workspace ainda está carregando, isMember default é `false` —
  // isso causaria um flash da UI de upgrade para um convidado. Enquanto
  // carrega OU se confirmado convidado, mostra a mensagem de permissão.
  if (isWorkspaceLoading || isMember) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <MemberFeatureDenied overlay={false} />
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Lógica de qual plano mostrar: se usuário é Pro, sempre mostra Business; 'essencial' (legado) cai para 'pro'
  const normalizedTarget: 'pro' | 'business' | undefined =
    targetPlanProp === 'essencial' ? 'pro' : targetPlanProp;
  const resolvedTarget: 'pro' | 'business' = normalizedTarget
    ? (currentPlan === 'pro' && normalizedTarget !== 'pro' ? 'business' : normalizedTarget)
    : (currentPlan === 'pro' ? 'business' : 'pro');

  const isPro = currentPlan === 'pro';
  const isUpgradeFromPro = isPro && resolvedTarget === 'business';

  // Usuário já é Business e bateu no limite: a expansão é via add-on, não upgrade
  if (currentPlan === 'business' && resolvedTarget === 'business') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="h-6 w-6 text-purple-500" />
              <DialogTitle className="text-lg">Adicione mais unidades ao seu Business</DialogTitle>
            </div>
            <DialogDescription>
              Você já está no plano mais alto (Business) e atingiu o limite de unidades
              incluído nele. Para expandir, não existe upgrade de plano — a forma de
              crescer é contratar um add-on de unidades, que é somado ao seu limite atual.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 rounded-lg border-2 border-purple-500 bg-card">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Pack de Unidades (+50)</p>
                  <p className="text-xs text-muted-foreground">R$ 39,90/mês cada</p>
                </div>
              </div>
            </div>

            <ul className="space-y-2">
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <span>+50 unidades gerenciadas somadas ao seu limite atual</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <span>Cobrança recorrente mensal, cancele quando quiser</span>
              </li>
              <li className="flex items-start gap-2 text-sm">
                <Check className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <span>Você mantém todos os recursos do Business</span>
              </li>
            </ul>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Agora não
              </Button>
              <Button
                className="flex-1 bg-purple-500 hover:opacity-90 gap-2"
                disabled={!!loadingAddonId}
                onClick={async () => {
                  const url = await buyAddon('extra-units-50', 1);
                  if (url) onOpenChange(false);
                }}
              >
                {loadingAddonId === 'extra-units-50' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                Adicionar +50 unidades
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }


  // Preços baseados no banco (subscription_plans)
  const planConfig = {
    pro: {
      name: 'Pro',
      icon: Rocket,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500',
      borderColor: 'border-blue-500',
      priceMonthly: 197,
    },
    business: {
      name: 'Business',
      icon: Building2,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500',
      borderColor: 'border-purple-500',
      priceMonthly: 297,
    },
  };

  const config = planConfig[resolvedTarget];
  const Icon = config.icon;

  const displayPrice = config.priceMonthly;
  const proCurrentPrice = planConfig.pro.priceMonthly;
  const upgradePrice = displayPrice - proCurrentPrice;

  // Benefícios a mostrar
  const benefits = resolvedTarget === 'business'
    ? (isUpgradeFromPro ? businessBenefitsFromPro : businessBenefitsFromStart)
    : proBenefits;

  const modalTitle = resolvedTarget === 'business'
    ? (isUpgradeFromPro ? 'Adicionar Gestão de Equipe ao seu Plano 👥' : 'Evolua para o Plano Business 🏢')
    : 'Desbloqueie tudo com o Plano Pro 🚀';

  const checkoutUrl = `/checkout?plan=${resolvedTarget}`;
  const ctaLabel = isUpgradeFromPro ? 'Fazer Upgrade para Business' : 'Fazer Upgrade Agora';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Icon className={`h-6 w-6 ${config.color}`} />
            <DialogTitle className="text-lg">{modalTitle}</DialogTitle>
          </div>
          <DialogDescription>
            {isUpgradeFromPro
              ? 'Convide agentes, defina permissões por usuário e gerencie sua equipe — tudo com apenas R$100/mês a mais no seu plano atual.'
              : resolvedTarget === 'business'
              ? 'Gestão de equipe completa, mais unidades, mais IA e onboarding dedicado para crescer com segurança.'
              : 'Gestão completa de ativos, contratos, financeiro avançado, IA e WhatsApp integrado.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Bloco de preço: diferenciado para usuário Pro */}
          {isUpgradeFromPro ? (
            <div className={`p-4 rounded-lg border-2 ${config.borderColor} bg-card space-y-2`}>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Seu plano atual (Pro)</span>
                <span className="font-medium">R$ {proCurrentPrice}/mês</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-3xl font-bold ${config.color}`}>+ R$ {upgradePrice}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Total: <strong className="text-foreground">R$ {displayPrice}/mês</strong> no Business
                </span>
              </div>
              <p className="text-xs text-muted-foreground pt-1 border-t border-border">
                Sua assinatura Pro atual será substituída automaticamente pelo Business. Sem cobrança dupla.
              </p>
            </div>
          ) : (
            <div className={`p-4 rounded-lg border-2 ${config.borderColor} bg-card`}>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">R$ {displayPrice}</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </div>
          )}

          {/* Lista de benefícios */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">
              {isUpgradeFromPro ? 'O que você adiciona ao seu plano:' : 'O que você desbloqueia:'}
            </h4>
            <ul className="space-y-2">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className={`h-4 w-4 ${config.color} shrink-0 mt-0.5`} />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Agora não
            </Button>
            <Button
              className={`flex-1 ${config.bgColor} hover:opacity-90 gap-2`}
              onClick={() => {
                onOpenChange(false);
                navigate(checkoutUrl);
              }}
            >
              <Zap className="h-4 w-4" />
              {ctaLabel}
            </Button>
          </div>

          {/* Nota de rodapé contextual */}
          {isUpgradeFromPro && (
            <p className="text-xs text-center text-muted-foreground">
              O Business inclui tudo do Pro. Nenhum recurso atual será perdido.
            </p>
          )}
          {!isUpgradeFromPro && resolvedTarget === 'pro' && (
            <p className="text-xs text-center text-muted-foreground">
              Teste grátis por 7 dias. Cancele quando quiser.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
