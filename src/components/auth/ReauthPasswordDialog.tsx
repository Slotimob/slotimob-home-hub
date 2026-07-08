import { useState } from 'react';
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
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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

      await onConfirm();
      setPassword('');
      onClose();
    } catch {
      toast.error('Erro ao confirmar. Tente novamente.', { duration: 1000 });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setPassword(''); onClose(); } }}>
      <DialogContent className="max-w-sm">
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
            <Button type="button" variant="outline" onClick={() => { setPassword(''); onClose(); }}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !password.trim()}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
