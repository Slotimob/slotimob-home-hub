import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldCheck, ShieldAlert, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useMfa } from '@/hooks/useMfa';
import { useCockpitAccess } from '@/hooks/useCockpitAccess';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';
import { MfaEnrollDialog } from '@/components/security/MfaEnrollDialog';
import { ReauthPasswordDialog } from '@/components/auth/ReauthPasswordDialog';

export function MfaSettingsCard() {
  const { verifiedFactor, hasVerifiedFactor, isLoading, unenroll } = useMfa();
  const { cockpitRole } = useCockpitAccess();
  const { isMember } = useWorkspace();
  const { plan } = useSubscriptionLimits();

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [reauthOpen, setReauthOpen] = useState(false);

  const isInternalStaff = cockpitRole !== null;
  const isBusinessOwner = !isInternalStaff && !isMember && plan === 'business';

  const handleConfirmDisable = async () => {
    if (!verifiedFactor) return;
    try {
      await unenroll(verifiedFactor.id);
      toast.success('Verificação em duas etapas desativada.', { duration: 1000 });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Não foi possível desativar. Tente novamente.',
        { duration: 1000 },
      );
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Autenticação em duas etapas (2FA)</CardTitle>
              <CardDescription>
                Camada extra de segurança no acesso à sua conta.
              </CardDescription>
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : hasVerifiedFactor ? (
              <Badge variant="default" className="gap-1">
                <ShieldCheck className="h-3 w-3" />
                Ativado
              </Badge>
            ) : (
              <Badge variant="outline">Desativado</Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {!isLoading && isInternalStaff && !hasVerifiedFactor && (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>
                Sua conta tem acesso administrativo à plataforma. A ativação da verificação em duas etapas é
                obrigatória pela Política de Gestão de Acessos da Slotimob.
              </AlertDescription>
            </Alert>
          )}

          {!isLoading && isBusinessOwner && !hasVerifiedFactor && (
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                Sua conta emite cobranças financeiras. Recomendamos fortemente ativar a verificação em duas etapas.
              </AlertDescription>
            </Alert>
          )}

          {isLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </p>
          ) : hasVerifiedFactor && verifiedFactor ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                  <Smartphone className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {verifiedFactor.friendly_name || 'Aplicativo autenticador'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ativado em{' '}
                    {format(new Date(verifiedFactor.updated_at || verifiedFactor.created_at), "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setReauthOpen(true)}
              >
                Desativar 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Proteja sua conta exigindo um código temporário do seu celular além da senha.
              </p>
              <Button onClick={() => setEnrollOpen(true)}>Ativar 2FA</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <MfaEnrollDialog open={enrollOpen} onOpenChange={setEnrollOpen} />

      <ReauthPasswordDialog
        open={reauthOpen}
        onClose={() => setReauthOpen(false)}
        onConfirm={handleConfirmDisable}
        title="Desativar 2FA"
        description="Confirme sua senha para desativar a verificação em duas etapas."
      />
    </>
  );
}
