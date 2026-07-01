import { useState } from "react";
import { AgentSelector } from '@/components/shared/AgentSelector';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/hooks/use-toast";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Building2, Home, Check, ChevronsUpDown } from "lucide-react";
import { format, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface CreateVisitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

type AssetType = "property" | "standalone";

export function CreateVisitDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateVisitDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { effectiveBrokerId } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState("60");
  const [leadId, setLeadId] = useState("");
  const [unitId, setUnitId] = useState("");
  const [standaloneUnitId, setStandaloneUnitId] = useState("");
  const [notes, setNotes] = useState("");
  const [assetType, setAssetType] = useState<AssetType>("property");
  const [assignedUserId, setAssignedUserId] = useState("");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);

  const { data: leads } = useQuery({
    queryKey: ["leads", effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("broker_id", effectiveBrokerId)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveBrokerId,
  });

  const { data: units } = useQuery({
    queryKey: ["units-with-property", effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("id, unit_number, area, price, property_id, properties!units_property_id_fkey (name)")
        .eq("broker_id", effectiveBrokerId)
        .eq("is_standalone", false)
        .order("unit_number");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!effectiveBrokerId,
  });

  // Fetch standalone units (Imóveis Avulsos)
  const { data: standaloneUnits } = useQuery({
    queryKey: ["standalone-units", effectiveBrokerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("units")
        .select("*")
        .eq("broker_id", effectiveBrokerId)
        .eq("is_standalone", true)
        .order("unit_number");
      if (error) throw error;
      return data;
    },
    enabled: !!effectiveBrokerId,
  });

  const formatPrice = (price: number | null) => {
    if (!price) return "";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const selectedUnit = units?.find((u) => u.id === unitId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedDate || !leadId) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha data e cliente",
        variant: "destructive",
      });
      return;
    }

    if (assetType === "property" && !unitId) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione uma unidade",
        variant: "destructive",
      });
      return;
    }

    if (assetType === "standalone" && !standaloneUnitId) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione um imóvel avulso",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const [hours, minutes] = time.split(":").map(Number);
      const scheduledAt = new Date(selectedDate);
      scheduledAt.setHours(hours, minutes, 0, 0);

      const visitData = {
        broker_id: effectiveBrokerId,
        lead_id: leadId,
        property_id: assetType === "property" ? (selectedUnit?.property_id ?? null) : null,
        unit_id: assetType === "property" ? unitId : standaloneUnitId,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: parseInt(duration),
        notes,
        status: "scheduled" as const,
        assigned_user_id: assignedUserId || user?.id || null,
      };

      const { error } = await supabase.from("visits").insert(visitData);

      if (error) throw error;

      toast({
        title: "Visita agendada!",
        description: "A visita foi agendada com sucesso.",
      });

      setSelectedDate(undefined);
      setTime("10:00");
      setDuration("60");
      setLeadId("");
      setUnitId("");
      setStandaloneUnitId("");
      setNotes("");
      setAssetType("property");
      setAssignedUserId("");

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao agendar visita",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssetTypeChange = (value: string) => {
    setAssetType(value as AssetType);
    setUnitId("");
    setStandaloneUnitId("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agendar Visita</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? (
                      format(selectedDate, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione a data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    locale={ptBR}
                    disabled={(date) => date < startOfDay(new Date())}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Horário *</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duração (minutos)</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1h 30min</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lead">Cliente *</Label>
            <Select value={leadId} onValueChange={setLeadId} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {leads?.map((lead) => (
                  <SelectItem key={lead.id} value={lead.id}>
                    {lead.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Tipo de Imóvel *</Label>
            <Tabs value={assetType} onValueChange={handleAssetTypeChange} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="property" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Unidade
                </TabsTrigger>
                <TabsTrigger value="standalone" className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  Imóvel Avulso
                </TabsTrigger>
              </TabsList>

              <TabsContent value="property" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Unidade *</Label>
                  <Popover open={unitPickerOpen} onOpenChange={setUnitPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={unitPickerOpen}
                        className="w-full justify-between font-normal"
                      >
                        {selectedUnit ? (
                          <span className="truncate">
                            {selectedUnit.properties?.name ?? "—"} — Un. {selectedUnit.unit_number}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Selecione a unidade (buscar por empreendimento ou número)
                          </span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command
                        filter={(value, search) =>
                          value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                        }
                      >
                        <CommandInput placeholder="Buscar empreendimento ou nº unidade..." />
                        <CommandList>
                          <CommandEmpty>Nenhuma unidade encontrada.</CommandEmpty>
                          <CommandGroup>
                            {units?.map((unit) => {
                              const propName = unit.properties?.name ?? "—";
                              const label = `${propName} — Un. ${unit.unit_number}`;
                              return (
                                <CommandItem
                                  key={unit.id}
                                  value={`${propName} ${unit.unit_number}`}
                                  onSelect={() => {
                                    setUnitId(unit.id);
                                    setUnitPickerOpen(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      unitId === unit.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span className="font-medium">{label}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {unit.area ? `${unit.area}m²` : ""}
                                      {unit.price ? ` • ${formatPrice(unit.price)}` : ""}
                                    </span>
                                  </div>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {(!units || units.length === 0) && (
                    <p className="text-xs text-muted-foreground">
                      Nenhuma unidade cadastrada.
                    </p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="standalone" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="standaloneUnit">Imóvel Avulso *</Label>
                  <Select value={standaloneUnitId} onValueChange={setStandaloneUnitId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o imóvel avulso" />
                    </SelectTrigger>
                    <SelectContent>
                      {standaloneUnits?.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{unit.unit_number}</span>
                            <span className="text-xs text-muted-foreground">
                              {unit.area ? `${unit.area}m²` : ""} 
                              {unit.price ? ` • ${formatPrice(unit.price)}` : ""}
                              {unit.neighborhood ? ` • ${unit.neighborhood}` : ""}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      {(!standaloneUnits || standaloneUnits.length === 0) && (
                        <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                          Nenhum imóvel avulso cadastrado
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          <AgentSelector
            value={assignedUserId}
            onValueChange={setAssignedUserId}
          />

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre a visita..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Agendando..." : "Agendar Visita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
