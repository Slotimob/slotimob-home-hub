import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatPhoneForWhatsApp } from "@/lib/utils";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  due_date: string | null;
  contact_id: string | null;
  unit_id: string | null;
  status: string;
}

interface ContactData {
  id: string;
  name: string;
  phone: string | null;
  whatsapp: string | null;
}

interface BillingMessageData {
  contactName: string;
  contactPhone: string;
  amount: string;
  dueDate: string;
  description: string;
  unitInfo?: string;
}

export function useWhatsAppBilling(navigateFn?: (path: string) => void) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isFetchingContact, setIsFetchingContact] = useState(false);

  const openWhatsApp = (phone: string, message: string) => {
    const encoded = encodeURIComponent(message);
    if (navigateFn) {
      navigateFn(`/whatsapp?phone=${phone}&text=${encoded}`);
    } else {
      window.open(`https://wa.me/${phone}?text=${encoded}`, "_blank", "noopener,noreferrer");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "data não informada";
    return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
  };

  const composeBillingMessage = (data: BillingMessageData): string => {
    const unitPart = data.unitInfo ? ` referente ao imóvel ${data.unitInfo}` : "";
    
    return `Olá, ${data.contactName}! 👋

Notamos que o pagamento de *${data.amount}*${unitPart}, com vencimento em *${data.dueDate}*, ainda não foi identificado em nosso sistema.

📋 *Detalhes:*
• Descrição: ${data.description}
• Valor: ${data.amount}
• Vencimento: ${data.dueDate}

Caso já tenha efetuado o pagamento, por favor nos envie o comprovante para baixa em nosso sistema.

Se precisar de ajuda ou tiver alguma dúvida, estamos à disposição!

Atenciosamente,
Equipe de Administração`;
  };

  const fetchContactData = async (contactId: string): Promise<ContactData | null> => {
    if (!user) return null;
    
    setIsFetchingContact(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, whatsapp")
        .eq("id", contactId)
        .single();

      if (error) {
        console.error("Error fetching contact:", error);
        return null;
      }

      return data;
    } catch (error) {
      console.error("Error fetching contact:", error);
      return null;
    } finally {
      setIsFetchingContact(false);
    }
  };

  const fetchUnitInfo = async (unitId: string): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from("units")
        .select("unit_number, property:properties(name)")
        .eq("id", unitId)
        .single();

      if (error || !data) return null;

      const property = data.property as { name?: string } | null;
      if (property?.name) {
        return `${property.name} - ${data.unit_number}`;
      }
      return data.unit_number;
    } catch {
      return null;
    }
  };

  const sendBillingReminder = async (
    transaction: Transaction,
    onSuccess?: () => void
  ): Promise<void> => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar autenticado",
        variant: "destructive",
      });
      return;
    }

    if (!transaction.contact_id) {
      toast({
        title: "Contato não vinculado",
        description: "Esta transação não possui um contato vinculado para envio da cobrança.",
        variant: "destructive",
      });
      return;
    }

    setIsSending(true);

    try {
      // Try edge function first (sends via Evolution API + updates whatsapp_sent_at)
      const { data: edgeResult, error: edgeError } = await supabase.functions.invoke(
        'whatsapp-billing',
        { body: { transactionId: transaction.id } }
      );

      if (!edgeError && edgeResult?.success) {
        toast({
          title: "Cobrança enviada!",
          description: `Mensagem enviada para ${edgeResult.contactName} via WhatsApp.`,
        });
        onSuccess?.();
        return;
      }

      // If edge function fails (no WhatsApp connection, etc), fallback to wa.me
      console.warn("Edge function billing failed, falling back to wa.me:", edgeError || edgeResult?.error);

      const contact = await fetchContactData(transaction.contact_id);
      
      if (!contact) {
        toast({
          title: "Contato não encontrado",
          description: "Não foi possível encontrar os dados do contato vinculado.",
          variant: "destructive",
        });
        return;
      }

      const phoneNumber = contact.whatsapp || contact.phone;
      if (!phoneNumber) {
        toast({
          title: "Telefone não cadastrado",
          description: `O contato ${contact.name} não possui telefone cadastrado.`,
          variant: "destructive",
        });
        return;
      }

      let unitInfo: string | undefined;
      if (transaction.unit_id) {
        const info = await fetchUnitInfo(transaction.unit_id);
        if (info) unitInfo = info;
      }

      const messageData: BillingMessageData = {
        contactName: contact.name.split(" ")[0],
        contactPhone: phoneNumber,
        amount: formatCurrency(transaction.amount),
        dueDate: formatDate(transaction.due_date),
        description: transaction.description,
        unitInfo,
      };

      const message = composeBillingMessage(messageData);
      const formattedPhone = formatPhoneForWhatsApp(phoneNumber);

      const encodedMessage = encodeURIComponent(message);
      openWhatsApp(formattedPhone, message);
      
      toast({
        title: "WhatsApp aberto",
        description: `Mensagem preparada para ${contact.name}. Clique em "Enviar" no WhatsApp.`,
      });
      
      await logBillingAction(transaction.id, contact.name, true);
      onSuccess?.();
    } catch (error) {
      console.error("Error sending billing reminder:", error);
      toast({
        title: "Erro ao enviar cobrança",
        description: "Não foi possível processar o envio. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const logBillingAction = async (
    transactionId: string,
    contactName: string,
    isManual = false
  ): Promise<void> => {
    try {
      const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const method = isManual ? "via link wa.me" : "via API";
      const newNote = `Cobrança enviada para ${contactName} ${method} em ${now}`;

      const { data: current } = await supabase
        .from("financial_transactions")
        .select("notes")
        .eq("id", transactionId)
        .single();

      const existingNotes = current?.notes || "";
      const updatedNotes = existingNotes
        ? `${existingNotes}\n\n${newNote}`
        : newNote;

      await supabase
        .from("financial_transactions")
        .update({ notes: updatedNotes })
        .eq("id", transactionId);
    } catch (error) {
      console.error("Error logging billing action:", error);
    }
  };

  const isEligibleForBilling = (transaction: Transaction): boolean => {
    if (transaction.status === "overdue") return true;
    
    if (transaction.status === "pending" && transaction.due_date) {
      const dueDate = new Date(transaction.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    }
    
    return false;
  };

  return {
    sendBillingReminder,
    isEligibleForBilling,
    isSending,
    isFetchingContact,
  };
}
