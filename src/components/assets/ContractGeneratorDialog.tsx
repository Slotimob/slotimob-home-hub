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
  LegalContractData,
  type EncargoContrato,
} from "@/utils/legalContractPdfGenerator";
import type {
  FireInsuranceConfig,
  IptuChargeConfig,
  ObligationChargeConfig,
  LeaseChargeResponsible,
} from "@/hooks/useLeases";
import { ADDITIONAL_OBLIGATIONS } from "@/components/assets/LeaseFinancialStep";
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
   /** Optional: generate the PDF for a specific lease (needed when a unit has multiple active leases / fractions) */
   leaseId?: string;
   onSuccess?: () => void;
 }
 
 export function ContractGeneratorDialog({
   open,
   onOpenChange,
   unitId,
   leaseId,
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
     queryKey: ["unit-lease-for-pdf", unitId, leaseId ?? null],
     queryFn: async () => {
       const baseSelect = `id, rent_amount, start_date, end_date, due_day, admin_fee_percentage,
           tenant_contact_id, adjustment_index, deposit_amount, guarantee_type, guarantor_data, payment_info,
           unit_subdivision_id`;

       const { data: lease } = leaseId
         ? await supabase.from("leases").select(baseSelect).eq("id", leaseId).maybeSingle()
         : await supabase
             .from("leases")
             .select(baseSelect)
             .eq("unit_id", unitId)
             .eq("status", "active")
             .order("start_date", { ascending: false })
             .limit(1)
             .maybeSingle();
       
       let subdivision: { label: string; area: number | null } | null = null;
       if (lease?.unit_subdivision_id) {
         const { data: sub } = await supabase
           .from("unit_subdivisions")
           .select("label, area")
           .eq("id", lease.unit_subdivision_id)
           .maybeSingle();
         subdivision = sub ?? null;
       }

       if (!lease?.tenant_contact_id) return { lease, tenant: null, subdivision };
       
       const { data: tenant } = await supabase
         .from("contacts")
         .select("name, document_number, address, city, state, phone, email, postal_code")
         .eq("id", lease.tenant_contact_id)
         .single();
       
       return { lease, tenant, subdivision };
     },
     enabled: open,
   });
 
  const lease = activeLease?.lease as any;

  /** Encargos brutos da Matriz de Responsabilidades gravada no contrato */
  const fireInsurance = (lease?.fire_insurance || null) as FireInsuranceConfig | null;
  const iptuCharge = (lease?.iptu_charge || null) as IptuChargeConfig | null;
  const additionalObligations = (Array.isArray(lease?.additional_obligations)
    ? lease.additional_obligations
    : []) as ObligationChargeConfig[];

  /** IDs de imobiliária referenciados por qualquer encargo */
  const agencyIds = Array.from(
    new Set(
      [
        fireInsurance,
        iptuCharge,
        ...additionalObligations,
      ]
        .filter((c): c is FireInsuranceConfig | IptuChargeConfig | ObligationChargeConfig =>
          !!c && (c as any).enabled && (c as any).charge_to === "agency"
        )
        .map((c) => c.agency_contact_id || c.responsible_contact_id)
        .filter((id): id is string => !!id)
    )
  );

  const { data: agencyContacts } = useQuery({
    queryKey: ["contract-agency-contacts", agencyIds.join(",")],
    queryFn: async () => {
      const { data } = await supabase
        .from("contacts")
        .select("id, name, document_number, address, city, state, postal_code, phone, email")
        .in("id", agencyIds);
      return data || [];
    },
    enabled: open && agencyIds.length > 0,
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

    // ---------------------------------------------------------------------
    // MATRIZ DE RESPONSABILIDADES -> cláusulas dinâmicas do PDF
    // ---------------------------------------------------------------------
    const agencyById = new Map((agencyContacts || []).map((c: any) => [c.id, c]));

    const responsavelNome = (
      chargeTo: LeaseChargeResponsible,
      link: { responsible_contact_id?: string | null; agency_contact_id?: string | null }
    ): string | null => {
      if (chargeTo === "tenant") return activeLease?.tenant?.name || null;
      if (chargeTo === "owner") return ownerContact?.name || null;
      const id = link.agency_contact_id || link.responsible_contact_id;
      return (id && agencyById.get(id)?.name) || null;
    };

    const encargos: EncargoContrato[] = [];

    // Taxa de administração (percentual sobre o aluguel, devida à imobiliária)
    const adminFeePercent = Number(lease.admin_fee_percentage) || 0;
    if (adminFeePercent > 0) {
      const adminAgency = agencyIds.length === 1 ? agencyById.get(agencyIds[0]) : null;
      encargos.push({
        key: "admin_fee",
        label: "Taxa de administração imobiliária",
        responsavelTipo: "owner",
        responsavelNome: ownerContact?.name || null,
        valor: (lease.rent_amount || 0) * (adminFeePercent / 100),
        periodicidade: `mensal, equivalente a ${adminFeePercent}% do aluguel`,
        observacao: adminAgency
          ? `devida à administradora ${adminAgency.name} e retida do repasse ao LOCADOR`
          : "retida do repasse ao LOCADOR",
      });
    }

    if (fireInsurance?.enabled) {
      encargos.push({
        key: "insurance",
        label: "Seguro contra incêndio",
        responsavelTipo: fireInsurance.charge_to,
        responsavelNome: responsavelNome(fireInsurance.charge_to, fireInsurance),
        valor: fireInsurance.installment_amount || null,
        periodicidade: fireInsurance.installments > 1
          ? `${fireInsurance.installments} parcelas`
          : "parcela única",
      });
    }

    if (iptuCharge?.enabled) {
      encargos.push({
        key: "iptu",
        label: "IPTU e taxas municipais",
        responsavelTipo: iptuCharge.charge_to,
        responsavelNome: responsavelNome(iptuCharge.charge_to, iptuCharge),
        valor: iptuCharge.installment_amount || null,
        periodicidade: iptuCharge.installments > 1
          ? `${iptuCharge.installments} parcelas`
          : "parcela única",
      });
    }

    additionalObligations
      .filter((o) => o?.enabled)
      .forEach((o) => {
        const meta = ADDITIONAL_OBLIGATIONS.find((m) => m.type === o.type);
        const label =
          (o.type === "other" && o.label) ||
          (o.type === "condominium" ? "Condomínio (despesas ordinárias)" : meta?.label) ||
          "Outras despesas";
        encargos.push({
          key: o.type === "other" ? `other_${label}` : o.type,
          label,
          responsavelTipo: o.charge_to,
          responsavelNome: responsavelNome(o.charge_to, o),
          valor: o.installment_amount || null,
          periodicidade: "mensal",
        });
      });

    // Imobiliária qualificada no preâmbulo quando responsável por algum encargo
    const agencyForQualification = agencyIds.length > 0 ? agencyById.get(agencyIds[0]) : null;
    const agencyDocDigits = (agencyForQualification?.document_number || "").replace(/\D/g, "");

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
        fracaoLabel: activeLease?.subdivision?.label || undefined,
        fracaoArea: activeLease?.subdivision?.area ?? undefined,
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
      imobiliaria: agencyForQualification ? {
        nome: agencyForQualification.name || '',
        cnpj: agencyDocDigits.length === 14 ? agencyForQualification.document_number : '',
        cpf: agencyDocDigits.length === 11 ? agencyForQualification.document_number : '',
        endereco: agencyForQualification.address || '',
        cidade: agencyForQualification.city || '',
        estado: agencyForQualification.state || '',
        cep: agencyForQualification.postal_code || '',
        email: agencyForQualification.email || '',
        telefone: agencyForQualification.phone || '',
      } : undefined,
      encargos,
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

      <AlertDialog
        open={pendencies.length > 0}
        onOpenChange={(o) => {
          if (!o) {
            setPendencies([]);
            setPendingData(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Campos pendentes no contrato
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os campos abaixo não estão preenchidos. Sem eles o PDF sairá com omissões.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="max-h-72 overflow-y-auto rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
            {pendencies.map((p) => (
              <div key={p.campo} className="border-b last:border-b-0 pb-2 last:pb-0">
                <div className="font-medium">{p.rotulo}</div>
                <div className="text-xs text-muted-foreground">Onde corrigir: {p.onde_corrigir}</div>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Corrigir depois</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingData) {
                  const data = pendingData;
                  const fn = pendingFileName;
                  setPendencies([]);
                  setPendingData(null);
                  void runGeneration(data, fn);
                }
              }}
            >
              Gerar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}