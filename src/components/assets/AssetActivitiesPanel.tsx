import { useMemo, useState } from 'react';
import type { DateRange as RDPRange } from 'react-day-picker';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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
  type AssetOption,
  type EditingActivity,
} from '@/components/assets/ActivityFormDialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { format, parseISO, startOfMonth, endOfDay, subYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  Layers,
  MoreVertical,
  Pencil,
  Trash2,
  RotateCcw,
  CalendarDays,
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

const brl = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export interface AssetActivitiesPanelProps {
  /** Restricts the list to a single unit */
  scopeUnitId?: string;
  /** Restricts the list to a single property */
  scopePropertyId?: string;
  /** Label used for the locked asset on the create dialog when scoped */
  scopeAssetLabel?: string;
  /** Show the "Imóvel" filter + column. Ignored (forced off) when scoped. */
  showAssetColumn?: boolean;
  /** Render the internal "Nova atividade" button (default: true when uncontrolled) */
  showNewButton?: boolean;
  /** When false, hides the create button and the per-row actions (read-only) */
  canManage?: boolean;
  /** Controlled create dialog — lets the parent render its own trigger button */
  createDialogOpen?: boolean;
  onCreateDialogOpenChange?: (open: boolean) => void;
}

export function AssetActivitiesPanel({
  scopeUnitId,
  scopePropertyId,
  scopeAssetLabel,
  showAssetColumn = true,
  showNewButton,
  canManage = true,
  createDialogOpen,
  onCreateDialogOpenChange,
}: AssetActivitiesPanelProps) {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const brokerId = effectiveBrokerId || user?.id || null;
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isScoped = !!(scopeUnitId || scopePropertyId);
  const withAssetColumn = showAssetColumn && !isScoped;
  const isCreateControlled = createDialogOpen !== undefined;

  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const dialogOpen = isCreateControlled ? !!createDialogOpen : internalDialogOpen;
  const setDialogOpen = (open: boolean) => {
    if (isCreateControlled) onCreateDialogOpenChange?.(open);
    else setInternalDialogOpen(open);
  };
  const renderNewButton = (showNewButton ?? !isCreateControlled) && canManage;

  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>(() => ({
    from: isScoped ? subYears(new Date(), 2) : startOfMonth(new Date()),
    to: new Date(),
  }));
  const [periodOpen, setPeriodOpen] = useState(false);
  const [pendingPeriod, setPendingPeriod] = useState<RDPRange | undefined>({
    from: dateRange.from,
    to: dateRange.to,
  });
  const [typeFilter, setTypeFilter] = useState('all');
  const [contactFilter, setContactFilter] = useState('all');
  const [assetFilter, setAssetFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editingActivity, setEditingActivity] = useState<EditingActivity | null>(null);
  const [editingAsset, setEditingAsset] = useState<AssetOption | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ActivityRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: [
      'activities-list',
      brokerId,
      dateRange.from.toISOString(),
      dateRange.to.toISOString(),
      scopeUnitId || null,
      scopePropertyId || null,
    ],
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

      if (scopeUnitId) query = query.eq('unit_id', scopeUnitId);
      if (scopePropertyId) query = query.eq('property_id', scopePropertyId);

      const fromDate = format(dateRange.from, 'yyyy-MM-dd');
      const toDate = format(endOfDay(dateRange.to), "yyyy-MM-dd'T'HH:mm:ss");
      query = query.gte('created_at', fromDate).lte('created_at', toDate);

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
      if (withAssetColumn && assetFilter !== 'all') {
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
  }, [activities, typeFilter, contactFilter, assetFilter, search, data, withAssetColumn]);

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

  const setCompleted = async (row: ActivityRow, completed: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('property_activities')
        .update({
          is_completed: completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', row.id);
      if (error) throw error;
      toast({ title: completed ? 'Atividade concluída' : 'Atividade reaberta' });
      queryClient.invalidateQueries({ queryKey: ['activities-list'] });
      queryClient.invalidateQueries({ queryKey: ['asset-manual-notes'] });
    } catch (e: any) {
      toast({ title: 'Erro ao atualizar', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await (supabase as any)
        .from('property_activities')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast({ title: 'Atividade excluída' });
      queryClient.invalidateQueries({ queryKey: ['activities-list'] });
      queryClient.invalidateQueries({ queryKey: ['asset-manual-notes'] });
      setDeleteTarget(null);
    } catch (e: any) {
      toast({ title: 'Erro ao excluir', description: e.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const openEdit = (row: ActivityRow) => {
    setEditingAsset(
      row.unit_id
        ? { id: row.unit_id, type: 'unit', label: assetLabel(row) }
        : row.property_id
        ? { id: row.property_id, type: 'property', label: assetLabel(row) }
        : null,
    );
    setEditingActivity({
      id: row.id,
      title: row.title,
      description: row.description,
      activity_type: row.activity_type,
      scheduled_at: row.scheduled_at,
      estimated_cost: row.estimated_cost != null ? Number(row.estimated_cost) : null,
      assigned_contact_id: row.assigned_contact_id,
    });
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

  const StatusBadge = ({ row }: { row: ActivityRow }) =>
    row.is_completed ? (
      <Badge className="bg-emerald-500/15 text-emerald-600 gap-1 hover:bg-emerald-500/15 text-xs h-6">
        <CheckCircle2 className="h-3 w-3" /> Concluída
      </Badge>
    ) : (
      <Badge variant="outline" className="gap-1 text-xs h-6">
        <Clock className="h-3 w-3" /> Pendente
      </Badge>
    );

  const RowActions = ({ row }: { row: ActivityRow }) => {
    if (!canManage) return null;
    return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => e.stopPropagation()}
          aria-label="Ações da atividade"
        >
          <MoreVertical className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={() => openEdit(row)}>
          <Pencil className="h-3.5 w-3.5 mr-2" /> Editar
        </DropdownMenuItem>
        {row.is_completed ? (
          <DropdownMenuItem onClick={() => setCompleted(row, false)}>
            <RotateCcw className="h-3.5 w-3.5 mr-2" /> Marcar como pendente
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={() => setCompleted(row, true)}>
            <CheckCircle2 className="h-3.5 w-3.5 mr-2" /> Marcar como concluída
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => setDeleteTarget(row)}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    );
  };

  const ActivityCells = ({ row, indent }: { row: ActivityRow; indent?: boolean }) => (
    <>
      <TableCell className={cn('py-2 px-3', indent ? 'pl-10' : '')}>
        <p className="text-[11px] font-medium leading-tight">{row.title}</p>
        {row.description && (
          <p className="text-[10px] text-muted-foreground line-clamp-1">{row.description}</p>
        )}
      </TableCell>
      <TableCell className="py-2 px-3">
        <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
          {ACTIVITY_TYPE_LABELS[row.activity_type] || row.activity_type}
        </Badge>
      </TableCell>
      {withAssetColumn && (
        <TableCell className="text-[11px] py-2 px-3 leading-tight">{assetLabel(row)}</TableCell>
      )}
      <TableCell className="text-[11px] py-2 px-3 leading-tight">
        {row.assigned_contact_id ? data?.contacts[row.assigned_contact_id] || '—' : '—'}
      </TableCell>
      <TableCell className="text-[11px] py-2 px-3 whitespace-nowrap leading-tight">{renderDate(row)}</TableCell>
      <TableCell className="text-[11px] py-2 px-3 text-right whitespace-nowrap leading-tight">
        {row.estimated_cost != null ? brl(Number(row.estimated_cost)) : '—'}
      </TableCell>
      <TableCell className="py-2 px-3">
        <StatusBadge row={row} />
      </TableCell>
      <TableCell className="w-10 py-2 px-3 text-right">
        <RowActions row={row} />
      </TableCell>
    </>
  );

  const scopedAsset: AssetOption | null = scopeUnitId
    ? { id: scopeUnitId, type: 'unit', label: scopeAssetLabel || 'Esta unidade' }
    : scopePropertyId
    ? { id: scopePropertyId, type: 'property', label: scopeAssetLabel || 'Este imóvel' }
    : null;

  return (
    <>
      <div className="space-y-4">
        {renderNewButton && (
          <div className="flex justify-end">
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nova atividade
            </Button>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filtros</CardTitle>
          </CardHeader>
          <CardContent
            className={cn(
              'grid grid-cols-1 sm:grid-cols-2 gap-3',
              withAssetColumn ? 'lg:grid-cols-5' : 'lg:grid-cols-4',
            )}
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Período</Label>
              <Popover open={periodOpen} onOpenChange={setPeriodOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal h-10 min-w-0',
                      !dateRange.from && 'text-muted-foreground'
                    )}
                  >
                    <CalendarDays className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">
                      {dateRange.from && dateRange.to
                        ? `${format(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}`
                        : 'Selecione o período'}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={pendingPeriod}
                    onSelect={(range) => {
                      setPendingPeriod(range);
                      if (range?.from && range?.to) {
                        setDateRange({ from: range.from, to: range.to });
                        setPeriodOpen(false);
                      }
                    }}
                    initialFocus
                    numberOfMonths={2}
                    locale={ptBR}
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
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
            {withAssetColumn && (
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
            )}
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
                      <TableHead className="text-[11px] py-2 px-3">Atividade</TableHead>
                      <TableHead className="text-[11px] py-2 px-3">Tipo</TableHead>
                      {withAssetColumn && (
                        <TableHead className="text-[11px] py-2 px-3">Imóvel</TableHead>
                      )}
                      <TableHead className="text-[11px] py-2 px-3">Responsável</TableHead>
                      <TableHead className="text-[11px] py-2 px-3">Data</TableHead>
                      <TableHead className="text-[11px] py-2 px-3 text-right">Custo estimado</TableHead>
                      <TableHead className="text-[11px] py-2 px-3">Status</TableHead>
                      <TableHead className="text-[11px] py-2 px-3 w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedRows.map((entry) => {
                      if (entry.kind === 'single') {
                        return (
                          <TableRow
                            key={entry.row.id}
                            className="border-l-4 border-l-transparent bg-card hover:bg-muted/40"
                          >
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
                            className="cursor-pointer border-l-4 border-l-primary bg-primary/5 hover:bg-primary/10"
                            onClick={() =>
                              setExpanded((prev) => ({ ...prev, [entry.groupId]: !isOpen }))
                            }
                          >
                            <TableCell className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                {isOpen ? (
                                  <ChevronDown className="h-3.5 w-3.5 text-primary" />
                                ) : (
                                  <ChevronRight className="h-3.5 w-3.5 text-primary" />
                                )}
                                <div>
                                  <p className="text-[11px] font-semibold leading-tight">{first.title}</p>
                                  {first.description && (
                                    <p className="text-[10px] text-muted-foreground line-clamp-1">
                                      {first.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="py-2 px-3">
                              <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
                                {ACTIVITY_TYPE_LABELS[first.activity_type] || first.activity_type}
                              </Badge>
                            </TableCell>
                            {withAssetColumn && (
                              <TableCell className="py-2 px-3">
                                <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20 text-[10px] h-5 px-1.5">
                                  <Layers className="h-3 w-3" />
                                  Aplicado a {entry.rows.length} imóveis
                                </Badge>
                              </TableCell>
                            )}
                            <TableCell className="text-[11px] py-2 px-3 leading-tight">
                              {first.assigned_contact_id
                                ? data?.contacts[first.assigned_contact_id] || '—'
                                : '—'}
                            </TableCell>
                            <TableCell className="text-[11px] py-2 px-3 whitespace-nowrap leading-tight">
                              {renderDate(first)}
                            </TableCell>
                            <TableCell className="text-[11px] py-2 px-3 text-right whitespace-nowrap font-medium leading-tight">
                              {first.estimated_cost != null
                                ? brl(Number(first.estimated_cost) * entry.rows.length)
                                : '—'}
                            </TableCell>
                            <TableCell className="py-2 px-3">
                              <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                {done}/{entry.rows.length} concluídas
                              </Badge>
                            </TableCell>
                            <TableCell className="w-10 py-2 px-3" />
                          </TableRow>
                          {isOpen &&
                            entry.rows.map((row) => (
                              <TableRow
                                key={row.id}
                                className="border-l-4 border-l-primary/40 bg-muted/20 hover:bg-muted/40"
                              >
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

      <ActivityFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        {...(scopedAsset ? { defaultAsset: scopedAsset, lockAsset: true } : {})}
      />

      <ActivityFormDialog
        open={!!editingActivity}
        onOpenChange={(o) => {
          if (!o) {
            setEditingActivity(null);
            setEditingAsset(null);
          }
        }}
        defaultAsset={editingAsset}
        lockAsset
        editingActivity={editingActivity}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir atividade?</AlertDialogTitle>
            <AlertDialogDescription>
              A atividade "{deleteTarget?.title}" será removida permanentemente deste imóvel. Outras
              atividades do mesmo grupo não serão afetadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AssetActivitiesPanel;
