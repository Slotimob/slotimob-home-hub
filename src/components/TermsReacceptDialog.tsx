import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Shield, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TermsReacceptDialogProps {
  open: boolean;
  userId: string;
  currentVersion: string;
  onAccepted: () => void;
}

export const TermsReacceptDialog = ({
  open,
  userId,
  currentVersion,
  onAccepted,
}: TermsReacceptDialogProps) => {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    if (!accepted) {
      toast({
        title: 'Aceite necessário',
        description: 'Você precisa aceitar os termos para continuar usando o aplicativo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('profiles')
        .update({
          terms_accepted_at: new Date().toISOString(),
          terms_version: currentVersion,
        })
        .eq('id', userId);

      if (error) throw error;

      toast({
        title: 'Termos aceitos',
        description: 'Obrigado por aceitar os novos termos de uso.',
      });

      onAccepted();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Termos Atualizados</DialogTitle>
          <DialogDescription className="text-center">
            Atualizamos nossa Política de Privacidade e Termos de Uso. Por favor, revise e aceite os novos termos para continuar usando o SLOTIMOB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-4 justify-center">
            <Link
              to="/legal"
              target="_blank"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Shield className="h-4 w-4" />
              Política de Privacidade
            </Link>
            <Link
              to="/legal"
              target="_blank"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <FileText className="h-4 w-4" />
              Termos de Uso
            </Link>
          </div>

          <div className="flex items-start space-x-2 p-4 bg-muted/50 rounded-lg">
            <Checkbox
              id="reaccept-terms"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked as boolean)}
              className="mt-0.5"
            />
            <Label
              htmlFor="reaccept-terms"
              className="text-sm leading-relaxed cursor-pointer"
            >
              Li e aceito a nova versão dos Termos de Uso e Política de Privacidade
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleAccept}
            disabled={!accepted || loading}
            className="w-full"
          >
            {loading ? 'Salvando...' : 'Aceitar e Continuar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
