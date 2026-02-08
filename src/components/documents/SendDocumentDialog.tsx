import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, MessageSquare, Loader2, Check } from 'lucide-react';
import { DocumentTemplate } from '@/utils/documentTemplates';
import { generateDocumentPDFBlob } from '@/utils/pdfGenerator';

interface SendDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: DocumentTemplate | null;
  filledFields: Record<string, string>;
}

export const SendDocumentDialog = ({
  open,
  onOpenChange,
  template,
  filledFields,
}: SendDocumentDialogProps) => {
  const { toast } = useToast();
  const [sendMethod, setSendMethod] = useState<'email' | 'whatsapp'>('email');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Email state
  const [email, setEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailMessage, setEmailMessage] = useState('');

  // WhatsApp state
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappMessage, setWhatsappMessage] = useState('');

  // Reset state when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && template) {
      setEmailSubject(`Documento: ${template.name}`);
      setEmailMessage(
        `Olá,\n\nSegue em anexo o documento "${template.name}".\n\nAtenciosamente,`
      );
      setWhatsappMessage(
        `Olá! Segue o documento "${template.name}" em anexo.`
      );
      setSent(false);
    }
    onOpenChange(isOpen);
  };

  const handleSendEmail = async () => {
    if (!template || !email) return;

    setIsSending(true);
    try {
      // Generate PDF as base64
      const pdfBase64 = await generateDocumentPDFBlob(template, filledFields);

      // Send via edge function
      const { error } = await supabase.functions.invoke('send-document-email', {
        body: {
          to: email,
          subject: emailSubject,
          message: emailMessage,
          documentName: template.name,
          pdfBase64,
        },
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: 'E-mail enviado!',
        description: `Documento enviado para ${email}`,
      });

      setTimeout(() => {
        onOpenChange(false);
        setSent(false);
      }, 1500);
    } catch (error) {
      console.error('Error sending email:', error);
      toast({
        title: 'Erro ao enviar e-mail',
        description: 'Não foi possível enviar o documento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!template || !whatsappNumber) return;

    setIsSending(true);
    try {
      // Generate PDF as base64
      const pdfBase64 = await generateDocumentPDFBlob(template, filledFields);

      // DISABLED: WhatsApp connection check - causing 406 errors that block network
      // TODO: Re-enable once whatsapp_connections table RLS is fixed
      const connection = null;

      if (!connection) {
        toast({
          title: 'WhatsApp não conectado',
          description: 'Conecte seu WhatsApp nas configurações para enviar documentos.',
          variant: 'destructive',
        });
        setIsSending(false);
        return;
      }

      // Format phone number (remove non-digits, add country code if needed)
      let formattedNumber = whatsappNumber.replace(/\D/g, '');
      if (!formattedNumber.startsWith('55')) {
        formattedNumber = '55' + formattedNumber;
      }

      // Get or create conversation
      const remoteJid = `${formattedNumber}@s.whatsapp.net`;
      
      let { data: conversation } = await supabase
        .from('whatsapp_conversations')
        .select('id')
        .eq('connection_id', connection.id)
        .eq('remote_jid', remoteJid)
        .maybeSingle();

      if (!conversation) {
        const { data: newConv, error: convError } = await supabase
          .from('whatsapp_conversations')
          .insert({
            connection_id: connection.id,
            remote_jid: remoteJid,
            contact_phone: formattedNumber,
            contact_name: null,
          })
          .select()
          .single();

        if (convError) throw convError;
        conversation = newConv;
      }

      // Send document via WhatsApp
      const { error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          conversationId: conversation.id,
          messageType: 'document',
          content: whatsappMessage,
          mediaBase64: pdfBase64,
          mediaMimeType: 'application/pdf',
          mediaFilename: `${template.name}.pdf`,
        },
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: 'Documento enviado!',
        description: `Documento enviado via WhatsApp para ${whatsappNumber}`,
      });

      setTimeout(() => {
        onOpenChange(false);
        setSent(false);
      }, 1500);
    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast({
        title: 'Erro ao enviar via WhatsApp',
        description: 'Não foi possível enviar o documento. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar Documento</DialogTitle>
          <DialogDescription>
            Envie "{template.name}" por e-mail ou WhatsApp
          </DialogDescription>
        </DialogHeader>

        <Tabs value={sendMethod} onValueChange={(v) => setSendMethod(v as 'email' | 'whatsapp')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">
              <Mail className="mr-2 h-4 w-4" />
              E-mail
            </TabsTrigger>
            <TabsTrigger value="whatsapp">
              <MessageSquare className="mr-2 h-4 w-4" />
              WhatsApp
            </TabsTrigger>
          </TabsList>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail do destinatário</Label>
              <Input
                id="email"
                type="email"
                placeholder="cliente@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Assunto</Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Mensagem</Label>
              <Textarea
                id="message"
                rows={4}
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
              />
            </div>
          </TabsContent>

          <TabsContent value="whatsapp" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Número do WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                placeholder="(11) 99999-9999"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wa-message">Mensagem</Label>
              <Textarea
                id="wa-message"
                rows={3}
                value={whatsappMessage}
                onChange={(e) => setWhatsappMessage(e.target.value)}
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={sendMethod === 'email' ? handleSendEmail : handleSendWhatsApp}
            disabled={
              isSending ||
              sent ||
              (sendMethod === 'email' && !email) ||
              (sendMethod === 'whatsapp' && !whatsappNumber)
            }
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : sent ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Enviado!
              </>
            ) : (
              <>
                {sendMethod === 'email' ? (
                  <Mail className="mr-2 h-4 w-4" />
                ) : (
                  <MessageSquare className="mr-2 h-4 w-4" />
                )}
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
