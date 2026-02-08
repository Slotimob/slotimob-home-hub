import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { History, FileSpreadsheet, Calendar, Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ImportHistoryDialogProps {
  propertyId?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ImportRecord {
  id: string;
  file_name: string;
  file_type: string;
  units_imported: number;
  imported_at: string;
}

export const ImportHistoryDialog = ({ propertyId, open, onOpenChange }: ImportHistoryDialogProps) => {
  const { toast } = useToast();
  const [history, setHistory] = useState<ImportRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadHistory();
    }
  }, [open, propertyId]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('import_history')
        .select('*')
        .order('imported_at', { ascending: false });

      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      setHistory(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar histórico',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getFileTypeLabel = (fileType: string) => {
    const types: Record<string, string> = {
      'csv': 'CSV',
      'xlsx': 'Excel',
      'xls': 'Excel',
    };
    return types[fileType.toLowerCase()] || fileType.toUpperCase();
  };

  const getFileTypeColor = (fileType: string): 'default' | 'secondary' | 'outline' => {
    const colors: Record<string, 'default' | 'secondary' | 'outline'> = {
      'csv': 'default',
      'xlsx': 'secondary',
      'xls': 'secondary',
    };
    return colors[fileType.toLowerCase()] || 'outline';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Importações
          </DialogTitle>
          <DialogDescription>
            Visualize todas as importações de unidades realizadas neste empreendimento
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">Carregando histórico...</p>
            </div>
          ) : history.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma importação realizada</h3>
                <p className="text-sm text-muted-foreground text-center">
                  O histórico aparecerá aqui após você importar unidades
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {history.map((record) => (
                <Card key={record.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                          <FileSpreadsheet className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm truncate">{record.file_name}</h4>
                            <Badge variant={getFileTypeColor(record.file_type)} className="text-xs">
                              {getFileTypeLabel(record.file_type)}
                            </Badge>
                          </div>
                          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <Package className="h-3.5 w-3.5" />
                              <span>
                                {record.units_imported} unidade{record.units_imported !== 1 ? 's' : ''} importada
                                {record.units_imported !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5" />
                              <span>
                                {format(new Date(record.imported_at), "d 'de' MMMM 'de' yyyy 'às' HH:mm", {
                                  locale: ptBR,
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {history.length > 0 && (
          <div className="pt-4 border-t text-sm text-muted-foreground">
            Total: {history.reduce((acc, record) => acc + record.units_imported, 0)} unidades importadas em{' '}
            {history.length} importaç{history.length === 1 ? 'ão' : 'ões'}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};