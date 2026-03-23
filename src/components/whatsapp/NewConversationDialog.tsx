import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NewConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string | null;
  initialPhone?: string;
  initialMessage?: string;
}

function sanitizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
  if (cleaned.length <= 11) cleaned = '55' + cleaned;
  return cleaned;
}

export function NewConversationDialog({ open, onOpenChange, connectionId, initialPhone = '', initialMessage = '' }: NewConversationDialogProps) {
  const [phone, setPhone] = useState(initialPhone);
  const [message, setMessage] = useState(initialMessage);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Sync initial values when dialog opens with deep link data
  useEffect(() => {
    if (open) {
      if (initialPhone) setPhone(initialPhone);
      if (initialMessage) setMessage(initialMessage);
    }
  }, [open, initialPhone, initialMessage]);

  const canSend = phone.replace(/\D/g, '').length >= 10 && message.trim().length > 0;

  const handleSend = async () => {
    if (!canSend || !connectionId) return;
    setSending(true);
    try {
      const sanitized = sanitizePhone(phone);
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          to: sanitized,
          message: message.trim(),
          connectionId,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Mensagem enviada!', description: `Para ${sanitized}` });
      setPhone('');
      setMessage('');
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Erro ao enviar', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Conversa</DialogTitle>
          <DialogDescription>Envie a primeira mensagem para iniciar uma conversa.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Número do WhatsApp</Label>
            <Input
              id="phone"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">DDD + número. Ex: 11999999999</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="first-message">Mensagem</Label>
            <Textarea
              id="first-message"
              placeholder="Olá! Tudo bem?"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleSend} disabled={!canSend || sending}>
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
