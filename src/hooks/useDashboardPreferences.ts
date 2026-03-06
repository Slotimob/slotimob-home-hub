import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DashboardWidgetPreferences {
  shortcuts: boolean;
  assets: boolean;
  financial: boolean;
  pipeline: boolean;
}

export interface ShortcutConfig {
  id: string;
  label: string;
  icon: string;
  route: string;
  enabled: boolean;
}

export interface PipelineStageConfig {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
}

export interface DashboardPreferences {
  widgets: DashboardWidgetPreferences;
  shortcuts: ShortcutConfig[];
  pipelineStages: PipelineStageConfig[];
  dateFilter?: string;
}

// Dashboard settings stored in Supabase
interface DashboardSettings {
  visible_widgets: DashboardWidgetPreferences;
  shortcuts: ShortcutConfig[];
  selected_pipeline_stages: string[]; // Array of enabled stage IDs
  date_filter?: string;
}

const DEFAULT_SHORTCUTS: ShortcutConfig[] = [
  // Ações de Criação
  { id: 'new-lead', label: 'Novo Lead', icon: 'UserPlus', route: '/leads', enabled: true },
  { id: 'new-unit', label: 'Nova Unidade', icon: 'Building2', route: '/units', enabled: true },
  { id: 'new-property', label: 'Imóvel Avulso', icon: 'Home', route: '/real-estate', enabled: true },
  { id: 'new-transaction', label: 'Lançamento', icon: 'PlusCircle', route: '/finance', enabled: true },
  { id: 'new-deal', label: 'Novo Negócio', icon: 'Handshake', route: '/pipeline', enabled: false },
  { id: 'new-visit', label: 'Nova Visita', icon: 'MapPin', route: '/schedule', enabled: false },
  // Navegação Rápida
  { id: 'calendar', label: 'Calendário', icon: 'Calendar', route: '/schedule', enabled: true },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'MessageCircle', route: '/whatsapp', enabled: true },
  { id: 'reports', label: 'Relatórios', icon: 'BarChart3', route: '/reports', enabled: false },
  { id: 'documents', label: 'Documentos', icon: 'FileText', route: '/documents', enabled: false },
  { id: 'simulator', label: 'Simulador', icon: 'Calculator', route: '/simulator/financing', enabled: false },
  { id: 'asset-health', label: 'Gestão de Ativos', icon: 'HeartPulse', route: '/gestao/alugueis', enabled: false },
];

// Estágios padrão do CRM (enum pipeline_stage)
const DEFAULT_PIPELINE_STAGE_DEFS: Array<{ id: string; name: string; color: string }> = [
  { id: 'new_lead', name: 'Novo Lead', color: '#3b82f6' },
  { id: 'in_contact', name: 'Em Contato', color: '#f59e0b' },
  { id: 'visit_scheduled', name: 'Visita Agendada', color: '#8b5cf6' },
  { id: 'proposal', name: 'Proposta', color: '#f97316' },
  { id: 'won', name: 'Ganho', color: '#22c55e' },
  { id: 'lost', name: 'Perdido', color: '#ef4444' },
];

const DEFAULT_PIPELINE_STAGE_IDS = new Set(DEFAULT_PIPELINE_STAGE_DEFS.map(s => s.id));

const DEFAULT_PIPELINE_STAGE_CONFIGS: PipelineStageConfig[] = DEFAULT_PIPELINE_STAGE_DEFS.map((s, index) => ({
  id: s.id,
  name: s.name,
  color: s.color,
  enabled: index < 3,
}));

const DEFAULT_PREFERENCES: DashboardPreferences = {
  widgets: {
    shortcuts: true,
    assets: true,
    financial: true,
    pipeline: true,
  },
  shortcuts: DEFAULT_SHORTCUTS,
  pipelineStages: DEFAULT_PIPELINE_STAGE_CONFIGS,
};

const MAX_PIPELINE_STAGES = 6;

export function useDashboardPreferences() {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<DashboardPreferences>(DEFAULT_PREFERENCES);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);

  // Load preferences from Supabase on mount
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setIsLoaded(true);
        return;
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('dashboard_settings')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading dashboard preferences:', error);
          setIsLoaded(true);
          return;
        }

        // Cast to unknown first, then to DashboardSettings for proper type handling
        const rawSettings = profile?.dashboard_settings;
        const settings = rawSettings ? (rawSettings as unknown as DashboardSettings) : null;

        if (settings) {
          // Reconstruct preferences from stored settings
          const enabledStageIds = new Set(settings.selected_pipeline_stages || []);
          
          const mergedPipelineStages: PipelineStageConfig[] = DEFAULT_PIPELINE_STAGE_CONFIGS.map(stage => ({
            ...stage,
            enabled: enabledStageIds.has(stage.id),
          }));

          // Merge shortcuts - preserve stored enabled state
          const storedShortcutsMap = new Map(
            (settings.shortcuts || []).map(s => [s.id, s])
          );
          const mergedShortcuts = DEFAULT_SHORTCUTS.map(shortcut => {
            const stored = storedShortcutsMap.get(shortcut.id);
            return stored ? { ...shortcut, enabled: stored.enabled } : shortcut;
          });

          setPreferences({
            widgets: settings.visible_widgets || DEFAULT_PREFERENCES.widgets,
            shortcuts: mergedShortcuts,
            pipelineStages: mergedPipelineStages,
            dateFilter: settings.date_filter,
          });
        }
      } catch (error) {
        console.error('Error loading dashboard preferences:', error);
      }
      
      setIsLoaded(true);
    };

    loadPreferences();
  }, [user]);

  // Save preferences to Supabase with debounce
  const saveToSupabase = useCallback(async (newPrefs: DashboardPreferences) => {
    if (!user || isSavingRef.current) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce saves to avoid excessive API calls
    saveTimeoutRef.current = setTimeout(async () => {
      isSavingRef.current = true;

      try {
        const settings: DashboardSettings = {
          visible_widgets: newPrefs.widgets,
          shortcuts: newPrefs.shortcuts,
          selected_pipeline_stages: newPrefs.pipelineStages
            .filter(s => s.enabled)
            .map(s => s.id),
          date_filter: newPrefs.dateFilter,
        };

        const { error } = await supabase
          .from('profiles')
          .update({ dashboard_settings: JSON.parse(JSON.stringify(settings)) })
          .eq('id', user.id);

        if (error) {
          console.error('Error saving dashboard preferences:', error);
          toast.error('Erro ao salvar preferências');
        }
      } catch (error) {
        console.error('Error saving dashboard preferences:', error);
      } finally {
        isSavingRef.current = false;
      }
    }, 500);
  }, [user]);

  const savePreferences = useCallback((newPrefs: DashboardPreferences) => {
    setPreferences(newPrefs);
    saveToSupabase(newPrefs);
  }, [saveToSupabase]);

  const toggleWidget = useCallback((widget: keyof DashboardWidgetPreferences) => {
    const newPrefs = {
      ...preferences,
      widgets: {
        ...preferences.widgets,
        [widget]: !preferences.widgets[widget],
      },
    };
    savePreferences(newPrefs);
  }, [preferences, savePreferences]);

  const toggleShortcut = useCallback((shortcutId: string) => {
    const newShortcuts = preferences.shortcuts.map(s =>
      s.id === shortcutId ? { ...s, enabled: !s.enabled } : s
    );
    savePreferences({ ...preferences, shortcuts: newShortcuts });
  }, [preferences, savePreferences]);

  const togglePipelineStage = useCallback((stageId: string) => {
    const currentStage = preferences.pipelineStages.find(s => s.id === stageId);
    const enabledCount = preferences.pipelineStages.filter(s => s.enabled).length;

    // If trying to enable and already at max limit
    if (!currentStage?.enabled && enabledCount >= MAX_PIPELINE_STAGES) {
      toast.warning(`Máximo de ${MAX_PIPELINE_STAGES} estágios permitidos`, {
        description: 'Desative outro estágio antes de ativar este.',
      });
      return;
    }

    const newPipelineStages = preferences.pipelineStages.map(s =>
      s.id === stageId ? { ...s, enabled: !s.enabled } : s
    );
    savePreferences({ ...preferences, pipelineStages: newPipelineStages });
  }, [preferences, savePreferences]);

  const syncPipelineStages = useCallback((dbStages: Array<{ id: string; name: string; color: string | null }>) => {
    // Merge: estágios padrão (enum) + customizados (tabela), preservando escolhas do usuário.
    const existingPrefs = preferences.pipelineStages;
    const existingMap = new Map(existingPrefs.map(s => [s.id, s]));
    const hasAnyPrefs = existingPrefs.some(s => s.enabled);

    const mergedDefaults: PipelineStageConfig[] = DEFAULT_PIPELINE_STAGE_CONFIGS.map((defStage) => {
      const existing = existingMap.get(defStage.id);
      return {
        ...defStage,
        enabled: existing ? !!existing.enabled : (hasAnyPrefs ? false : defStage.enabled),
      };
    });

    const mergedCustom: PipelineStageConfig[] = (dbStages || []).map((dbStage) => {
      const existing = existingMap.get(dbStage.id);
      return {
        id: dbStage.id,
        name: dbStage.name,
        color: dbStage.color || '#6366f1',
        enabled: existing ? !!existing.enabled : false,
      };
    });

    const mergedStages: PipelineStageConfig[] = [...mergedDefaults, ...mergedCustom];

    // Only update if stages changed
    const stagesChanged = JSON.stringify(mergedStages.map(s => s.id)) !== 
                          JSON.stringify(existingPrefs.map(s => s.id));
    
    if (stagesChanged || existingPrefs.length === 0) {
      // Don't save to Supabase here - just update local state
      // The enabled state is already persisted, we're just adding stage definitions
      setPreferences(prev => ({ ...prev, pipelineStages: mergedStages }));
    }
  }, [preferences.pipelineStages]);

  const resetPreferences = useCallback(() => {
    const resetPrefs = {
      ...DEFAULT_PREFERENCES,
      pipelineStages: preferences.pipelineStages.map((s, i) => ({ ...s, enabled: i < 3 })),
    };
    savePreferences(resetPrefs);
    toast.success('Preferências restauradas');
  }, [savePreferences, preferences.pipelineStages]);

  const getEnabledStagesCount = useCallback(() => {
    return preferences.pipelineStages.filter(s => s.enabled).length;
  }, [preferences.pipelineStages]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    preferences,
    isLoaded,
    toggleWidget,
    toggleShortcut,
    togglePipelineStage,
    syncPipelineStages,
    resetPreferences,
    savePreferences,
    getEnabledStagesCount,
    maxPipelineStages: MAX_PIPELINE_STAGES,
  };
}
