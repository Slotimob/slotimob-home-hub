import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCockpitAccess } from '@/hooks/useCockpitAccess';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs';
import { ScrollableTabsList } from '@/components/ui/scrollable-tabs';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Building2, CreditCard, Loader2, MessageSquare, Plus, Settings2,
  Shield, Sparkles, Users, Search, Crown, UserCog, BarChart3, HeadphonesIcon, FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { CockpitOverviewTab } from '@/components/cockpit/CockpitOverviewTab';
import { CockpitSupportTab } from '@/components/cockpit/CockpitSupportTab';
import { CockpitBlogTab } from '@/components/cockpit/CockpitBlogTab';
import { CockpitSettingsTab } from '@/components/cockpit/CockpitSettingsTab';

interface Organization {
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  plan_id: string;
  subscription_status: string;
  is_early_adopter: boolean;
  extra_users_count: number;
  extra_unit_packs: number;
  stripe_customer_id: string | null;
  trial_ends_at: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  units_count: number;
  contacts_count: number;
  whatsapp_credits: number;
  whatsapp_sent_month: number;
  ai_credits: number;
  roles: string[];
}

const planLabels: Record<string, string> = {
  free: 'Gratuito', essencial: 'Essencial', pro: 'Pro', business: 'Business',
};

const statusLabels: Record<string, string> = {
  active: 'Ativa', trialing: 'Trial', past_due: 'Inadimplente', cancelled: 'Cancelada', none: 'Sem assinatura',
};

const statusColors: Record<string, string> = {
  active: 'default', trialing: 'secondary', past_due: 'destructive', cancelled: 'outline', none: 'outline',
};

const AdminCockpit = () => {
  const { user, loading: authLoading } = useAuth();
  const { cockpitRole, isSuperAdmin, isAdmin, isSupport, hasCockpitAccess, isLoading: roleLoading } = useCockpitAccess();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [creditsDialog, setCreditsDialog] = useState<Organization | null>(null);
  const [limitsDialog, setLimitsDialog] = useState<Organization | null>(null);
  const [planDialog, setPlanDialog] = useState<Organization | null>(null);
  const [roleDialog, setRoleDialog] = useState<Organization | null>(null);
  const [creditType, setCreditType] = useState('ai');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [extraUsers, setExtraUsers] = useState(0);
  const [extraUnits, setExtraUnits] = useState(0);
  const [limitReason, setLimitReason] = useState('');
  const [newPlan, setNewPlan] = useState('');
  const [planReason, setPlanReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { data: organizations, isLoading: orgsLoading, refetch } = useQuery({
    queryKey: ['cockpit-organizations'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_cockpit_organizations');
      if (error) throw error;
      return (data as unknown as Organization[]) || [];
    },
    enabled: hasCockpitAccess,
    staleTime: 30 * 1000,
  });

  useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !hasCockpitAccess)) {
      navigate('/dashboard');
    }
  }, [authLoading, roleLoading, user, hasCockpitAccess, navigate]);

  if (!authLoading && !roleLoading && (!user || !hasCockpitAccess)) {
    return null;
  }

  if (authLoading || roleLoading || orgsLoading) {
    return (
      <AppLayout title="Cockpit Master">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const filtered = (organizations || []).filter(
    (org) =>
      org.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      org.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddCredits = async () => {
    if (!creditsDialog || !creditAmount || !creditReason) {
      toast.error('Preencha todos os campos.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_add_credits', {
        p_target_user_id: creditsDialog.user_id,
        p_credit_type: creditType,
        p_amount: parseInt(creditAmount),
        p_reason: creditReason,
      });
      if (error) throw error;
      toast.success('Créditos adicionados com sucesso!');
      setCreditsDialog(null);
      setCreditAmount('');
      setCreditReason('');
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao adicionar créditos.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdjustLimits = async () => {
    if (!limitsDialog || !limitReason) {
      toast.error('Preencha o motivo.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_adjust_limits', {
        p_target_user_id: limitsDialog.user_id,
        p_extra_users: extraUsers,
        p_extra_unit_packs: extraUnits,
        p_reason: limitReason,
      });
      if (error) throw error;
      toast.success('Limites ajustados com sucesso!');
      setLimitsDialog(null);
      setLimitReason('');
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao ajustar limites.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePlan = async () => {
    if (!planDialog || !newPlan || !planReason) {
      toast.error('Preencha todos os campos.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_change_plan', {
        p_target_user_id: planDialog.user_id,
        p_new_plan_id: newPlan,
        p_reason: planReason,
      });
      if (error) throw error;
      toast.success(`Plano alterado para ${planLabels[newPlan] || newPlan}!`);
      setPlanDialog(null);
      setPlanReason('');
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar plano.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleRole = async (org: Organization, role: string) => {
    const hasRole = org.roles?.includes(role);
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('admin_change_role', {
        p_target_user_id: org.user_id,
        p_role: role,
        p_action: hasRole ? 'revoke' : 'grant',
        p_reason: `Toggle ${role} via Cockpit`,
      });
      if (error) throw error;
      toast.success(`Role ${role} ${hasRole ? 'removida' : 'concedida'}!`);
      refetch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao alterar role.');
    } finally {
      setSubmitting(false);
    }
  };

  const openLimitsDialog = (org: Organization) => {
    setExtraUsers(org.extra_users_count);
    setExtraUnits(org.extra_unit_packs);
    setLimitReason('');
    setLimitsDialog(org);
  };

  const openPlanDialog = (org: Organization) => {
    setNewPlan(org.plan_id);
    setPlanReason('');
    setPlanDialog(org);
  };

  // Determine default tab based on role
  const defaultTab = isSupport && !isAdmin ? 'support' : 'overview';

  // Role label for header
  const roleLabel = cockpitRole === 'super_admin' ? 'Super Admin' : cockpitRole === 'admin' ? 'Admin' : 'Suporte';

  return (
    <AppLayout title="Cockpit Master">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Cockpit Master</h1>
              <p className="text-sm text-muted-foreground">Gestão global da plataforma SlotiMob</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs gap-1">
            <Shield className="h-3 w-3" /> {roleLabel}
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <ScrollableTabsList>
            {(isAdmin || isSuperAdmin) && (
              <TabsTrigger value="overview" className="gap-2 min-h-[44px]">
                <BarChart3 className="h-4 w-4" /> Visão Geral
              </TabsTrigger>
            )}
            {(isAdmin || isSuperAdmin) && (
              <TabsTrigger value="organizations" className="gap-2 min-h-[44px]">
                <Users className="h-4 w-4" /> Organizações
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="roles" className="gap-2 min-h-[44px]">
                <UserCog className="h-4 w-4" /> Roles
              </TabsTrigger>
            )}
            {isSupport && (
              <TabsTrigger value="support" className="gap-2 min-h-[44px]">
                <HeadphonesIcon className="h-4 w-4" /> Suporte
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="blog" className="gap-2 min-h-[44px]">
                <FileText className="h-4 w-4" /> Blog
              </TabsTrigger>
            )}
            {isSuperAdmin && (
              <TabsTrigger value="settings" className="gap-2 min-h-[44px]">
                <Settings2 className="h-4 w-4" /> Configurações
              </TabsTrigger>
            )}
          </ScrollableTabsList>

          {/* Overview Tab */}
          {(isAdmin || isSuperAdmin) && (
            <TabsContent value="overview">
              <CockpitOverviewTab organizations={organizations || []} />
            </TabsContent>
          )}

          {/* Organizations Tab */}
          {(isAdmin || isSuperAdmin) && (
            <TabsContent value="organizations">
              <div className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Organizações</CardTitle>
                    <CardDescription>{filtered.length} resultados</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome / Email</TableHead>
                            <TableHead>Plano</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-center">Unidades</TableHead>
                            <TableHead className="text-center">WhatsApp</TableHead>
                            <TableHead className="text-center">IA</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((org) => {
                            const isTrialActive = org.trial_ends_at && new Date(org.trial_ends_at) > new Date();
                            return (
                              <TableRow key={org.user_id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm">{org.full_name || 'Sem nome'}</p>
                                    <p className="text-xs text-muted-foreground">{org.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <Badge variant="secondary" className="text-xs">
                                      {planLabels[org.plan_id] || org.plan_id}
                                    </Badge>
                                    {org.is_early_adopter && (
                                      <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 dark:text-amber-400">EA</Badge>
                                    )}
                                    {isTrialActive && (
                                      <Badge variant="outline" className="text-xs">Trial</Badge>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={statusColors[org.subscription_status] as 'default' | 'secondary' | 'destructive' | 'outline'}>
                                    {statusLabels[org.subscription_status] || org.subscription_status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-sm font-medium">{org.units_count}</span>
                                  {org.extra_unit_packs > 0 && (
                                    <span className="text-xs text-muted-foreground ml-1">(+{org.extra_unit_packs * 50})</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="text-sm">
                                    <span className="font-medium">{org.whatsapp_credits}</span>
                                    <span className="text-xs text-muted-foreground ml-1">créditos</span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{org.whatsapp_sent_month} enviadas/mês</p>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-sm font-medium">{org.ai_credits}</span>
                                  <span className="text-xs text-muted-foreground ml-1">créditos</span>
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {isAdmin && (
                                      <>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Alterar Plano"
                                          onClick={() => openPlanDialog(org)}>
                                          <Crown className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Adicionar Créditos"
                                          onClick={() => { setCreditAmount(''); setCreditReason(''); setCreditType('whatsapp'); setCreditsDialog(org); }}>
                                          <Plus className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Ajustar Limites"
                                          onClick={() => openLimitsDialog(org)}>
                                          <Settings2 className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          {filtered.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                Nenhuma organização encontrada.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Roles Tab - super_admin only */}
          {isSuperAdmin && (
            <TabsContent value="roles">
              <div className="space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Gerenciamento de Roles</CardTitle>
                    <CardDescription>Apenas super admins podem gerenciar roles</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome / Email</TableHead>
                            <TableHead>Roles Atuais</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filtered.map((org) => (
                            <TableRow key={org.user_id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium text-sm">{org.full_name || 'Sem nome'}</p>
                                  <p className="text-xs text-muted-foreground">{org.email}</p>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {(org.roles || []).map((role) => (
                                    <Badge key={role} variant="outline" className="text-xs">
                                      {role === 'super_admin' ? '🛡️ Super Admin' : role}
                                    </Badge>
                                  ))}
                                  {(!org.roles || org.roles.length === 0) && (
                                    <span className="text-xs text-muted-foreground">Assinante</span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerenciar Roles"
                                  onClick={() => setRoleDialog(org)}>
                                  <UserCog className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* Support Tab */}
          {isSupport && (
            <TabsContent value="support">
              <CockpitSupportTab />
            </TabsContent>
          )}

          {/* Blog Tab - super_admin only */}
          {isSuperAdmin && (
            <TabsContent value="blog">
              <CockpitBlogTab />
            </TabsContent>
          )}

          {/* Settings Tab - super_admin only */}
          {isSuperAdmin && (
            <TabsContent value="settings">
              <CockpitSettingsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Change Plan Dialog */}
      <Dialog open={!!planDialog} onOpenChange={() => setPlanDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" /> Alterar Plano
            </DialogTitle>
            <DialogDescription>
              {planDialog?.full_name} ({planDialog?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Novo Plano</Label>
              <Select value={newPlan} onValueChange={setNewPlan}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Gratuito</SelectItem>
                  <SelectItem value="essencial">Essencial</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Motivo (obrigatório)</Label>
              <Textarea value={planReason} onChange={(e) => setPlanReason(e.target.value)}
                placeholder="Ex: Upgrade cortesia, suporte comercial..." rows={2} />
            </div>
            <Button className="w-full" onClick={handleChangePlan} disabled={submitting || !planReason}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Alterar Plano
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Roles Dialog - super_admin only */}
      <Dialog open={!!roleDialog} onOpenChange={() => setRoleDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" /> Gerenciar Roles
            </DialogTitle>
            <DialogDescription>
              {roleDialog?.full_name} ({roleDialog?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {['super_admin', 'admin', 'moderator', 'support'].map((role) => (
              <div key={role} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm capitalize">{role.replace('_', ' ')}</p>
                  <p className="text-xs text-muted-foreground">
                    {role === 'super_admin' && 'Acesso total — gestão global e roles'}
                    {role === 'admin' && 'Planos, créditos e limites — sem roles'}
                    {role === 'moderator' && 'CRUD de conteúdos na aba Treinamentos'}
                    {role === 'support' && 'Visualização de usuários e logs — somente leitura'}
                  </p>
                </div>
                <Switch
                  checked={roleDialog?.roles?.includes(role) || false}
                  disabled={submitting}
                  onCheckedChange={() => roleDialog && handleToggleRole(roleDialog, role)}
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground text-center">
              Alterações são aplicadas imediatamente e registradas no log de auditoria.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Credits Dialog */}
      <Dialog open={!!creditsDialog} onOpenChange={() => setCreditsDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" /> Adicionar Créditos
            </DialogTitle>
            <DialogDescription>
              {creditsDialog?.full_name} ({creditsDialog?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Crédito</Label>
              <Select value={creditType} onValueChange={setCreditType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">
                    <div className="flex items-center gap-2"><MessageSquare className="h-4 w-4" /> WhatsApp</div>
                  </SelectItem>
                  <SelectItem value="ai">
                    <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> IA</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input type="number" min="1" value={creditAmount} onChange={(e) => setCreditAmount(e.target.value)} placeholder="Ex: 500" />
            </div>
            <div className="space-y-2">
              <Label>Motivo (obrigatório)</Label>
              <Textarea value={creditReason} onChange={(e) => setCreditReason(e.target.value)}
                placeholder="Ex: Bônus por falha no sistema..." rows={2} />
            </div>
            <Button className="w-full" onClick={handleAddCredits} disabled={submitting || !creditAmount || !creditReason}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Adicionar Créditos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Adjust Limits Dialog */}
      <Dialog open={!!limitsDialog} onOpenChange={() => setLimitsDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" /> Ajustar Limites
            </DialogTitle>
            <DialogDescription>
              {limitsDialog?.full_name} ({limitsDialog?.email})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Users className="h-4 w-4" /> Usuários Extras</Label>
              <Input type="number" min="0" value={extraUsers} onChange={(e) => setExtraUsers(parseInt(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Cada unidade = 1 usuário adicional (R$ 19,90/mês)</p>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Building2 className="h-4 w-4" /> Packs de Unidades Extras (+50 cada)</Label>
              <Input type="number" min="0" value={extraUnits} onChange={(e) => setExtraUnits(parseInt(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground">Cada pack = +50 unidades (R$ 29,90/mês)</p>
            </div>
            <div className="space-y-2">
              <Label>Motivo (obrigatório)</Label>
              <Textarea value={limitReason} onChange={(e) => setLimitReason(e.target.value)}
                placeholder="Ex: Ajuste manual solicitado pelo cliente..." rows={2} />
            </div>
            <Button className="w-full" onClick={handleAdjustLimits} disabled={submitting || !limitReason}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar Ajustes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdminCockpit;
