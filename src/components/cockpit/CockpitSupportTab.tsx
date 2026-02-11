import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Loader2, User, Clock, ChevronRight, ArrowLeft, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface SupportUser {
  user_id: string;
  full_name: string;
  email: string;
  created_at: string;
  last_activity: string;
  plan_id: string;
  subscription_status: string;
  trial_ends_at: string | null;
  current_period_end: string | null;
  units_count: number;
  contacts_count: number;
  deals_count: number;
  transactions_count: number;
  roles: string[];
}

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  metadata: any;
  created_at: string;
}

const planLabels: Record<string, string> = {
  free: 'Gratuito', essencial: 'Essencial', pro: 'Pro', business: 'Business',
};

const statusLabels: Record<string, string> = {
  active: 'Ativa', trialing: 'Trial', past_due: 'Inadimplente', cancelled: 'Cancelada', none: 'Sem assinatura',
};

export function CockpitSupportTab() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<SupportUser | null>(null);

  const { data: activeDebugSession } = useQuery({
    queryKey: ['debug-session', selectedUser?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_debug_sessions')
        .select('*')
        .eq('target_user_id', selectedUser!.user_id)
        .eq('is_active', true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedUser,
  });

  const toggleDebugSession = useMutation({
    mutationFn: async (activate: boolean) => {
      if (activate) {
        const { error } = await supabase.from('support_debug_sessions').insert({
          target_user_id: selectedUser!.user_id,
          started_by: currentUser!.id,
          is_active: true,
        });
        if (error) throw error;
      } else if (activeDebugSession) {
        const { error } = await supabase
          .from('support_debug_sessions')
          .update({ is_active: false, ended_at: new Date().toISOString() })
          .eq('id', activeDebugSession.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, activate) => {
      queryClient.invalidateQueries({ queryKey: ['debug-session', selectedUser?.user_id] });
      toast.success(activate ? 'Sessão de debug ativada' : 'Sessão de debug desativada');
    },
    onError: () => toast.error('Erro ao alterar sessão de debug'),
  });

  const { data: searchResults, isLoading: searching } = useQuery({
    queryKey: ['support-search', searchTerm],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_support_info', { p_search: searchTerm });
      if (error) throw error;
      return (data as unknown as SupportUser[]) || [];
    },
    enabled: searchTerm.length >= 2,
  });

  const { data: auditLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['support-audit-logs', selectedUser?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_audit_logs', {
        p_target_user_id: selectedUser!.user_id,
        p_limit: 100,
      });
      if (error) throw error;
      return (data as unknown as AuditLog[]) || [];
    },
    enabled: !!selectedUser,
  });

  const handleSearch = () => {
    if (searchQuery.length >= 2) setSearchTerm(searchQuery);
  };

  if (selectedUser) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar à busca
        </Button>

        {/* User profile card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">{selectedUser.full_name || 'Sem nome'}</CardTitle>
                <CardDescription>{selectedUser.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Plano</p>
                <Badge variant="secondary">{planLabels[selectedUser.plan_id] || selectedUser.plan_id}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-medium">{statusLabels[selectedUser.subscription_status] || selectedUser.subscription_status}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Cadastro</p>
                <p className="font-medium">{format(new Date(selectedUser.created_at), 'dd/MM/yyyy', { locale: ptBR })}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Última atividade</p>
                <p className="font-medium">{format(new Date(selectedUser.last_activity), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{selectedUser.units_count}</p>
                <p className="text-muted-foreground text-xs">Unidades</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{selectedUser.contacts_count}</p>
                <p className="text-muted-foreground text-xs">Contatos</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{selectedUser.deals_count}</p>
                <p className="text-muted-foreground text-xs">Negócios</p>
              </div>
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <p className="text-2xl font-bold">{selectedUser.transactions_count}</p>
                <p className="text-muted-foreground text-xs">Transações</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Debug Session Toggle */}
        <Card>
          <CardContent className="flex items-center justify-between py-4 px-6">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">Sessão de Debug</p>
                <p className="text-xs text-muted-foreground">
                  {activeDebugSession ? 'Ativa — iniciada em ' + format(new Date(activeDebugSession.started_at), 'dd/MM HH:mm', { locale: ptBR }) : 'Inativa'}
                </p>
              </div>
            </div>
            <Switch
              checked={!!activeDebugSession}
              onCheckedChange={(checked) => toggleDebugSession.mutate(checked)}
              disabled={toggleDebugSession.isPending}
            />
          </CardContent>
        </Card>

        {/* Audit Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" /> Timeline de Ações
            </CardTitle>
            <CardDescription>Últimas {auditLogs?.length || 0} ações registradas</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {logsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tabela</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(auditLogs || []).map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {format(new Date(log.created_at), 'dd/MM HH:mm:ss', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{log.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">{log.table_name}</TableCell>
                        <TableCell className="text-xs max-w-[300px] truncate">
                          {log.metadata ? JSON.stringify(log.metadata) : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!auditLogs || auditLogs.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          Nenhum log encontrado para este usuário.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Buscar Usuário</CardTitle>
          <CardDescription>Pesquise por nome ou email para visualizar informações e logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite o nome ou email do usuário..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={searchQuery.length < 2}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {searchResults && searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{searchResults.length} resultado(s)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome / Email</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Unidades</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {searchResults.map((user) => (
                  <TableRow key={user.user_id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedUser(user)}>
                    <TableCell>
                      <p className="font-medium text-sm">{user.full_name || 'Sem nome'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{planLabels[user.plan_id] || user.plan_id}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{statusLabels[user.subscription_status] || user.subscription_status}</TableCell>
                    <TableCell className="text-center text-sm">{user.units_count}</TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {searchResults && searchResults.length === 0 && (
        <p className="text-center text-muted-foreground py-8">Nenhum usuário encontrado.</p>
      )}
    </div>
  );
}
