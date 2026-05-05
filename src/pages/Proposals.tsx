import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useProposals, type Proposal } from '@/hooks/useProposals';
import { CreateProposalSheet } from '@/components/proposals/CreateProposalSheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FileText, Plus, Calculator, User, Building2, Clock, Pencil, Send, Trash2, MessageCircle, Mail, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  draft: { label: 'Não Enviada', variant: 'secondary' },
  sent: { label: 'Enviada', variant: 'default' },
  viewed: { label: 'Visualizada', variant: 'outline' },
};

export default function Proposals() {
  const { proposals, isLoading, updateProposalStatus, deleteProposal } = useProposals();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      setSearchParams({}, { replace: true });
    }
  };

  const handleEdit = (proposal: Proposal) => {
    setEditingProposal(proposal);
    setSheetOpen(true);
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

  const markProposalAsSent = async (proposalId: string) => {
    try {
      await supabase
        .from('proposals')
        .update({ status: 'sent', updated_at: new Date().toISOString() } as any)
        .eq('id', proposalId);
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    } catch (err) {
      console.error('Falha ao marcar proposta como enviada:', err);
    }
  };

  const handleCopyLink = async (proposal: Proposal) => {
    if (!proposal.pdf_url) {
      toast({ title: 'Sem link disponível', description: 'Esta proposta ainda não tem PDF gerado.', variant: 'destructive' });
      return;
    }
    try {
      await navigator.clipboard.writeText(proposal.pdf_url);
      toast({ title: 'Link copiado', description: 'Cole onde quiser enviar a proposta.' });
      if (proposal.status === 'draft') await markProposalAsSent(proposal.id);
    } catch {
      toast({ title: 'Erro ao copiar', description: 'Tente novamente.', variant: 'destructive' });
    }
  };

  const handleSendWhatsApp = async (proposal: Proposal) => {
    if (!proposal.pdf_url) {
      toast({ title: 'Sem link disponível', description: 'Esta proposta ainda não tem PDF gerado.', variant: 'destructive' });
      return;
    }
    const propertyTitle = proposal.property?.name || 'o imóvel';
    const clientName = proposal.lead_name || '';
    const greeting = clientName ? `Olá ${clientName}` : 'Olá';
    const message = encodeURIComponent(`${greeting}, segue a proposta para ${propertyTitle}:\n\n${proposal.pdf_url}`);
    window.open(`https://wa.me/?text=${message}`, '_blank', 'noopener,noreferrer');
    if (proposal.status === 'draft') await markProposalAsSent(proposal.id);
  };

  const handleSendEmail = async (proposal: Proposal) => {
    if (!proposal.pdf_url) {
      toast({ title: 'Sem link disponível', description: 'Esta proposta ainda não tem PDF gerado.', variant: 'destructive' });
      return;
    }
    const propertyTitle = proposal.property?.name || 'o imóvel';
    const subject = encodeURIComponent(`Proposta - ${propertyTitle}`);
    const body = encodeURIComponent(`Olá,\n\nSegue a proposta para ${propertyTitle}:\n\n${proposal.pdf_url}\n\nQualquer dúvida, estou à disposição.`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    if (proposal.status === 'draft') await markProposalAsSent(proposal.id);
  };

  const draftCount = proposals.filter((p) => p.status === 'draft' || !p.status).length;
  const sentCount = proposals.filter((p) => p.status === 'sent').length;

  return (
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
              <Button onClick={() => { setEditingProposal(null); setSheetOpen(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Proposta
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold">{proposals.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold">{sentCount}</p>
                  <p className="text-xs text-muted-foreground">Enviadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold">{draftCount}</p>
                  <p className="text-xs text-muted-foreground">Não Enviadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold">
                    {proposals.filter((p) => p.include_financing).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Com Financiamento</p>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <Card>
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
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Imóvel</TableHead>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Opções</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Data</TableHead>
                          <TableHead className="w-28"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {proposals.map((proposal) => {
                          const status = statusLabels[proposal.status] || statusLabels.draft;
                          return (
                            <TableRow key={proposal.id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-sm">
                                    {proposal.property?.name
                                      ? `${proposal.property.name} - ${proposal.unit?.unit_number || ''}`
                                      : proposal.unit?.unit_number || 'Imóvel removido'}
                                  </span>
                                </div>
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
                              <TableCell>
                                <div className="flex gap-1">
                                  {proposal.include_financing && (
                                    <Badge variant="outline" className="text-[10px] px-1.5">
                                      <Calculator className="h-3 w-3 mr-0.5" />
                                      Financ.
                                    </Badge>
                                  )}
                                  {proposal.include_cover && (
                                    <Badge variant="outline" className="text-[10px] px-1.5">
                                      Capa
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={status.variant}
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                  onClick={() => handleToggleStatus(proposal)}
                                  title={proposal.status === 'draft' || !proposal.status
                                    ? 'Marcar como enviada'
                                    : 'Reverter para rascunho'}
                                >
                                  {status.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(proposal.created_at), "dd/MM/yy 'às' HH:mm", {
                                  locale: ptBR,
                                })}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        title="Enviar proposta"
                                        disabled={!proposal.pdf_url}
                                      >
                                        <Send className="h-3.5 w-3.5 text-muted-foreground" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={() => handleSendWhatsApp(proposal)}>
                                        <MessageCircle className="mr-2 h-4 w-4" />
                                        WhatsApp
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleSendEmail(proposal)}>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Email
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleCopyLink(proposal)}>
                                        <LinkIcon className="mr-2 h-4 w-4" />
                                        Copiar link
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEdit(proposal)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => setDeletingId(proposal.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
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
  );
}
