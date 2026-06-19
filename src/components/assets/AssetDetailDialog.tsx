import { useState, useMemo } from "react";
import { format, addMonths, startOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Home,
  Building2,
  User,
  Receipt,
  Link2,
  Plus,
  Check,
  Clock,
  AlertCircle,
  Building,
  Zap,
  Droplets,
  Flame,
  Shield,
  MoreHorizontal,
  ExternalLink,
  Pencil,
  FileText,
  LayoutDashboard,
  type LucideIcon,
  Loader2,
  Save,
  MapPin,
  Wrench,
  File,
  Phone,
  Users,
  Circle,
  Download,
  FileSpreadsheet,
  Calendar as CalendarIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CreateTransactionDialog, TransactionPrefill } from "@/components/finance/CreateTransactionDialog";
import { useObligationCategoryMapping } from "@/hooks/useObligationCategoryMapping";
import { MonthYearPicker } from "@/components/schedule/MonthYearPicker";
import {
  AssetHealth,
  ObligationType,
  ObligationStatus,
  ObligationsConfig,
  ObligationConfig,
} from "@/hooks/useAssetHealth";
import { EditUnitDialog } from "@/components/units/EditUnitDialog";
import { AssetMetricsCards } from "./AssetMetricsCards";
import { ObligationsConfigForm } from "./ObligationsConfigForm";
import { DimobStatusCard } from "./DimobStatusCard";
import { ContractGeneratorDialog } from "./ContractGeneratorDialog";
import { CreateLeaseWizard } from "./CreateLeaseWizard";
import { toast } from "@/hooks/use-toast";

interface AssetDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetHealth | null;
}

const OBLIGATION_LABELS: Record<ObligationType, string> = {
  rent: "Aluguel",
  condominium: "Condomínio",
  iptu: "IPTU",
  energy: "Energia",
  water: "Água",
  gas: "Gás",
  insurance: "Seguro",
  other: "Outros",
};

const OBLIGATION_ICONS: Record<ObligationType, LucideIcon> = {
  rent: Home,
  condominium: Building,
  iptu: Receipt,
  energy: Zap,
  water: Droplets,
  gas: Flame,
  insurance: Shield,
  other: MoreHorizontal,
};

const STATUS_CONFIG: Record<ObligationStatus, {
  label: string;
  icon: LucideIcon;
  className: string;
  bgClassName: string;
}> = {
  paid: {
    label: "Pago",
    icon: Check,
    className: "text-green-600",
    bgClassName: "bg-green-500/15 text-green-600 border-green-500/30",
  },
  pending: {
    label: "Pendente",
    icon: Clock,
    className: "text-yellow-600",
    bgClassName: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
  },
  overdue: {
    label: "Atrasado",
    icon: AlertCircle,
    className: "text-red-600",
    bgClassName: "bg-red-500/15 text-red-600 border-red-500/30",
  },
  ignored: {
    label: "Desativado",
    icon: MoreHorizontal,
    className: "text-muted-foreground",
    bgClassName: "bg-muted text-muted-foreground",
  },
};

const OVERALL_STATUS_CONFIG = {
  healthy: { label: "Saudável", className: "bg-green-500/15 text-green-600 border-green-500/30" },
  attention: { label: "Atenção", className: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
  critical: { label: "Crítico", className: "bg-red-500/15 text-red-600 border-red-500/30" },
} as const;

interface MonthlyObligation {
  type: ObligationType;
  label: string;
  config: ObligationConfig | null;
  status: ObligationStatus;
  transaction: {
    id: string;
    amount: number;
    status: string;
    transaction_date: string;
    description: string;
  } | null;
}

export function AssetDetailDialog({
  open,
  onOpenChange,
  asset,
}: AssetDetailDialogProps) {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { findCategoryForObligation, getTransactionTypeForObligation } = useObligationCategoryMapping();

  const [activeTab, setActiveTab] = useState("overview");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [transactionPrefill, setTransactionPrefill] = useState<TransactionPrefill | undefined>();
  const [selectedObligationType, setSelectedObligationType] = useState<ObligationType | null>(null);
  const [linkingTransactionFor, setLinkingTransactionFor] = useState<ObligationType | null>(null);
  const [obligationsView, setObligationsView] = useState<"config" | "status">("config");
  
  // New state for in-place editing
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  const [leaseWizardOpen, setLeaseWizardOpen] = useState(false);
  
  // Inline CIB editing state
  const [editingCib, setEditingCib] = useState(false);
  const [cibValue, setCibValue] = useState("");

  // Activities tab state
  const [showNewForm, setShowNewForm] = useState(false);
  const [activityDateFrom, setActivityDateFrom] = useState("");
  const [activityDateTo, setActivityDateTo] = useState("");
  const [newActivity, setNewActivity] = useState({
    activity_type: 'note',
    title: '',
    description: '',
    scheduled_at: '',
    responsible_name: '',
    outcome: '',
  });
  const [savingActivity, setSavingActivity] = useState(false);

  const competencyPeriod = format(currentMonth, "yyyy-MM");
  const monthLabel = format(currentMonth, "MMMM yyyy", { locale: ptBR });
  const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  // Fetch full unit data for editing
  const { data: unitData } = useQuery({
    queryKey: ["unit-full-data", asset?.unitId],
    queryFn: async () => {
      if (!asset) return null;
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("id", asset.unitId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!asset,
  });

  // Fetch unit's obligations config
  const { data: unitConfig } = useQuery({
    queryKey: ["unit-obligations-config", asset?.unitId],
    queryFn: async () => {
      if (!asset) return null;
      const { data, error } = await supabase
        .from("units")
        .select("obligations_config")
        .eq("id", asset.unitId)
        .single();
      if (error) throw error;
      return (data?.obligations_config as ObligationsConfig) || {};
    },
    enabled: !!asset,
  });

  // Fetch transactions for the selected month
  const { data: monthTransactions = [] } = useQuery({
    queryKey: ["unit-month-transactions", asset?.unitId, competencyPeriod],
    queryFn: async () => {
      if (!asset) return [];
      
      const monthStart = format(currentMonth, "yyyy-MM-01");
      const monthEnd = format(addMonths(currentMonth, 1), "yyyy-MM-01");
      
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(`
          id,
          amount,
          status,
          transaction_date,
          description,
          obligation_type,
          competency_period,
          is_reconciled,
          category:financial_categories(name)
        `)
        .eq("unit_id", asset.unitId)
        .or(`competency_period.eq.${competencyPeriod},and(competency_period.is.null,transaction_date.gte.${monthStart},transaction_date.lt.${monthEnd})`);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!asset,
  });

  // Fetch available transactions to link (financial)
  const { data: availableFinancialTransactions = [] } = useQuery({
    queryKey: ["unlinked-transactions", asset?.unitId],
    queryFn: async () => {
      if (!asset) return [];
      const { data, error } = await supabase
        .from("financial_transactions")
        .select(`
          id,
          amount,
          status,
          transaction_date,
          description,
          category:financial_categories(name)
        `)
        .eq("unit_id", asset.unitId)
        .is("obligation_type", null)
        .order("transaction_date", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return (data || []).map(t => ({ ...t, source: "financial" as const }));
    },
    enabled: !!asset && !!linkingTransactionFor,
  });

  // Fetch available managerial transactions to link
  const { data: availableManagerialTransactions = [] } = useQuery({
    queryKey: ["unlinked-managerial-transactions", asset?.unitId],
    queryFn: async () => {
      if (!asset) return [];
      const { data, error } = await supabase
        .from("managerial_transactions")
        .select("id, amount, status, due_date, description")
        .eq("unit_id", asset.unitId)
        .is("obligation_type", null)
        .order("due_date", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return (data || []).map(t => ({ ...t, transaction_date: t.due_date || "", source: "managerial" as const }));
    },
    enabled: !!asset && !!linkingTransactionFor,
  });

  // Combine both sources
  const availableTransactions = [...availableFinancialTransactions, ...availableManagerialTransactions];

  // Mutation for updating CIB inline
  const updateCibMutation = useMutation({
    mutationFn: async (newCib: string) => {
      if (!asset) throw new Error("No asset");
      const { error } = await supabase
        .from("units")
        .update({ cib: newCib || null })
        .eq("id", asset.unitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unit-full-data", asset?.unitId] });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      setEditingCib(false);
      toast({
        title: "CIB atualizado",
        description: "O número do CIB foi salvo com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Activities: schedule_activities (direct unit)
  const { data: scheduleActivities } = useQuery({
    queryKey: ['schedule-activities-unit', asset?.unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('schedule_activities')
        .select('id, title, description, activity_type, scheduled_at, is_completed, completed_at, created_at')
        .eq('unit_id', asset!.unitId)
        .order('scheduled_at', { ascending: false });
      return (data || []).map(r => ({ ...r, source: 'agenda' as const }));
    },
    enabled: !!asset?.unitId && activeTab === 'activities',
  });

  // Activities: deal_activities via deals.unit_id
  const { data: dealActivities } = useQuery({
    queryKey: ['deal-activities-unit', asset?.unitId],
    queryFn: async () => {
      const { data: deals } = await supabase
        .from('deals')
        .select('id')
        .eq('unit_id', asset!.unitId);
      if (!deals?.length) return [];
      const dealIds = deals.map(d => d.id);
      const { data } = await supabase
        .from('deal_activities')
        .select('id, title, description, activity_type, scheduled_at, completed_at, created_at')
        .in('deal_id', dealIds)
        .order('created_at', { ascending: false });
      return (data || []).map(r => ({ ...r, source: 'pipeline' as const, is_completed: !!r.completed_at }));
    },
    enabled: !!asset?.unitId && activeTab === 'activities',
  });

  // Activities: property_activities (manual)
  const { data: propertyActivities, refetch: refetchPropertyActivities } = useQuery({
    queryKey: ['property-activities', asset?.unitId],
    queryFn: async () => {
      const { data } = await supabase
        .from('property_activities')
        .select('id, title, description, activity_type, scheduled_at, is_completed, completed_at, created_at')
        .eq('unit_id', asset!.unitId)
        .order('created_at', { ascending: false });
      return (data || []).map(r => ({ ...r, source: 'manual' as const }));
    },
    enabled: !!asset?.unitId && activeTab === 'activities',
  });

  const allActivities = useMemo(() => {
    const all = [
      ...(scheduleActivities || []),
      ...(dealActivities || []),
      ...(propertyActivities || []),
    ];
    return all.sort((a: any, b: any) => {
      const dateA = new Date(a.scheduled_at || a.created_at).getTime();
      const dateB = new Date(b.scheduled_at || b.created_at).getTime();
      return dateB - dateA;
    });
  }, [scheduleActivities, dealActivities, propertyActivities]);

  const filteredActivities = useMemo(() => {
    return allActivities.filter((a: any) => {
      const date = new Date(a.scheduled_at || a.created_at);
      if (activityDateFrom && date < new Date(activityDateFrom)) return false;
      if (activityDateTo && date > new Date(activityDateTo + 'T23:59:59')) return false;
      return true;
    });
  }, [allActivities, activityDateFrom, activityDateTo]);

  const exportActivitiesCSV = () => {
    import('papaparse').then(Papa => {
      const rows = filteredActivities.map((a: any) => ({
        Tipo: a.activity_type,
        Título: a.title,
        Descrição: a.description || '',
        Data: a.scheduled_at || a.created_at
          ? format(new Date(a.scheduled_at || a.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
          : '',
        Fonte: ({ agenda: 'Agenda', pipeline: 'Pipeline', manual: 'Manual' } as Record<string,string>)[a.source] || a.source,
        Concluído: a.is_completed ? 'Sim' : 'Não',
      }));
      const csv = Papa.unparse(rows);
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `atividades-${asset?.unitId || 'imovel'}-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    });
  };

  const exportActivitiesPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.setFontSize(16);
    doc.text('Histórico de Atividades', 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Imóvel: ${asset?.unitId || ''}`, 14, 26);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 32);
    let y = 42;
    doc.setFontSize(9);
    doc.setTextColor(60);
    doc.setFont('helvetica', 'bold');
    const cols = ['Data', 'Tipo', 'Título', 'Fonte', 'Status'];
    const colWidths = [28, 22, 80, 22, 20];
    let x = 14;
    cols.forEach((col, i) => { doc.text(col, x, y); x += colWidths[i]; });
    doc.setDrawColor(200);
    doc.line(14, y + 2, 196, y + 2);
    y += 7;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    filteredActivities.forEach((a: any) => {
      if (y > 270) { doc.addPage(); y = 18; }
      const date = a.scheduled_at || a.created_at
        ? format(new Date(a.scheduled_at || a.created_at), "dd/MM/yy HH:mm")
        : '';
      const source = ({ agenda: 'Agenda', pipeline: 'Pipeline', manual: 'Manual' } as Record<string,string>)[a.source] || '';
      const status = a.is_completed ? 'Concluído' : 'Pendente';
      const rowData = [date, a.activity_type, a.title, source, status];
      x = 14;
      rowData.forEach((val, i) => {
        const maxW = colWidths[i] - 2;
        const text = doc.splitTextToSize(String(val || ''), maxW);
        doc.text(text[0], x, y);
        x += colWidths[i];
      });
      y += 6;
    });
    doc.save(`atividades-${asset?.unitId || 'imovel'}-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const handleSaveActivity = async () => {
    if (!newActivity.title.trim() || !asset) return;
    setSavingActivity(true);
    await supabase.from('property_activities').insert({
      unit_id: asset.unitId,
      broker_id: effectiveBrokerId || user?.id,
      activity_type: newActivity.activity_type,
      title: newActivity.title,
      description: newActivity.description || null,
      scheduled_at: newActivity.scheduled_at || null,
    });
    setNewActivity({ activity_type: 'note', title: '', description: '', scheduled_at: '' });
    setShowNewForm(false);
    setSavingActivity(false);
    refetchPropertyActivities();
  };

  // Build monthly obligations list
  const monthlyObligations = useMemo((): MonthlyObligation[] => {
    if (!unitConfig) return [];

    const today = new Date();
    const isCurrentMonth = format(today, "yyyy-MM") === competencyPeriod;
    const currentDay = today.getDate();

    return (Object.keys(OBLIGATION_LABELS) as ObligationType[]).map((type) => {
      const config = unitConfig[type] || { active: false };
      
      // Find matching transaction with priority order:
      // 1. Exact match by obligation_type + competency_period
      // 2. Match by obligation_type only
      // 3. Legacy fallback by description/category
      const transaction = monthTransactions.find((t) => {
        if (t.obligation_type === type && t.competency_period === competencyPeriod) {
          return true;
        }
        return false;
      }) || monthTransactions.find((t) => {
        if (t.obligation_type === type && !t.competency_period) {
          return true;
        }
        return false;
      }) || monthTransactions.find((t) => {
        if (t.obligation_type) return false; // Skip if already typed
        const categoryName = (t.category?.name || "").toLowerCase();
        const description = (t.description || "").toLowerCase();
        const keywords = [OBLIGATION_LABELS[type].toLowerCase()];
        return keywords.some(k => categoryName.includes(k) || description.includes(k));
      });

      let status: ObligationStatus = "ignored";
      if (config.active) {
        if (transaction) {
          // Reconciled transactions are always treated as paid (Master Rule)
          if (transaction.is_reconciled === true) {
            status = "paid";
          } else if (transaction.status === "paid") {
            status = "paid";
          } else if (transaction.status === "overdue") {
            status = "overdue";
          } else {
            const dueDay = config.due_day || 10;
            status = isCurrentMonth && currentDay > dueDay ? "overdue" : "pending";
          }
        } else {
          const dueDay = config.due_day || 10;
          status = isCurrentMonth && currentDay > dueDay ? "overdue" : "pending";
        }
      }

      return {
        type,
        label: OBLIGATION_LABELS[type],
        config: config.active ? config : null,
        status,
        transaction: transaction ? {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.status,
          transaction_date: transaction.transaction_date,
          description: transaction.description,
        } : null,
      };
    }).filter(o => o.config !== null);
  }, [unitConfig, monthTransactions, competencyPeriod]);

  const handleCreateTransaction = (obligationType: ObligationType) => {
    if (!asset) return;

    const config = unitConfig?.[obligationType];
    const dueDay = config?.due_day || 10;
    const dueDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dueDay);
    
    const categoryId = findCategoryForObligation(obligationType);
    const transactionType = getTransactionTypeForObligation(obligationType);

    setSelectedObligationType(obligationType);
    setTransactionPrefill({
      description: `${OBLIGATION_LABELS[obligationType]} - ${capitalizedMonthLabel}`,
      unitId: asset.unitId,
      categoryId: categoryId || undefined,
      type: transactionType,
      dueDate: format(dueDate, "yyyy-MM-dd"),
      status: "pending",
    });
    setTransactionDialogOpen(true);
  };

  const handleLinkTransaction = async (transactionId: string, obligationType: ObligationType, source: "financial" | "managerial" = "financial") => {
    try {
      if (source === "managerial") {
        const { error } = await supabase
          .from("managerial_transactions")
          .update({
            obligation_type: obligationType,
            competency_period: competencyPeriod,
          })
          .eq("id", transactionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("financial_transactions")
          .update({
            obligation_type: obligationType,
            competency_period: competencyPeriod,
          })
          .eq("id", transactionId);
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["unit-month-transactions", asset?.unitId] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-transactions", asset?.unitId] });
      queryClient.invalidateQueries({ queryKey: ["unlinked-managerial-transactions", asset?.unitId] });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      
      setLinkingTransactionFor(null);
    } catch (error) {
      console.error("Error linking transaction:", error);
    }
  };

  const handleTransactionSuccess = () => {
    setTransactionDialogOpen(false);
    setTransactionPrefill(undefined);
    setSelectedObligationType(null);
    
    // Invalidate all related queries to ensure UI sync across modules
    queryClient.invalidateQueries({ queryKey: ["unit-month-transactions", asset?.unitId] });
    queryClient.invalidateQueries({ queryKey: ["asset-health"] });
    queryClient.invalidateQueries({ queryKey: ["financial-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["action-center-payables"] });
    queryClient.invalidateQueries({ queryKey: ["action-center-receivables"] });
  };

  const handleEditSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["unit-full-data", asset?.unitId] });
    queryClient.invalidateQueries({ queryKey: ["asset-health"] });
  };

  const handleStartCibEdit = () => {
    setCibValue(unitData?.cib || "");
    setEditingCib(true);
  };

  const handleSaveCib = () => {
    updateCibMutation.mutate(cibValue);
  };

  const content = (
    <div className="flex flex-col h-full">
      {/* Asset Header */}
      {asset && (
        <div className="px-4 pb-4 border-b">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-12 h-12 rounded-lg flex items-center justify-center shrink-0",
              "bg-primary/10"
            )}>
              {asset.propertyName ? (
                <Building2 className="h-6 w-6 text-primary" />
              ) : (
                <Home className="h-6 w-6 text-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-lg truncate">{asset.unitNumber}</h3>
              {asset.propertyName && (
                <p className="text-sm text-muted-foreground truncate">{asset.propertyName}</p>
              )}
              {asset.ownerName && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <User className="h-3 w-3" />
                  <span className="truncate">{asset.ownerName}</span>
                </div>
              )}
            </div>
            {asset.overallStatus && OVERALL_STATUS_CONFIG[asset.overallStatus] && (
              <Badge
                variant="outline"
                className={cn("text-xs shrink-0 self-start mt-0.5", OVERALL_STATUS_CONFIG[asset.overallStatus].className)}
              >
                {OVERALL_STATUS_CONFIG[asset.overallStatus].label}
              </Badge>
            )}
            {/* Action buttons */}
            <div className="flex gap-2 shrink-0 flex-col items-end">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button variant="default" size="sm" onClick={() => setContractDialogOpen(true)}>
                  <FileText className="h-4 w-4 mr-1" />
                  Contrato
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="px-4 pt-2 border-b">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">
              <LayoutDashboard className="h-3.5 w-3.5 mr-1" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="obligations" className="text-xs">
              <Receipt className="h-3.5 w-3.5 mr-1" />
              Obrigações
            </TabsTrigger>
            <TabsTrigger value="fiscal" className="text-xs">
              <Shield className="h-3.5 w-3.5 mr-1" />
              Fiscal
            </TabsTrigger>
            <TabsTrigger value="activities" className="text-xs">
              <Clock className="h-3.5 w-3.5 mr-1" />
              Atividades
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab - Dashboard de Métricas */}
        <TabsContent value="overview" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full px-4 py-4">
            <div className="space-y-4">
              {/* Key Metrics Cards - Performance, Occupancy, Next Action */}
              {asset && (
                <AssetMetricsCards
                  unitId={asset.unitId}
                  rentAmount={unitData?.rent_price || undefined}
                  marketValue={unitData?.market_value || unitData?.price || undefined}
                />
              )}

              {/* Property Details Grid */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3">Dados do Imóvel</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Tipo</p>
                      <p className="font-medium">{unitData?.property_type || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Área</p>
                      <p className="font-medium">{unitData?.area ? `${unitData.area} m²` : "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Quartos</p>
                      <p className="font-medium">{unitData?.bedrooms ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Vagas</p>
                      <p className="font-medium">{unitData?.parking_spots ?? "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">Endereço</p>
                      <p className="font-medium truncate">
                        {unitData?.address 
                          ? `${unitData.address}, ${unitData.city} - ${unitData.state}`
                          : "—"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Matrícula</p>
                      <p className="font-medium">{unitData?.registration_number || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">CIB</p>
                      <p className="font-medium">{unitData?.cib || "—"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Summary */}
              <Card>
                <CardContent className="p-4">
                  <h4 className="text-sm font-medium mb-3">Resumo Financeiro</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Aluguel</p>
                      <p className="font-medium">
                        {unitData?.rent_price 
                          ? `R$ ${unitData.rent_price.toLocaleString("pt-BR")}`
                          : "—"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Condomínio</p>
                      <p className="font-medium">
                        {unitData?.condo_fee 
                          ? `R$ ${unitData.condo_fee.toLocaleString("pt-BR")}`
                          : "—"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">IPTU (anual)</p>
                      <p className="font-medium">
                        {unitData?.iptu 
                          ? `R$ ${unitData.iptu.toLocaleString("pt-BR")}`
                          : "—"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Valor Estimado</p>
                      <p className="font-medium">
                        {(unitData?.market_value || unitData?.price)
                          ? `R$ ${(unitData.market_value || unitData.price)?.toLocaleString("pt-BR")}`
                          : "—"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Obligations Tab */}
        <TabsContent value="obligations" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full px-4 py-4">
            <div className="space-y-6">
              {/* Toggle de visualização */}
              <div className="flex rounded-lg border overflow-hidden p-1 bg-muted/50">
                <button
                  className={cn(
                    "flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all",
                    obligationsView === "config"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setObligationsView("config")}
                >
                  Configurar
                </button>
                <button
                  className={cn(
                    "flex-1 text-xs font-medium py-1.5 px-3 rounded-md transition-all",
                    obligationsView === "status"
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setObligationsView("status")}
                >
                  Status Mensal
                </button>
              </div>

              {obligationsView === "config" && (
                <ObligationsConfigForm
                  unitId={asset?.unitId || null}
                  unitName={asset?.unitNumber}
                  onSaved={() => {
                    queryClient.invalidateQueries({ queryKey: ["unit-obligations-config", asset?.unitId] });
                    queryClient.invalidateQueries({ queryKey: ["asset-health"] });
                  }}
                />
              )}

              {obligationsView === "status" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-center py-2">
                    <MonthYearPicker value={currentMonth} onChange={setCurrentMonth} showNavigation={true} />
                  </div>
                  <div className="space-y-3">
                    {monthlyObligations.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Nenhuma obrigação configurada</p>
                        <Button variant="outline" size="sm" className="mt-3" onClick={() => setObligationsView("config")}>
                          Configurar obrigações
                        </Button>
                      </div>
                    ) : (
                      monthlyObligations.map((obligation) => {
                        const Icon = OBLIGATION_ICONS[obligation.type];
                        const statusConfig = STATUS_CONFIG[obligation.status];
                        const StatusIcon = statusConfig.icon;

                        return (
                          <Card key={obligation.type} className="overflow-hidden">
                            <CardContent className="p-3">
                              <div className="flex items-start gap-3">
                                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", statusConfig.bgClassName)}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{obligation.label}</span>
                                    <Badge variant="outline" className={cn("text-xs", statusConfig.bgClassName)}>
                                      <StatusIcon className="h-3 w-3 mr-1" />
                                      {statusConfig.label}
                                    </Badge>
                                  </div>
                                  {obligation.config?.due_day && (
                                    <p className="text-xs text-muted-foreground mt-0.5">Vence dia {obligation.config.due_day}</p>
                                  )}
                                  {obligation.transaction ? (
                                    <div className="mt-2 p-2 bg-muted/50 rounded-md">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm truncate">{obligation.transaction.description}</span>
                                        <span className="text-sm font-medium">R$ {obligation.transaction.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                      </div>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        {format(parseISO(obligation.transaction.transaction_date), "dd/MM/yyyy")}
                                      </p>
                                    </div>
                                  ) : obligation.status !== "ignored" && (
                                    <div className="flex gap-2 mt-2">
                                      <Button variant="outline" size="sm" className="h-7 text-xs flex-1" onClick={() => handleCreateTransaction(obligation.type)}>
                                        <Plus className="h-3 w-3 mr-1" /> Criar Lançamento
                                      </Button>
                                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setLinkingTransactionFor(obligation.type)}>
                                        <Link2 className="h-3 w-3 mr-1" /> Vincular
                                      </Button>
                                    </div>
                                  )}
                                  {linkingTransactionFor === obligation.type && (
                                    <div className="mt-2 p-2 border rounded-md bg-background">
                                      <p className="text-xs font-medium mb-2">Selecione um lançamento:</p>
                                      {availableTransactions.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">Nenhum lançamento disponível</p>
                                      ) : (
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                          {availableTransactions.map((tx: any) => (
                                            <button
                                              key={`${tx.source}-${tx.id}`}
                                              className="w-full text-left p-2 text-xs rounded hover:bg-muted transition-colors"
                                              onClick={() => handleLinkTransaction(tx.id, obligation.type, tx.source)}
                                            >
                                              <div className="flex justify-between items-center">
                                                <span className="truncate flex items-center gap-1">
                                                  {tx.description}
                                                  {tx.source === "managerial" && (
                                                    <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground font-medium">Gerencial</span>
                                                  )}
                                                </span>
                                                <span className="font-medium">R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</span>
                                              </div>
                                              <span className="text-muted-foreground">
                                                {tx.transaction_date ? format(parseISO(tx.transaction_date), "dd/MM/yyyy") : "—"}
                                              </span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                      <Button variant="ghost" size="sm" className="w-full h-6 text-xs mt-2" onClick={() => setLinkingTransactionFor(null)}>Cancelar</Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Fiscal/DIMOB Tab */}
        <TabsContent value="fiscal" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full px-4 py-4">
            <div className="space-y-4">
              {/* Inline CIB Editor */}
              <Card className={cn(
                "border-2",
                unitData?.cib ? "border-green-500/30" : "border-amber-500/30"
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                      unitData?.cib ? "bg-green-500/15 text-green-600" : "bg-amber-500/15 text-amber-600"
                    )}>
                      {unitData?.cib ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">CIB - Cadastro Imobiliário</p>
                          <p className="text-xs text-muted-foreground">
                            Obrigatório para declaração DIMOB
                          </p>
                        </div>
                        {unitData?.cib && !editingCib && (
                          <Badge variant="outline" className="border-green-500/30 text-green-600">
                            {unitData.cib}
                          </Badge>
                        )}
                      </div>

                      {!unitData?.cib && !editingCib && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={handleStartCibEdit}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Adicionar CIB
                        </Button>
                      )}

                      {editingCib && (
                        <div className="flex gap-2 mt-2">
                          <Input
                            value={cibValue}
                            onChange={(e) => setCibValue(e.target.value)}
                            placeholder="Digite o número do CIB"
                            className="h-8 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            className="h-8"
                            onClick={handleSaveCib}
                            disabled={updateCibMutation.isPending}
                          >
                            {updateCibMutation.isPending ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Save className="h-3 w-3" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => setEditingCib(false)}
                          >
                            Cancelar
                          </Button>
                        </div>
                      )}

                      {unitData?.cib && !editingCib && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2 h-7 text-xs"
                          onClick={handleStartCibEdit}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Alterar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DIMOB Status Card */}
              {asset && unitData && (
                <DimobStatusCard
                  unitId={asset.unitId}
                  onEditUnit={() => setEditDialogOpen(true)}
                  onCreateLease={() => setLeaseWizardOpen(true)}
                />
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="flex-1 overflow-hidden m-0">
          <ScrollArea className="h-full px-4 py-4">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    <span>Período:</span>
                  </div>
                  <Input
                    type="date"
                    className="h-7 text-xs w-[130px]"
                    value={activityDateFrom}
                    onChange={e => setActivityDateFrom(e.target.value)}
                  />
                  <span className="text-xs text-muted-foreground self-center">até</span>
                  <Input
                    type="date"
                    className="h-7 text-xs w-[130px]"
                    value={activityDateTo}
                    onChange={e => setActivityDateTo(e.target.value)}
                  />
                  {(activityDateFrom || activityDateTo) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs px-2"
                      onClick={() => { setActivityDateFrom(''); setActivityDateTo(''); }}
                    >
                      Limpar
                    </Button>
                  )}
                </div>

                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">{filteredActivities.length} registro(s)</p>
                  <div className="flex gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline">
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Exportar
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={exportActivitiesCSV}>
                          <FileSpreadsheet className="h-4 w-4 mr-2" />
                          CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={exportActivitiesPDF}>
                          <FileText className="h-4 w-4 mr-2" />
                          PDF
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button size="sm" variant="outline" onClick={() => setShowNewForm(v => !v)}>
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Nova atividade
                    </Button>
                  </div>
                </div>
              </div>


              {showNewForm && (
                <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tipo</Label>
                      <Select value={newActivity.activity_type} onValueChange={v => setNewActivity(p => ({ ...p, activity_type: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="note">Nota</SelectItem>
                          <SelectItem value="visit">Visita</SelectItem>
                          <SelectItem value="maintenance">Manutenção</SelectItem>
                          <SelectItem value="document">Documento</SelectItem>
                          <SelectItem value="other">Outro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Data (opcional)</Label>
                      <Input type="date" className="h-8 text-xs" value={newActivity.scheduled_at} onChange={e => setNewActivity(p => ({ ...p, scheduled_at: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Título *</Label>
                    <Input className="h-8 text-xs" placeholder="Descreva a atividade..." value={newActivity.title} onChange={e => setNewActivity(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Observações (opcional)</Label>
                    <Textarea className="text-xs min-h-[60px]" value={newActivity.description} onChange={e => setNewActivity(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setShowNewForm(false)}>Cancelar</Button>
                    <Button size="sm" onClick={handleSaveActivity} disabled={!newActivity.title.trim() || savingActivity}>
                      {savingActivity && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}

              {filteredActivities.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma atividade registrada</p>
                  <p className="text-xs mt-1">Clique em "Nova atividade" para registrar</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredActivities.map((activity: any) => {
                    const activityIcons: Record<string, React.ReactNode> = {
                      note: <FileText className="h-3.5 w-3.5" />,
                      visit: <MapPin className="h-3.5 w-3.5" />,
                      maintenance: <Wrench className="h-3.5 w-3.5" />,
                      document: <File className="h-3.5 w-3.5" />,
                      call: <Phone className="h-3.5 w-3.5" />,
                      meeting: <Users className="h-3.5 w-3.5" />,
                      other: <Circle className="h-3.5 w-3.5" />,
                    };
                    const sourceBadge: Record<string, string> = {
                      agenda: 'Agenda',
                      pipeline: 'Pipeline',
                      manual: 'Manual',
                    };
                    const displayDate = activity.scheduled_at || activity.created_at;
                    return (
                      <div key={`${activity.source}-${activity.id}`} className="flex gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                        <div className={cn(
                          "h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                          activity.is_completed ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"
                        )}>
                          {activityIcons[activity.activity_type] || activityIcons.other}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn("text-sm font-medium truncate", activity.is_completed && "line-through text-muted-foreground")}>
                              {activity.title}
                            </p>
                            <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground shrink-0">
                              {sourceBadge[activity.source]}
                            </span>
                          </div>
                          {activity.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{activity.description}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {format(new Date(displayDate), "dd 'de' MMM 'de' yyyy, HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <Separator />
      <div className="p-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => window.open(`/finance/transactions?unitId=${asset?.unitId}`, "_self")}
        >
          <ExternalLink className="h-4 w-4" />
          Ver Lançamentos
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5"
          onClick={() => {
            setActiveTab("obligations");
            setObligationsView("status");
          }}
        >
          <Receipt className="h-4 w-4" />
          Status do Mês
        </Button>
      </div>

      {/* Dialogs */}
      <CreateTransactionDialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
        onSuccess={handleTransactionSuccess}
        prefill={transactionPrefill}
        obligationType={selectedObligationType}
        competencyPeriod={competencyPeriod}
      />

      {/* Edit Unit Dialog - In-place editing */}
      {unitData && (
        <EditUnitDialog
          unit={unitData as any}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSuccess={handleEditSuccess}
        />
      )}

      {/* Contract Generator Dialog */}
      {asset && (
        <ContractGeneratorDialog
          open={contractDialogOpen}
          onOpenChange={setContractDialogOpen}
          unitId={asset.unitId}
        />
      )}

      {/* Create Lease Wizard */}
      {asset && (
        <CreateLeaseWizard
          open={leaseWizardOpen}
          onOpenChange={setLeaseWizardOpen}
          unitId={asset.unitId}
          unitName={asset.unitNumber || unitData?.unit_number || "Imóvel"}
          ownerContactId={unitData?.owner_contact_id || undefined}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["unit-full-data", asset.unitId] });
            queryClient.invalidateQueries({ queryKey: ["asset-health"] });
            toast({
              title: "Contrato criado",
              description: "O contrato de locação foi criado com sucesso.",
            });
          }}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle>Gerenciar Ativo</DrawerTitle>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-[640px] p-0 flex flex-col gap-0"
      >
        <SheetHeader className="p-5 pb-0 border-b shrink-0">
          <SheetTitle>Gerenciar Ativo</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          {content}
        </div>
      </SheetContent>
    </Sheet>
  );
}
