import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'slotimob_onboarding_seen';

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setOpen(false);
  };

  const goToTraining = () => {
    dismiss();
    navigate('/training');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Bem-vindo ao SlotiMob! 🚀</DialogTitle>
          <DialogDescription className="text-sm pt-2 leading-relaxed">
            Para extrair o máximo do sistema e organizar sua operação, preparamos
            vídeos rápidos de 2 minutos. Vamos começar?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-row gap-2 sm:justify-end pt-2">
          <Button variant="ghost" onClick={dismiss}>
            Agora não
          </Button>
          <Button onClick={goToTraining}>
            Ir para Treinamentos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
