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

export function useWhatsAppBilling() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const [isFetchingContact, setIsFetchingContact] = useState(false);

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

  // Compose a professional billing message
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

  // Fetch contact data linked to a transaction
  const fetchContactData = async (contactId: string): Promise<ContactData | null> => {
    if (!user) return null;
    
    setIsFetchingContact(true);
    try {
      const { data, error } = await supabase
        .from("contacts")
        .select("id, name, phone, whatsapp")
        .eq("id", contactId)
        .eq("broker_id", user.id)
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

  // Fetch unit info for context
  const fetchUnitInfo = async (unitId: string): Promise<string | null> => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from("units")
        .select("unit_number, property:properties(name)")
        .eq("id", unitId)
        .eq("broker_id", user.id)
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

  // Try to send via Edge Function, fallback to wa.me link
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
      // 1. Fetch contact data
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

      // 2. Fetch unit info if available
      let unitInfo: string | undefined;
      if (transaction.unit_id) {
        const info = await fetchUnitInfo(transaction.unit_id);
        if (info) unitInfo = info;
      }

      // 3. Compose message
      const messageData: BillingMessageData = {
        contactName: contact.name.split(" ")[0], // First name only
        contactPhone: phoneNumber,
        amount: formatCurrency(transaction.amount),
        dueDate: formatDate(transaction.due_date),
        description: transaction.description,
        unitInfo,
      };

      const message = composeBillingMessage(messageData);
      const formattedPhone = formatPhoneForWhatsApp(phoneNumber);

      // DISABLED: WhatsApp connection check - causing 406 errors that block network
      // TODO: Re-enable once whatsapp_connections table RLS is fixed
      // For now, skip WhatsApp entirely and go straight to fallback
      const edgeFunctionSuccess = false;

      // 5. Fallback: Open wa.me link
      if (!edgeFunctionSuccess) {
        const encodedMessage = encodeURIComponent(message);
        const waLink = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
        
        window.open(waLink, "_blank", "noopener,noreferrer");
        
        toast({
          title: "WhatsApp aberto",
          description: `Mensagem preparada para ${contact.name}. Clique em "Enviar" no WhatsApp.`,
        });
        
        // Log the action
        await logBillingAction(transaction.id, contact.name, true);
        
        onSuccess?.();
      }
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

  // Log the billing action in transaction notes
  const logBillingAction = async (
    transactionId: string,
    contactName: string,
    isManual = false
  ): Promise<void> => {
    try {
      const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      const method = isManual ? "via link wa.me" : "via API";
      const newNote = `Cobrança enviada para ${contactName} ${method} em ${now}`;

      // Get current notes
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

  // Check if a transaction is eligible for billing reminder
  const isEligibleForBilling = (transaction: Transaction): boolean => {
    // Only overdue or pending transactions past due date
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
