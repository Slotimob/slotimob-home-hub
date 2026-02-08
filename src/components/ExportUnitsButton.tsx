import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import { createWorkbook, addJsonSheet, downloadWorkbook } from '@/utils/excelUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Unit {
  unit_number: string;
  status: string;
  price: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  condo_fee: number | null;
}

interface ExportUnitsButtonProps {
  units: Unit[];
  propertyName: string;
}

const STATUS_LABELS: Record<string, string> = {
  available: 'disponivel',
  reserved: 'reservado',
  rented: 'alugado',
  sold: 'vendido',
};

export const ExportUnitsButton = ({ units, propertyName }: ExportUnitsButtonProps) => {
  const { toast } = useToast();

  const prepareExportData = () => {
    return units.map((unit) => ({
      numero_unidade: unit.unit_number,
      status: STATUS_LABELS[unit.status] || unit.status,
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
    const fileName = `unidades_${propertyName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    link.download = fileName;
    link.click();

    toast({
      title: 'Unidades exportadas!',
      description: `${units.length} unidade${units.length > 1 ? 's foram exportadas' : ' foi exportada'} para CSV.`,
    });
  };

  const exportToExcel = async () => {
    const data = prepareExportData();
    
    const workbook = createWorkbook();
    addJsonSheet(workbook, data, 'Unidades', {
      columnWidths: [20, 12, 15, 12, 10, 12, 15],
    });
    
    const fileName = `unidades_${propertyName.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
    await downloadWorkbook(workbook, fileName);

    toast({
      title: 'Unidades exportadas!',
      description: `${units.length} unidade${units.length > 1 ? 's foram exportadas' : ' foi exportada'} para Excel.`,
    });
  };

  if (units.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-8 w-8 sm:h-9 sm:w-9 lg:h-9 lg:w-auto lg:px-3">
          <Download className="h-4 w-4" />
          <span className="hidden lg:inline lg:ml-2">Exportar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV}>
          Exportar como CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel}>
          Exportar como Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
