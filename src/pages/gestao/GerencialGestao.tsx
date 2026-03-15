import { useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { usePermissions } from "@/hooks/usePermissions";
import { AppLayout } from "@/components/AppLayout";
import { SEOHead } from "@/components/SEOHead";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAssetHealth } from "@/hooks/useAssetHealth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Trash2,
  Edit3,
  Building2,
  Droplets,
  Zap,
  Flame,
  Shield,
  Receipt,
  Home as HomeIcon,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { MonthYearPicker } from "@/components/schedule/MonthYearPicker";

interface ManagerialTransaction {
  id: string;
  broker_id: string;
  unit_id: string;
  obligation_type: string | null;
  competency_period: string | null;
  description: string;
  amount: number;
  due_date: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  paid: { label: "Pago", color: "text-green-600 bg-green-500/15", icon: CheckCircle2 },
  pending: { label: "Pendente", color: "text-yellow-600 bg-yellow-500/15", icon: AlertCircle },
  overdue: { label: "Atrasado", color: "text-red-600 bg-red-500/15", icon: XCircle },
};

const OBLIGATION_LABELS: Record<string, { label: string; icon: typeof HomeIcon }> = {
  rent: { label: "Aluguel", icon: HomeIcon },
  condominium: { label: "Condomínio", icon: Building2 },
  iptu: { label: "IPTU", icon: Receipt },
  energy: { label: "Energia", icon: Zap },
  water: { label: "Água", icon: Droplets },
  gas: { label: "Gás", icon: Flame },
  insurance: { label: "Seguro", icon: Shield },
  other: { label: "Outros", icon: Receipt },
};

const GerencialGestao = () => {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { isOwner, hasPermission } = usePermissions();
  const canCreate = isOwner || hasPermission('management_reports', 'create');
  const canEdit = isOwner || hasPermission('management_reports', 'edit');
  const canDelete = isOwner || hasPermission('management_reports', 'delete');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(() => new Date());
  const competencyPeriod = format(selectedMonth, "yyyy-MM");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<ManagerialTransaction | null>(null);

  // Form state
  const [formUnitId, setFormUnitId] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formStatus, setFormStatus] = useState("pending");
  const [formObligationType, setFormObligationType] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Fetch managed units
  const { data: assets } = useAssetHealth(selectedMonth);

  // Fetch managerial transactions
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["managerial-transactions", user?.id, competencyPeriod],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("managerial_transactions")
        .select("*")
        .eq("competency_period", competencyPeriod)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return data as ManagerialTransaction[];
    },
    enabled: !!user,
  });

  // Fetch units for the selector
  const { data: units = [] } = useQuery({
    queryKey: ["managed-units-list", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number")
        .eq("is_managed", true)
        .order("unit_number");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (isEdit: boolean) => {
      if (!user) throw new Error("Not authenticated");
      const payload = {
        broker_id: effectiveBrokerId || user.id,
        unit_id: formUnitId,
        description: formDescription,
        amount: parseFloat(formAmount) || 0,
        due_date: formDueDate || null,
        status: formStatus,
        obligation_type: formObligationType || null,
        competency_period: competencyPeriod,
        notes: formNotes || null,
      };

      if (isEdit && editingTransaction) {
        const { error } = await supabase
          .from("managerial_transactions")
          .update(payload)
          .eq("id", editingTransaction.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("managerial_transactions")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managerial-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      toast({ title: editingTransaction ? "Lançamento atualizado" : "Lançamento criado" });
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("managerial_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["managerial-transactions"] });
      toast({ title: "Lançamento excluído" });
    },
  });

  const resetForm = () => {
    setFormUnitId("");
    setFormDescription("");
    setFormAmount("");
    setFormDueDate("");
    setFormStatus("pending");
    setFormObligationType("");
    setFormNotes("");
    setEditingTransaction(null);
    setCreateDialogOpen(false);
  };

  const openEdit = (tx: ManagerialTransaction) => {
    setEditingTransaction(tx);
    setFormUnitId(tx.unit_id);
    setFormDescription(tx.description);
    setFormAmount(String(tx.amount));
    setFormDueDate(tx.due_date || "");
    setFormStatus(tx.status);
    setFormObligationType(tx.obligation_type || "");
    setFormNotes(tx.notes || "");
    setCreateDialogOpen(true);
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusFilter !== "all" && tx.status !== statusFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const unitName = units.find((u) => u.id === tx.unit_id)?.unit_number || "";
        return (
          tx.description.toLowerCase().includes(search) ||
          unitName.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [transactions, statusFilter, searchTerm, units]);

  // Stats
  const stats = useMemo(() => ({
    total: transactions.length,
    paid: transactions.filter((t) => t.status === "paid").length,
    pending: transactions.filter((t) => t.status === "pending").length,
    overdue: transactions.filter((t) => t.status === "overdue").length,
  }), [transactions]);

  const getUnitName = (unitId: string) => units.find((u) => u.id === unitId)?.unit_number || "—";

  return (
    <>
      <SEOHead
        title="Gerencial - Gestão"
        description="Controle gerencial de obrigações de imóveis"
        path="/gestao/gerencial"
        noIndex={true}
      />
      <AppLayout title="Gerencial">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Controle Gerencial</h1>
            <p className="text-muted-foreground">
              Acompanhe as obrigações e pagamentos de imóveis (água, luz, condomínio) que não afetam o DRE/Caixa da imobiliária
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Pagos</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Atrasados</p>
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
              </CardContent>
            </Card>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou unidade..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="overdue">Atrasados</SelectItem>
              </SelectContent>
            </Select>
            <MonthYearPicker value={selectedMonth} onChange={setSelectedMonth} />
            {canCreate && (
            <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Novo Lançamento
            </Button>
            )}
          </div>

          {/* Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Receipt className="h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-lg font-semibold">Nenhum lançamento gerencial</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1">
                    Registre pagamentos de contas (água, luz, etc.) que são de responsabilidade de terceiros e não afetam o caixa da imobiliária.
                  </p>
                  {canCreate && (
                  <Button className="mt-4" onClick={() => { resetForm(); setCreateDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Lançamento
                  </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((tx) => {
                      const statusCfg = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
                      const oblInfo = tx.obligation_type ? OBLIGATION_LABELS[tx.obligation_type] : null;
                      const StatusIcon = statusCfg.icon;
                      return (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">{getUnitName(tx.unit_id)}</TableCell>
                          <TableCell>
                            {oblInfo ? (
                              <div className="flex items-center gap-1.5">
                                <oblInfo.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-sm">{oblInfo.label}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">{tx.description}</TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {tx.amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {tx.due_date ? format(new Date(tx.due_date + "T12:00:00"), "dd/MM/yyyy") : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("gap-1", statusCfg.color)} variant="secondary">
                              <StatusIcon className="h-3 w-3" />
                              {statusCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {canEdit && (
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(tx)}>
                                <Edit3 className="h-3.5 w-3.5" />
                              </Button>
                              )}
                              {canDelete && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(tx.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Dialog */}
        <Dialog open={createDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setCreateDialogOpen(true); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTransaction ? "Editar Lançamento" : "Novo Lançamento Gerencial"}</DialogTitle>
              <DialogDescription>
                Registre um pagamento que não afeta o DRE/Caixa da imobiliária
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Unidade *</Label>
                <Select value={formUnitId} onValueChange={setFormUnitId}>
                  <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.unit_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tipo de Obrigação</Label>
                <Select value={formObligationType} onValueChange={setFormObligationType}>
                  <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {Object.entries(OBLIGATION_LABELS).map(([key, { label }]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descrição *</Label>
                <Input value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="Ex: Conta de água - Março/2026" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Valor (R$)</Label>
                  <Input type="number" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0,00" />
                </div>
                <div>
                  <Label>Vencimento</Label>
                  <Input type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formStatus} onValueChange={setFormStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="paid">Pago</SelectItem>
                    <SelectItem value="overdue">Atrasado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Observações opcionais..." />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetForm}>Cancelar</Button>
              <Button
                onClick={() => saveMutation.mutate(!!editingTransaction)}
                disabled={!formUnitId || !formDescription || saveMutation.isPending}
              >
                {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editingTransaction ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppLayout>
    </>
  );
};

export default GerencialGestao;
