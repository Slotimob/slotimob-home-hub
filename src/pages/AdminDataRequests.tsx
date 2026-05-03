import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Clock, AlertTriangle, CheckCircle, Upload, XCircle, Mail, RotateCcw, Package } from 'lucide-react';
import { REASON_LABELS, STATUS_CONFIG, notifyPreparationStarted, notifyExportRejected } from '@/lib/data-export-notifications';

const AdminDataRequests = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Verify super admin access
  const { data: isSuperAdmin, isLoading: checkingAdmin } = useQuery({
    queryKey: ['is-super-admin', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('is_super_admin')
        .eq('id', user!.id)
        .single();
      return data?.is_super_admin === true;
    },
    enabled: !!user?.id,
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-data-export-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_export_requests')
        .select('*')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: isSuperAdmin === true,
  });

  // Fetch profiles for names
  const ownerIds = useMemo(() => [...new Set(requests.map(r => r.organization_owner_id))], [requests]);
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles-for-exports', ownerIds],
    queryFn: async () => {
      if (ownerIds.length === 0) return [];
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone')
        .in('id', ownerIds);
      return data || [];
    },
    enabled: ownerIds.length > 0,
  });

  const profileMap = useMemo(() => {
    const m: Record<string, typeof profiles[0]> = {};
    profiles.forEach(p => { m[p.id] = p; });
    return m;
  }, [profiles]);

  // Workspace counts for drawer
  const selectedReq = requests.find(r => r.id === selectedId);
  const { data: workspaceCounts } = useQuery({
    queryKey: ['workspace-counts', selectedReq?.organization_owner_id],
    queryFn: async () => {
      const oid = selectedReq!.organization_owner_id;
      const tables = ['units', 'contacts', 'deals', 'properties', 'leases', 'financial_transactions', 'documents'] as const;
      const counts: Record<string, number> = {};
      for (const t of tables) {
        const { count } = await supabase.from(t).select('*', { count: 'exact', head: true }).eq('broker_id', oid);
        counts[t] = count || 0;
      }
      // Members count
      const { count: membersCount } = await supabase.from('organization_members').select('*', { count: 'exact', head: true }).eq('organization_owner_id', oid).eq('is_active', true);
      counts['members'] = membersCount || 0;
      return counts;
    },
    enabled: !!selectedReq,
  });

  // Subscription info
  const { data: subInfo } = useQuery({
    queryKey: ['sub-info-export', selectedReq?.organization_owner_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('subscriptions')
        .select('plan_id, status')
        .eq('user_id', selectedReq!.organization_owner_id)
        .maybeSingle();
      return data;
    },
    enabled: !!selectedReq,
  });

  const filteredRequests = useMemo(() => {
    if (statusFilter === 'all') return requests;
    return requests.filter(r => r.status === statusFilter);
  }, [requests, statusFilter]);

  // KPIs
  const kpis = useMemo(() => {
    const now = new Date();
    const pending = requests.filter(r => ['requested', 'in_preparation'].includes(r.status));
    const dueSoon = pending.filter(r => new Date(r.expected_by) < new Date(now.getTime() + 48 * 60 * 60 * 1000));
    const overdue = pending.filter(r => new Date(r.expected_by) < now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const deliveredMonth = requests.filter(r => r.status === 'delivered' && r.delivered_at && new Date(r.delivered_at) >= startOfMonth);
    return { open: pending.length, dueSoon: dueSoon.length, overdue: overdue.length, deliveredMonth: deliveredMonth.length };
  }, [requests]);

  const startPreparation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('data_export_requests')
        .update({ status: 'in_preparation', started_at: new Date().toISOString(), handled_by: user!.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Preparação iniciada.', { duration: 1000 });
      queryClient.invalidateQueries({ queryKey: ['admin-data-export-requests'] });
      if (selectedReq) await notifyPreparationStarted(selectedReq);
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async () => {
      if (!selectedReq) return;
      const { error } = await supabase
        .from('data_export_requests')
        .update({ status: 'rejected', admin_note: rejectNote })
        .eq('id', selectedReq.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success('Solicitação recusada.', { duration: 1000 });
      setRejectOpen(false);
      setRejectNote('');
      queryClient.invalidateQueries({ queryKey: ['admin-data-export-requests'] });
      if (selectedReq) await notifyExportRejected({ ...selectedReq, admin_note: rejectNote });
    },
  });

  const handleUpload = async () => {
    if (!uploadFile || !selectedReq) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('request_id', selectedReq.id);
      formData.append('file', uploadFile);

      const { data, error } = await supabase.functions.invoke('upload-export-delivery', {
        body: formData,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Arquivo entregue com sucesso!', { duration: 1000 });
      setUploadOpen(false);
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ['admin-data-export-requests'] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro no upload';
      toast.error(msg, { duration: 1000 });
    } finally {
      setUploading(false);
    }
  };

  const handleResendEmail = async (reqId: string) => {
    try {
      const req = requests.find(r => r.id === reqId);
      if (!req) return;
      const profile = profileMap[req.organization_owner_id];
      if (!profile?.email) return;

      // Generate new signed URL via edge function for the email
      const { data } = await supabase.functions.invoke('get-delivery-url', {
        body: { request_id: reqId },
      });

      await supabase.from('email_notifications').insert({
        broker_id: req.organization_owner_id,
        recipient_email: profile.email,
        subject: 'Sua exportação de dados está pronta!',
        email_type: 'data_export_delivered',
        metadata: {
          body: `Olá ${profile.full_name || ''},\n\nSua exportação de dados está disponível para download.\n\nAcesse: https://slotimob.com.br/settings/data-export\n\nO arquivo ficará disponível por 30 dias.\n\nEquipe SLOTIMOB`,
        },
      });
      toast.success('E-mail reenviado.', { duration: 1000 });
    } catch {
      toast.error('Erro ao reenviar e-mail.', { duration: 1000 });
    }
  };

  const handleCancelDelivery = async (reqId: string) => {
    try {
      const req = requests.find(r => r.id === reqId);
      if (!req?.delivery_file_path) return;

      // We can't delete from storage via client (no policy), so just rollback status
      const { error } = await supabase
        .from('data_export_requests')
        .update({ status: 'in_preparation', delivery_file_path: null, delivery_file_size: null, delivered_at: null, expires_at: null, delivered_by: null })
        .eq('id', reqId);
      if (error) throw error;
      toast.success('Entrega cancelada.', { duration: 1000 });
      queryClient.invalidateQueries({ queryKey: ['admin-data-export-requests'] });
    } catch {
      toast.error('Erro ao cancelar entrega.', { duration: 1000 });
    }
  };

  const updateInternalNote = useMutation({
    mutationFn: async ({ id, note }: { id: string; note: string }) => {
      const { error } = await supabase
        .from('data_export_requests')
        .update({ internal_note: note })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Nota salva.', { duration: 1000 });
      queryClient.invalidateQueries({ queryKey: ['admin-data-export-requests'] });
    },
  });

  useEffect(() => {
    if (!checkingAdmin && !isSuperAdmin) {
      toast.error('Acesso restrito à equipe SLOTIMOB.', { duration: 1000 });
      navigate('/', { replace: true });
    }
  }, [checkingAdmin, isSuperAdmin, navigate]);

  if (checkingAdmin) return <AppLayout><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div></AppLayout>;
  if (!isSuperAdmin) return null;

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '—';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <AppLayout>
      <div className="space-y-6 p-4 md:p-6">
        <h1 className="text-2xl font-bold">Exportações de Dados</h1>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Package className="h-5 w-5 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">{kpis.open}</p>
              <p className="text-xs text-muted-foreground">Abertas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{kpis.dueSoon}</p>
              <p className="text-xs text-muted-foreground">Vencendo em 48h</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <AlertTriangle className="h-5 w-5 mx-auto mb-1 text-red-500" />
              <p className="text-2xl font-bold">{kpis.overdue}</p>
              <p className="text-xs text-muted-foreground">Atrasadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{kpis.deliveredMonth}</p>
              <p className="text-xs text-muted-foreground">Entregues no mês</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'expired').map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Solicitada</TableHead>
                      <TableHead>Prazo</TableHead>
                      <TableHead>Atrasado?</TableHead>
                      <TableHead>Entregue</TableHead>
                      <TableHead>Tamanho</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map(r => {
                      const profile = profileMap[r.organization_owner_id];
                      const isOverdue = ['requested', 'in_preparation'].includes(r.status) && new Date(r.expected_by) < new Date();
                      const statusCfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.requested;
                      return (
                        <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedId(r.id)}>
                          <TableCell>
                            <div className="text-sm font-medium">{profile?.full_name || '—'}</div>
                            <div className="text-xs text-muted-foreground">{profile?.email || ''}</div>
                          </TableCell>
                          <TableCell className="text-xs">{REASON_LABELS[r.reason] || r.reason}</TableCell>
                          <TableCell><Badge variant="outline" className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge></TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{new Date(r.requested_at).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{new Date(r.expected_by).toLocaleDateString('pt-BR')}</TableCell>
                          <TableCell>{isOverdue ? <Badge variant="destructive" className="text-xs">Atrasado</Badge> : '—'}</TableCell>
                          <TableCell className="text-xs whitespace-nowrap">{r.delivered_at ? new Date(r.delivered_at).toLocaleDateString('pt-BR') : '—'}</TableCell>
                          <TableCell className="text-xs">{formatSize(r.delivery_file_size)}</TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredRequests.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhuma solicitação encontrada.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detail Drawer */}
        <Sheet open={!!selectedId} onOpenChange={v => !v && setSelectedId(null)}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            {selectedReq && (() => {
              const profile = profileMap[selectedReq.organization_owner_id];
              const statusCfg = STATUS_CONFIG[selectedReq.status] || STATUS_CONFIG.requested;
              return (
                <div className="space-y-6">
                  <SheetHeader>
                    <SheetTitle>Detalhes da Solicitação</SheetTitle>
                  </SheetHeader>

                  {/* Client info */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Cliente</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Nome:</strong> {profile?.full_name || '—'}</p>
                      <p><strong>E-mail:</strong> {profile?.email || '—'}</p>
                      {profile?.phone && <p><strong>Telefone:</strong> {profile.phone}</p>}
                      <p><strong>Plano:</strong> {subInfo?.plan_id || 'free'} ({subInfo?.status || 'none'})</p>
                      <p><strong>Membros:</strong> {workspaceCounts?.members ?? '...'}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Data counts */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Estimativa de dados</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {workspaceCounts && Object.entries(workspaceCounts).filter(([k]) => k !== 'members').map(([k, v]) => (
                        <div key={k} className="flex justify-between bg-muted/50 rounded px-2 py-1">
                          <span className="capitalize">{k.replace('_', ' ')}</span>
                          <span className="font-medium">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Request details */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Solicitação</h3>
                    <div className="text-sm space-y-1">
                      <p><strong>Status:</strong> <Badge variant="outline" className={`text-xs ${statusCfg.color}`}>{statusCfg.label}</Badge></p>
                      <p><strong>Motivo:</strong> {REASON_LABELS[selectedReq.reason]}</p>
                      {selectedReq.request_note && <p><strong>Observação do cliente:</strong> {selectedReq.request_note}</p>}
                      <p><strong>Solicitada em:</strong> {new Date(selectedReq.requested_at).toLocaleString('pt-BR')}</p>
                      <p><strong>Prazo:</strong> {new Date(selectedReq.expected_by).toLocaleDateString('pt-BR')}</p>
                      {selectedReq.delivered_at && <p><strong>Entregue em:</strong> {new Date(selectedReq.delivered_at).toLocaleString('pt-BR')}</p>}
                      {selectedReq.download_count > 0 && <p><strong>Downloads:</strong> {selectedReq.download_count}</p>}
                    </div>
                  </div>

                  <Separator />

                  {/* Internal note */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Observação interna</Label>
                    <Textarea
                      defaultValue={selectedReq.internal_note || ''}
                      placeholder="Nota interna (não visível ao cliente)..."
                      rows={3}
                      onBlur={e => {
                        if (e.target.value !== (selectedReq.internal_note || '')) {
                          updateInternalNote.mutate({ id: selectedReq.id, note: e.target.value });
                        }
                      }}
                    />
                  </div>

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Ações</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedReq.status === 'requested' && (
                        <>
                          <Button size="sm" className="gap-1" onClick={() => startPreparation.mutate(selectedReq.id)} disabled={startPreparation.isPending}>
                            {startPreparation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Package className="h-3 w-3" />}
                            Iniciar preparação
                          </Button>
                          <Button size="sm" variant="destructive" className="gap-1" onClick={() => setRejectOpen(true)}>
                            <XCircle className="h-3 w-3" />
                            Recusar
                          </Button>
                        </>
                      )}
                      {selectedReq.status === 'in_preparation' && (
                        <Button size="sm" className="gap-1" onClick={() => setUploadOpen(true)}>
                          <Upload className="h-3 w-3" />
                          Marcar como pronta e enviar
                        </Button>
                      )}
                      {selectedReq.status === 'delivered' && (
                        <>
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => handleResendEmail(selectedReq.id)}>
                            <Mail className="h-3 w-3" />
                            Reenviar e-mail
                          </Button>
                          <Button size="sm" variant="ghost" className="gap-1 text-destructive" onClick={() => handleCancelDelivery(selectedReq.id)}>
                            <RotateCcw className="h-3 w-3" />
                            Cancelar entrega
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          </SheetContent>
        </Sheet>

        {/* Reject dialog */}
        <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Recusar solicitação</DialogTitle>
              <DialogDescription>Informe o motivo da recusa. Essa mensagem será enviada ao cliente.</DialogDescription>
            </DialogHeader>
            <Textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Motivo da recusa..." rows={3} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => rejectRequest.mutate()} disabled={!rejectNote || rejectRequest.isPending}>
                {rejectRequest.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Recusar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upload dialog */}
        <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enviar arquivo de exportação</DialogTitle>
              <DialogDescription>Selecione o arquivo ZIP com os dados do cliente. Máximo: 5 GB.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Input type="file" accept=".zip" onChange={e => setUploadFile(e.target.files?.[0] || null)} />
              {uploadFile && (
                <p className="text-xs text-muted-foreground">{uploadFile.name} — {(uploadFile.size / (1024 * 1024)).toFixed(1)} MB</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setUploadOpen(false); setUploadFile(null); }}>Cancelar</Button>
              <Button onClick={handleUpload} disabled={!uploadFile || uploading}>
                {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</> : 'Enviar e marcar como entregue'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AdminDataRequests;
