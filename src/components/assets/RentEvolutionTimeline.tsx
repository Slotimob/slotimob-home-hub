import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { cn } from "@/lib/utils";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  TrendingUp,
  Trash2,
  Loader2,
  History,
  AlertTriangle,
  ChevronDown,
  Pencil,
} from "lucide-react";
import {
  useLeaseAdjustments,
  useDeleteLeaseAdjustment,
  useUpdateLeaseAdjustment,
  type LeaseAdjustment,
} from "@/hooks/useLeaseAdjustments";

interface RentEvolutionTimelineProps {
  leaseId: string | null;
  startDate: string;
  initialRent: number;
  currentRent: number;
}

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const INDEX_OPTIONS = ["IGPM", "IPCA", "INPC", "Fixo"];

export function RentEvolutionTimeline({
  leaseId,
  startDate,
  initialRent,
  currentRent,
}: RentEvolutionTimelineProps) {
  const { data: adjustments, isLoading } = useLeaseAdjustments(leaseId);
  const deleteAdjustment = useDeleteLeaseAdjustment();
  const updateAdjustment = useUpdateLeaseAdjustment();
  const [deleteConfirm, setDeleteConfirm] = useState<LeaseAdjustment | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<{ adj: LeaseAdjustment; isLatest: boolean } | null>(
    null
  );

  // Form state do dialog de edição
  const [formDate, setFormDate] = useState("");
  const [formIndex, setFormIndex] = useState("IGPM");
  const [formPercentage, setFormPercentage] = useState("");
  const [formPrevious, setFormPrevious] = useState(0);
  const [formNew, setFormNew] = useState(0);
  const [formNotes, setFormNotes] = useState("");

  useEffect(() => {
    if (!editing) return;
    const { adj } = editing;
    setFormDate(adj.adjustment_date);
    setFormIndex(adj.index_used || "IGPM");
    setFormPercentage(adj.index_percentage != null ? String(adj.index_percentage) : "");
    setFormPrevious(adj.previous_value);
    setFormNew(adj.new_value);
    setFormNotes(adj.notes || "");
  }, [editing]);

  // Calculate total increase percentage
  const totalIncreasePercent =
    initialRent > 0 ? ((currentRent - initialRent) / initialRent) * 100 : 0;

  const firstValue = adjustments?.length
    ? adjustments[adjustments.length - 1]?.previous_value || initialRent
    : initialRent;

  const confirmDelete = async () => {
    if (!deleteConfirm || !leaseId) return;

    await deleteAdjustment.mutateAsync({
      adjustmentId: deleteConfirm.id,
      leaseId,
      previousValue: deleteConfirm.previous_value,
    });

    setDeleteConfirm(null);
  };

  const handleSaveEdit = async () => {
    if (!editing || !leaseId) return;
    const { adj, isLatest } = editing;

    await updateAdjustment.mutateAsync({
      adjustmentId: adj.id,
      leaseId,
      isLatest,
      previousAdjustmentDate: adj.adjustment_date,
      values: isLatest
        ? {
            adjustment_date: formDate,
            index_used: formIndex,
            index_percentage: formPercentage === "" ? null : parseFloat(formPercentage),
            previous_value: formPrevious,
            new_value: formNew,
            notes: formNotes || null,
          }
        : { notes: formNotes || null },
    });

    setEditing(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasHistory = adjustments && adjustments.length > 0;

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <span className="font-semibold">Evolução do Aluguel</span>
          </div>
          {totalIncreasePercent > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              +{totalIncreasePercent.toFixed(1)}% no período
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-xs text-muted-foreground">Valor Inicial</p>
            <p className="text-lg font-bold">{formatCurrency(firstValue)}</p>
            <p className="text-[10px] text-muted-foreground">
              {format(parseISO(startDate), "dd/MM/yyyy")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Valor Atual</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(currentRent)}</p>
            <p className="text-[10px] text-muted-foreground">Hoje</p>
          </div>
        </div>

        {totalIncreasePercent > 0 && (
          <div className="space-y-1">
            <Progress value={Math.min(totalIncreasePercent, 100)} className="h-2" />
            <p className="text-[10px] text-muted-foreground text-center">
              Aumento acumulado: {formatCurrency(currentRent - firstValue)}
            </p>
          </div>
        )}
      </Card>

      {/* Histórico de reajustes (colapsado por padrão) */}
      {hasHistory ? (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <div className="flex flex-row items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <History className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Histórico de Reajustes</span>
                  <Badge variant="secondary">{adjustments.length}</Badge>
                </div>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <Separator />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Índice</TableHead>
                      <TableHead className="text-xs text-right">De</TableHead>
                      <TableHead className="text-xs text-right">Para</TableHead>
                      <TableHead className="text-xs text-right">Var%</TableHead>
                      <TableHead className="text-xs">Notas</TableHead>
                      <TableHead className="text-xs text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((adj, index) => {
                      const isLatest = index === 0;
                      const percentChange =
                        adj.previous_value > 0
                          ? ((adj.new_value - adj.previous_value) / adj.previous_value) * 100
                          : 0;

                      return (
                        <TableRow key={adj.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(parseISO(adj.adjustment_date), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px]">
                              {adj.index_used}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-muted-foreground">
                            {formatCurrency(adj.previous_value)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums font-medium">
                            {formatCurrency(adj.new_value)}
                          </TableCell>
                          <TableCell className="text-xs text-right tabular-nums text-primary">
                            {percentChange >= 0 ? "+" : ""}
                            {percentChange.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-xs max-w-[180px] truncate text-muted-foreground">
                            {adj.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditing({ adj, isLatest })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {isLatest && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteConfirm(adj)}
                                  disabled={deleteAdjustment.isPending}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="bg-muted/30">
                      <TableCell className="text-xs whitespace-nowrap">
                        {format(parseISO(startDate), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground" colSpan={2}>
                        Início do Contrato
                      </TableCell>
                      <TableCell className="text-xs text-right tabular-nums">
                        {formatCurrency(firstValue)}
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ) : (
        <Card className="p-6 text-center border-dashed">
          <History className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum reajuste registrado ainda.</p>
          <p className="text-xs text-muted-foreground mt-1">
            Os reajustes aplicados aparecerão aqui automaticamente.
          </p>
        </Card>
      )}

      {/* Dialog de edição */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editing?.isLatest ? "Editar Reajuste" : "Editar Observações"}
            </DialogTitle>
            <DialogDescription>
              {editing?.isLatest
                ? "Este é o reajuste mais recente: alterar valores atualiza o aluguel vigente e as parcelas pendentes."
                : "Reajustes anteriores são histórico consolidado — apenas as observações podem ser alteradas."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {editing?.isLatest && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data do Reajuste</Label>
                    <Input
                      type="date"
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Índice</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={formIndex}
                      onChange={(e) => setFormIndex(e.target.value)}
                    >
                      {INDEX_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Valor Anterior</Label>
                    <CurrencyInput value={formPrevious} onChange={setFormPrevious} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Novo Valor</Label>
                    <CurrencyInput value={formNew} onChange={setFormNew} />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Percentual Aplicado (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formPercentage}
                    onChange={(e) => setFormPercentage(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={formNotes}
                onChange={(e) => setFormNotes(e.target.value)}
                rows={3}
                placeholder="Observações sobre este reajuste..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateAdjustment.isPending}>
              {updateAdjustment.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Reajuste?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              Esta ação irá reverter o valor do aluguel para{" "}
              <strong>{formatCurrency(deleteConfirm?.previous_value || 0)}</strong>. Todas as
              parcelas futuras pendentes também serão atualizadas para o valor anterior.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteAdjustment.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAdjustment.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Excluir e Reverter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
