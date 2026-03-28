import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  ObligationType,
  ObligationsConfig,
  ObligationConfig,
  ResponsibleRole,
  ControlType,
  useUnitObligationsConfig,
  updateUnitObligationsConfig,
} from "@/hooks/useAssetHealth";
import { useLeaseByUnitId } from "@/hooks/useLeases";
import { 
  useCustomObligationTypes, 
  SYSTEM_OBLIGATION_TYPES 
} from "@/hooks/useCustomObligationTypes";
import { CreateCustomObligationDialog } from "./CreateCustomObligationDialog";
import { 
  Loader2, 
  Home, 
  Building, 
  Zap, 
  Droplets, 
  Flame, 
  Shield, 
  Receipt, 
  Circle,
  Plus,
  User,
  Users,
  Briefcase,
  Info,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface ConfigureObligationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unitId: string | null;
  unitName: string;
}

// Icon mapping
const ICON_MAP: Record<string, typeof Home> = {
  Home,
  Building,
  Zap,
  Droplets,
  Flame,
  Shield,
  Receipt,
  Circle,
};

// Extended obligation config with installation code
interface ExtendedObligationConfig extends ObligationConfig {
  installation_code?: string;
  control_type?: ControlType;
}

interface ExtendedObligationsConfig {
  [key: string]: ExtendedObligationConfig | undefined;
}

// Hook to fetch unit owner and tenant info
function useUnitContacts(unitId: string | null) {
  return useQuery({
    queryKey: ["unit-contacts", unitId],
    queryFn: async () => {
      if (!unitId) return { owner: null, tenant: null, isVacant: true };

      const { data: unit, error } = await supabase
        .from("units")
        .select(`
          owner_contact_id,
          tenant_contact_id,
          is_occupied
        `)
        .eq("id", unitId)
        .single();

      if (error) throw error;

      let owner = null;
      let tenant = null;

      if (unit?.owner_contact_id) {
        const { data: ownerData } = await supabase
          .from("contacts")
          .select("id, name, avatar_url")
          .eq("id", unit.owner_contact_id)
          .single();
        owner = ownerData;
      }

      if (unit?.tenant_contact_id) {
        const { data: tenantData } = await supabase
          .from("contacts")
          .select("id, name, avatar_url")
          .eq("id", unit.tenant_contact_id)
          .single();
        tenant = tenantData;
      }

      return {
        owner,
        tenant,
        isVacant: !unit?.is_occupied,
      };
    },
    enabled: !!unitId,
  });
}

export function ConfigureObligationsDialog({
  open,
  onOpenChange,
  unitId,
  unitName,
}: ConfigureObligationsDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: currentConfig, isLoading } = useUnitObligationsConfig(unitId);
  const { data: customTypes, isLoading: isLoadingCustom } = useCustomObligationTypes();
  const { data: activeLease } = useLeaseByUnitId(unitId);
  const { data: unitContacts, isLoading: isLoadingContacts } = useUnitContacts(unitId);
  
  const [config, setConfig] = useState<ExtendedObligationsConfig>({});
  const [isSaving, setIsSaving] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Track if we've initialized from current config to prevent loops
  const [hasInitialized, setHasInitialized] = useState(false);

  // Combine system and custom obligation types (memoized to prevent re-creation)
  const allObligationTypes = useMemo(() => [
    ...SYSTEM_OBLIGATION_TYPES.map((t) => ({
      type: t.type,
      label: t.label,
      icon: t.icon,
      defaultDueDay: t.defaultDueDay,
      isSystem: true,
      customId: null,
    })),
    ...(customTypes || []).map((t) => ({
      type: `custom_${t.id}` as ObligationType,
      label: t.name,
      icon: t.icon,
      defaultDueDay: t.default_due_day,
      isSystem: false,
      customId: t.id,
    })),
  ], [customTypes]);

  // Get owner and tenant info from contacts or lease
  const ownerInfo = unitContacts?.owner || activeLease?.owner;
  const tenantInfo = unitContacts?.tenant || activeLease?.tenant;
  const isVacant = unitContacts?.isVacant ?? !activeLease;

  // Initialize config only once when data loads - prevent infinite loops
  useEffect(() => {
    if (hasInitialized) return;
    if (!open) return;
    
    if (currentConfig !== undefined) {
      if (currentConfig && Object.keys(currentConfig).length > 0) {
        setConfig(currentConfig as ExtendedObligationsConfig);
      } else {
        // Initialize with defaults only if no config exists
        const defaults: ExtendedObligationsConfig = {};
        allObligationTypes.forEach(({ type, defaultDueDay }) => {
          defaults[type] = {
            active: false,
            due_day: defaultDueDay,
            responsible: "owner",
            installation_code: "",
          };
        });
        setConfig(defaults);
      }
      setHasInitialized(true);
    }
  }, [currentConfig, open, hasInitialized, allObligationTypes]);

  // Reset initialization flag when dialog closes
  useEffect(() => {
    if (!open) {
      setHasInitialized(false);
    }
  }, [open]);

  const handleToggle = (type: ObligationType, active: boolean) => {
    const obligationType = allObligationTypes.find(o => o.type === type);
    setConfig((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        active,
        due_day: prev[type]?.due_day || obligationType?.defaultDueDay || 10,
        responsible: prev[type]?.responsible || "owner",
        installation_code: prev[type]?.installation_code || "",
      },
    }));
  };

  const handleDueDayChange = (type: ObligationType, dueDay: number) => {
    setConfig((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        due_day: dueDay,
      },
    }));
  };

  const handleResponsibleChange = (type: ObligationType, responsible: ResponsibleRole) => {
    setConfig((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        responsible,
      },
    }));
  };

  const handleInstallationCodeChange = (type: ObligationType, code: string) => {
    setConfig((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        installation_code: code,
      },
    }));
  };

  const handleControlTypeChange = (type: ObligationType, controlType: ControlType) => {
    setConfig((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        control_type: controlType,
      },
    }));
  };

  const handleSave = async () => {
    if (!unitId) return;

    setIsSaving(true);
    try {
      await updateUnitObligationsConfig(unitId, config as ObligationsConfig);
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["asset-health"] });
      queryClient.invalidateQueries({ queryKey: ["unit-obligations-config", unitId] });
      
      toast({
        title: "Configurações salvas",
        description: "As responsabilidades financeiras foram configuradas com sucesso.",
      });
      
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getIcon = (iconName: string) => {
    return ICON_MAP[iconName] || Circle;
  };

  const getResponsibleLabel = (role: ResponsibleRole) => {
    switch (role) {
      case "owner":
        return "Proprietário";
      case "tenant":
        return "Inquilino";
      case "agency":
        return "Imobiliária";
      default:
        return "Não definido";
    }
  };

  const getResponsibleFeedback = (role: ResponsibleRole, obligationLabel: string) => {
    const tenantName = tenantInfo?.name || "o inquilino";
    const ownerName = ownerInfo?.name || "o proprietário";
    
    switch (role) {
      case "tenant":
        return `O sistema enviará lembretes de cobrança para ${tenantName}`;
      case "owner":
        return `Despesa deduzida do repasse ou paga diretamente por ${ownerName}`;
      case "agency":
        return "A imobiliária é responsável pelo pagamento direto";
      default:
        return "";
    }
  };

  const systemTypes = allObligationTypes.filter(t => t.isSystem);
  const userCustomTypes = allObligationTypes.filter(t => !t.isSystem);

  const isLoaded = !isLoading && !isLoadingCustom && !isLoadingContacts;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Matriz de Responsabilidades</DialogTitle>
            <DialogDescription>
              Configure quem é responsável por cada despesa do imóvel{" "}
              <span className="font-medium">{unitName}</span>
            </DialogDescription>
          </DialogHeader>

          {!isLoaded ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4 py-4">
              {/* Vacancy Warning */}
              {isVacant && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                  <Info className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Este imóvel está vago. A opção "Inquilino" está desabilitada.
                  </p>
                </div>
              )}

              {/* Contacts Summary */}
              <div className="flex gap-4 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={ownerInfo?.avatar_url} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                      {ownerInfo?.name?.charAt(0) || "P"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Proprietário</p>
                    <p className="text-sm font-medium">{ownerInfo?.name || "Não definido"}</p>
                  </div>
                </div>
                
                <Separator orientation="vertical" className="h-auto" />
                
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={tenantInfo?.avatar_url} />
                    <AvatarFallback className={cn(
                      "text-xs",
                      isVacant ? "bg-muted text-muted-foreground" : "bg-blue-500/10 text-blue-600"
                    )}>
                      {tenantInfo?.name?.charAt(0) || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs text-muted-foreground">Inquilino</p>
                    <p className="text-sm font-medium">
                      {isVacant ? (
                        <span className="text-muted-foreground">Vago</span>
                      ) : (
                        tenantInfo?.name || "Não definido"
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Obligation Cards */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Obrigações do Imóvel
                </p>
                
                {systemTypes.map(({ type, label, icon }) => {
                  const obligationConfig = config[type] || { active: false };
                  const Icon = getIcon(icon);
                  
                  return (
                    <ObligationResponsibilityCard
                      key={type}
                      type={type}
                      label={label}
                      icon={<Icon className="h-4 w-4" />}
                      config={obligationConfig}
                      ownerInfo={ownerInfo}
                      tenantInfo={tenantInfo}
                      isVacant={isVacant}
                      onToggle={handleToggle}
                      onDueDayChange={handleDueDayChange}
                      onResponsibleChange={handleResponsibleChange}
                      onInstallationCodeChange={handleInstallationCodeChange}
                      getResponsibleFeedback={getResponsibleFeedback}
                    />
                  );
                })}
              </div>

              {/* Custom Obligation Types */}
              {userCustomTypes.length > 0 && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Obrigações Personalizadas
                    </p>
                    {userCustomTypes.map(({ type, label, icon }) => {
                      const obligationConfig = config[type] || { active: false };
                      const Icon = getIcon(icon);
                      
                      return (
                        <ObligationResponsibilityCard
                          key={type}
                          type={type}
                          label={label}
                          icon={<Icon className="h-4 w-4" />}
                          config={obligationConfig}
                          ownerInfo={ownerInfo}
                          tenantInfo={tenantInfo}
                          isVacant={isVacant}
                          onToggle={handleToggle}
                          onDueDayChange={handleDueDayChange}
                          onResponsibleChange={handleResponsibleChange}
                          onInstallationCodeChange={handleInstallationCodeChange}
                          getResponsibleFeedback={getResponsibleFeedback}
                        />
                      );
                    })}
                  </div>
                </>
              )}

              {/* Add Custom Type Button */}
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo Personalizado
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving || !isLoaded}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Configurações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CreateCustomObligationDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </>
  );
}

// Individual Obligation Card with Responsibility Selection
interface ObligationResponsibilityCardProps {
  type: ObligationType;
  label: string;
  icon: React.ReactNode;
  config: ExtendedObligationConfig;
  ownerInfo: { id: string; name: string; avatar_url?: string | null } | null | undefined;
  tenantInfo: { id: string; name: string; avatar_url?: string | null } | null | undefined;
  isVacant: boolean;
  onToggle: (type: ObligationType, active: boolean) => void;
  onDueDayChange: (type: ObligationType, dueDay: number) => void;
  onResponsibleChange: (type: ObligationType, responsible: ResponsibleRole) => void;
  onInstallationCodeChange: (type: ObligationType, code: string) => void;
  onControlTypeChange: (type: ObligationType, controlType: ControlType) => void;
  getResponsibleFeedback: (role: ResponsibleRole, label: string) => string;
}

function ObligationResponsibilityCard({
  type,
  label,
  icon,
  config,
  ownerInfo,
  tenantInfo,
  isVacant,
  onToggle,
  onDueDayChange,
  onResponsibleChange,
  onInstallationCodeChange,
  onControlTypeChange,
  getResponsibleFeedback,
}: ObligationResponsibilityCardProps) {
  const currentResponsible = config.responsible || "owner";
  const currentControlType = config.control_type || "financial";
  const feedback = getResponsibleFeedback(currentResponsible, label);

  return (
    <div className={cn(
      "flex flex-col gap-4 p-4 rounded-lg border bg-card transition-colors",
      config.active && "border-primary/30 bg-primary/5"
    )}>
      {/* Header Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg transition-colors",
            config.active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
          )}>
            {icon}
          </div>
          <div>
            <Label className="text-sm font-medium">{label}</Label>
            <p className="text-xs text-muted-foreground">
              {config.active ? "Monitorando" : "Não monitorado"}
            </p>
          </div>
        </div>
        <Switch
          checked={config.active || false}
          onCheckedChange={(checked) => onToggle(type, checked)}
        />
      </div>

      {/* Expanded Configuration when Active */}
      {config.active && (
        <div className="space-y-4 pt-3 border-t">
          {/* Responsible Selection */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Quem é responsável pelo pagamento?
            </Label>
            <RadioGroup
              value={currentResponsible}
              onValueChange={(value) => onResponsibleChange(type, value as ResponsibleRole)}
              className="flex flex-wrap gap-2"
            >
              {/* Owner Option */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <RadioGroupItem
                        value="owner"
                        id={`${type}-owner`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`${type}-owner`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                          "hover:bg-accent/50",
                          currentResponsible === "owner" 
                            ? "border-primary bg-primary/10 text-primary" 
                            : "border-input"
                        )}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={ownerInfo?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {ownerInfo?.name?.charAt(0) || <User className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {ownerInfo?.name || "Proprietário"}
                        </span>
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Despesa deduzida do repasse ou paga diretamente</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Tenant Option */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <RadioGroupItem
                        value="tenant"
                        id={`${type}-tenant`}
                        className="peer sr-only"
                        disabled={isVacant}
                      />
                      <Label
                        htmlFor={`${type}-tenant`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                          isVacant 
                            ? "opacity-50 cursor-not-allowed border-input" 
                            : "hover:bg-accent/50",
                          currentResponsible === "tenant" && !isVacant
                            ? "border-blue-500 bg-blue-500/10 text-blue-600" 
                            : "border-input"
                        )}
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={tenantInfo?.avatar_url || undefined} />
                          <AvatarFallback className={cn(
                            "text-xs",
                            isVacant ? "bg-muted" : "bg-blue-500/10 text-blue-600"
                          )}>
                            {tenantInfo?.name?.charAt(0) || <Users className="h-3 w-3" />}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {isVacant ? "Vago" : (tenantInfo?.name || "Inquilino")}
                        </span>
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isVacant 
                      ? "Imóvel vago - não há inquilino" 
                      : "O sistema enviará lembretes de cobrança"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Agency Option */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <RadioGroupItem
                        value="agency"
                        id={`${type}-agency`}
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor={`${type}-agency`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-all",
                          "hover:bg-accent/50",
                          currentResponsible === "agency" 
                            ? "border-amber-500 bg-amber-500/10 text-amber-600" 
                            : "border-input"
                        )}
                      >
                        <div className="h-6 w-6 rounded-full bg-amber-500/10 flex items-center justify-center">
                          <Briefcase className="h-3 w-3 text-amber-600" />
                        </div>
                        <span className="text-sm">Imobiliária</span>
                      </Label>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>A imobiliária é responsável pelo pagamento direto</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </RadioGroup>

            {/* Feedback Badge */}
            <div className="flex items-start gap-2 mt-2">
              <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="text-xs text-muted-foreground">{feedback}</p>
            </div>
          </div>

          {/* Due Day and Installation Code */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Dia de Vencimento
              </Label>
              <Input
                type="number"
                min={1}
                max={31}
                value={config.due_day || 10}
                onChange={(e) =>
                  onDueDayChange(type, parseInt(e.target.value) || 10)
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Código/Matrícula
              </Label>
              <Input
                type="text"
                placeholder="Ex: 123456789"
                value={config.installation_code || ""}
                onChange={(e) =>
                  onInstallationCodeChange(type, e.target.value)
                }
                className="h-9"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
