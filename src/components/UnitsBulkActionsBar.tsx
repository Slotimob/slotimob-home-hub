import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download, Tag, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useBulkActionGate, type BulkGateInput } from '@/hooks/useBulkActionGate';
import { RequestApprovalDialog } from '@/components/approvals/RequestApprovalDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import Papa from 'papaparse';
import { createWorkbook, addJsonSheet, downloadWorkbook } from '@/utils/excelUtils';
import type { Database } from '@/integrations/supabase/types';
import { UNIT_STATUS_STYLES, ALL_UNIT_STATUSES, getStatusLabel } from '@/utils/uiConstants';

type UnitStatus = Database['public']['Enums']['unit_status'];

interface Unit {
  id: string;
  unit_number: string;
  status: UnitStatus;
  price: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  condo_fee: number | null;
  property?: {
    id: string;
    name: string;
  };
}

interface UnitsBulkActionsBarProps {
  selectedUnits: Unit[];
  onClearSelection: () => void;
  onSuccess: () => void;
}

// Export-specific lowercase labels (for file exports)
const STATUS_EXPORT_LABELS: Record<string, string> = {
  available: 'disponivel',
  reserved: 'reservado',
  rented: 'alugado',
  sold: 'vendido',
};

export const UnitsBulkActionsBar = ({
  selectedUnits,
  onClearSelection,
  onSuccess,
}: UnitsBulkActionsBarProps) => {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const gate = useBulkActionGate();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [pendingGateInput, setPendingGateInput] = useState<BulkGateInput | null>(null);
  const [pendingThreshold, setPendingThreshold] = useState(0);

  const handleChangeStatus = async (newStatus: UnitStatus) => {
    const ids = selectedUnits.map((u) => u.id);
    const gateInput: BulkGateInput = { actionType: 'bulk_status_change', itemCount: ids.length, targetTable: 'units', targetIds: ids };
    const r = await gate.check(gateInput);
    if (!r.canProceed) {
      setPendingGateInput(gateInput);
      setPendingThreshold(r.thresholdValue ?? 0);
      setApprovalDialogOpen(true);
      return;
    }
    try {
      const { error } = await supabase
        .from('units')
        .update({ status: newStatus })
        .in('id', ids);

      if (error) throw error;

      toast({
        title: 'Status atualizado!',
        description: `${selectedUnits.length} unidade${selectedUnits.length > 1 ? 's foram atualizadas' : ' foi atualizada'} para "${getStatusLabel(newStatus)}".`,
      });

      onClearSelection();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar status',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const prepareExportData = () => {
    return selectedUnits.map((unit) => ({
      numero_unidade: unit.unit_number,
      empreendimento: unit.property?.name || '',
      status: STATUS_EXPORT_LABELS[unit.status] || unit.status,
      preco: unit.price?.toFixed(2) || '',
      area_m2: unit.area?.toFixed(2) || '',
      quartos: unit.bedrooms?.toString() || '',
      banheiros: unit.bathrooms?.toString() || '',
      condominio: unit.condo_fee?.toFixed(2) || '',
    }));
  };

  const exportToCSV = () => {
    const data = prepareExportData();
    const csv = Papa.unparse(data, {
      delimiter: ',',
      header: true,
    });

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const fileName = `unidades_selecionadas_${new Date().toISOString().split('T')[0]}.csv`;
    link.download = fileName;
    link.click();

    toast({
      title: 'Unidades exportadas!',
      description: `${selectedUnits.length} unidade${selectedUnits.length > 1 ? 's foram exportadas' : ' foi exportada'} para CSV.`,
    });
  };

  const exportToExcel = async () => {
    const data = prepareExportData();
    
    const workbook = createWorkbook();
    addJsonSheet(workbook, data, 'Unidades', {
      columnWidths: [20, 25, 12, 15, 12, 10, 12, 15],
    });
    
    const fileName = `unidades_selecionadas_${new Date().toISOString().split('T')[0]}.xlsx`;
    await downloadWorkbook(workbook, fileName);

    toast({
      title: 'Unidades exportadas!',
      description: `${selectedUnits.length} unidade${selectedUnits.length > 1 ? 's foram exportadas' : ' foi exportada'} para Excel.`,
    });
  };

  const handleBulkDelete = async () => {
    try {
      setIsDeleting(true);
      const ids = selectedUnits.map((u) => u.id);
      
      // Check if any units are referenced in deals
      const { data: linkedDeals, error: dealsError } = await supabase
        .from('deals')
        .select('id')
        .in('unit_id', ids)
        .limit(1);

      if (dealsError) throw dealsError;

      if (linkedDeals && linkedDeals.length > 0) {
        toast({
          title: 'Não é possível excluir',
          description: 'Algumas unidades estão vinculadas a negócios. Remova os vínculos primeiro.',
          variant: 'destructive',
        });
        return;
      }

      // Check if any units are referenced in visits
      const { data: linkedVisits, error: visitsError } = await supabase
        .from('visits')
        .select('id')
        .in('unit_id', ids)
        .limit(1);

      if (visitsError) throw visitsError;

      if (linkedVisits && linkedVisits.length > 0) {
        toast({
          title: 'Não é possível excluir',
          description: 'Algumas unidades estão vinculadas a visitas. Remova os vínculos primeiro.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('units')
        .delete()
        .in('id', ids);

      if (error) throw error;

      toast({
        title: 'Unidades excluídas!',
        description: `${selectedUnits.length} unidade${selectedUnits.length > 1 ? 's foram excluídas' : ' foi excluída'} com sucesso.`,
      });

      setShowDeleteDialog(false);
      onClearSelection();
      onSuccess();
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir unidades',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedUnits.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 transform">
      <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
        <span className="text-sm font-medium">
          {selectedUnits.length} {selectedUnits.length === 1 ? 'unidade selecionada' : 'unidades selecionadas'}
        </span>
        
        <div className="h-4 w-px bg-border" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Tag className="mr-2 h-4 w-4" />
              Alterar Status
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            {ALL_UNIT_STATUSES.map((status) => (
              <DropdownMenuItem key={status} onClick={() => handleChangeStatus(status)}>
                {getStatusLabel(status)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={exportToCSV}>
              Exportar como CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={exportToExcel}>
              Exportar como Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          variant="destructive" 
          size="sm" 
          onClick={async () => {
            const ids = selectedUnits.map((u) => u.id);
            const gateInput: BulkGateInput = { actionType: 'bulk_delete', itemCount: ids.length, targetTable: 'units', targetIds: ids };
            const r = await gate.check(gateInput);
            if (!r.canProceed) {
              setPendingGateInput(gateInput);
              setPendingThreshold(r.thresholdValue ?? 0);
              setApprovalDialogOpen(true);
              return;
            }
            setShowDeleteDialog(true);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Excluir
        </Button>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir{' '}
              <span className="font-semibold text-foreground">
                {selectedUnits.length} unidade{selectedUnits.length > 1 ? 's' : ''}
              </span>
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
