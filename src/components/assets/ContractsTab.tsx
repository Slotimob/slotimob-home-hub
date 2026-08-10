import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { EmitirCobrancaDialog } from "@/components/asaas/EmitirCobrancaDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Search,
  Building2,
  User,
  Calendar,
  TrendingUp,
  Loader2,
  Filter,
  Calculator,
  AlertTriangle,
  Bell,
  MoreVertical,
  Edit3,
  Plus,
  FileSignature,
  Receipt,
  Eye,
  XCircle,
  Upload,
  Check,
  Clock,
  CalendarDays,
  FileCheck,
  FileX,
  Trash2,
  RefreshCw,
  Home,
} from "lucide-react";
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, isBefore, isAfter } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AdjustmentCalculatorDialog } from "./AdjustmentCalculatorDialog";
import { ContractCard } from "./ContractCard";
import { ContractGeneratorDialog } from "./ContractGeneratorDialog";
import { CreateLeaseWizard } from "./CreateLeaseWizard";
import { CreateTransactionDialog, TransactionPrefill } from "@/components/finance/CreateTransactionDialog";
import { TerminateContractDialog } from "./TerminateContractDialog";
import { UploadSignedContractDialog } from "./UploadSignedContractDialog";
import { EditAdjustmentDateDialog } from "./EditAdjustmentDateDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUpdateLeaseSignature } from "@/hooks/useLeases";
import { useLeases } from "@/hooks/useLeases";
import { EmptyState } from "@/components/shared/EmptyState";
import { TableErrorBoundary } from "@/components/shared/TableErrorBoundary";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
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
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  pending: { label: "Pendente de Configuração", variant: "secondary" },
  pending_signature: { label: "Aguardando Assinatura", variant: "secondary" },
  expired: { label: "Expirado", variant: "destructive" },
  cancelled: { label: "Cancelado", variant: "outline" },
  terminated: { label: "Encerrado", variant: "outline" },
};

const INDEX_LABELS: Record<string, string> = {
  IGPM: "IGP-M",
  IPCA: "IPCA",
  INPC: "INPC",
  Fixo: "Fixo",
};

interface LeaseWithDetails {
  id: string;
  unit_id: string;
  rent_amount: number;
  admin_fee_percentage?: number;
  due_day?: number;
  deposit_amount?: number;
  adjustment_index: string | null;
  next_adjustment_date: string | null;
  start_date: string;
  end_date: string | null;
  contract_status: string | null;
  status: string;
  tenant_contact_id: string;
  owner_contact_id?: string | null;
  cib?: string | null;
  is_dimob_deductible?: boolean;
  notes?: string | null;
  billing_automation?: any;
  metadata?: any;
  signature_status?: string | null;
  signed_contract_path?: string | null;
  termination_date?: string | null;
  termination_reason?: string | null;
  guarantee_type?: string | null;
  guarantor_data?: any;
  payment_info?: any;
  tenant_contact?: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
  } | null;
  unit?: {
    id: string;
    unit_number: string;
    address: string | null;
  } | null;
}

type AdjustmentStatus = "overdue" | "current_month" | "upcoming" | "ok";

interface LeaseWithAdjustment extends LeaseWithDetails {
  adjustmentStatus: AdjustmentStatus;
}

function getAdjustmentStatus(nextAdjustmentDate: string | null): AdjustmentStatus {
  if (!nextAdjustmentDate) return "ok";
  
  const adjustmentDate = parseISO(nextAdjustmentDate);
  const today = new Date();
  const currentMonthStart = startOfMonth(today);
  const currentMonthEnd = endOfMonth(today);
  
  // Overdue: date is before today
  if (isBefore(adjustmentDate, today) && differenceInDays(today, adjustmentDate) > 0) {
    return "overdue";
  }
  
  // Current month: date is within the current month
  if (!isBefore(adjustmentDate, currentMonthStart) && !isAfter(adjustmentDate, currentMonthEnd)) {
    return "current_month";
  }
  
  // Upcoming: within 30 days
  const daysUntil = differenceInDays(adjustmentDate, today);
  if (daysUntil >= 0 && daysUntil <= 30) {
    return "upcoming";
  }
  
  return "ok";
}
type ContractStatusFilter = "all" | "active" | "pending_signature" | "terminated";

export function ContractsTab() {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { isOwner, hasPermission } = usePermissions();
  const canCreate = isOwner || hasPermission('management_contracts', 'create');
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const updateSignature = useUpdateLeaseSignature();
  const { data: allLeases } = useLeases();

  const [searchTerm, setSearchTerm] = useState("");
  const [emitirLeaseId, setEmitirLeaseId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ContractStatusFilter>("all");
  const [adjustmentFilter, setAdjustmentFilter] = useState<string>("all");
  const [selectedLease, setSelectedLease] = useState<LeaseWithDetails | null>(null);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const [selectedIsUrgent, setSelectedIsUrgent] = useState(false);
  
  // Edit lease wizard state
  const [editWizardOpen, setEditWizardOpen] = useState(false);
  const [editingLease, setEditingLease] = useState<LeaseWithDetails | null>(null);
  const [editingLeaseData, setEditingLeaseData] = useState<any>(null);
  
  // Quick transaction dialog state
  const [quickTransactionOpen, setQuickTransactionOpen] = useState(false);
  const [transactionPrefill, setTransactionPrefill] = useState<TransactionPrefill | null>(null);
  
  // Contract generator dialog state
  const [contractGeneratorOpen, setContractGeneratorOpen] = useState(false);
  const [generatorUnitId, setGeneratorUnitId] = useState<string | null>(null);
  
  // New dialogs state
  const [terminateDialogOpen, setTerminateDialogOpen] = useState(false);
  const [terminatingLease, setTerminatingLease] = useState<LeaseWithDetails | null>(null);
  
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadingLease, setUploadingLease] = useState<LeaseWithDetails | null>(null);
  
  const [editAdjustmentDateOpen, setEditAdjustmentDateOpen] = useState(false);
  const [editingAdjustmentLease, setEditingAdjustmentLease] = useState<LeaseWithDetails | null>(null);

  // Create new contract wizard state
  const [createWizardOpen, setCreateWizardOpen] = useState(false);
  const [createUnitId, setCreateUnitId] = useState<string | null>(null);
  const [createUnitName, setCreateUnitName] = useState("");
  
  // Duplicate warning dialog state
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [pendingLeaseEdit, setPendingLeaseEdit] = useState<LeaseWithDetails | null>(null);
  
  // Unit selection dialog for new contracts
  const [unitSelectionOpen, setUnitSelectionOpen] = useState(false);
  const [unitSearchTerm, setUnitSearchTerm] = useState("");
  

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingLease, setDeletingLease] = useState<LeaseWithDetails | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all available units for the selection dialog
  const { data: availableUnits, isLoading: isLoadingUnits } = useQuery({
    queryKey: ["available-units-for-lease", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, address, city, is_occupied, owner_contact_id")
        .eq("broker_id", effectiveBrokerId || user.id)
        .eq("is_managed", true)
        .order("unit_number", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && unitSelectionOpen,
  });
  
  // Filter available units (show only unoccupied ones by default, but allow all)
  const filteredUnits = useMemo(() => {
    if (!availableUnits) return [];
    let units = availableUnits;
    if (unitSearchTerm) {
      const search = unitSearchTerm.toLowerCase();
      units = units.filter(
        (u) =>
          u.unit_number?.toLowerCase().includes(search) ||
          u.address?.toLowerCase().includes(search) ||
          u.city?.toLowerCase().includes(search)
      );
    }
    // Sort: unoccupied first, then occupied
    return units.sort((a, b) => {
      if (a.is_occupied === b.is_occupied) return 0;
      return a.is_occupied ? 1 : -1;
    });
  }, [availableUnits, unitSearchTerm]);

  // Fetch all leases with related data
  const { data: leases, isLoading, refetch } = useQuery({
    queryKey: ["leases-contracts", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("leases")
        .select(`
          id,
          unit_id,
          rent_amount,
          admin_fee_percentage,
          due_day,
          deposit_amount,
          adjustment_index,
          next_adjustment_date,
          start_date,
          end_date,
          contract_status,
          status,
          tenant_contact_id,
          owner_contact_id,
          cib,
          is_dimob_deductible,
          notes,
          billing_automation,
          metadata,
          signature_status,
          signed_contract_path,
          termination_date,
          termination_reason,
          guarantee_type,
          guarantor_data,
          payment_info,
          tenant_contact:contacts!leases_tenant_contact_id_fkey(id, name, email, phone, whatsapp),
          unit:units!leases_unit_id_fkey(id, unit_number, address)
        `)
        .eq("broker_id", effectiveBrokerId || user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as LeaseWithDetails[];
    },
    enabled: !!user,
  });

  // Fetch units with property info for type indicator
  const { data: unitsWithProperty } = useQuery({
    queryKey: ["units-with-property-contracts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("units")
        .select("id, property_id, is_standalone")
        .eq("broker_id", effectiveBrokerId || user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Calculate adjustment statuses
  const leasesWithStatus = useMemo((): LeaseWithAdjustment[] => {
    return (leases || []).map(lease => ({
      ...lease,
      adjustmentStatus: getAdjustmentStatus(lease.next_adjustment_date),
    }));
  }, [leases]);

  // Filter leases
  const filteredLeases = useMemo(() => {
    return leasesWithStatus.filter((lease) => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          lease.unit?.unit_number?.toLowerCase().includes(search) ||
          lease.tenant_contact?.name?.toLowerCase().includes(search) ||
          lease.unit?.address?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        if (statusFilter === "pending_signature") {
          // Contracts without signature (not signed and no signed path) and not terminated
          if (
            lease.signature_status === "signed" ||
            lease.signed_contract_path ||
            lease.status === "terminated"
          ) return false;
        } else if (statusFilter === "terminated") {
          if (lease.status !== "terminated") return false;
        } else if (statusFilter === "active") {
          if (lease.status !== "active") return false;
        }
      }

      // Adjustment filter
      if (adjustmentFilter !== "all") {
        if (adjustmentFilter === "needs_action") {
          if (lease.adjustmentStatus !== "overdue" && lease.adjustmentStatus !== "current_month") {
            return false;
          }
        } else if (lease.adjustmentStatus !== adjustmentFilter) {
          return false;
        }
      }

      return true;
    });
  }, [leasesWithStatus, searchTerm, statusFilter, adjustmentFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: leases?.length || 0,
    active: leases?.filter((l) => l.status === "active").length || 0,
    pendingConfig: leases?.filter((l) => l.status === "pending").length || 0,
    pendingSignature: leases?.filter((l) => 
      l.signature_status !== "signed" && 
      !l.signed_contract_path && 
      l.status !== "terminated"
    ).length || 0,
    terminated: leases?.filter((l) => l.status === "terminated").length || 0,
    needsAction: leasesWithStatus.filter((l) => 
      l.adjustmentStatus === "overdue" || l.adjustmentStatus === "current_month"
    ).length,
  }), [leases, leasesWithStatus]);

  const handleOpenAdjustment = (lease: LeaseWithDetails, isUrgent: boolean = false) => {
    setSelectedLease(lease);
    setSelectedIsUrgent(isUrgent);
    setIsAdjustmentOpen(true);
  };

  // Handle edit contract - opens the lease wizard in edit mode
  const handleEditContract = (lease: LeaseWithDetails) => {
    if (lease.status === "terminated") {
      toast.info("Contrato encerrado", {
        description: "Este contrato está encerrado e não pode ser editado.",
      });
      return;
    }
    
    // Fetch full lease data for editing
    supabase
      .from("leases")
      .select(`
        id, unit_id, tenant_contact_id, owner_contact_id, rent_amount,
        admin_fee_percentage, due_day, deposit_amount, start_date, end_date,
        status, cib, is_dimob_deductible, notes, adjustment_index,
        next_adjustment_date, guarantee_type, guarantor_data, payment_info,
        metadata
      `)
      .eq("id", lease.id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Erro ao carregar dados do contrato");
          return;
        }
        setEditingLeaseData(data);
        setEditingLease(lease);
        setEditWizardOpen(true);
      });
  };

  // Handle create new contract - navigate to dedicated page
  const handleCreateContract = () => {
    navigate("/gestao/contratos/novo");
  };
  
  // Handle unit selection for new contract
  const handleUnitSelected = (unit: { id: string; unit_number: string; owner_contact_id: string | null }) => {
    // Check if there's already an active lease for this unit
    const existingLease = leases?.find((l) => l.unit_id === unit.id && l.status === "active");
    
    if (existingLease) {
      toast.warning("Imóvel já possui contrato ativo", {
        description: `O imóvel ${unit.unit_number} já possui um contrato ativo com ${existingLease.tenant_contact?.name || "inquilino"}.`,
      });
      return;
    }
    
    setUnitSelectionOpen(false);
    setCreateUnitId(unit.id);
    setCreateUnitName(unit.unit_number);
    setCreateWizardOpen(true);
  };

  // Check for duplicate contracts before creating
  const checkDuplicateAndCreate = (unitId: string, unitName: string, tenantId: string) => {
    const existingContract = allLeases?.find(
      (l) => l.unit_id === unitId && l.tenant?.id === tenantId && l.status === "active"
    );
    
    if (existingContract) {
      // Show duplicate warning
      setDuplicateWarningOpen(true);
      setPendingLeaseEdit(existingContract as unknown as LeaseWithDetails);
      return false;
    }
    
    return true;
  };

  // Handle quick transaction (generates prefilled transaction for this lease)
  const handleQuickTransaction = (lease: LeaseWithDetails) => {
    const now = new Date();
    const monthYear = format(now, "MMMM/yyyy", { locale: ptBR });
    const capitalizedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
    
    setTransactionPrefill({
      description: `Lançamento Avulso - ${lease.unit?.unit_number || "Contrato"} - ${capitalizedMonthYear}`,
      unitId: lease.unit_id,
      type: "income",
    });
    setQuickTransactionOpen(true);
  };

  // Handle contract generator
  const handleGenerateContract = (unitId: string) => {
    setGeneratorUnitId(unitId);
    setContractGeneratorOpen(true);
  };

  // Handle terminate contract
  const handleTerminateContract = (lease: LeaseWithDetails) => {
    setTerminatingLease(lease);
    setTerminateDialogOpen(true);
  };

  // Handle upload signed contract
  const handleUploadContract = (lease: LeaseWithDetails) => {
    setUploadingLease(lease);
    setUploadDialogOpen(true);
  };

  // Handle toggle signature status
  const handleToggleSignature = async (lease: LeaseWithDetails) => {
    const newStatus = lease.signature_status === "signed" ? "pending" : "signed";
    try {
      await updateSignature.mutateAsync({
        leaseId: lease.id,
        signatureStatus: newStatus,
      });
      refetch();
    } catch (error) {
      console.error("Error updating signature status:", error);
    }
  };

  // Handle edit adjustment date
  const handleEditAdjustmentDate = (lease: LeaseWithDetails) => {
    setEditingAdjustmentLease(lease);
    setEditAdjustmentDateOpen(true);
  };

  // Handle delete lease
  const handleDeleteLease = (lease: LeaseWithDetails) => {
    setDeletingLease(lease);
    setDeleteDialogOpen(true);
  };

  // Confirm delete lease
  const confirmDeleteLease = async () => {
    if (!deletingLease || !user) return;
    
    setIsDeleting(true);
    try {
      // First, delete related financial transactions
      const { error: transactionsError } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("broker_id", effectiveBrokerId || user.id)
        .eq("reference", `lease:${deletingLease.id}`);
      
      if (transactionsError) {
        console.error("Error deleting related transactions:", transactionsError);
      }

      // Update unit to release it
      const { error: unitError } = await supabase
        .from("units")
        .update({
          is_occupied: false,
          tenant_contact_id: null,
        })
        .eq("id", deletingLease.unit_id);
      
      if (unitError) {
        console.error("Error updating unit:", unitError);
      }

      // Delete the lease
      const { error } = await supabase
        .from("leases")
        .delete()
        .eq("id", deletingLease.id)
        .eq("broker_id", effectiveBrokerId || user.id);
      
      if (error) throw error;

      toast.success("Contrato excluído com sucesso", {
        description: "O registro foi removido permanentemente do banco de dados.",
      });
      
      refetch();
      queryClient.invalidateQueries({ queryKey: ["leases"] });
      queryClient.invalidateQueries({ queryKey: ["units"] });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
    } catch (error) {
      console.error("Error deleting lease:", error);
      toast.error("Erro ao excluir contrato", {
        description: "Não foi possível excluir o contrato. Tente novamente.",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setDeletingLease(null);
    }
  };

  // Handle row click → navigate to contract detail page
  const handleRowClick = (lease: LeaseWithDetails, e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('[role="menuitem"]') || target.closest('[data-radix-collection-item]')) {
      return;
    }
    navigate(`/gestao/contratos?id=${lease.id}`);
  };

  // Handle view financial details
  const handleViewFinancials = (lease: LeaseWithDetails) => {
    navigate(`/finance/transactions?unitId=${lease.unit_id}`);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === "all" && "ring-2 ring-primary"
          )}
          onClick={() => setStatusFilter("all")}
        >
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total Contratos</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md border-primary/30 bg-primary/5",
            statusFilter === "active" && "ring-2 ring-primary"
          )}
          onClick={() => setStatusFilter("active")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-primary" />
              <p className="text-xs text-muted-foreground">Ativos</p>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.active}</p>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "transition-all hover:shadow-md",
            stats.pendingConfig > 0 ? "border-blue-500/50 bg-blue-500/10" : "border-muted"
          )}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3 text-blue-600" />
              <p className="text-xs text-muted-foreground">Pend. Configuração</p>
            </div>
            <p className={`text-2xl font-bold ${stats.pendingConfig > 0 ? "text-blue-600" : "text-muted-foreground"}`}>
              {stats.pendingConfig}
            </p>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            stats.pendingSignature > 0 ? "border-amber-500/50 bg-amber-500/10" : "border-muted",
            statusFilter === "pending_signature" && "ring-2 ring-amber-500"
          )}
          onClick={() => setStatusFilter("pending_signature")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-1">
              <FileX className="h-3 w-3 text-amber-600" />
              <p className="text-xs text-muted-foreground">Pend. Assinatura</p>
            </div>
            <p className={`text-2xl font-bold ${stats.pendingSignature > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
              {stats.pendingSignature}
            </p>
          </CardContent>
        </Card>
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:shadow-md",
            statusFilter === "terminated" && "ring-2 ring-muted-foreground"
          )}
          onClick={() => setStatusFilter("terminated")}
        >
          <CardContent className="p-3">
            <div className="flex items-center gap-1">
              <XCircle className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">Encerrados</p>
            </div>
            <p className="text-2xl font-bold text-muted-foreground">
              {stats.terminated}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por imóvel, inquilino..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={adjustmentFilter} onValueChange={setAdjustmentFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Bell className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Reajustes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="needs_action">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                Ação Necessária
              </span>
            </SelectItem>
            <SelectItem value="overdue">Atrasados</SelectItem>
            <SelectItem value="current_month">Este Mês</SelectItem>
            <SelectItem value="upcoming">Próximos 30 dias</SelectItem>
          </SelectContent>
        </Select>
        
        {/* Status Filter Dropdown */}
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ContractStatusFilter)}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="active">
              <span className="flex items-center gap-2">
                <Check className="h-3.5 w-3.5 text-primary" />
                Ativos
              </span>
            </SelectItem>
            <SelectItem value="pending_signature">
              <span className="flex items-center gap-2">
                <FileX className="h-3.5 w-3.5 text-amber-600" />
                Pend. Assinatura
              </span>
            </SelectItem>
            <SelectItem value="terminated">
              <span className="flex items-center gap-2">
                <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Encerrados
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
        
        {/* Refresh Button */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={() => refetch()}
          className="shrink-0"
          title="Atualizar lista"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
        
        {/* Create Contract Button */}
        {canCreate && (
        <Button onClick={handleCreateContract} className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Novo Contrato</span>
          <span className="sm:hidden">Novo</span>
        </Button>
        )}
      </div>

      {/* Contracts - Mobile Card View or Desktop Table */}
      <TableErrorBoundary onRetry={refetch}>
        {isMobile ? (
          // Mobile: Card View
          filteredLeases.length === 0 ? (
            searchTerm || statusFilter !== "all" || adjustmentFilter !== "all" ? (
              <EmptyState
                type="no-results"
                description="Nenhum contrato corresponde aos filtros aplicados."
                actionLabel="Limpar Filtros"
                onAction={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setAdjustmentFilter("all");
                }}
              />
            ) : (
              <EmptyState
                type="no-data"
                title="Nenhum contrato"
                description="Você ainda não possui contratos de locação cadastrados."
              />
            )
          ) : (
            <div className="grid gap-3">
              {filteredLeases.map((lease) => (
                <ContractCard
                  key={lease.id}
                  lease={lease}
                  onAdjustmentClick={handleOpenAdjustment}
                  onEditClick={handleEditContract}
                  onQuickTransactionClick={handleQuickTransaction}
                  onGenerateContractClick={handleGenerateContract}
                  onViewFinancialsClick={handleViewFinancials}
                  onTerminateClick={(isOwner || hasPermission('management_contracts', 'edit')) ? handleTerminateContract : undefined}
                  onUploadContractClick={handleUploadContract}
                  onToggleSignatureClick={handleToggleSignature}
                  onEditAdjustmentDateClick={handleEditAdjustmentDate}
                  // UNIFIED UX: Click anywhere on card navigates to contract detail page
                  onCardClick={(lease) => navigate(`/gestao/contratos?id=${lease.id}`)}
                />
              ))}
            </div>
          )
        ) : (
          // Desktop: Table View
          <Card>
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Imóvel</TableHead>
                    <TableHead>Inquilino</TableHead>
                    <TableHead className="text-right">Valor Atual</TableHead>
                    <TableHead className="text-center hidden md:table-cell">Índice</TableHead>
                    <TableHead className="hidden sm:table-cell">Próximo Reajuste</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="w-[80px] text-center">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-32">
                        {searchTerm || statusFilter !== "all" || adjustmentFilter !== "all" ? (
                          <div className="flex flex-col items-center justify-center text-center">
                            <Search className="h-8 w-8 text-muted-foreground/50 mb-2" />
                            <p className="text-muted-foreground">Nenhum resultado encontrado</p>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => {
                                setSearchTerm("");
                                setStatusFilter("all");
                                setAdjustmentFilter("all");
                              }}
                            >
                              Limpar filtros
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center text-center">
                            <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
                            <p className="text-muted-foreground">Nenhum contrato cadastrado</p>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLeases.map((lease) => {
                      // Use lease.status directly since it's the actual status field
                      const statusConfig = STATUS_LABELS[lease.status] || STATUS_LABELS.active;
                      const { adjustmentStatus } = lease;
                      const needsAction = adjustmentStatus === "overdue" || adjustmentStatus === "current_month";
                      const daysUntilAdjustment = lease.next_adjustment_date
                        ? differenceInDays(parseISO(lease.next_adjustment_date), new Date())
                        : null;

                      return (
                        <TableRow 
                          key={lease.id} 
                          className={`cursor-pointer transition-colors hover:bg-muted/80 ${needsAction ? "bg-destructive/5 hover:bg-destructive/10" : ""}`}
                          onClick={(e) => handleRowClick(lease, e)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {/* Property type indicator */}
                              {(() => {
                                const unitData = unitsWithProperty?.find(u => u.id === lease.unit_id);
                                const isStandalone = !unitData || unitData.is_standalone || !unitData.property_id;
                                return isStandalone ? (
                                  <Home className="h-4 w-4 text-primary flex-shrink-0" />
                                ) : (
                                  <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                                );
                              })()}
                              <div className="min-w-0">
                                <p className="font-medium truncate">
                                  {lease.unit?.unit_number || "—"}
                                </p>
                                {(() => {
                                  const unitData = unitsWithProperty?.find(u => u.id === lease.unit_id);
                                  const isStandalone = !unitData || unitData.is_standalone || !unitData.property_id;
                                  return (
                                    <p className="text-xs text-muted-foreground">
                                      {isStandalone ? "Imóvel Avulso" : "Unidade"}
                                    </p>
                                  );
                                })()}
                                {lease.unit?.address && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {lease.unit.address}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">
                                {lease.tenant_contact?.name || "—"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(lease.rent_amount)}
                          </TableCell>
                          <TableCell className="text-center hidden md:table-cell">
                            <Badge variant="outline" className="text-[10px] whitespace-nowrap">
                              {INDEX_LABELS[lease.adjustment_index || "IGPM"]}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {lease.next_adjustment_date ? (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(parseISO(lease.next_adjustment_date), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                {adjustmentStatus === "overdue" && (
                                  <Badge variant="destructive" className="text-[10px] ml-1">
                                    Atrasado
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {(() => {
                              const awaitingSignature =
                                lease.status === "active" && lease.signature_status !== "signed";
                              if (awaitingSignature) {
                                return (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] whitespace-nowrap border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/30"
                                  >
                                    <Clock className="h-2.5 w-2.5 mr-0.5" />
                                    Aguardando Assinatura
                                  </Badge>
                                );
                              }
                              return (
                                <Badge
                                  variant={statusConfig.variant}
                                  className={cn(
                                    "text-[10px] whitespace-nowrap",
                                    lease.status === "terminated" && "bg-muted text-muted-foreground"
                                  )}
                                >
                                  {statusConfig.label}
                                </Badge>
                              );
                            })()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => e.stopPropagation()}
                                    title="Ações"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/gestao/contratos?id=${lease.id}`);
                                    }}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Ver Detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {needsAction && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenAdjustment(lease, true);
                                      }}
                                    >
                                      <TrendingUp className="h-4 w-4 mr-2 text-destructive" />
                                      Reajustar
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickTransaction(lease);
                                    }}
                                  >
                                    <Receipt className="h-4 w-4 mr-2" />
                                    Registrar Pagamento
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEmitirLeaseId(lease.id);
                                    }}
                                  >
                                    <Receipt className="h-4 w-4 mr-2" />
                                    Emitir Boleto/PIX
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGenerateContract(lease.unit_id);
                                    }}
                                  >
                                    <FileSignature className="h-4 w-4 mr-2" />
                                    Gerar Contrato
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleUploadContract(lease);
                                    }}
                                  >
                                    <Upload className="h-4 w-4 mr-2" />
                                    Upload Assinado
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {(isOwner || hasPermission('management_contracts', 'edit')) && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleTerminateContract(lease);
                                      }}
                                    >
                                      <XCircle className="h-4 w-4 mr-2" />
                                      Encerrar
                                    </DropdownMenuItem>
                                  )}
                                  {(isOwner || hasPermission('management_contracts', 'delete')) && (
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteLease(lease);
                                      }}
                                      className="text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      Excluir
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </Card>
        )}
      </TableErrorBoundary>

      {/* Adjustment Calculator Dialog */}
      <AdjustmentCalculatorDialog
        open={isAdjustmentOpen}
        onOpenChange={setIsAdjustmentOpen}
        lease={selectedLease}
        onSuccess={refetch}
        isUrgent={selectedIsUrgent}
      />

      {/* Quick Transaction Dialog */}
      <CreateTransactionDialog
        open={quickTransactionOpen}
        onOpenChange={setQuickTransactionOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
          setQuickTransactionOpen(false);
          setTransactionPrefill(null);
        }}
        prefill={transactionPrefill || undefined}
      />

      {/* Contract Generator Dialog */}
      {generatorUnitId && (
        <ContractGeneratorDialog
          open={contractGeneratorOpen}
          onOpenChange={(open) => {
            setContractGeneratorOpen(open);
            if (!open) setGeneratorUnitId(null);
          }}
          unitId={generatorUnitId}
        />
      )}

      {/* Terminate Contract Dialog */}
      <TerminateContractDialog
        open={terminateDialogOpen}
       onOpenChange={(open) => {
         setTerminateDialogOpen(open);
         if (!open) setTerminatingLease(null);
       }}
        lease={terminatingLease}
        onSuccess={() => {
          refetch();
         setTerminateDialogOpen(false);
          setTerminatingLease(null);
        }}
      />

      {/* Upload Signed Contract Dialog */}
      <UploadSignedContractDialog
        open={uploadDialogOpen}
        onOpenChange={(open) => {
          setUploadDialogOpen(open);
          if (!open) setUploadingLease(null);
        }}
        lease={uploadingLease}
        onSuccess={() => {
          refetch();
          setUploadDialogOpen(false);
          setUploadingLease(null);
        }}
      />

      {/* Edit Adjustment Date Dialog */}
      <EditAdjustmentDateDialog
        open={editAdjustmentDateOpen}
        onOpenChange={setEditAdjustmentDateOpen}
        lease={editingAdjustmentLease}
        onSuccess={() => {
          refetch();
          setEditingAdjustmentLease(null);
        }}
      />

      {/* Duplicate Contract Warning Dialog */}
      <AlertDialog open={duplicateWarningOpen} onOpenChange={setDuplicateWarningOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Contrato Duplicado
            </AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um contrato ativo para este inquilino neste imóvel. 
              Deseja criar um novo contrato mesmo assim?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDuplicateWarningOpen(false);
              setPendingLeaseEdit(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              // Proceed with creation anyway
              setDuplicateWarningOpen(false);
              if (pendingLeaseEdit) {
                setCreateUnitId(pendingLeaseEdit.unit_id);
                setCreateUnitName(pendingLeaseEdit.unit?.unit_number || "");
                setCreateWizardOpen(true);
              }
              setPendingLeaseEdit(null);
            }}>
              Criar Mesmo Assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Lease Wizard - for new contracts */}
      {createUnitId && (
        <CreateLeaseWizard
          open={createWizardOpen}
          onOpenChange={(open) => {
            setCreateWizardOpen(open);
            if (!open) {
              setCreateUnitId(null);
              setCreateUnitName("");
            }
          }}
          unitId={createUnitId}
          unitName={createUnitName}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["leases-contracts"] });
            setCreateWizardOpen(false);
            setCreateUnitId(null);
            setCreateUnitName("");
          }}
        />
      )}

      {/* Edit Lease Wizard - for editing existing contracts */}
      {editingLease && editingLeaseData && (
        <CreateLeaseWizard
          open={editWizardOpen}
          onOpenChange={(open) => {
            setEditWizardOpen(open);
            if (!open) {
              setEditingLease(null);
              setEditingLeaseData(null);
            }
          }}
          unitId={editingLease.unit_id}
          unitName={editingLease.unit?.unit_number || ""}
          editLease={editingLeaseData}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["leases-contracts"] });
            queryClient.invalidateQueries({ queryKey: ["leases"] });
            setEditWizardOpen(false);
            setEditingLease(null);
            setEditingLeaseData(null);
          }}
        />
      )}

      {/* Unit Selection Dialog for New Contract */}
      <Dialog open={unitSelectionOpen} onOpenChange={setUnitSelectionOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Selecionar Imóvel
            </DialogTitle>
            <DialogDescription>
              Escolha o imóvel para criar um novo contrato de locação.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por endereço ou número..."
                value={unitSearchTerm}
                onChange={(e) => setUnitSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <ScrollArea className="h-[300px] pr-2">
              {isLoadingUnits ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : filteredUnits.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Nenhum imóvel encontrado</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUnits.map((unit) => (
                    <Card
                      key={unit.id}
                      className={`p-3 cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm ${
                        unit.is_occupied ? "opacity-60" : ""
                      }`}
                      onClick={() => handleUnitSelected(unit)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{unit.unit_number}</p>
                            {unit.address && (
                              <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                {unit.address}
                              </p>
                            )}
                          </div>
                        </div>
                        <Badge 
                          variant={unit.is_occupied ? "secondary" : "outline"}
                          className={`text-[10px] ${!unit.is_occupied ? "border-green-500 text-green-600" : ""}`}
                        >
                          {unit.is_occupied ? "Ocupado" : "Disponível"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>


      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Excluir Contrato Permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Você está prestes a excluir o contrato do imóvel{" "}
                <strong>{deletingLease?.unit?.unit_number}</strong> com o inquilino{" "}
                <strong>{deletingLease?.tenant_contact?.name}</strong>.
              </p>
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Atenção: Esta ação é irreversível!
                </p>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• O registro será excluído permanentemente do banco de dados</li>
                  <li>• Todas as transações financeiras vinculadas serão removidas</li>
                  <li>• O imóvel será liberado para novas locações</li>
                  <li>• Os dados não poderão ser recuperados</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLease}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sim, Excluir Permanentemente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EmitirCobrancaDialog
        open={!!emitirLeaseId}
        onOpenChange={(open) => !open && setEmitirLeaseId(null)}
        preselectedLeaseId={emitirLeaseId ?? undefined}
      />
    </div>
  );
}
