import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Building2, 
  LayoutGrid, 
  Users, 
  Kanban,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AppLayout } from '@/components/AppLayout';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';

interface AuditLog {
  id: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
  broker_id: string;
}

interface Profile {
  full_name: string;
  avatar_url: string | null;
}

const TABLE_LABELS: Record<string, string> = {
  units: 'Unidade',
  leads: 'Lead',
  deals: 'Negócio',
  properties: 'Empreendimento',
  visits: 'Visita',
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'Criação',
  UPDATE: 'Atualização',
  DELETE: 'Exclusão',
};

const TABLE_ICONS: Record<string, typeof LayoutGrid> = {
  units: LayoutGrid,
  leads: Users,
  deals: Kanban,
  properties: Building2,
  visits: CalendarDays,
};

const ACTION_COLORS: Record<string, 'default' | 'secondary' | 'destructive'> = {
  INSERT: 'default',
  UPDATE: 'secondary',
  DELETE: 'destructive',
};

const ITEMS_PER_PAGE = 20;

const ActivityHistory = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [filterTable, setFilterTable] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadLogs();
      loadProfile();
    }
  }, [user]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterTable, filterAction, filterPeriod, searchQuery]);

  const loadLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const toggleExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getRecordIdentifier = (log: AuditLog): string => {
    const data = log.new_data || log.old_data;
    if (!data) return log.record_id || 'N/A';
    
    if (data.name) return data.name;
    if (data.unit_number) return `Unidade ${data.unit_number}`;
    if (data.title) return data.title;
    
    return log.record_id?.slice(0, 8) || 'N/A';
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return Plus;
      case 'UPDATE':
        return Pencil;
      case 'DELETE':
        return Trash2;
      default:
        return Pencil;
    }
  };

  const formatChanges = (log: AuditLog): { key: string; old: string; new: string }[] => {
    if (log.action === 'INSERT') {
      return Object.entries(log.new_data || {})
        .filter(([key]) => !['id', 'broker_id', 'created_at', 'updated_at'].includes(key))
        .slice(0, 5)
        .map(([key, value]) => ({
          key,
          old: '-',
          new: String(value ?? '-'),
        }));
    }

    if (log.action === 'DELETE') {
      return Object.entries(log.old_data || {})
        .filter(([key]) => !['id', 'broker_id', 'created_at', 'updated_at'].includes(key))
        .slice(0, 5)
        .map(([key, value]) => ({
          key,
          old: String(value ?? '-'),
          new: '-',
        }));
    }

    // UPDATE - show changed fields only
    const changes: { key: string; old: string; new: string }[] = [];
    const oldData = log.old_data || {};
    const newData = log.new_data || {};

    Object.keys(newData).forEach(key => {
      if (['id', 'broker_id', 'created_at', 'updated_at'].includes(key)) return;
      if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
        changes.push({
          key,
          old: String(oldData[key] ?? '-'),
          new: String(newData[key] ?? '-'),
        });
      }
    });

    return changes.slice(0, 10);
  };

  const getPeriodStartDate = (period: string): Date | null => {
    const now = new Date();
    switch (period) {
      case 'today':
        return startOfDay(now);
      case 'week':
        return subWeeks(now, 1);
      case 'month':
        return subMonths(now, 1);
      default:
        return null;
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filter by table
      if (filterTable !== 'all' && log.table_name !== filterTable) return false;
      
      // Filter by action
      if (filterAction !== 'all' && log.action !== filterAction) return false;
      
      // Filter by period
      if (filterPeriod !== 'all') {
        const periodStart = getPeriodStartDate(filterPeriod);
        if (periodStart && !isAfter(new Date(log.created_at), periodStart)) {
          return false;
        }
      }
      
      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const identifier = getRecordIdentifier(log).toLowerCase();
        const tableLabel = (TABLE_LABELS[log.table_name] || log.table_name).toLowerCase();
        const actionLabel = (ACTION_LABELS[log.action] || log.action).toLowerCase();
        
        if (!identifier.includes(query) && !tableLabel.includes(query) && !actionLabel.includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [logs, filterTable, filterAction, filterPeriod, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / ITEMS_PER_PAGE);
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredLogs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredLogs, currentPage]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  if (loading || loadingLogs) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <AppLayout title="Histórico de Atividades">
      <div className="space-y-6">
        <div>
          <p className="text-muted-foreground">
            Acompanhe todas as alterações realizadas no sistema
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, tipo ou ação..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterTable} onValueChange={setFilterTable}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="units">Unidades</SelectItem>
                  <SelectItem value="leads">Leads</SelectItem>
                  <SelectItem value="deals">Negócios</SelectItem>
                  <SelectItem value="properties">Empreendimentos</SelectItem>
                  <SelectItem value="visits">Visitas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas ações</SelectItem>
                <SelectItem value="INSERT">Criações</SelectItem>
                <SelectItem value="UPDATE">Atualizações</SelectItem>
                <SelectItem value="DELETE">Exclusões</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Última semana</SelectItem>
                <SelectItem value="month">Último mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count */}
        <div className="text-sm text-muted-foreground">
          {filteredLogs.length} {filteredLogs.length === 1 ? 'registro encontrado' : 'registros encontrados'}
          {totalPages > 1 && ` • Página ${currentPage} de ${totalPages}`}
        </div>

        {/* Activity List */}
        <div className="space-y-3">
          {paginatedLogs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Nenhuma atividade encontrada</p>
              </CardContent>
            </Card>
          ) : (
            paginatedLogs.map((log, index) => {
              const ActionIcon = getActionIcon(log.action);
              const TableIcon = TABLE_ICONS[log.table_name] || LayoutGrid;
              const isExpanded = expandedLogs.has(log.id);
              const changes = formatChanges(log);

              return (
                <Card 
                  key={log.id} 
                  className="animate-fade-in overflow-hidden"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(log.id)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                            <TableIcon className="h-5 w-5 text-muted-foreground" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant={ACTION_COLORS[log.action]}>
                                <ActionIcon className="h-3 w-3 mr-1" />
                                {ACTION_LABELS[log.action] || log.action}
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {TABLE_LABELS[log.table_name] || log.table_name}
                              </span>
                            </div>
                            
                            <CardTitle className="text-base font-medium mt-1 truncate">
                              {getRecordIdentifier(log)}
                            </CardTitle>
                            
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={profile?.avatar_url || ''} />
                                  <AvatarFallback className="text-[10px]">
                                    {profile?.full_name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{profile?.full_name || 'Usuário'}</span>
                              </div>
                              <span>•</span>
                              <span>
                                {format(new Date(log.created_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </div>

                          <Button variant="ghost" size="icon" className="shrink-0">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4">
                        <div className="border-t pt-4">
                          <p className="text-sm font-medium mb-3">Detalhes da alteração:</p>
                          {changes.length > 0 ? (
                            <div className="space-y-2">
                              {changes.map((change, idx) => (
                                <div key={idx} className="text-sm grid grid-cols-3 gap-2 py-1 border-b border-dashed last:border-0">
                                  <span className="text-muted-foreground font-mono text-xs">
                                    {change.key}
                                  </span>
                                  <span className="text-destructive/70 line-through truncate" title={change.old}>
                                    {change.old.slice(0, 30)}{change.old.length > 30 ? '...' : ''}
                                  </span>
                                  <span className="text-green-600 truncate" title={change.new}>
                                    {change.new.slice(0, 30)}{change.new.length > 30 ? '...' : ''}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Sem alterações detalhadas disponíveis
                            </p>
                          )}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => goToPage(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => goToPage(pageNum)}
                      isActive={currentPage === pageNum}
                      className="cursor-pointer"
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => goToPage(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </AppLayout>
  );
};

export default ActivityHistory;
