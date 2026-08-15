import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  ActivityFormDialog,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
} from '@/components/assets/ActivityFormDialog';
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus,
  Wrench,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';

interface ActivityRow {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  scheduled_at: string | null;
  created_at: string;
  is_completed: boolean;
  completed_at: string | null;
  outcome: string | null;
  estimated_cost: number | null;
  activity_group_id: string | null;
  assigned_contact_id: string | null;
  financial_transaction_id: string | null;
  property_id: string | null;
  unit_id: string | null;
}

const PERIOD_OPTIONS = [
  { value: '30', label: 'Últimos 30 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: '365', label: 'Último ano' },
  { value: 'all', label: 'Todo o histórico' },
];

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export default function Manutencoes() {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const brokerId = effectiveBrokerId || user?.id || null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [period, setPeriod] = useState('90');
  const [typeFilter, setTypeFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['activities-list', brokerId, period],
    queryFn: async () => {
      if (!brokerId) return { activities: [] as ActivityRow[], units: {}, properties: {}, contacts: {} };

      let query = (supabase as any)
        .from('property_activities')
        .select(
          'id, activity_type, title, description, scheduled_at, created_at, is_completed, completed_at, outcome, estimated_cost, activity_group_id, assigned_contact_id, financial_transaction_id, property_id, unit_id',
        )
        .eq('broker_id', brokerId)
        .order('scheduled_at', { ascending: false, nullsFirst: false })
        .limit(500);

      if (period !== 'all') {
        const since = format(subDays(new Date(), parseInt(period, 10)), 'yyyy-MM-dd');
        query = query.gte('created_at', since);
      }

      const { data: activities, error } = await query;
      if (error) throw error;
      const rows = (activities || []) as ActivityRow[];

      const unitIds = [...new Set(rows.map((r) => r.unit_id).filter(Boolean))] as string[];
      const propertyIds = [...new Set(rows.map((r) => r.property_id).filter(Boolean))] as string[];
      const contactIds = [
        ...new Set(rows.map((r) => r.assigned_contact_id).filter(Boolean)),
      ] as string[];

      const [unitsRes, propsRes, contactsRes] = await Promise.all([
        unitIds.length
          ? supabase.from('units').select('id, unit_number, address').in('id', unitIds)
          : Promise.resolve({ data: [] as any[] }),
        propertyIds.length
          ? supabase.from('properties').select('id, name').in('id', propertyIds)
          : Promise.resolve({ data: [] as any[] }),
        contactIds.length
          ? supabase.from('contacts').select('id, name').in('id', contactIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const units: Record<string, string> = {};
      (unitsRes.data || []).forEach((u: any) => {
        units[u.id] = u.unit_number || u.address || 'Unidade';
      });
      const properties: Record<string, string> = {};
      (propsRes.data || []).forEach((p: any) => {
        properties[p.id] = p.name || 'Empreendimento';
      });
      const contacts: Record<string, string> = {};
      (contactsRes.data || []).forEach((c: any) => {
        contacts[c.id] = c.name;
      });

      return { activities: rows, units, properties, contacts };
    },
    enabled: !!brokerId,
    staleTime: 30_000,
  });

  const activities = data?.activities || [];
  const assetLabel = (row: ActivityRow) =>
    row.unit_id
      ? data?.units[row.unit_id] || 'Unidade'
      : row.property_id
      ? data?.properties[row.property_id] || 'Empreendimento'
      : '—';

  const contactOptions = useMemo(() => {
    const entries = Object.entries(data?.contacts || {});
    return entries.sort((a, b) => a[1].localeCompare(b[1]));
  }, [data?.contacts]);

  const assetOptions = useMemo(() => {
    const map = new Map<string, string>();
    activities.forEach((a) => {
      if (a.unit_id) map.set(`unit:${a.unit_id}`, data?.units[a.unit_id] || 'Unidade');
      if (a.property_id)
        map.set(`property:${a.property_id}`, data?.properties[a.property_id] || 'Empreendimento');
    });
    return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [activities, data]);

  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (typeFilter !== 'all' && a.activity_type !== typeFilter) return false;
      if (contactFilter !== 'all' && a.assigned_contact_id !== contactFilter) return false;
      if (assetFilter !== 'all') {
        const key = a.unit_id ? `unit:${a.unit_id}` : a.property_id ? `property:${a.property_id}` : '';
        if (key !== assetFilter) return false;
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const haystack = `${a.title} ${a.description || ''} ${assetLabel(a)}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities, typeFilter, contactFilter, assetFilter, search, data]);

  /** Rows grouped by activity_group_id (ungrouped rows stay standalone) */
  const groupedRows = useMemo(() => {
    const groups = new Map<string, ActivityRow[]>();
    const singles: ActivityRow[] = [];
    filtered.forEach((a) => {
      if (a.activity_group_id) {
        const list = groups.get(a.activity_group_id) || [];
        list.push(a);
        groups.set(a.activity_group_id, list);
      } else {
        singles.push(a);
      }
    });

    const result: Array<
      { kind: 'single'; row: ActivityRow } | { kind: 'group'; groupId: string; rows: ActivityRow[] }
    > = [
      ...singles.map((row) => ({ kind: 'single' as const, row })),
      ...[...groups.entries()].map(([groupId, rows]) =>
        rows.length > 1
          ? { kind: 'group' as const, groupId, rows }
          : { kind: 'single' as const, row: rows[0] },
      ),
    ];

    const dateOf = (r: ActivityRow) => new Date(r.scheduled_at || r.created_at).getTime();
    result.sort((a, b) => {
      const da = a.kind === 'single' ? dateOf(a.row) : Math.max(...a.rows.map(dateOf));
      const db = b.kind === 'single' ? dateOf(b.row) : Math.max(...b.rows.map(dateOf));
      return db - da;
    });
    return result;
  }, [filtered]);

  const toggleCompleted = async (row: ActivityRow) => {
    try {
      const { error } = await (supabase as any)
        .from('property_activities')
        .update({
          is_completed: !row.is_completed,
          completed_at: !row.is_completed ? new Date().toISOString() : null,
        })
        .eq('id', row.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['activities-list'] });
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' });
    }
  };

  const renderDate = (row: ActivityRow) => {
    const base = row.scheduled_at || row.created_at;
    if (!base) return '—';
    try {
      return format(parseISO(base), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '—';
    }
  };

  const StatusBadge = ({ row }: { row: ActivityRow }) => (
    <button type="button" onClick={() => toggleCompleted(row)} className="focus:outline-none">
      {row.is_completed ? (
        <Badge className="bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/25 gap-1">
          <CheckCircle2 className="h-3 w-3" /> Concluída
        </Badge>
      ) : (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" /> Pendente
        </Badge>
      )}
    </button>
  );

  const ActivityCells = ({ row, indent }: { row: ActivityRow; indent?: boolean }) => (
    <>
      <TableCell className={indent ? 'pl-10' : ''}>
        <p className="text-sm font-medium">{row.title}</p>
        {row.description && (
          <p className="text-xs text-muted-foreground line-clamp-1">{row.description}</p>
        )}
      </TableCell>
      <TableCell>
        <Badge variant="secondary">
          {ACTIVITY_TYPE_LABELS[row.activity_type] || row.activity_type}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">{assetLabel(row)}</TableCell>
      <TableCell className="text-sm">
        {row.assigned_contact_id ? data?.contacts[row.assigned_contact_id] || '—' : '—'}
      </TableCell>
      <TableCell className="text-sm whitespace-nowrap">{renderDate(row)}</TableCell>
      <TableCell className="text-sm text-right whitespace-nowrap">
        {row.estimated_cost != null ? brl(Number(row.estimated_cost)) : '—'}
      </TableCell>
      <TableCell>
        <StatusBadge row={row} />
      </TableCell>
    </>
  );

  return (
    <AppLayout title="Manutenções">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Manutenções
            </h1>
            <p className="text-sm text-muted-foreground">
              Registre e acompanhe manutenções, vistorias, reformas e demais atividades dos imóveis.
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova atividade
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtros</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Período</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Responsável</Label>
              <Select value={contactFilter} onValueChange={setContactFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {contactOptions.map(([id, name]) => (
                    <SelectItem key={id} value={id}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Imóvel</Label>
              <Select value={assetFilter} onValueChange={setAssetFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {assetOptions.map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Buscar</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Título, descrição..."
              />
            </div>
          </CardContent>
        </Card>

        {/* List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Atividades ({filtered.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : groupedRows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhuma atividade encontrada para os filtros selecionados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Atividade</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Imóvel</TableHead>
                      <TableHead>Responsável</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Custo estimado</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRows.map((entry) => {
                      if (entry.kind === 'single') {
                        return (
                          <TableRow key={entry.row.id}>
                            <ActivityCells row={entry.row} />
                          </TableRow>
                        );
                      }
                      const isOpen = !!expanded[entry.groupId];
                      const first = entry.rows[0];
                      const done = entry.rows.filter((r) => r.is_completed).length;
                      return (
                        <>
                          <TableRow
                            key={entry.groupId}
                            className="cursor-pointer bg-muted/30"
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [entry.groupId]: !isOpen }))
                            }
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{first.title}</p>
                                  {first.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {first.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary">
                                {ACTIVITY_TYPE_LABELS[first.activity_type] || first.activity_type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="gap-1">
                                <Layers className="h-3 w-3" />
                                Aplicado a {entry.rows.length} imóveis
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {first.assigned_contact_id
                                ? data?.contacts[first.assigned_contact_id] || '—'
                                : '—'}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              {renderDate(first)}
                            </TableCell>
                            <TableCell className="text-sm text-right whitespace-nowrap">
                              {first.estimated_cost != null
                                ? brl(Number(first.estimated_cost) * entry.rows.length)
                                : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {done}/{entry.rows.length} concluídas
                              </Badge>
                            </TableCell>
                          </TableRow>
                          {isOpen &&
                            entry.rows.map((row) => (
                              <TableRow key={row.id} className="bg-background">
                                <ActivityCells row={row} indent />
                              </TableRow>
                            ))}
                        </>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <ActivityFormDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppLayout>
  );
}
