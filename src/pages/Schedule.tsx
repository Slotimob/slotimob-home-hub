import { useState, useMemo } from "react";
import { TeamFilter } from "@/components/shared/TeamFilter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, Clock, MapPin, User, CheckCircle2, Briefcase, RefreshCw } from "lucide-react";
import { PermissionGate } from "@/components/subscription/PermissionGate";
import { HeaderButton } from "@/components/ui/header-button";
import { format, isSameDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateVisitDialog } from "@/components/CreateVisitDialog";
import { AppLayout } from "@/components/AppLayout";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { ActivityPalette, ACTIVITY_TYPES } from "@/components/schedule/ActivityPalette";
import { DayScheduleGrid } from "@/components/schedule/DayScheduleGrid";
import { WeekScheduleGrid } from "@/components/schedule/WeekScheduleGrid";
import { CreateActivityDialog } from "@/components/schedule/CreateActivityDialog";
import { ScheduleActivityDetailDialog } from "@/components/schedule/ScheduleActivityDetailDialog";
import { CalendarSyncDialog } from "@/components/schedule/CalendarSyncDialog";
import { NegotiationScheduleCard } from "@/components/schedule/NegotiationScheduleCard";
import { ScheduleCalendar } from "@/components/schedule/ScheduleCalendar";
import { useNegotiationScheduleItems } from "@/hooks/useNegotiationScheduleItems";
import { useScheduleEventCounts } from "@/hooks/useScheduleEventCounts";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Schedule() {
  const { user } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'day' | 'week'>('day');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedActivityType, setDraggedActivityType] = useState<string | null>(null);
  const [createActivityDialog, setCreateActivityDialog] = useState<{
    open: boolean;
    activityType: string;
    date: Date;
    hour: number;
  }>({ open: false, activityType: '', date: new Date(), hour: 9 });

  // Activity detail dialog state
  const [activityDetailDialog, setActivityDetailDialog] = useState<{
    open: boolean;
    activity: any | null;
  }>({ open: false, activity: null });

  const handleActivityClick = (activity: any) => {
    setActivityDetailDialog({ open: true, activity });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Helper to apply team filter to a query
  const applyTeamFilter = (query: any, userIdCol = 'assigned_user_id') => {
    if (teamFilter === 'mine') {
      return query.eq(userIdCol, user?.id);
    } else if (teamFilter !== 'all') {
      return query.eq(userIdCol, teamFilter);
    }
    return query;
  };

  // Fetch ALL visits for event counting (not filtered by date)
  const { data: allVisits } = useQuery({
    queryKey: ["all-visits", effectiveBrokerId, currentMonth.toISOString(), teamFilter],
    queryFn: async () => {
      const monthStart = startOfMonth(subMonths(currentMonth, 1));
      const monthEnd = endOfMonth(addMonths(currentMonth, 1));
      
      let query = supabase
        .from("visits")
        .select(`
          id,
          scheduled_at,
          status,
          lead_confirmed,
          leads!visits_lead_id_fkey (name, phone, email),
          units!visits_unit_id_fkey (unit_number, price, area),
          properties!visits_property_id_fkey (name, address)
        `)
        .eq("broker_id", effectiveBrokerId!)
        .gte("scheduled_at", monthStart.toISOString())
        .lte("scheduled_at", monthEnd.toISOString())
        .order("scheduled_at", { ascending: true });

      query = applyTeamFilter(query);

      const { data, error } = await query;
      if (error) throw error;
      return data as any;
    },
    enabled: !!effectiveBrokerId,
  });

  // Fetch ALL activities for event counting
  const { data: allActivities } = useQuery({
    queryKey: ["all-schedule-activities", effectiveBrokerId, currentMonth.toISOString()],
    queryFn: async () => {
      const monthStart = startOfMonth(subMonths(currentMonth, 1));
      const monthEnd = endOfMonth(addMonths(currentMonth, 1));

      const { data, error } = await supabase
        .from("schedule_activities")
        .select(`
          id,
          scheduled_at,
          activity_type,
          title,
          duration_minutes,
          leads:lead_id (name, phone)
        `)
        .eq("broker_id", effectiveBrokerId!)
        .gte("scheduled_at", monthStart.toISOString())
        .lte("scheduled_at", monthEnd.toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as any;
    },
    enabled: !!effectiveBrokerId,
  });

  // Fetch ALL negotiation items for event counting (excluding expected_close_date)
  const { data: allNegotiationItems } = useQuery({
    queryKey: ["all-negotiation-items", effectiveBrokerId, currentMonth.toISOString()],
    queryFn: async () => {
      if (!effectiveBrokerId) return [];

      const monthStart = startOfMonth(subMonths(currentMonth, 1));
      const monthEnd = endOfMonth(addMonths(currentMonth, 1));
      const items: any[] = [];

      // Fetch deal activities
      const { data: activities } = await supabase
        .from('deal_activities')
        .select('id, scheduled_at')
        .eq('broker_id', effectiveBrokerId)
        .not('scheduled_at', 'is', null)
        .gte('scheduled_at', monthStart.toISOString())
        .lte('scheduled_at', monthEnd.toISOString());

      activities?.forEach((a: any) => {
        if (a.scheduled_at) items.push({ id: a.id, scheduled_at: a.scheduled_at, type: 'activity' });
      });

      // Fetch deal tasks
      const { data: tasks } = await supabase
        .from('deal_tasks')
        .select('id, due_date')
        .eq('broker_id', effectiveBrokerId)
        .not('due_date', 'is', null)
        .gte('due_date', monthStart.toISOString().split('T')[0])
        .lte('due_date', monthEnd.toISOString().split('T')[0]);

      tasks?.forEach((t: any) => {
        if (t.due_date) {
          const dt = new Date(t.due_date);
          dt.setHours(9, 0, 0, 0);
          items.push({ id: t.id, scheduled_at: dt.toISOString(), type: 'task' });
        }
      });

      // NOTE: expected_close_date is NOT included in the agenda
      // It's only stored in the deal record for management purposes

      return items;
    },
    enabled: !!effectiveBrokerId,
  });

  // Calculate event counts for calendar display
  const { getEventCount } = useScheduleEventCounts({
    visits: allVisits,
    activities: allActivities,
    negotiationItems: allNegotiationItems,
    currentMonth,
  });

  // Fetch negotiation items for selected date (for display)
  const { data: negotiationItems } = useNegotiationScheduleItems({
    selectedDate,
    viewMode: viewMode === 'calendar' ? 'day' : viewMode,
  });

  // For weekly view, fetch activities for the entire week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

  const { data: activities, refetch: refetchActivities } = useQuery({
    queryKey: ["schedule-activities", effectiveBrokerId, viewMode === 'week' ? weekStart.toISOString() : selectedDate.toISOString(), viewMode],
    queryFn: async () => {
      let startDate: Date;
      let endDate: Date;

      if (viewMode === 'week') {
        startDate = weekStart;
        startDate.setHours(0, 0, 0, 0);
        endDate = weekEnd;
        endDate.setHours(23, 59, 59, 999);
      } else {
        startDate = new Date(selectedDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(selectedDate);
        endDate.setHours(23, 59, 59, 999);
      }

      const { data, error } = await supabase
        .from("schedule_activities")
        .select(`
          *,
          leads:lead_id (name, phone)
        `)
        .eq("broker_id", effectiveBrokerId!)
        .gte("scheduled_at", startDate.toISOString())
        .lte("scheduled_at", endDate.toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as any;
    },
    enabled: !!effectiveBrokerId,
  });

  // Mutation for updating activity duration
  const updateActivityDuration = useMutation({
    mutationFn: async ({ activityId, newDuration }: { activityId: string; newDuration: number }) => {
      const { error } = await supabase
        .from("schedule_activities")
        .update({ duration_minutes: newDuration })
        .eq("id", activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchActivities();
      toast.success("Duração atualizada");
    },
    onError: () => {
      toast.error("Erro ao atualizar duração");
    },
  });

  // Mutation for rescheduling activity (drag and drop)
  const rescheduleActivity = useMutation({
    mutationFn: async ({ activityId, newDate, newHour }: { activityId: string; newDate: Date; newHour: number }) => {
      const newScheduledAt = new Date(newDate);
      newScheduledAt.setHours(newHour, 0, 0, 0);

      const { error } = await supabase
        .from("schedule_activities")
        .update({ scheduled_at: newScheduledAt.toISOString() })
        .eq("id", activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchActivities();
      toast.success("Atividade reagendada");
    },
    onError: () => {
      toast.error("Erro ao reagendar atividade");
    },
  });

  // Filter visits for selected date
  const visitsOnSelectedDate = allVisits?.filter((visit: any) => {
    const matchesDate = isSameDay(new Date(visit.scheduled_at), selectedDate);
    const matchesStatus = !statusFilter || visit.status === statusFilter;
    return matchesDate && matchesStatus;
  });

  const handleActivityResize = (activityId: string, newDuration: number) => {
    updateActivityDuration.mutate({ activityId, newDuration });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setIsDragging(true);
    const activityType = event.active.data.current?.activityType;
    if (activityType) {
      setDraggedActivityType(activityType);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setIsDragging(false);
    setDraggedActivityType(null);

    const { active, over } = event;
    
    if (!over) return;

    const slotData = over.data.current;
    
    // Check if this is an existing activity being moved
    if (active.data.current?.type === 'existing-activity') {
      const activityId = active.data.current.activityId;
      if (slotData?.hour !== undefined && slotData?.date) {
        rescheduleActivity.mutate({
          activityId,
          newDate: slotData.date,
          newHour: slotData.hour,
        });
      }
      return;
    }

    // Otherwise it's a new activity being created from palette
    const activityType = active.data.current?.activityType;

    if (activityType && activityType.trim() !== '' && slotData?.hour !== undefined && slotData?.date) {
      setCreateActivityDialog({
        open: true,
        activityType,
        date: slotData.date,
        hour: slotData.hour,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "bg-green-500";
      case "scheduled":
        return "bg-blue-500";
      case "cancelled":
        return "bg-red-500";
      case "completed":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "confirmed":
        return "Confirmada";
      case "scheduled":
        return "Agendada";
      case "cancelled":
        return "Cancelada";
      case "completed":
        return "Concluída";
      default:
        return status;
    }
  };
  
  const draggedActivity = draggedActivityType 
    ? ACTIVITY_TYPES.find(a => a.id === draggedActivityType) 
    : null;

  const handleMonthChange = (month: Date) => {
    setCurrentMonth(month);
  };

  return (
    <AppLayout
      title="Agenda"
      headerActions={
        <>
          <CalendarSyncDialog />
          <PermissionGate permission="crm_schedule.create">
            <HeaderButton icon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateDialogOpen(true)}>
              Agendar Visita
            </HeaderButton>
          </PermissionGate>
        </>
      }
    >
      <DndContext 
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">Gerencie suas atividades e visitas</p>
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'day' | 'week')}>
                <TabsList>
                  <TabsTrigger value="day">Dia</TabsTrigger>
                  <TabsTrigger value="week">Semana</TabsTrigger>
                  <TabsTrigger value="calendar">Calendário</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["all-visits"] });
                  queryClient.invalidateQueries({ queryKey: ["all-schedule-activities"] });
                  queryClient.invalidateQueries({ queryKey: ["all-negotiation-items"] });
                  queryClient.invalidateQueries({ queryKey: ["schedule-activities"] });
                  queryClient.invalidateQueries({ queryKey: ["negotiation-schedule-items"] });
                  toast.success("Agenda atualizada");
                }}
                title="Atualizar agenda"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {viewMode === 'day' ? (
            <div className="flex flex-col gap-6">
              {/* Top Section: Templates and Calendar side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Palette */}
                <ActivityPalette />
                
                {/* Mini Calendar */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Calendário
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <ScheduleCalendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      month={currentMonth}
                      onMonthChange={handleMonthChange}
                      getEventCount={getEventCount}
                      locale={ptBR}
                      compact
                      className="rounded-md w-full"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Section: Day Schedule Grid */}
              <DayScheduleGrid 
                date={selectedDate} 
                activities={activities || []}
                negotiationItems={negotiationItems || []}
onActivityClick={handleActivityClick}
                onActivityResize={handleActivityResize}
                onNegotiationItemClick={() => navigate('/pipeline')}
              />
            </div>
          ) : viewMode === 'week' ? (
            <div className="flex flex-col gap-6">
              {/* Top Section: Templates and Calendar side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Activity Palette */}
                <ActivityPalette />
                
                {/* Mini Calendar */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      Calendário
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <ScheduleCalendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      month={currentMonth}
                      onMonthChange={handleMonthChange}
                      getEventCount={getEventCount}
                      locale={ptBR}
                      compact
                      className="rounded-md w-full"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Section: Week Schedule Grid */}
              <WeekScheduleGrid 
                selectedDate={selectedDate}
                activities={activities || []}
                negotiationItems={negotiationItems || []}
                onActivityClick={handleActivityClick}
                onActivityResize={handleActivityResize}
                onDateChange={setSelectedDate}
                onNegotiationItemClick={() => navigate('/pipeline')}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Row 1: Compact Calendar */}
              <Card>
                <CardContent className="p-4">
                  <ScheduleCalendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    month={currentMonth}
                    onMonthChange={handleMonthChange}
                    getEventCount={getEventCount}
                    locale={ptBR}
                    className="rounded-md w-full"
                  />
                </CardContent>
              </Card>

              {/* Row 2: Visits for Selected Date */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl">
                    Visitas em {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge
                      variant={statusFilter === null ? "default" : "outline"}
                      className="cursor-pointer text-xs sm:text-sm"
                      onClick={() => setStatusFilter(null)}
                    >
                      Todas
                    </Badge>
                    <Badge
                      variant={statusFilter === "scheduled" ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-xs sm:text-sm",
                        statusFilter === "scheduled" && "bg-blue-500 hover:bg-blue-600 border-blue-500"
                      )}
                      onClick={() => setStatusFilter("scheduled")}
                    >
                      Agendadas
                    </Badge>
                    <Badge
                      variant={statusFilter === "confirmed" ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-xs sm:text-sm",
                        statusFilter === "confirmed" && "bg-green-500 hover:bg-green-600 border-green-500"
                      )}
                      onClick={() => setStatusFilter("confirmed")}
                    >
                      Confirmadas
                    </Badge>
                    <Badge
                      variant={statusFilter === "completed" ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-xs sm:text-sm",
                        statusFilter === "completed" && "bg-muted-foreground hover:bg-muted-foreground/80 border-muted-foreground"
                      )}
                      onClick={() => setStatusFilter("completed")}
                    >
                      Concluídas
                    </Badge>
                    <Badge
                      variant={statusFilter === "cancelled" ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-xs sm:text-sm",
                        statusFilter === "cancelled" && "bg-destructive hover:bg-destructive/80 border-destructive"
                      )}
                      onClick={() => setStatusFilter("cancelled")}
                    >
                      Canceladas
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Negotiation Items Section */}
                  {negotiationItems && negotiationItems.length > 0 && (
                    <div className="mb-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-medium">Itens de Negociações</h3>
                        <Badge variant="secondary" className="text-xs">
                          {negotiationItems.length}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {negotiationItems.map((item) => (
                          <NegotiationScheduleCard
                            key={item.id}
                            item={item}
                            onClick={() => navigate(`/pipeline`)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Visits Section */}
                  {negotiationItems && negotiationItems.length > 0 && visitsOnSelectedDate && visitsOnSelectedDate.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-medium">Visitas</h3>
                      <Badge variant="secondary" className="text-xs">
                        {visitsOnSelectedDate.length}
                      </Badge>
                    </div>
                  )}
                  
                  {(!visitsOnSelectedDate || visitsOnSelectedDate.length === 0) && (!negotiationItems || negotiationItems.length === 0) ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhum compromisso para esta data</p>
                    </div>
                  ) : visitsOnSelectedDate && visitsOnSelectedDate.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {visitsOnSelectedDate.map((visit: any) => (
                        <Card key={visit.id} className="relative">
                          {/* Confirmation indicator */}
                          {visit.lead_confirmed && (
                            <div className="absolute top-2 right-2">
                              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-950 px-2 py-1 rounded-full">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Cliente Informado</span>
                              </div>
                            </div>
                          )}
                          <CardContent className="pt-6">
                            <div className="flex flex-wrap items-center gap-2 mb-4">
                              <Badge className={getStatusColor(visit.status)}>
                                {getStatusLabel(visit.status)}
                              </Badge>
                              <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
                                <Clock className="h-4 w-4" />
                                {format(new Date(visit.scheduled_at), "HH:mm", { locale: ptBR })}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium truncate">{visit.leads?.name}</span>
                              </div>

                              {visit.leads?.phone && (
                                <p className="text-sm text-muted-foreground pl-6">
                                  {visit.leads.phone}
                                </p>
                              )}

                              {visit.properties && (
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                  <span className="line-clamp-2">
                                    {visit.properties.name}
                                    {visit.units && ` - Un. ${visit.units.unit_number}`}
                                  </span>
                                </div>
                              )}

                              {visit.units && (
                                <div className="text-sm text-muted-foreground pl-6">
                                  {visit.units.area}m² • {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                    maximumFractionDigits: 0,
                                  }).format(visit.units.price || 0)}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <CreateVisitDialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["all-visits"] });
              setIsCreateDialogOpen(false);
            }}
          />

          <CreateActivityDialog
            open={createActivityDialog.open}
            onOpenChange={(open) => setCreateActivityDialog(prev => ({ ...prev, open }))}
            activityType={createActivityDialog.activityType}
            scheduledDate={createActivityDialog.date}
            scheduledHour={createActivityDialog.hour}
            onSuccess={() => {
              refetchActivities();
              queryClient.invalidateQueries({ queryKey: ["all-schedule-activities"] });
            }}
          />

          <ScheduleActivityDetailDialog
            activity={activityDetailDialog.activity}
            open={activityDetailDialog.open}
            onOpenChange={(open) => setActivityDetailDialog(prev => ({ ...prev, open }))}
            onSuccess={() => {
              refetchActivities();
              queryClient.invalidateQueries({ queryKey: ["all-schedule-activities"] });
            }}
          />

          {/* Drag Overlay */}
          <DragOverlay>
            {draggedActivity && (
              <div className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg shadow-lg',
                'border border-border bg-card opacity-90'
              )}>
                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center text-white', draggedActivity.color)}>
                  <draggedActivity.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium mt-2">{draggedActivity.label}</span>
              </div>
            )}
          </DragOverlay>
        </div>
      </DndContext>
    </AppLayout>
  );
}
