import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useMfa } from '@/hooks/useMfa';
import { MfaChallengeForm } from '@/components/security/MfaChallengeForm';
import { toast } from 'sonner';

interface ReauthPasswordDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
}

export function ReauthPasswordDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirmar identidade',
  description = 'Confirme sua senha para salvar as permissões.',
}: ReauthPasswordDialogProps) {
  const { user } = useAuth();
  const { hasVerifiedFactor, refetch } = useMfa();
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'password' | 'mfa'>('password');

  // Sempre reinicia no passo da senha ao abrir/fechar o dialog.
  useEffect(() => {
    setStep('password');
    setPassword('');
    setIsLoading(false);
  }, [open]);

  const closeDialog = () => {
    setStep('password');
    setPassword('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !password.trim()) return;

    setIsLoading(true);
    try {
      const { data: isValid, error } = await supabase.rpc('verify_current_password', {
        password: password.trim(),
      });

      if (error || !isValid) {
        toast.error('Senha incorreta. Tente novamente.', { duration: 1000 });
        return;
      }

      let requiresMfa = hasVerifiedFactor;
      try {
        const { data: freshFactors } = await refetch();
        if (freshFactors) {
          requiresMfa = freshFactors.some((f) => f.status === 'verified');
        }
      } catch {
        // mantém o valor já carregado pelo hook
      }

      if (requiresMfa) {
        setPassword('');
        setStep('mfa');
        return;
      }

      await onConfirm();
      setPassword('');
      onClose();
    } catch {
      toast.error('Erro ao confirmar. Tente novamente.', { duration: 1000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMfaSuccess = async () => {
    try {
      await onConfirm();
    } catch {
      toast.error('Erro ao confirmar. Tente novamente.', { duration: 1000 });
    } finally {
      closeDialog();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { closeDialog(); } }}>
      <DialogContent className="max-w-sm">
        {step === 'mfa' ? (
          <>
            <DialogHeader className="sr-only">
              <DialogTitle>Confirme com o código do autenticador</DialogTitle>
              <DialogDescription>Digite o código de 6 dígitos para concluir esta ação.</DialogDescription>
            </DialogHeader>
            <MfaChallengeForm
              title="Confirme com o código do autenticador"
              description="Digite o código de 6 dígitos para concluir esta ação."
              onSuccess={() => { void handleMfaSuccess(); }}
              onCancel={closeDialog}
            />
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                {title}
              </DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reauth-password">Senha</Label>
                <Input
                  id="reauth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  autoFocus
                  required
                  style={{ fontSize: '16px' }}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={closeDialog}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading || !password.trim()}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                </Button>
              </div>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
