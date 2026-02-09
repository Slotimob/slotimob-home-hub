import { useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DeleteContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentId: string | null;
  contentTitle: string;
  onSuccess: () => void;
}

export function DeleteContentDialog({
  open,
  onOpenChange,
  contentId,
  contentTitle,
  onSuccess,
}: DeleteContentDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!contentId) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('training_content')
        .delete()
        .eq('id', contentId);

      if (error) throw error;

      toast.success('Conteúdo excluído com sucesso!');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast.error('Erro ao excluir conteúdo', { description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <AlertDialogTitle>Excluir Conteúdo</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2">
            Tem certeza que deseja excluir <strong>"{contentTitle}"</strong>?
            <br />
            Esta ação não pode ser desfeita e o progresso dos usuários neste conteúdo será perdido.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
