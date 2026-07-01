import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Download, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { 
  generateLegalContractPDF,
  validateContractData,
  type ContractPendency,
  LegalContractData
} from "@/utils/legalContractPdfGenerator";
import { format } from "date-fns";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
 
 interface ContractGeneratorDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   unitId: string;
   onSuccess?: () => void;
 }
 
 export function ContractGeneratorDialog({
   open,
   onOpenChange,
   unitId,
   onSuccess,
 }: ContractGeneratorDialogProps) {
   const [isGenerating, setIsGenerating] = useState(false);
 
   // Fetch unit data
   const { data: unitData, isLoading: isLoadingUnit } = useQuery({
     queryKey: ["unit-for-contract", unitId],
     queryFn: async () => {
       const { data, error } = await supabase
         .from("units")
         .select(`id, unit_number, address, city, state, postal_code, neighborhood,
           registration_number, cib, area, rent_price, condo_fee, iptu, owner_contact_id`)
         .eq("id", unitId)
         .single();
       if (error) throw error;
       return data;
     },
     enabled: open && !!unitId,
   });
 
   // Fetch owner contact
   const { data: ownerContact } = useQuery({
     queryKey: ["unit-owner-contact", unitId, unitData?.owner_contact_id],
     queryFn: async () => {
       if (!unitData?.owner_contact_id) return null;
       const { data } = await supabase
         .from("contacts")
         .select("name, document_number, address, city, state, phone, email, postal_code")
         .eq("id", unitData.owner_contact_id)
         .single();
       return data;
     },
     enabled: open && !!unitData?.owner_contact_id,
   });
 
   // Fetch active lease with all data
   const { data: activeLease, isLoading: isLoadingLease } = useQuery({
     queryKey: ["unit-lease-for-pdf", unitId],
     queryFn: async () => {
       const { data: lease } = await supabase
         .from("leases")
         .select(`id, rent_amount, start_date, end_date, due_day, admin_fee_percentage,
           tenant_contact_id, adjustment_index, deposit_amount, guarantee_type, guarantor_data, payment_info`)
         .eq("unit_id", unitId)
         .eq("status", "active")
         .order("start_date", { ascending: false })
         .limit(1)
         .maybeSingle();
       
       if (!lease?.tenant_contact_id) return { lease, tenant: null };
       
       const { data: tenant } = await supabase
         .from("contacts")
         .select("name, document_number, address, city, state, phone, email, postal_code")
         .eq("id", lease.tenant_contact_id)
         .single();
       
       return { lease, tenant };
     },
     enabled: open,
   });
 
  const [pendencies, setPendencies] = useState<ContractPendency[]>([]);
  const [pendingData, setPendingData] = useState<LegalContractData | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string>("");

  const buildContractData = (): { data: LegalContractData; fileName: string } | null => {
    if (!activeLease?.lease) return null;
    const lease = activeLease.lease;
    const guaranteeType = (lease.guarantee_type || 'nenhuma') as 'fiador' | 'caucao' | 'seguro_fianca' | 'titulo_capitalizacao' | 'nenhuma';
    const savedGuarantorData = typeof lease.guarantor_data === 'string'
      ? JSON.parse(lease.guarantor_data || '{}')
      : (lease.guarantor_data || {});
    const paymentInfo = typeof lease.payment_info === 'string'
      ? JSON.parse(lease.payment_info || '{}')
      : (lease.payment_info || {});

    // Prazo em meses (usando parse local para evitar bug de timezone)
    const parseLocal = (v: string): Date => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        const [y, m, d] = v.split('-').map(Number);
        return new Date(y, m - 1, d);
      }
      return new Date(v);
    };
    const startDate = parseLocal(lease.start_date);
    const endDate = lease.end_date ? parseLocal(lease.end_date) : null;
    const prazoMeses = endDate
      ? (endDate.getFullYear() - startDate.getFullYear()) * 12 + (endDate.getMonth() - startDate.getMonth())
      : 30;

    const ownerDocDigits = (ownerContact?.document_number || '').replace(/\D/g, '');
    const ownerIsCnpj = ownerDocDigits.length === 14;

    const contractData: LegalContractData = {
      locador: {
        nome: ownerContact?.name || '',
        cpf: !ownerIsCnpj ? (ownerContact?.document_number || '') : '',
        cnpj: ownerIsCnpj ? (ownerContact?.document_number || '') : '',
        endereco: ownerContact?.address || '',
        cidade: ownerContact?.city || unitData?.city || '',
        estado: ownerContact?.state || unitData?.state || '',
        cep: ownerContact?.postal_code || '',
        telefone: ownerContact?.phone || '',
        email: ownerContact?.email || '',
        nacionalidade: 'brasileiro(a)',
      },
      locatario: {
        nome: activeLease?.tenant?.name || '',
        cpf: activeLease?.tenant?.document_number || '',
        endereco: activeLease?.tenant?.address || '',
        cidade: activeLease?.tenant?.city || '',
        estado: activeLease?.tenant?.state || '',
        cep: activeLease?.tenant?.postal_code || '',
        telefone: activeLease?.tenant?.phone || '',
        email: activeLease?.tenant?.email || '',
        nacionalidade: 'brasileiro(a)',
      },
      fiador: guaranteeType === 'fiador' && savedGuarantorData?.nome ? {
        nome: savedGuarantorData.nome || '',
        cpf: savedGuarantorData.cpf || '',
        rg: savedGuarantorData.rg || '',
        endereco: savedGuarantorData.endereco || '',
        cidade: savedGuarantorData.cidade || '',
        estado: savedGuarantorData.estado || '',
        profissao: savedGuarantorData.profissao || '',
        nacionalidade: 'brasileiro(a)',
        estadoCivil: savedGuarantorData.estadoCivil || '',
      } : undefined,
      imovel: {
        endereco: unitData?.address || '',
        bairro: unitData?.neighborhood || '',
        cidade: unitData?.city || '',
        estado: unitData?.state || '',
        cep: unitData?.postal_code || '',
        matricula: unitData?.registration_number || '',
        cib: unitData?.cib || '',
      },
      contrato: {
        valorAluguel: lease.rent_amount || 0,
        diaVencimento: lease.due_day || 10,
        dataInicio: lease.start_date,
        dataFim: lease.end_date || undefined,
        prazoMeses,
        indiceReajuste: lease.adjustment_index || 'IGP-M/FGV',
        garantia: guaranteeType,
        valorCaucao: lease.deposit_amount || undefined,
        finalidade: 'residencial',
      },
      pagamento: paymentInfo?.pix || paymentInfo?.banco ? {
        pix: paymentInfo.pix || '',
        banco: paymentInfo.banco || '',
        agencia: paymentInfo.agencia || '',
        conta: paymentInfo.conta || '',
        tipoConta: paymentInfo.tipoConta || '',
        beneficiario: paymentInfo.beneficiario || ownerContact?.name || '',
      } : undefined,
    };

    const fileName = `Contrato_Locacao_${unitData?.address?.replace(/\s+/g, '_') || 'Imovel'}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    return { data: contractData, fileName };
  };

  const runGeneration = async (data: LegalContractData, fileName: string) => {
    setIsGenerating(true);
    try {
      await generateLegalContractPDF(data, fileName);
      toast.success("Contrato jurídico gerado com sucesso!");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error generating contract:", error);
      toast.error("Erro ao gerar contrato");
    } finally {
      setIsGenerating(false);
      setPendingData(null);
      setPendencies([]);
    }
  };

  const handleGenerateContract = async () => {
    if (!activeLease?.lease) {
      toast.error("Nenhum contrato ativo encontrado");
      return;
    }
    const built = buildContractData();
    if (!built) return;
    const issues = validateContractData(built.data);
    if (issues.length > 0) {
      setPendingData(built.data);
      setPendingFileName(built.fileName);
      setPendencies(issues);
      return;
    }
    await runGeneration(built.data, built.fileName);
  };

 
   const isLoading = isLoadingUnit || isLoadingLease;
   const hasActiveLease = !!activeLease?.lease;
   const guaranteeLabel = { fiador: 'Fiador', caucao: 'Caução', seguro_fianca: 'Seguro Fiança', none: 'Sem Garantia' }[activeLease?.lease?.guarantee_type || 'caucao'] || 'Caução';
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             <FileText className="h-5 w-5" />
             Gerar Contrato PDF
           </DialogTitle>
           <DialogDescription>O contrato será gerado com os dados já cadastrados.</DialogDescription>
         </DialogHeader>
         <div className="space-y-4 py-2">
           {isLoading ? (
             <div className="flex items-center justify-center py-8">
               <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
             </div>
           ) : !hasActiveLease ? (
             <Alert variant="destructive">
               <AlertTriangle className="h-4 w-4" />
               <AlertDescription>Nenhum contrato ativo encontrado. Crie um contrato primeiro.</AlertDescription>
             </Alert>
           ) : (
             <div className="space-y-3">
               <div className="p-3 rounded-lg bg-muted/50 space-y-2 text-sm">
                 <div className="flex justify-between"><span className="text-muted-foreground">Inquilino</span><span className="font-medium">{activeLease?.tenant?.name || '-'}</span></div>
                 <div className="flex justify-between"><span className="text-muted-foreground">Aluguel</span><span className="font-medium">{activeLease?.lease?.rent_amount?.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></div>
                 <div className="flex justify-between"><span className="text-muted-foreground">Garantia</span><span className="font-medium">{guaranteeLabel}</span></div>
               </div>
               <p className="text-xs text-muted-foreground">💡 Para alterar informações, use "Editar Contrato".</p>
             </div>
           )}
         </div>
         <div className="flex justify-end gap-2">
           <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
           <Button onClick={handleGenerateContract} disabled={isLoading || !hasActiveLease || isGenerating}>
             {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
             Baixar PDF
           </Button>
         </div>
       </DialogContent>
     </Dialog>
   );
 }