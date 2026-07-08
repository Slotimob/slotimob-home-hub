import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const DeleteAccountSection = () => {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [skipExportCheck, setSkipExportCheck] = useState(false);

  const isConfirmed = confirmText === 'EXCLUIR MINHA CONTA';

  const handleDelete = async () => {
    if (!isConfirmed) return;
    setIsDeleting(true);

    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: { confirmation_text: confirmText, reason, skip_export_check: skipExportCheck },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Conta excluída com sucesso. Você será redirecionado.');

      // Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao excluir conta.';
      toast.error(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="border-destructive/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive">
          <Trash2 className="h-5 w-5" />
          Zona de Perigo
        </CardTitle>
        <CardDescription>
          Ações irreversíveis relacionadas à sua conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setConfirmText(''); setReason(''); } }}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full gap-2">
              <Trash2 className="h-4 w-4" />
              Excluir Minha Conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Excluir Conta Permanentemente
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-3 text-left">
                <p>
                  Esta ação é <strong className="text-destructive">irreversível</strong>. Ao confirmar, todos os seus dados serão
                  permanentemente excluídos, incluindo:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Imóveis, unidades e contratos</li>
                  <li>Leads, contatos e negociações</li>
                  <li>Transações financeiras e contas bancárias</li>
                  <li>Mensagens de WhatsApp e histórico de IA</li>
                  <li>Documentos e arquivos armazenados</li>
                  <li>Assinatura e créditos restantes</li>
                </ul>
                <p className="text-sm font-medium">
                  Não será possível recuperar nenhum dado após a exclusão.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-sm text-muted-foreground">
                  Motivo da exclusão (opcional)
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Nos conte por que está saindo..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm" className="text-sm font-medium">
                  Digite <span className="font-bold text-destructive">EXCLUIR MINHA CONTA</span> para confirmar:
                </Label>
                <Input
                  id="confirm"
                  placeholder="EXCLUIR MINHA CONTA"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="font-mono"
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleDelete(); }}
                disabled={!isConfirmed || isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Excluindo...
                  </>
                ) : (
                  'Excluir Permanentemente'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
