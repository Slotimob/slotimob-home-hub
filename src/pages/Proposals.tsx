import { useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useProposals } from '@/hooks/useProposals';
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
import { FileText, Plus, Calculator, User, Building2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: 'Rascunho', variant: 'secondary' },
  sent: { label: 'Enviada', variant: 'default' },
  viewed: { label: 'Visualizada', variant: 'outline' },
};

export default function Proposals() {
  const { proposals, isLoading } = useProposals();
  const [sheetOpen, setSheetOpen] = useState(false);

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
              <Button onClick={() => setSheetOpen(true)}>
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
                  <p className="text-2xl font-bold">
                    {proposals.filter((p) => p.status === 'sent').length}
                  </p>
                  <p className="text-xs text-muted-foreground">Enviadas</p>
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
              <Card>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold">
                    {proposals.filter((p) => p.lead_name).length}
                  </p>
                  <p className="text-xs text-muted-foreground">Personalizadas</p>
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
                                <Badge variant={status.variant}>{status.label}</Badge>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {format(new Date(proposal.created_at), "dd/MM/yy 'às' HH:mm", {
                                  locale: ptBR,
                                })}
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

      <CreateProposalSheet open={sheetOpen} onOpenChange={setSheetOpen} />
    </SidebarProvider>
  );
}
