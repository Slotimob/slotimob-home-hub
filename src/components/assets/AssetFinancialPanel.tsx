import { useState, useEffect } from 'react';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Tooltip as UITooltip,
  TooltipContent as UITooltipContent,
  TooltipProvider as UITooltipProvider,
  TooltipTrigger as UITooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  Save,
  Plus,
  Pencil,
  Trash2,
  TrendingUp,
  Wallet,
  Hammer,
  Loader2,
  BarChart3,
  Link2,
  Link2Off,
} from 'lucide-react';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  type AssetType,
  useAssetAcquisition,
  useSaveAcquisition,
  useAssetImprovements,
  useCreateImprovement,
  useUpdateImprovement,
  useDeleteImprovement,
  useUnitFinancialTransactions,
  useReconcileImprovement,
  useMarketValueHistory,
  useRecordMarketValue,
  type Improvement,
} from '@/hooks/useAssetFinancials';

const IMPROVEMENT_TYPE_LABELS: Record<string, string> = {
  reforma_geral: 'Reforma Geral',
  ampliacao: 'Ampliação',
  reforma_cozinha: 'Reforma Cozinha',
  reforma_banheiro: 'Reforma Banheiro',
  pintura: 'Pintura',
  piso: 'Piso',
  eletrica: 'Elétrica',
  hidraulica: 'Hidráulica',
  telhado: 'Telhado',
  fachada: 'Fachada',
  mobilia: 'Mobília',
  equipamento: 'Equipamento',
  outro: 'Outro',
};

const SOURCE_LABELS: Record<string, string> = {
  manual_appraisal: 'Avaliação manual',
  third_party_appraisal: 'Avaliação de terceiros',
  market_data_import: 'Importação de dados',
};

function fmtCurrency(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Converts the raw numeric string produced by CurrencyInput ("1350000" / "1350.5")
 * into a number. Returns null for empty/invalid input.
 */
function toNumber(s: string | null | undefined): number | null {
  if (s == null || s.trim() === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

interface AssetFinancialPanelProps {
  assetType: AssetType;
  assetId: string;
  currentMarketValue?: number | null;
  disabled?: boolean;
}

export function AssetFinancialPanel({
  assetType,
  assetId,
  currentMarketValue,
  disabled = false,
}: AssetFinancialPanelProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      <AcquisitionBlock assetType={assetType} assetId={assetId} disabled={disabled} />
      <Separator />
      <MarketValueBlock
        assetType={assetType}
        assetId={assetId}
        currentMarketValue={currentMarketValue}
        disabled={disabled}
      />
      <Separator />
      <ImprovementsBlock assetType={assetType} assetId={assetId} disabled={disabled} />
    </div>
  );
}

// ─── Acquisition Block ────────────────────────────────────

function AcquisitionBlock({
  assetType,
  assetId,
  disabled,
}: {
  assetType: AssetType;
  assetId: string;
  disabled: boolean;
}) {
  const { toast } = useToast();
  const { data, isLoading } = useAssetAcquisition(assetType, assetId);
  const saveMutation = useSaveAcquisition(assetType, assetId);

  const [value, setValue] = useState('');
  const [date, setDate] = useState('');
  const [costs, setCosts] = useState('');
  const [notes, setNotes] = useState('');

  // Re-hydrate local state whenever the persisted data actually changes
  // (mount, refetch after save, cache invalidation).
  useEffect(() => {
    if (!data) return;
    setValue(data.acquisition_value != null ? String(data.acquisition_value) : '');
    setDate(data.acquisition_date || '');
    setCosts(data.acquisition_costs != null ? String(data.acquisition_costs) : '');
    setNotes(data.acquisition_notes || '');
  }, [
    data?.acquisition_value,
    data?.acquisition_date,
    data?.acquisition_costs,
    data?.acquisition_notes,
  ]);


  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({
        acquisition_value: toNumber(value),
        acquisition_date: date || null,
        acquisition_costs: toNumber(costs),
        acquisition_notes: notes || null,
      });
      toast({ title: 'Dados de aquisição salvos', duration: 1000 });
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive', duration: 1000 });
    }
  };

  const totalInvested = (toNumber(value) || 0) + (toNumber(costs) || 0);


  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Aquisição
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="acq-value" className="text-sm">Valor de aquisição (R$)</Label>
            <CurrencyInput
              id="acq-value"
              value={value}
              onChange={setValue}
              placeholder="0,00"
              disabled={disabled}
              className="text-base"
            />

          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acq-date" className="text-sm">Data de aquisição</Label>
            <Input
              id="acq-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={disabled}
              className="text-base"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acq-costs" className="text-sm">Custos (ITBI, cartório, etc.) (R$)</Label>
            <CurrencyInput
              id="acq-costs"
              value={costs}
              onChange={setCosts}
              placeholder="0,00"
              disabled={disabled}
              className="text-base"
            />

          </div>
          <div className="space-y-1.5">
            <Label htmlFor="acq-notes" className="text-sm">Observações</Label>
            <Textarea
              id="acq-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escritura, financiamento, etc."
              rows={2}
              disabled={disabled}
              className="text-base"
            />
          </div>
        </div>

        {(toNumber(value) || toNumber(costs)) ? (
          <div className="text-sm text-muted-foreground">
            Valor total investido: <span className="font-semibold text-foreground">{fmtCurrency(totalInvested)}</span>
          </div>
        ) : null}

        {!disabled && (
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Salvar aquisição
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Market Value Block ───────────────────────────────────

function MarketValueBlock({
  assetType,
  assetId,
  currentMarketValue,
  disabled,
}: {
  assetType: AssetType;
  assetId: string;
  currentMarketValue?: number | null;
  disabled: boolean;
}) {
  const { toast } = useToast();
  const twelveMonthsAgo = format(subMonths(new Date(), 12), 'yyyy-MM-dd');
  const { data: history, isLoading } = useMarketValueHistory(assetType, assetId, twelveMonthsAgo);
  const recordMutation = useRecordMarketValue(assetType, assetId);
  const [showModal, setShowModal] = useState(false);

  // Modal state
  const [newValue, setNewValue] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [source, setSource] = useState('manual_appraisal');
  const [appraiserName, setAppraiserName] = useState('');
  const [note, setNote] = useState('');

  const resetModal = () => {
    setNewValue('');
    setEffectiveDate(format(new Date(), 'yyyy-MM-dd'));
    setSource('manual_appraisal');
    setAppraiserName('');
    setNote('');
    setShowModal(false);
  };

  const handleSubmit = async () => {
    const val = toNumber(newValue);
    if (!val || val <= 0) {
      toast({ title: 'Informe um valor válido', variant: 'destructive', duration: 1000 });
      return;
    }
    try {
      await recordMutation.mutateAsync({
        value: val,
        effective_date: effectiveDate,
        source,
        appraiser_name: source === 'third_party_appraisal' ? appraiserName : null,
        note: note || null,
      });
      toast({ title: 'Valor de mercado registrado', duration: 1000 });
      resetModal();
    } catch {
      toast({ title: 'Erro ao registrar', variant: 'destructive', duration: 1000 });
    }
  };

  const chartData = (history || []).map((h) => ({
    date: format(new Date(h.effective_date), 'MMM/yy', { locale: ptBR }),
    value: h.value,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Valor de Mercado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Valor atual</p>
            <p className="text-xl font-semibold">{fmtCurrency(currentMarketValue)}</p>
          </div>
          {!disabled && (
            <Button size="sm" variant="outline" onClick={() => setShowModal(true)}>
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Reavaliar valor
            </Button>
          )}
        </div>

        {chartData.length > 1 ? (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) =>
                    `${(v / 1000).toLocaleString('pt-BR')}k`
                  }
                />
                <Tooltip
                  formatter={(v: number) => [fmtCurrency(v), 'Valor']}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  className="stroke-primary"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : chartData.length === 1 ? (
          <p className="text-xs text-muted-foreground">
            Apenas 1 registro — o gráfico aparece com 2+ avaliações.
          </p>
        ) : !isLoading ? (
          <p className="text-xs text-muted-foreground">Nenhum histórico de avaliação registrado.</p>
        ) : null}

        {/* Revaluation modal */}
        <Dialog open={showModal} onOpenChange={setShowModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Reavaliar valor de mercado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Novo valor (R$) *</Label>
                <CurrencyInput
                  value={newValue}
                  onChange={setNewValue}
                  placeholder="0,00"
                  className="text-base"
                />

              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Data efetiva</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  onChange={(e) => setEffectiveDate(e.target.value)}
                  className="text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Origem</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_appraisal">Avaliação manual</SelectItem>
                    <SelectItem value="third_party_appraisal">Avaliação de terceiros</SelectItem>
                    <SelectItem value="market_data_import">Importação de dados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {source === 'third_party_appraisal' && (
                <div className="space-y-1.5">
                  <Label className="text-sm">Nome do avaliador</Label>
                  <Input
                    value={appraiserName}
                    onChange={(e) => setAppraiserName(e.target.value)}
                    placeholder="Nome ou empresa"
                    className="text-base"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-sm">Observação</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Opcional"
                  className="text-base"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={resetModal}>Cancelar</Button>
                <Button size="sm" onClick={handleSubmit} disabled={recordMutation.isPending}>
                  {recordMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  Registrar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

// ─── Improvements Block ───────────────────────────────────

function ImprovementsBlock({
  assetType,
  assetId,
  disabled,
}: {
  assetType: AssetType;
  assetId: string;
  disabled: boolean;
}) {
  const { toast } = useToast();
  const { data, isLoading } = useAssetImprovements(assetType, assetId);
  const createMutation = useCreateImprovement();
  const updateMutation = useUpdateImprovement();
  const deleteMutation = useDeleteImprovement();
  const { data: expenseTransactions = [] } = useUnitFinancialTransactions(assetType, assetId);
  const reconcileMutation = useReconcileImprovement();
  const [reconcileOpenFor, setReconcileOpenFor] = useState<string | null>(null);

  const findTransaction = (txId: string | null) =>
    txId ? expenseTransactions.find((t) => t.id === txId) : undefined;

  const handleReconcile = async (imp: Improvement, financialTransactionId: string | null) => {
    try {
      await reconcileMutation.mutateAsync({
        id: imp.id,
        assetType,
        assetId,
        financial_transaction_id: financialTransactionId,
      });
      toast({
        title: financialTransactionId ? 'Benfeitoria conciliada' : 'Vínculo removido',
        duration: 1000,
      });
      setReconcileOpenFor(null);
    } catch {
      toast({ title: 'Erro ao conciliar', variant: 'destructive', duration: 1000 });
    }
  };

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Improvement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Improvement | null>(null);

  // Form state
  const [improvementType, setImprovementType] = useState('reforma_geral');
  const [description, setDescription] = useState('');
  const [cost, setCost] = useState('');
  const [completedAt, setCompletedAt] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [affectsMarketValue, setAffectsMarketValue] = useState(true);

  const resetForm = () => {
    setImprovementType('reforma_geral');
    setDescription('');
    setCost('');
    setCompletedAt(format(new Date(), 'yyyy-MM-dd'));
    setAffectsMarketValue(true);
    setShowForm(false);
    setEditing(null);
  };

  const openEdit = (imp: Improvement) => {
    setEditing(imp);
    setImprovementType(imp.improvement_type);
    setDescription(imp.description);
    setCost(imp.cost.toString());
    setCompletedAt(imp.completed_at);
    setAffectsMarketValue(imp.affects_market_value);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    const costVal = toNumber(cost);
    if (!description.trim() || !costVal || costVal < 0) {
      toast({ title: 'Preencha descrição e custo', variant: 'destructive', duration: 1000 });
      return;
    }
    try {
      const payload = {
        assetType,
        assetId,
        improvement_type: improvementType,
        description: description.trim(),
        cost: costVal,
        completed_at: completedAt,
        affects_market_value: affectsMarketValue,
      };
      if (editing) {
        await updateMutation.mutateAsync({ ...payload, id: editing.id });
        toast({ title: 'Benfeitoria atualizada', duration: 1000 });
      } else {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Benfeitoria registrada', duration: 1000 });
      }
      resetForm();
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive', duration: 1000 });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteTarget.id, assetType, assetId });
      toast({ title: 'Benfeitoria excluída', duration: 1000 });
      setDeleteTarget(null);
    } catch {
      toast({ title: 'Erro ao excluir', variant: 'destructive', duration: 1000 });
    }
  };

  const items = data?.items || [];
  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Hammer className="h-4 w-4" />
            Benfeitorias e Reformas
          </CardTitle>
          {!disabled && (
            <Button size="sm" variant="outline" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1.5" />
              Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhuma benfeitoria registrada.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2 pr-3 font-medium">Data</th>
                  <th className="pb-2 pr-3 font-medium">Tipo</th>
                  <th className="pb-2 pr-3 font-medium hidden sm:table-cell">Descrição</th>
                  <th className="pb-2 pr-3 font-medium text-right">Custo</th>
                  <th className="pb-2 pr-3 font-medium text-center hidden sm:table-cell">Afeta VM?</th>
                  <th className="pb-2 pr-3 font-medium hidden md:table-cell">Conciliação</th>
                  {!disabled && <th className="pb-2 font-medium text-right">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((imp) => (
                  <tr key={imp.id} className="border-b last:border-0">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {format(new Date(imp.completed_at), 'dd/MM/yy')}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant="secondary" className="text-xs font-normal">
                        {IMPROVEMENT_TYPE_LABELS[imp.improvement_type] || imp.improvement_type}
                      </Badge>
                      {/* Status de conciliação no mobile (coluna dedicada fica oculta) */}
                      <div className="md:hidden mt-1">
                        {imp.financial_transaction_id ? (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                          >
                            Conciliado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                            Não conciliado
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3 hidden sm:table-cell max-w-[200px] truncate">
                      {imp.description}
                    </td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap font-medium">
                      {fmtCurrency(imp.cost)}
                    </td>
                    <td className="py-2 pr-3 text-center hidden sm:table-cell">
                      {imp.affects_market_value ? '✓' : '—'}
                    </td>
                    <td className="py-2 pr-3 hidden md:table-cell">
                      {imp.financial_transaction_id ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Badge
                            variant="outline"
                            className="text-xs font-normal border-emerald-500/40 text-emerald-600 bg-emerald-500/10 whitespace-nowrap"
                          >
                            Conciliado
                          </Badge>
                          <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                            {findTransaction(imp.financial_transaction_id)?.description || 'Lançamento vinculado'}
                          </span>
                          {!disabled && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground"
                              title="Desvincular"
                              onClick={() => handleReconcile(imp, null)}
                            >
                              <Link2Off className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-xs font-normal text-muted-foreground whitespace-nowrap">
                            Não conciliado
                          </Badge>
                          {!disabled && (
                            expenseTransactions.length === 0 ? (
                              <UITooltipProvider>
                                <UITooltip>
                                  <UITooltipTrigger asChild>
                                    <span>
                                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" disabled>
                                        <Link2 className="h-3.5 w-3.5 mr-1" />
                                        Conciliar
                                      </Button>
                                    </span>
                                  </UITooltipTrigger>
                                  <UITooltipContent>
                                    Nenhum lançamento de despesa encontrado para este imóvel em Financeiro &gt; Lançamentos
                                  </UITooltipContent>
                                </UITooltip>
                              </UITooltipProvider>
                            ) : (
                              <Popover
                                open={reconcileOpenFor === imp.id}
                                onOpenChange={(o) => setReconcileOpenFor(o ? imp.id : null)}
                              >
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                                    <Link2 className="h-3.5 w-3.5 mr-1" />
                                    Conciliar
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-80 p-0">
                                  <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
                                    Lançamentos de despesa deste imóvel
                                  </div>
                                  <div className="max-h-64 overflow-y-auto">
                                    {expenseTransactions.map((tx) => (
                                      <button
                                        key={tx.id}
                                        type="button"
                                        className="w-full text-left px-3 py-2 hover:bg-muted/60 transition-colors"
                                        onClick={() => handleReconcile(imp, tx.id)}
                                      >
                                        <div className="text-sm truncate">{tx.description || 'Sem descrição'}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {fmtCurrency(tx.amount)} ·{' '}
                                          {format(new Date(tx.transaction_date), 'dd/MM/yyyy')}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            )
                          )}
                        </div>
                      )}
                    </td>
                    {!disabled && (
                      <td className="py-2 text-right whitespace-nowrap">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(imp)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(imp)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {items.length > 0 && (
          <div className="text-sm text-muted-foreground pt-1">
            Total investido em benfeitorias:{' '}
            <span className="font-semibold text-foreground">{fmtCurrency(data?.totalCost || 0)}</span>
          </div>
        )}

        {/* Add/Edit modal */}
        <Dialog open={showForm} onOpenChange={(o) => { if (!o) resetForm(); }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar benfeitoria' : 'Nova benfeitoria'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm">Tipo *</Label>
                <Select value={improvementType} onValueChange={setImprovementType}>
                  <SelectTrigger className="text-base">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(IMPROVEMENT_TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Descrição *</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Descreva a benfeitoria"
                  className="text-base"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">Custo (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    placeholder="0,00"
                    className="text-base"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">Data de conclusão *</Label>
                  <Input
                    type="date"
                    value={completedAt}
                    onChange={(e) => setCompletedAt(e.target.value)}
                    className="text-base"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="affects-mv"
                  checked={affectsMarketValue}
                  onCheckedChange={(c) => setAffectsMarketValue(c === true)}
                />
                <Label htmlFor="affects-mv" className="text-sm cursor-pointer">
                  Esta benfeitoria afeta o valor de mercado
                </Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={resetForm}>Cancelar</Button>
                <Button size="sm" onClick={handleSubmit} disabled={isMutating}>
                  {isMutating && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  {editing ? 'Salvar' : 'Registrar'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir benfeitoria</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta benfeitoria? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleteMutation.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
