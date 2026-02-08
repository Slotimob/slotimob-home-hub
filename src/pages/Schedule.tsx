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
import { Plus, Calendar as CalendarIcon, Clock, MapPin, User, Bell } from "lucide-react";
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
          <HeaderButton variant="outline" iconOnly showTextAt="lg" icon={<Bell className="h-4 w-4" />} onClick={() => navigate("/notification-history")}>
            Notificações
          </HeaderButton>
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
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5" />
                    Calendário
                  </CardTitle>
                </CardHeader>
                <CardContent>
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
                    className="rounded-md border"
                  />
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>
                    Visitas em {format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardTitle>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Badge
                      variant={statusFilter === null ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => setStatusFilter(null)}
                    >
                      Todas
                    </Badge>
                    <Badge
                      variant={statusFilter === "scheduled" ? "default" : "outline"}
                      className="cursor-pointer bg-blue-500 hover:bg-blue-600"
                      onClick={() => setStatusFilter("scheduled")}
                    >
                      Agendadas
                    </Badge>
                    <Badge
                      variant={statusFilter === "confirmed" ? "default" : "outline"}
                      className="cursor-pointer bg-green-500 hover:bg-green-600"
                      onClick={() => setStatusFilter("confirmed")}
                    >
                      Confirmadas
                    </Badge>
                    <Badge
                      variant={statusFilter === "completed" ? "default" : "outline"}
                      className="cursor-pointer bg-gray-500 hover:bg-gray-600"
                      onClick={() => setStatusFilter("completed")}
                    >
                      Concluídas
                    </Badge>
                    <Badge
                      variant={statusFilter === "cancelled" ? "default" : "outline"}
                      className="cursor-pointer bg-red-500 hover:bg-red-600"
                      onClick={() => setStatusFilter("cancelled")}
                    >
                      Canceladas
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {!visitsOnSelectedDate || visitsOnSelectedDate.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Nenhuma visita agendada para esta data</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {visitsOnSelectedDate.map((visit: any) => (
                        <Card key={visit.id}>
                          <CardContent className="pt-6">
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex gap-2">
                                <Badge className={getStatusColor(visit.status)}>
                                  {getStatusLabel(visit.status)}
                                </Badge>
                                {visit.lead_confirmed && (
                                  <Badge variant="default" className="bg-green-600">
                                    ✓ Confirmado
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                {format(new Date(visit.scheduled_at), "HH:mm", { locale: ptBR })}
                                {" - "}
                                {format(
                                  new Date(
                                    new Date(visit.scheduled_at).getTime() +
                                      visit.duration_minutes * 60000
                                  ),
                                  "HH:mm",
                                  { locale: ptBR }
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{visit.leads?.name}</span>
                                {visit.leads?.phone && (
                                  <span className="text-sm text-muted-foreground">
                                    {visit.leads.phone}
                                  </span>
                                )}
                              </div>

                              {visit.properties && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {visit.properties.name}
                                    {visit.units && ` - Unidade ${visit.units.unit_number}`}
                                  </span>
                                </div>
                              )}

                              {visit.units && (
                                <div className="text-sm text-muted-foreground">
                                  {visit.units.area}m² •{" "}
                                  {new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  }).format(visit.units.price || 0)}
                                </div>
                              )}

                              {visit.notes && (
                                <p className="text-sm text-muted-foreground mt-2">{visit.notes}</p>
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
