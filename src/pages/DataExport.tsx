import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Download, Package, Loader2, XCircle, Info, AlertTriangle, Trash2, Database } from 'lucide-react';
import { REASON_LABELS, STATUS_CONFIG, notifyExportCreated } from '@/lib/data-export-notifications';

const DataExport = () => {
  const { user } = useAuth();
  const { isMember } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [requestOpen, setRequestOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Delete account state
  const [skipExport, setSkipExport] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Redirect members — useEffect to avoid hooks-order violation
  useEffect(() => {
    if (isMember) {
      toast.error('Apenas o administrador da conta pode solicitar exportações.', { duration: 1000 });
      navigate('/settings', { replace: true });
    }
  }, [isMember, navigate]);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['data-export-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_export_requests')
        .select('*')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const activeRequest = requests.find(r =>
    ['requested', 'in_preparation', 'ready'].includes(r.status)
  );

  const hasRecentDelivery = requests.some(r =>
    r.status === 'delivered' &&
    r.delivered_at &&
    new Date(r.delivered_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  const undownloadedRecent = requests.find(r =>
    r.status === 'delivered' &&
    r.delivered_at &&
    new Date(r.delivered_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) &&
    !r.last_downloaded_at &&
    r.expires_at &&
    new Date(r.expires_at) > new Date()
  );

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Não autenticado');
      const { data, error } = await supabase
        .from('data_export_requests')
        .insert({
          requested_by: user.id,
          organization_owner_id: user.id,
          reason,
          request_note: note || null,
        })
        .select()
        .single();
      if (error) {
        if (error.code === '23505') throw new Error('Já existe uma solicitação ativa.');
        throw error;
      }
      return data;
    },
    onSuccess: async (data) => {
      toast.success('Solicitação enviada com sucesso!', { duration: 1000 });
      setRequestOpen(false);
      setReason('');
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['data-export-requests'] });
      await notifyExportCreated(data);
    },
    onError: (err: Error) => {
      toast.error(err.message, { duration: 1000 });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('data_export_requests')
        .update({ status: 'cancelled' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Solicitação cancelada.', { duration: 1000 });
      setCancelId(null);
      queryClient.invalidateQueries({ queryKey: ['data-export-requests'] });
    },
  });

  const handleDownload = async (requestId: string) => {
    setDownloading(requestId);
    try {
      const { data, error } = await supabase.functions.invoke('get-delivery-url', {
        body: { request_id: requestId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      window.open(data.url, '_blank');
      queryClient.invalidateQueries({ queryKey: ['data-export-requests'] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao gerar link';
      toast.error(msg, { duration: 1000 });
    } finally {
      setDownloading(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'ENCERRAR') return;
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-account', {
        body: {
          confirmation_text: 'EXCLUIR MINHA CONTA',
          reason: deleteReason,
          skip_export_check: skipExport || hasRecentDelivery,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success('Conta excluída com sucesso.', { duration: 1000 });
      await supabase.auth.signOut();
      window.location.href = '/';
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao excluir conta.';
      toast.error(msg, { duration: 1000 });
    } finally {
      setIsDeleting(false);
    }
  };

  const getEffectiveStatus = (r: typeof requests[0]) => {
    if (r.status === 'delivered' && r.expires_at && new Date(r.expires_at) < new Date()) {
      return 'expired';
    }
    return r.status;
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 p-4 md:p-6">
        <div>
          <h1 className="text-2xl font-bold">Exportar Meus Dados</h1>
          <p className="text-muted-foreground mt-1">Gerencie exportações completas do seu workspace</p>
        </div>

        {undownloadedRecent && (
          <Alert className="border-green-300 bg-green-50 dark:bg-green-950 dark:border-green-800">
            <Download className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-300">
              Sua exportação está pronta para download! Clique em "Baixar" na tabela abaixo.
            </AlertDescription>
          </Alert>
        )}

        {/* Request Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Exportar meus dados
            </CardTitle>
            <CardDescription>
              Solicite uma cópia completa dos dados do seu workspace. Nossa equipe prepara tudo manualmente para garantir integridade e segurança e entrega em até 7 dias úteis. Você receberá um e-mail quando estiver pronto e poderá baixar por aqui mesmo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">O que está incluído:</p>
              <ul className="list-disc pl-5 space-y-0.5 text-xs">
                <li>Todos os contatos, leads, proprietários, empresas</li>
                <li>Imóveis, unidades, contratos e cobranças</li>
                <li>Documentos anexados (PDFs, contratos gerados, mídias)</li>
                <li>Histórico de atividades e pipeline</li>
                <li>Configurações do workspace</li>
              </ul>
            </div>

            {activeRequest ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Você já possui uma solicitação ativa ({STATUS_CONFIG[activeRequest.status]?.label}). Aguarde a conclusão ou cancele-a para criar uma nova.
                </AlertDescription>
              </Alert>
            ) : (
              <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Package className="h-4 w-4" />
                    Solicitar exportação
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Solicitar exportação de dados</DialogTitle>
                    <DialogDescription>
                      Você receberá uma confirmação por e-mail. O prazo de entrega é de até 7 dias úteis a partir desta data.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Motivo da solicitação *</Label>
                      <Select value={reason} onValueChange={setReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(REASON_LABELS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Observação para nossa equipe (opcional)</Label>
                      <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Detalhes adicionais..." rows={3} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setRequestOpen(false)}>Cancelar</Button>
                    <Button onClick={() => createMutation.mutate()} disabled={!reason || createMutation.isPending}>
                      {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Enviar solicitação
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </CardContent>
        </Card>

        {/* Account closure card */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Encerrar conta
            </CardTitle>
            <CardDescription>
              Para encerrar sua conta, recomendamos solicitar a exportação completa antes. Após o encerramento, todos os dados serão removidos permanentemente em 30 dias.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!hasRecentDelivery && (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="skip-export"
                  checked={skipExport}
                  onCheckedChange={(v) => setSkipExport(!!v)}
                />
                <Label htmlFor="skip-export" className="text-sm leading-tight cursor-pointer">
                  Já tenho meus dados ou não preciso deles
                </Label>
              </div>
            )}
            <Button
              variant="destructive"
              className="w-full gap-2"
              disabled={!hasRecentDelivery && !skipExport}
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Encerrar conta
            </Button>
            {!hasRecentDelivery && !skipExport && (
              <p className="text-xs text-muted-foreground">
                <AlertTriangle className="h-3 w-3 inline mr-1" />
                Solicite uma exportação ou marque a opção acima para habilitar.
              </p>
            )}

            <AlertDialog open={deleteOpen} onOpenChange={v => { setDeleteOpen(v); if (!v) { setDeleteConfirm(''); setDeleteReason(''); } }}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5" />
                    Encerrar Conta Permanentemente
                  </AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3 text-left">
                    <p>Esta ação é <strong className="text-destructive">irreversível</strong>. Todos os seus dados serão permanentemente excluídos.</p>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label className="text-sm text-muted-foreground">Motivo (opcional)</Label>
                    <Textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Nos conte por que está saindo..." rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">
                      Digite <span className="font-bold text-destructive">ENCERRAR</span> para confirmar:
                    </Label>
                    <Input value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder="ENCERRAR" className="font-mono" />
                  </div>
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={e => { e.preventDefault(); handleDeleteAccount(); }}
                    disabled={deleteConfirm !== 'ENCERRAR' || isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Encerrando...</> : 'Encerrar Permanentemente'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">Você ainda não fez nenhuma solicitação de exportação.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Entrega</TableHead>
                      <TableHead>Tamanho</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map(r => {
                      const effectiveStatus = getEffectiveStatus(r);
                      const statusCfg = STATUS_CONFIG[effectiveStatus] || STATUS_CONFIG.requested;
                      const canDownload = effectiveStatus === 'delivered' && r.delivery_file_path;
                      const canCancel = r.status === 'requested';

                      return (
                        <TableRow key={r.id}>
                          <TableCell className="text-xs whitespace-nowrap">{new Date(r.requested_at).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="text-xs">{REASON_LABELS[r.reason] || r.reason}</TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge>
                              </TooltipTrigger>
                              {r.status === 'rejected' && r.admin_note && (
                                <TooltipContent><p className="max-w-xs">{r.admin_note}</p></TooltipContent>
                              )}
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{new Date(r.expected_by).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{r.delivered_at ? new Date(r.delivered_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                          <TableCell className="text-xs">{formatSize(r.delivery_file_size)}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{r.expires_at ? new Date(r.expires_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {canDownload && (
                                <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => handleDownload(r.id)} disabled={downloading === r.id}>
                                  {downloading === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                                  Baixar
                                </Button>
                              )}
                              {canCancel && (
                                <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive" onClick={() => setCancelId(r.id)}>
                                  <XCircle className="h-3 w-3" />
                                </Button>
                              )}
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

        {/* Cancel confirmation */}
        <AlertDialog open={!!cancelId} onOpenChange={v => !v && setCancelId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar solicitação?</AlertDialogTitle>
              <AlertDialogDescription>Essa ação não pode ser desfeita. Você poderá criar uma nova solicitação depois.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={() => cancelId && cancelMutation.mutate(cancelId)}>Cancelar solicitação</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
};

export default DataExport;
