import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Calendar as CalendarIcon, Clock, MapPin, User, CheckCircle2, Briefcase } from "lucide-react";
import { HeaderButton } from "@/components/ui/header-button";
import { format, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CreateVisitDialog } from "@/components/CreateVisitDialog";
import { AppLayout } from "@/components/AppLayout";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { ActivityPalette, ACTIVITY_TYPES } from "@/components/schedule/ActivityPalette";
import { DayScheduleGrid } from "@/components/schedule/DayScheduleGrid";
import { WeekScheduleGrid } from "@/components/schedule/WeekScheduleGrid";
import { CreateActivityDialog } from "@/components/schedule/CreateActivityDialog";
import { CalendarSyncDialog } from "@/components/schedule/CalendarSyncDialog";
import { NegotiationScheduleCard } from "@/components/schedule/NegotiationScheduleCard";
import { useNegotiationScheduleItems } from "@/hooks/useNegotiationScheduleItems";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Schedule() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'calendar' | 'day' | 'week'>('day');
  
  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false);
  const [draggedActivityType, setDraggedActivityType] = useState<string | null>(null);
  const [createActivityDialog, setCreateActivityDialog] = useState<{
    open: boolean;
    activityType: string;
    date: Date;
    hour: number;
  }>({ open: false, activityType: '', date: new Date(), hour: 9 });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const { data: visits, refetch: refetchVisits } = useQuery({
    queryKey: ["visits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("visits")
        .select(`
          *,
          leads!visits_lead_id_fkey (name, phone, email),
          units!visits_unit_id_fkey (unit_number, price, area),
          properties!visits_property_id_fkey (name, address)
        `)
        .eq("broker_id", user?.id)
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
  });

  // Fetch negotiation items (activities, tasks, expected close dates from deals)
  const { data: negotiationItems } = useNegotiationScheduleItems({
    selectedDate,
    viewMode: viewMode === 'calendar' ? 'day' : viewMode,
  });

  // For weekly view, fetch activities for the entire week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 0 });

  const { data: activities, refetch: refetchActivities } = useQuery({
    queryKey: ["schedule-activities", user?.id, viewMode === 'week' ? weekStart.toISOString() : selectedDate.toISOString(), viewMode],
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
        .eq("broker_id", user?.id)
        .gte("scheduled_at", startDate.toISOString())
        .lte("scheduled_at", endDate.toISOString())
        .order("scheduled_at", { ascending: true });

      if (error) throw error;
      return data as any;
    },
    enabled: !!user?.id,
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

  const visitsOnSelectedDate = visits?.filter((visit: any) => {
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

  const datesWithVisits = visits?.map((visit: any) => new Date(visit.scheduled_at)) || [];
  
  const draggedActivity = draggedActivityType 
    ? ACTIVITY_TYPES.find(a => a.id === draggedActivityType) 
    : null;

  return (
    <AppLayout
      title="Agenda"
      headerActions={
        <>
          <CalendarSyncDialog />
          <HeaderButton icon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateDialogOpen(true)}>
            Agendar Visita
          </HeaderButton>
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
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'day' | 'week')}>
              <TabsList>
                <TabsTrigger value="day">Dia</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="calendar">Calendário</TabsTrigger>
              </TabsList>
            </Tabs>
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
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      modifiers={{
                        hasVisit: datesWithVisits,
                      }}
                      modifiersStyles={{
                        hasVisit: {
                          fontWeight: "bold",
                          textDecoration: "underline",
                        },
                      }}
                      locale={ptBR}
                      className="rounded-md w-full"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Section: Day Schedule Grid */}
              <DayScheduleGrid 
                date={selectedDate} 
                activities={activities || []}
                onActivityClick={(activity) => console.log('Activity clicked:', activity)}
                onActivityResize={handleActivityResize}
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
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      modifiers={{
                        hasVisit: datesWithVisits,
                      }}
                      modifiersStyles={{
                        hasVisit: {
                          fontWeight: "bold",
                          textDecoration: "underline",
                        },
                      }}
                      locale={ptBR}
                      className="rounded-md w-full"
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Bottom Section: Week Schedule Grid */}
              <WeekScheduleGrid 
                selectedDate={selectedDate}
                activities={activities || []}
                onActivityClick={(activity) => console.log('Activity clicked:', activity)}
                onActivityResize={handleActivityResize}
                onDateChange={setSelectedDate}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Row 1: Full-width Calendar */}
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    modifiers={{
                      hasVisit: datesWithVisits,
                    }}
                    modifiersStyles={{
                      hasVisit: {
                        fontWeight: "bold",
                        textDecoration: "underline",
                      },
                    }}
                    locale={ptBR}
                    className="rounded-md w-full"
                    classNames={{
                      months: "flex flex-col sm:flex-row justify-center",
                      month: "space-y-4 w-full",
                      table: "w-full border-collapse",
                      head_row: "flex w-full justify-between",
                      head_cell: "text-muted-foreground rounded-md flex-1 font-normal text-sm text-center",
                      row: "flex w-full mt-2 justify-between",
                      cell: "flex-1 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 aspect-square",
                      day: "h-full w-full p-2 sm:p-3 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md transition-colors flex items-center justify-center",
                      day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                      day_today: "bg-accent text-accent-foreground font-semibold",
                      day_outside: "text-muted-foreground opacity-50",
                      nav: "space-x-1 flex items-center",
                      nav_button: "h-8 w-8 sm:h-9 sm:w-9 bg-transparent p-0 opacity-50 hover:opacity-100 border rounded-md",
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      caption: "flex justify-center pt-1 relative items-center mb-4",
                      caption_label: "text-base sm:text-lg font-medium",
                    }}
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
              refetchVisits();
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
