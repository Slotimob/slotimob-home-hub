import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import Papa from 'papaparse';
import { createWorkbook, addJsonSheet, addAoaSheet, downloadWorkbook, readExcelFile } from '@/utils/excelUtils';

interface ContactsImportExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: 'owners' | 'leads' | 'companies';
  owners: any[];
  leads: any[];
  companies: any[];
  onSuccess: () => void;
}

const OWNER_FIELDS = ['name', 'email', 'phone', 'cpf_cnpj', 'address', 'city', 'state', 'notes'];
const LEAD_FIELDS = ['name', 'email', 'phone', 'origin', 'campaign_name', 'budget_min', 'budget_max', 'notes'];
const COMPANY_FIELDS = ['name', 'cnpj', 'email', 'phone', 'contact_person', 'address', 'city', 'state', 'website', 'notes'];

const FIELD_LABELS: Record<string, string> = {
  name: 'Nome',
  email: 'E-mail',
  phone: 'Telefone',
  cpf_cnpj: 'CPF/CNPJ',
  cnpj: 'CNPJ',
  address: 'Endereço',
  city: 'Cidade',
  state: 'Estado',
  notes: 'Observações',
  origin: 'Origem',
  campaign_name: 'Campanha',
  budget_min: 'Orçamento Mín.',
  budget_max: 'Orçamento Máx.',
  contact_person: 'Pessoa de Contato',
  website: 'Website',
};

export const ContactsImportExportDialog = ({
  open,
  onOpenChange,
  activeTab,
  owners,
  leads,
  companies,
  onSuccess
}: ContactsImportExportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; errors: number } | null>(null);

  const getFieldsForTab = () => {
    switch (activeTab) {
      case 'owners': return OWNER_FIELDS;
      case 'leads': return LEAD_FIELDS;
      case 'companies': return COMPANY_FIELDS;
    }
  };

  const getDataForTab = () => {
    switch (activeTab) {
      case 'owners': return owners;
      case 'leads': return leads;
      case 'companies': return companies;
    }
  };

  const getTableForTab = () => {
    switch (activeTab) {
      case 'owners': return 'owners';
      case 'leads': return 'leads';
      case 'companies': return 'companies';
    }
  };

  const getTabLabel = () => {
    switch (activeTab) {
      case 'owners': return 'Proprietários';
      case 'leads': return 'Leads';
      case 'companies': return 'Empresas';
    }
  };

  const exportToCSV = () => {
    const fields = getFieldsForTab();
    const data = getDataForTab();
    const headers = fields.map(f => FIELD_LABELS[f] || f);
    
    const rows = data.map(item => 
      fields.map(field => {
        const value = item[field];
        if (value === null || value === undefined) return '';
        return String(value);
      })
    );

    const csv = Papa.unparse({
      fields: headers,
      data: rows
    });

    downloadFile(csv, `${activeTab}_export.csv`, 'text/csv;charset=utf-8;');
    toast({ title: 'Exportação concluída', description: `${data.length} registros exportados para CSV.` });
  };

  const exportToExcel = async () => {
    const fields = getFieldsForTab();
    const data = getDataForTab();
    const headers = fields.map(f => FIELD_LABELS[f] || f);
    
    const rows = data.map(item => {
      const row: Record<string, any> = {};
      fields.forEach((field, index) => {
        row[headers[index]] = item[field] ?? '';
      });
      return row;
    });

    const workbook = createWorkbook();
    addJsonSheet(workbook, rows, getTabLabel());
    await downloadWorkbook(workbook, `${activeTab}_export.xlsx`);
    
    toast({ title: 'Exportação concluída', description: `${data.length} registros exportados para Excel.` });
  };

  const downloadTemplate = async (format: 'csv' | 'xlsx') => {
    const fields = getFieldsForTab();
    const headers = fields.map(f => FIELD_LABELS[f] || f);

    if (format === 'csv') {
      const csv = headers.join(',');
      downloadFile(csv, `template_${activeTab}.csv`, 'text/csv;charset=utf-8;');
    } else {
      const workbook = createWorkbook();
      addAoaSheet(workbook, [headers], 'Template');
      await downloadWorkbook(workbook, `template_${activeTab}.xlsx`);
    }
    
    toast({ title: 'Template baixado', description: 'Preencha o arquivo e importe de volta.' });
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      let parsedData: any[] = [];

      if (fileExtension === 'csv') {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        parsedData = result.data;
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        parsedData = await readExcelFile(file);
      } else {
        throw new Error('Formato não suportado. Use CSV ou Excel.');
      }

      if (parsedData.length === 0) {
        throw new Error('Arquivo vazio ou sem dados válidos.');
      }

      // Map headers to field names
      const fields = getFieldsForTab();
      const headerMap: Record<string, string> = {};
      fields.forEach(field => {
        headerMap[FIELD_LABELS[field]?.toLowerCase() || field.toLowerCase()] = field;
        headerMap[field.toLowerCase()] = field;
      });

      const table = getTableForTab();
      let successCount = 0;
      let errorCount = 0;

      for (const row of parsedData) {
        const record: Record<string, any> = { broker_id: effectiveBrokerId };
        
        for (const [key, value] of Object.entries(row)) {
          const fieldName = headerMap[key.toLowerCase()];
          if (fieldName && value !== undefined && value !== '') {
            if ((fieldName === 'budget_min' || fieldName === 'budget_max') && typeof value === 'string') {
              record[fieldName] = parseFloat(value.replace(/[^\d.,]/g, '').replace(',', '.')) || null;
            } else {
              record[fieldName] = value;
            }
          }
        }

        if (!record.name) {
          errorCount++;
          continue;
        }

        const { error } = await supabase.from(table).insert([record as any]);
        if (error) {
          errorCount++;
        } else {
          successCount++;
        }
      }

      setImportResult({ success: successCount, errors: errorCount });
      
      if (successCount > 0) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Erro na importação',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar / Exportar {getTabLabel()}</DialogTitle>
          <DialogDescription>
            Exporte seus contatos ou importe de arquivos CSV/Excel.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="export" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="export" className="flex-1 gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </TabsTrigger>
            <TabsTrigger value="import" className="flex-1 gap-2">
              <Upload className="h-4 w-4" />
              Importar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="export" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Exportar {getDataForTab().length} {activeTab === 'leads' ? 'leads' : activeTab === 'owners' ? 'proprietários' : 'empresas'}.
            </p>
            <div className="flex flex-col gap-2">
              <Button onClick={exportToCSV} variant="outline" className="justify-start gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Exportar para CSV
              </Button>
              <Button onClick={exportToExcel} variant="outline" className="justify-start gap-2">
                <FileSpreadsheet className="h-4 w-4" />
                Exportar para Excel (.xlsx)
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Baixe o template, preencha com seus dados e importe.
              </p>
              <div className="flex gap-2">
                <Button onClick={() => downloadTemplate('csv')} variant="outline" size="sm">
                  Template CSV
                </Button>
                <Button onClick={() => downloadTemplate('xlsx')} variant="outline" size="sm">
                  Template Excel
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="w-full gap-2"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? 'Importando...' : 'Selecionar arquivo para importar'}
              </Button>
            </div>

            {importResult && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                {importResult.errors === 0 ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                )}
                <div className="text-sm">
                  <p>{importResult.success} registros importados com sucesso.</p>
                  {importResult.errors > 0 && (
                    <p className="text-muted-foreground">{importResult.errors} registros com erro (nome obrigatório).</p>
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
