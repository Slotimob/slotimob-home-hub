import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useProposals, type Proposal } from '@/hooks/useProposals';
import { CreateProposalSheet } from '@/components/proposals/CreateProposalSheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  FileText, Plus, Calculator, User, Building2, Clock, Pencil, Send, Trash2,
  Eye, Copy, Search, Loader2, Download, CheckCircle2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';


const formatBRL = (v: number | null | undefined) =>
  typeof v === 'number'
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
    : '—';

// Extrai o caminho dentro do bucket 'proposals' a partir da signed URL
function extractProposalStoragePath(pdfUrl: string): string | null {
  try {
    const match = pdfUrl.match(/\/sign\/proposals\/([^?]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

type StatusKey = 'draft' | 'sent' | 'viewed' | 'expired';

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  draft: {
    label: 'Rascunho',
    className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
    icon: Clock,
  },
  sent: {
    label: 'Enviada',
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900',
    icon: Send,
  },
  viewed: {
    label: 'Visualizada',
    className: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900',
    icon: Eye,
  },
  expired: {
    label: 'Expirada',
    className: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900',
    icon: Clock,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] || statusConfig.draft;
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${cfg.className}`}
    >
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

export default function Proposals() {
  const { proposals, isLoading, updateProposalStatus, deleteProposal } = useProposals();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [duplicatingProposal, setDuplicatingProposal] = useState<Proposal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pdfDownloading, setPdfDownloading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();


  const preSelectedUnitId = searchParams.get('unitId') || undefined;

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setSheetOpen(true);
    }
  }, []);

  const handleSheetClose = (open: boolean) => {
    setSheetOpen(open);
    if (!open) {
      setEditingProposal(null);
      setDuplicatingProposal(null);
      setSearchParams({}, { replace: true });
    }
  };

  const handleEdit = (proposal: Proposal) => {
    setDuplicatingProposal(null);
    setEditingProposal(proposal);
    setSheetOpen(true);
  };

  const handleDuplicate = (proposal: Proposal) => {
    setEditingProposal(null);
    setDuplicatingProposal(proposal);
    setSheetOpen(true);
    toast({ title: 'Proposta duplicada', description: 'Edite e gere a nova versão.' });
  };

  const handleToggleStatus = (proposal: Proposal) => {
    const newStatus = proposal.status === 'sent' ? 'draft' : 'sent';
    updateProposalStatus.mutate(
      { id: proposal.id, status: newStatus },
      {
        onSuccess: () => {
          toast({
            title: newStatus === 'sent' ? 'Proposta marcada como enviada' : 'Proposta revertida para rascunho',
          });
        },
      }
    );
  };

  const handleDownloadPdf = async (proposal: Proposal) => {
    if (!proposal.pdf_url) {
      toast({ title: 'PDF não disponível', description: 'Esta proposta ainda não tem PDF gerado.', variant: 'destructive' });
      return;
    }

    const storagePath = extractProposalStoragePath(proposal.pdf_url);
    if (!storagePath) {
      window.open(proposal.pdf_url, '_blank', 'noopener,noreferrer');
      return;
    }

    setPdfDownloading(proposal.id);
    try {
      const { data, error } = await supabase.storage
        .from('proposals')
        .download(storagePath);

      if (error || !data) throw error ?? new Error('Download falhou');

      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = blobUrl;
      const filename = storagePath.split('/').pop() || 'proposta.pdf';
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 10_000);

      toast({ title: 'PDF baixado', description: 'Verifique sua pasta de downloads.' });
    } catch (err) {
      console.error('Erro ao baixar PDF:', err);
      toast({
        title: 'Erro ao baixar PDF',
        description: 'Não foi possível baixar o arquivo. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setPdfDownloading(null);
    }
  };


  const propertyLabel = (p: Proposal) =>
    p.property?.name
      ? `${p.property.name} - ${p.unit?.unit_number || ''}`
      : p.unit?.unit_number || 'Imóvel removido';

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return proposals.filter((p) => {
      if (statusFilter !== 'all' && (p.status || 'draft') !== statusFilter) return false;
      if (!term) return true;
      const hay = `${propertyLabel(p)} ${p.lead_name || ''}`.toLowerCase();
      return hay.includes(term);
    });
  }, [proposals, searchTerm, statusFilter]);

  const draftCount = proposals.filter((p) => p.status === 'draft' || !p.status).length;
  const sentCount = proposals.filter((p) => p.status === 'sent').length;
  const financingCount = proposals.filter((p) => p.include_financing).length;

  return (
    <TooltipProvider delayDuration={150}>
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-background">
          <AppSidebar />
          <main className="flex-1 p-4 md:p-6 pb-24 lg:pb-6 overflow-auto">
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="h-6 w-6 text-primary" />
                    Propostas Comerciais
                  </h1>
                  <p className="text-muted-foreground text-sm mt-1">
                    Gere e gerencie propostas premium para seus clientes.
                  </p>
                </div>
                <Button onClick={() => { setEditingProposal(null); setDuplicatingProposal(null); setSheetOpen(true); }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nova Proposta
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={FileText} value={proposals.length} label="Total" tone="primary" />
                <StatCard icon={Send} value={sentCount} label="Enviadas" tone="green" />
                <StatCard icon={Clock} value={draftCount} label="Rascunhos" tone="amber" />
                <StatCard icon={Calculator} value={financingCount} label="Com Financiamento" tone="blue" />
              </div>

              {/* Table / Cards */}
              <Card>
                <div className="px-6 pt-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por imóvel ou cliente..."
                      className="pl-9"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="sm:w-52">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                      <SelectItem value="sent">Enviada</SelectItem>
                      <SelectItem value="viewed">Visualizada</SelectItem>
                      <SelectItem value="expired">Expirada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <CardHeader>
                  <CardTitle className="text-base">Histórico de Propostas</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Clock className="h-5 w-5 animate-spin mr-2" />
                      Carregando...
                    </div>
                  ) : proposals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium">Nenhuma proposta ainda</h3>
                      <p className="text-sm text-muted-foreground mt-1 mb-4">
                        Crie sua primeira proposta comercial premium.
                      </p>
                      <Button onClick={() => setSheetOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Proposta
                      </Button>
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-sm text-muted-foreground">
                      Nenhuma proposta encontrada com os filtros aplicados.
                    </div>
                  ) : (
                    <>
                      {/* MOBILE — cards */}
                      <div className="md:hidden space-y-3">
                        {filtered.map((proposal) => (
                          <div key={proposal.id} className="border rounded-lg p-4 space-y-2">
                            <div className="flex justify-between items-start gap-2">
                              <button
                                className="font-medium text-sm text-left hover:underline cursor-pointer"
                                onClick={() => handleDownloadPdf(proposal)}
                                title={proposal.pdf_url ? 'Baixar PDF' : 'PDF não disponível'}
                              >
                                {propertyLabel(proposal)}
                              </button>
                              <StatusBadge status={proposal.status} />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {proposal.lead_name || 'Sem cliente'} •{' '}
                              {format(new Date(proposal.created_at), "dd/MM/yy", { locale: ptBR })}
                              {proposal.unit?.price && ` • ${formatBRL(proposal.unit.price)}`}
                            </div>
                            <div className="flex flex-wrap gap-1 pt-1">
                              {proposal.include_financing && (
                                <Badge variant="outline" className="text-[10px] px-1.5">
                                  <Calculator className="h-3 w-3 mr-0.5" /> Financ.
                                </Badge>
                              )}
                              {proposal.include_cover && (
                                <Badge variant="outline" className="text-[10px] px-1.5">Capa</Badge>
                              )}
                            </div>
                            <RowActions
                              proposal={proposal}
                              onEdit={handleEdit}
                              onDuplicate={handleDuplicate}
                              onDelete={(id) => setDeletingId(id)}
                              onDownloadPdf={handleDownloadPdf}
                              pdfDownloading={pdfDownloading}
                            />

                          </div>
                        ))}
                      </div>

                      {/* DESKTOP — table */}
                      <div className="hidden md:block overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Imóvel</TableHead>
                              <TableHead>Cliente</TableHead>
                              <TableHead>Valor</TableHead>
                              <TableHead>Opções</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Data</TableHead>
                              <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filtered.map((proposal) => (
                              <TableRow key={proposal.id}>
                                <TableCell>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        onClick={() => handleDownloadPdf(proposal)}
                                        className="flex items-center gap-2 text-left hover:underline cursor-pointer"
                                      >
                                        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                                        <span className="font-medium text-sm">{propertyLabel(proposal)}</span>
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {proposal.pdf_url ? 'Baixar PDF da proposta' : 'PDF não disponível ainda'}
                                    </TooltipContent>

                                  </Tooltip>
                                </TableCell>
                                <TableCell>
                                  {proposal.lead_name ? (
                                    <div className="flex items-center gap-1.5 text-sm">
                                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                                      {proposal.lead_name}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-sm font-medium tabular-nums">
                                  {formatBRL(proposal.unit?.price)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {proposal.include_financing && (
                                      <Badge variant="outline" className="text-[10px] px-1.5">
                                        <Calculator className="h-3 w-3 mr-0.5" /> Financ.
                                      </Badge>
                                    )}
                                    {proposal.include_cover && (
                                      <Badge variant="outline" className="text-[10px] px-1.5">Capa</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <button
                                    onClick={() => handleToggleStatus(proposal)}
                                    className="hover:opacity-80 transition-opacity"
                                    title={proposal.status === 'sent' ? 'Reverter para rascunho' : 'Marcar como enviada'}
                                  >
                                    <StatusBadge status={proposal.status} />
                                  </button>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                  {format(new Date(proposal.created_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  <RowActions
                                    proposal={proposal}
                                    onEdit={handleEdit}
                                    onDuplicate={handleDuplicate}
                                    onDelete={(id) => setDeletingId(id)}
                                    onDownloadPdf={handleDownloadPdf}
                                    pdfDownloading={pdfDownloading}
                                  />

                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
          <BottomNavigation />
        </div>

        <CreateProposalSheet
          open={sheetOpen}
          onOpenChange={handleSheetClose}
          preSelectedUnitId={preSelectedUnitId}
          editingProposal={editingProposal}
          duplicatingProposal={duplicatingProposal}
        />

        <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir proposta?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é irreversível. A proposta será removida permanentemente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deletingId) {
                    deleteProposal.mutate(deletingId);
                    setDeletingId(null);
                  }
                }}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarProvider>
    </TooltipProvider>
  );
}

/* ----------------- Helper components ----------------- */

function StatCard({
  icon: Icon, value, label, tone,
}: {
  icon: typeof FileText;
  value: number;
  label: string;
  tone: 'primary' | 'green' | 'amber' | 'blue';
}) {
  const tones = {
    primary: 'bg-primary/10 text-primary',
    green: 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400',
  } as const;
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RowActions({
  proposal,
  onEdit,
  onDuplicate,
  onDelete,
  onDownloadPdf,
  pdfDownloading,
}: {
  proposal: Proposal;
  onEdit: (p: Proposal) => void;
  onDuplicate: (p: Proposal) => void;
  onDelete: (id: string) => void;
  onDownloadPdf: (p: Proposal) => void;
  pdfDownloading: string | null;
  onToggleStatus: (p: Proposal) => void;
}) {
  const hasPdf = !!proposal.pdf_url;
  const isDownloading = pdfDownloading === proposal.id;
  return (
    <div className="flex items-center justify-end gap-1 flex-wrap">
      {hasPdf && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isDownloading}
              onClick={() => onDownloadPdf(proposal)}
            >
              {isDownloading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Download className="h-3.5 w-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isDownloading ? 'Baixando...' : 'Baixar PDF'}</TooltipContent>
        </Tooltip>
      )}



      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(proposal)}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Editar</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDuplicate(proposal)}>
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Duplicar</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(proposal.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Excluir</TooltipContent>
      </Tooltip>
    </div>
  );
}
