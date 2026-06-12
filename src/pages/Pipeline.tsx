import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { TeamFilter } from '@/components/shared/TeamFilter';
import { Button } from '@/components/ui/button';
import { Plus, BarChart3, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, ArrowUpDown, FolderPlus, Trash2, Pencil, MoreVertical, Filter } from 'lucide-react';
import { PermissionGate } from '@/components/subscription/PermissionGate';
import { HeaderButton } from "@/components/ui/header-button";
import { useToast } from '@/hooks/use-toast';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, TouchSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { KanbanColumn } from '@/components/KanbanColumn';
import { SortableStageColumn } from '@/components/crm/SortableStageColumn';
import { DealCard } from '@/components/DealCard';
import { CreateDealDialog } from '@/components/CreateDealDialog';
import { DealDetailsSheet } from '@/components/crm/DealDetailsSheet';
import { CreateCommissionDialog } from '@/components/crm/CreateCommissionDialog';
import { CreateProposalDialog, type DealContext } from '@/components/CreateProposalDialog';
import { DealClosingDialog } from '@/components/crm/DealClosingDialog';
import { PipelineMetrics } from '@/components/crm/PipelineMetrics';
import { PipelineFilters, type PipelineFiltersState } from '@/components/crm/PipelineFilters';
import { LossReasonDialog } from '@/components/crm/LossReasonDialog';
import { BulkActionsBar } from '@/components/crm/BulkActionsBar';
import { useBulkActionGate, type BulkGateInput } from '@/hooks/useBulkActionGate';
import { RequestApprovalDialog } from '@/components/approvals/RequestApprovalDialog';
import { AddStageCard } from '@/components/crm/AddStageCard';
import { EditStageDialog } from '@/components/crm/EditStageDialog';
import { ReorderStagesDialog } from '@/components/crm/ReorderStagesDialog';

import { PipelineScrollHint } from '@/components/crm/PipelineScrollHint';
import { AppLayout } from '@/components/AppLayout';
import { HelpTooltip } from '@/components/help/HelpTooltip';
import { usePipelineAuxData } from '@/hooks/usePipelineAuxData';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useSwipeNavigation } from '@/hooks/useSwipeNavigation';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Database } from '@/integrations/supabase/types';
import { useCustomPipelines } from '@/hooks/useCustomPipelines';
import { usePipelineDeals } from '@/hooks/usePipelineDeals';
import type { Deal } from '@/hooks/usePipelineDeals';
import { usePipelineStages } from '@/hooks/usePipelineStages';
import type { CustomStage } from '@/hooks/usePipelineStages';
import { useDealMutations } from '@/hooks/useDealMutations';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

type PipelineStage = Database['public']['Enums']['pipeline_stage'];

export type { Deal } from '@/hooks/usePipelineDeals';

// Only "Vendas" pipeline is kept as default; users can create custom pipelines via DB

// CustomStage moved to usePipelineStages hook


interface DisplayStage {
  id: string;
  label: string;
  color: string;
  isCustom: boolean;
}

const DEFAULT_STAGES: DisplayStage[] = [
  { id: 'new_lead', label: 'Novo Lead', color: '#6366f1', isCustom: false },
  { id: 'in_contact', label: 'Em Contato', color: '#8b5cf6', isCustom: false },
  { id: 'visit_scheduled', label: 'Visita Agendada', color: '#f59e0b', isCustom: false },
  { id: 'proposal', label: 'Proposta', color: '#ec4899', isCustom: false },
  { id: 'lost', label: 'Perdido', color: '#ef4444', isCustom: false },
  { id: 'won', label: 'Ganho', color: '#22c55e', isCustom: false },
];

const Pipeline = () => {
  const { user, loading } = useAuth();
  const { effectiveBrokerId } = useWorkspace();
  const { isOwner, hasPermission } = usePermissions();
  const canEdit = isOwner || hasPermission('crm_pipeline', 'edit');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { pipelines: customPipelines, createPipeline, renamePipeline, deletePipeline: deleteCustomPipeline, loading: pipelinesLoading } = useCustomPipelines();
  const [isCreatePipelineOpen, setIsCreatePipelineOpen] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [isRenamePipelineOpen, setIsRenamePipelineOpen] = useState(false);
  const [renamePipelineKey, setRenamePipelineKey] = useState('');
  const [renamePipelineValue, setRenamePipelineValue] = useState('');
  const [isDeletePipelineOpen, setIsDeletePipelineOpen] = useState(false);
  const [deletePipelineKey, setDeletePipelineKey] = useState('');
  const activePipeline = searchParams.get('type') || 'sale';
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const { deals, loadingDeals, invalidateDeals, setDealsOptimistic } = usePipelineDeals({
    activePipeline,
    teamFilter,
    userId: user?.id,
  });
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [showMetrics, setShowMetrics] = useState(false);
  const { taskCounts, stageHistory, properties } = usePipelineAuxData();
  const {
    customStages,
    stageOrder,
    saveStageOrder,
    handleAddStage,
    handleDeleteStage,
    handleSaveStage,
    handleReorderStages,
  } = usePipelineStages(activePipeline);
  const { updateDealPlacement, bulkMoveDeals, confirmLossReason } = useDealMutations();
  const [isReorderDialogOpen, setIsReorderDialogOpen] = useState(false);

  const kanbanScrollRef = useRef<HTMLDivElement | null>(null);
  const [showScrollRight, setShowScrollRight] = useState(true);
  const [showScrollLeft, setShowScrollLeft] = useState(false);
  const isMobile = useIsMobile();
  
  // Drag-to-scroll state
  const isDraggingScroll = useRef(false);
  const dragStartX = useRef(0);
  const scrollStartLeft = useRef(0);

  const COLUMN_WIDTH = 336; // 320px column + 16px gap (desktop)
  const MOBILE_COLUMN_WIDTH = 304; // 288px column + 16px gap (mobile)

  // Initialize swipe navigation for mobile
  useSwipeNavigation({
    containerRef: kanbanScrollRef,
    columnWidth: isMobile ? MOBILE_COLUMN_WIDTH : COLUMN_WIDTH,
    threshold: 60,
    velocityThreshold: 0.25,
    enabled: isMobile,
  });

  // Check scroll position to show/hide indicators
  const updateScrollIndicators = useCallback(() => {
    const el = kanbanScrollRef.current;
    if (!el) return;
    
    const isAtStart = el.scrollLeft <= 20;
    const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 20;
    const hasOverflow = el.scrollWidth > el.clientWidth;
    
    setShowScrollLeft(!isAtStart && hasOverflow);
    setShowScrollRight(!isAtEnd && hasOverflow);
  }, []);

  // Initial check for scroll indicators
  useEffect(() => {
    const el = kanbanScrollRef.current;
    if (!el) return;
    
    // Small delay to ensure layout is complete
    const timer = setTimeout(updateScrollIndicators, 100);
    
    el.addEventListener('scroll', updateScrollIndicators, { passive: true });
    window.addEventListener('resize', updateScrollIndicators);
    
    return () => {
      clearTimeout(timer);
      el.removeEventListener('scroll', updateScrollIndicators);
      window.removeEventListener('resize', updateScrollIndicators);
    };
  }, [updateScrollIndicators, loadingDeals]);

  const scrollKanban = useCallback((direction: 'left' | 'right') => {
    const el = kanbanScrollRef.current;
    if (!el) return;
    
    const scrollAmount = direction === 'right' ? COLUMN_WIDTH : -COLUMN_WIDTH;
    el.scrollBy({ left: scrollAmount, behavior: 'smooth' });
  }, []);

  const handleKanbanWheel = useCallback((e: WheelEvent) => {
    const el = kanbanScrollRef.current;
    if (!el) return;

    // If the user is already doing horizontal scrolling (trackpad), don't interfere.
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    // Check if scroll originated from inside a card content area (inner scrollable)
    const target = e.target as HTMLElement | null;
    const cardContent = target?.closest?.('[data-card-scroll]');
    if (cardContent) {
      // Let the card handle its own vertical scroll - don't convert to horizontal
      return;
    }

    // Check if we can scroll
    const canScrollLeft = el.scrollLeft > 0;
    const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth;

    // Only prevent default if we can actually scroll in the intended direction
    if ((e.deltaY > 0 && canScrollRight) || (e.deltaY < 0 && canScrollLeft)) {
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, []);

  useEffect(() => {
    const el = kanbanScrollRef.current;
    if (!el) return;

    // React may attach wheel handlers as passive; use a native non-passive listener.
    const listener = handleKanbanWheel as unknown as EventListener;
    el.addEventListener('wheel', listener, { passive: false });
    return () => el.removeEventListener('wheel', listener);
  }, [handleKanbanWheel]);

  // Drag-to-scroll handlers (mouse only). Touch uses native swipe.
  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== 'mouse') return;

    const el = kanbanScrollRef.current;
    if (!el) return;

    // Don’t hijack interactions on draggable handles or interactive controls
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-dnd-handle]') ||
      target.closest('[data-deal-card]') ||
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('textarea') ||
      target.closest('[role="button"]')
    ) {
      return;
    }

    isDraggingScroll.current = true;
    dragStartX.current = e.clientX;
    scrollStartLeft.current = el.scrollLeft;

    // Keep receiving move events even if pointer leaves the element
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    e.currentTarget.classList.add('cursor-grabbing');
    el.style.userSelect = 'none';
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingScroll.current || e.pointerType !== 'mouse') return;

    const el = kanbanScrollRef.current;
    if (!el) return;

    const deltaX = dragStartX.current - e.clientX;
    el.scrollLeft = scrollStartLeft.current + deltaX;
    e.preventDefault();
  }, []);

  const endPointerDrag = useCallback((e?: React.PointerEvent<HTMLDivElement>) => {
    isDraggingScroll.current = false;
    const el = kanbanScrollRef.current;
    if (el) {
      el.style.userSelect = '';
    }
    if (e?.currentTarget) {
      e.currentTarget.classList.remove('cursor-grabbing');
    }
  }, []);





  const [filters, setFilters] = useState<PipelineFiltersState>({
    search: '',
    priority: '',
    temperature: '',
    origin: '',
    minValue: '',
    maxValue: '',
    propertyId: '',
    dateFrom: undefined,
    dateTo: undefined,
  });

  // Selection mode state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedDeals, setSelectedDeals] = useState<Set<string>>(new Set());
  const gate = useBulkActionGate();
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [pendingGateInput, setPendingGateInput] = useState<BulkGateInput | null>(null);
  const [pendingThreshold, setPendingThreshold] = useState(0);

  // Loss reason dialog state
  const [isLossDialogOpen, setIsLossDialogOpen] = useState(false);
  const [pendingLossDeal, setPendingLossDeal] = useState<{
    dealId: string;
    oldStage: PipelineStage;
    oldVisibleStageId: string;
  } | null>(null);

  // Commission dialog state (for "won" deals)
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false);
  const [pendingWonDeal, setPendingWonDeal] = useState<Deal | null>(null);

  // Edit stage dialog state
  const [isEditStageDialogOpen, setIsEditStageDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState<CustomStage | null>(null);

  // Proposal auto-trigger state
  const [isProposalDialogOpen, setIsProposalDialogOpen] = useState(false);
  const [proposalDealContext, setProposalDealContext] = useState<DealContext | null>(null);

  // Reorder mode state (now used to open dialog)
  const [isReorderMode, setIsReorderMode] = useState(false);

  // Drag state
  const [isDraggingStage, setIsDraggingStage] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 4,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 8,
      },
    })
  );

  // Combine default and custom stages with custom ordering
  const allStages = useMemo((): DisplayStage[] => {
    const customDisplayStages: DisplayStage[] = customStages.map((cs) => ({
      id: `custom_${cs.id}`,
      label: cs.name,
      color: cs.color,
      isCustom: true,
    }));
    
    // Default order: default stages (except lost/won), then custom, then lost/won
    const lostIndex = DEFAULT_STAGES.findIndex(s => s.id === 'lost');
    const regularStages = DEFAULT_STAGES.slice(0, lostIndex);
    const finalStages = DEFAULT_STAGES.slice(lostIndex);
    const defaultOrder = [...regularStages, ...customDisplayStages, ...finalStages];
    
    // If custom order exists, use it
    if (stageOrder && stageOrder.length > 0) {
      const stageMap = new Map(defaultOrder.map(s => [s.id, s]));
      const ordered: DisplayStage[] = [];
      
      // Add stages in custom order
      for (const id of stageOrder) {
        const stage = stageMap.get(id);
        if (stage) {
          ordered.push(stage);
          stageMap.delete(id);
        }
      }
      
      // Add any new stages that weren't in the saved order
      stageMap.forEach(stage => ordered.push(stage));
      
      return ordered;
    }
    
    return defaultOrder;
  }, [customStages, stageOrder]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      loadTaskCounts();
      loadStageHistory();
      loadProperties();
    }
  }, [user, teamFilter, activePipeline]);

  // Clear selection when exiting selection mode
  useEffect(() => {
    if (!selectionMode) {
      setSelectedDeals(new Set());
    }
  }, [selectionMode]);




  const loadTaskCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_tasks')
        .select('deal_id, is_completed, due_date');

      if (error) throw error;

      const counts: Record<string, { pending: number; overdue: number }> = {};
      
      (data as TaskCount[])?.forEach((task) => {
        if (!counts[task.deal_id]) {
          counts[task.deal_id] = { pending: 0, overdue: 0 };
        }
        
        if (!task.is_completed) {
          counts[task.deal_id].pending++;
          
          if (task.due_date && isPast(new Date(task.due_date)) && !isToday(new Date(task.due_date))) {
            counts[task.deal_id].overdue++;
          }
        }
      });

      setTaskCounts(counts);
    } catch (error) {
      console.error('Error loading task counts:', error);
    }
  };

  const loadStageHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('deal_stage_history')
        .select('deal_id, from_stage, to_stage, changed_at')
        .order('changed_at', { ascending: false });

      if (error) throw error;
      setStageHistory(data || []);
    } catch (error) {
      console.error('Error loading stage history:', error);
    }
  };

  const loadProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error loading properties:', error);
    }
  };

  const handleEditStage = (stage: CustomStage) => {
    console.debug('[pipeline] handleEditStage called', { stage });
    setEditingStage(stage);
    setIsEditStageDialogOpen(true);
  };


  // Filter deals
  const filteredDeals = useMemo(() => {
    return deals.filter((deal) => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          (deal as any).title?.toLowerCase().includes(searchLower) ||
          deal.lead?.name?.toLowerCase().includes(searchLower) ||
          deal.lead?.email?.toLowerCase().includes(searchLower) ||
          deal.lead?.phone?.includes(filters.search) ||
          deal.property?.name?.toLowerCase().includes(searchLower) ||
          deal.unit?.unit_number?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Priority filter
      if (filters.priority && filters.priority !== 'all') {
        if ((deal.priority || 'medium') !== filters.priority) return false;
      }

      // Temperature filter
      if (filters.temperature && filters.temperature !== 'all') {
        if (((deal as any).temperature || 'warm') !== filters.temperature) return false;
      }

      // Origin filter
      if (filters.origin && filters.origin !== 'all') {
        if (deal.lead?.origin?.toLowerCase() !== filters.origin.toLowerCase()) return false;
      }

      // Property filter
      if (filters.propertyId && filters.propertyId !== 'all') {
        if (deal.property?.id !== filters.propertyId) return false;
      }

      // Value range filter
      if (filters.minValue) {
        if (!deal.estimated_value || deal.estimated_value < Number(filters.minValue)) return false;
      }
      if (filters.maxValue) {
        if (!deal.estimated_value || deal.estimated_value > Number(filters.maxValue)) return false;
      }

      // Date range filter
      if (filters.dateFrom) {
        const dealDate = new Date(deal.created_at);
        if (dealDate < filters.dateFrom) return false;
      }
      if (filters.dateTo) {
        const dealDate = new Date(deal.created_at);
        const endOfDay = new Date(filters.dateTo);
        endOfDay.setHours(23, 59, 59, 999);
        if (dealDate > endOfDay) return false;
      }

      return true;
    });
  }, [deals, filters]);

  const handleDragStart = (event: DragStartEvent) => {
    if (!canEdit) return; // Block drag for users without edit permission
    
    const activeId = event.active.id as string;
    
    // Check if dragging a stage (stage IDs start with "stage_")
    if (activeId.startsWith('stage_')) {
      setIsDraggingStage(true);
      setActiveDeal(null);
      return;
    }
    
    // Otherwise dragging a deal
    const deal = deals.find((d) => d.id === activeId);
    setActiveDeal(deal || null);
    setIsDraggingStage(false);
  };

  const getDealVisibleStageId = (deal: Deal): string => {
    return deal.custom_stage_id ? `custom_${deal.custom_stage_id}` : deal.stage;
  };

  // updateDealPlacement now provided by useDealMutations hook


  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDeal(null);
    setIsDraggingStage(false);

    if (!over || active.id === over.id) return;

    // Block deal moves for users without edit permission (stage reorder still allowed)
    const activeId_check = active.id as string;
    const overId_check = over.id as string;
    if (!activeId_check.startsWith('stage_') && !overId_check.startsWith('stage_')) {
      if (!canEdit) {
        toast({ title: 'Sem permissão', description: 'Você não tem permissão para mover negócios.', variant: 'destructive' });
        return;
      }
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    // Check if reordering stages
    if (activeId.startsWith('stage_') && overId.startsWith('stage_')) {
      await handleReorderStages(activeId, overId, allStages.map(s => s.id));
      return;
    }

    // Otherwise, moving a deal to a new (visible) stage
    const dealId = activeId;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal) return;

    const oldVisibleStageId = getDealVisibleStageId(deal);
    const newVisibleStageId = overId;

    if (oldVisibleStageId === newVisibleStageId) return;

    await updateDealPlacement(
      dealId,
      newVisibleStageId,
      customStages,
      deals,
      (id, oldStage, oldVisibleStageId) => {
        setPendingLossDeal({ dealId: id, oldStage, oldVisibleStageId });
        setIsLossDialogOpen(true);
      },
      (movedDeal) => {
        setPendingWonDeal(movedDeal);
        setIsCommissionDialogOpen(true);
      },
    );

    // Preserve proposal dialog side-effect
    if (newVisibleStageId === 'proposal') {
      setProposalDealContext({
        deal_id: dealId,
        lead_id: deal.lead?.id || '',
        lead_name: deal.lead?.name || '',
        property_id: deal.property?.id || null,
        property_name: deal.property?.name || null,
        unit_id: deal.unit?.id || null,
        unit_number: deal.unit?.unit_number || null,
        estimated_value: deal.estimated_value,
      });
      setIsProposalDialogOpen(true);
    }
  };

  const handleLossReasonConfirm = async (reason: string, notes: string) => {
    if (!pendingLossDeal) return;
    await confirmLossReason(
      pendingLossDeal.dealId,
      pendingLossDeal.oldVisibleStageId,
      reason,
      notes,
      deals,
    );
    setPendingLossDeal(null);
    setIsLossDialogOpen(false);
  };

  const handleLossReasonCancel = () => {
    setIsLossDialogOpen(false);
    setPendingLossDeal(null);
  };

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal);
    setIsDetailsOpen(true);
  };

  const handleDealUpdate = () => {
    invalidateDeals();
    loadTaskCounts();
    loadStageHistory();
  };

  // Selection handlers
  const handleSelectionChange = (dealId: string, selected: boolean) => {
    setSelectedDeals((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(dealId);
      } else {
        newSet.delete(dealId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (dealIds: string[], selected: boolean) => {
    setSelectedDeals((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        dealIds.forEach((id) => newSet.add(id));
      } else {
        dealIds.forEach((id) => newSet.delete(id));
      }
      return newSet;
    });
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((prev) => !prev);
  };

  const handleBulkMove = async (targetStage: string) => {
    if (selectedDeals.size === 0) return;

    // Gate check
    const dealIds = Array.from(selectedDeals);
    const gateInput: BulkGateInput = { actionType: 'bulk_status_change', itemCount: dealIds.length, targetTable: 'deals', targetIds: dealIds };
    const r = await gate.check(gateInput);
    if (!r.canProceed) {
      setPendingGateInput(gateInput);
      setPendingThreshold(r.thresholdValue ?? 0);
      setApprovalDialogOpen(true);
      return;
    }

    // Only allow moving to default stages (enum values)
    const isDefaultStage = DEFAULT_STAGES.some(s => s.id === targetStage);
    if (!isDefaultStage) {
      toast({
        title: 'Ação não suportada',
        description: 'Movimentação em massa só é permitida para estágios padrão.',
        variant: 'destructive',
      });
      return;
    }

    await bulkMoveDeals(dealIds, targetStage, deals);
    setSelectionMode(false);
    setSelectedDeals(new Set());
  };


  const handleCancelSelection = () => {
    setSelectedDeals(new Set());
    setSelectionMode(false);
  };

  const isCurrentPipelineCustom = activePipeline !== 'sale';
  const currentPipelineName = customPipelines.find(p => p.pipeline_key === activePipeline)?.name || 'Pipeline';

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    const key = await createPipeline(newPipelineName.trim());
    if (key) {
      setNewPipelineName('');
      setIsCreatePipelineOpen(false);
      navigate(`/pipeline?type=${key}`);
    }
  };

  const handleRenamePipeline = async () => {
    if (!renamePipelineValue.trim()) return;
    await renamePipeline(renamePipelineKey, renamePipelineValue.trim());
    setIsRenamePipelineOpen(false);
  };

  const handleDeletePipeline = async () => {
    await deleteCustomPipeline(deletePipelineKey);
    setIsDeletePipelineOpen(false);
    if (activePipeline === deletePipelineKey) {
      navigate('/pipeline?type=sale');
    }
  };

  const openRenameDialog = () => {
    setRenamePipelineKey(activePipeline);
    setRenamePipelineValue(currentPipelineName);
    setIsRenamePipelineOpen(true);
  };

  const openDeleteDialog = () => {
    setDeletePipelineKey(activePipeline);
    setIsDeletePipelineOpen(true);
  };

  // Skeleton loading state
  if (loading || loadingDeals) {
    return (
      <AppLayout title="Pipeline" titleExtra={<HelpTooltip featureKey="crm.pipeline" />}>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="flex gap-4 overflow-hidden">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="w-[320px] flex-shrink-0 space-y-3">
                <Skeleton className="h-10 w-full rounded-lg" />
                {Array.from({ length: 3 - i % 2 }).map((_, j) => (
                  <Skeleton key={j} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }
  return (
    <AppLayout
      title={currentPipelineName}
      titleExtra={
        <div className="flex items-center gap-1">
          {isCurrentPipelineCustom && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Opções do pipeline">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={openRenameDialog}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Renomear pipeline
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={openDeleteDialog} className="text-destructive focus:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir pipeline
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <HelpTooltip featureKey="crm.pipeline" />
        </div>
      }
      headerActions={
        <>
          <PermissionGate permission="crm_pipeline.create">
            <HeaderButton icon={<Plus className="h-4 w-4" />} onClick={() => setIsCreateDialogOpen(true)}>
              Nova Negociação
            </HeaderButton>
          </PermissionGate>
          <HeaderButton
            variant="outline"
            iconOnly
            showTextAt="lg"
            icon={<FolderPlus className="h-4 w-4" />}
            onClick={() => setIsCreatePipelineOpen(true)}
          >
            Novo Pipeline
          </HeaderButton>
          <HeaderButton
            variant={showMetrics ? 'secondary' : 'outline'}
            iconOnly
            showTextAt="lg"
            icon={<BarChart3 className="h-4 w-4" />}
            onClick={() => setShowMetrics(!showMetrics)}
          >
            Métricas
          </HeaderButton>
          <HeaderButton
            variant="ghost"
            iconOnly
            showTextAt="lg"
            icon={<ArrowUpDown className="h-4 w-4" />}
            onClick={() => setIsReorderDialogOpen(true)}
          >
            Reordenar
          </HeaderButton>
        </>
      }
    >
      <div className="space-y-4">

        {/* Metrics Section */}
        <Collapsible open={showMetrics} onOpenChange={setShowMetrics}>
          <CollapsibleContent className="space-y-4">
            <PipelineMetrics deals={deals} stageHistory={stageHistory} />
          </CollapsibleContent>
        </Collapsible>

        {/* Filters */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <PipelineFilters
              filters={filters}
              onFiltersChange={setFilters}
              properties={properties}
            />
          </div>
          <TeamFilter value={teamFilter} onValueChange={setTeamFilter} />
        </div>

        {/* Empty state */}
        {deals.length === 0 && !loadingDeals && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-muted p-4 mb-4">
              <Filter className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma negociação</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Este pipeline ainda não possui negociações. Crie a primeira para começar a acompanhar seus deals.
            </p>
            <PermissionGate permission="crm_pipeline.create">
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Negociação
              </Button>
            </PermissionGate>
          </div>
        )}

        {/* Pipeline Kanban */}
        <div className="relative group">
          {/* Left navigation button - discrete, hidden on mobile */}
          <button
            onClick={() => scrollKanban('left')}
            className={`hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground ${
              showScrollLeft ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-label="Scroll esquerda"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {/* Right navigation button - discrete, hidden on mobile */}
          <button
            onClick={() => scrollKanban('right')}
            className={`hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 items-center justify-center rounded-full bg-muted/60 text-muted-foreground transition-all duration-200 hover:bg-muted hover:text-foreground ${
              showScrollRight ? 'opacity-70 hover:opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-label="Scroll direita"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          <div
            ref={kanbanScrollRef}
            className="w-full min-w-0 overflow-x-scroll overflow-y-hidden h-[calc(100vh-16rem)] pb-4 touch-pan-x overscroll-x-contain pipeline-scrollbar cursor-grab px-6 snap-x snap-proximity md:snap-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={endPointerDrag}
            onPointerCancel={endPointerDrag}
            onPointerLeave={endPointerDrag}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="min-w-max px-2 py-3 select-none pr-8 md:pr-2 h-full">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={customStages.map(s => `stage_${s.id}`)}
                strategy={horizontalListSortingStrategy}
              >
                <div className="flex gap-4 min-w-max h-full">
                  {/* Render all stages in the correct order from allStages */}
                  {allStages.map((stage) => {
                    // Custom stage
                    if (stage.isCustom) {
                      const customStageId = stage.id.replace('custom_', '');
                      const customStage = customStages.find(cs => cs.id === customStageId);
                      if (!customStage) return null;
                      
                      return (
                        <SortableStageColumn
                          key={stage.id}
                          id={`stage_${customStageId}`}
                          stageId={stage.id}
                          title={stage.label}
                          color={stage.color}
                          deals={filteredDeals.filter((deal) => deal.custom_stage_id === customStageId)}
                          onDealClick={handleDealClick}
                          taskCounts={taskCounts}
                          selectionMode={selectionMode}
                          selectedDeals={selectedDeals}
                          onSelectionChange={handleSelectionChange}
                          onSelectAll={handleSelectAll}
                          onToggleSelectionMode={handleToggleSelectionMode}
                          isCustomStage={true}
                          onEditStage={() => handleEditStage(customStage)}
                          onDeleteStage={() => handleDeleteStage(customStageId)}
                          isDraggingStage={isDraggingStage}
                          isReorderMode={isReorderMode}
                          stageHistory={stageHistory}
                        />
                      );
                    }
                    
                    // Default stage (including lost/won)
                    return (
                      <KanbanColumn
                        key={stage.id}
                        id={stage.id}
                        title={stage.label}
                        color={stage.color}
                        deals={filteredDeals.filter(
                          (deal) => deal.stage === stage.id && !deal.custom_stage_id
                        )}
                        onDealClick={handleDealClick}
                        taskCounts={taskCounts}
                        selectionMode={selectionMode}
                        selectedDeals={selectedDeals}
                        onSelectionChange={handleSelectionChange}
                        onSelectAll={handleSelectAll}
                        onToggleSelectionMode={handleToggleSelectionMode}
                        isCustomStage={false}
                        stageHistory={stageHistory}
                      />
                    );
                  })}

                  {/* Add Stage Card - always at the end */}
                  <AddStageCard 
                    onAddStage={handleAddStage}
                    existingStages={[
                      ...DEFAULT_STAGES.filter(s => s.id !== 'lost' && s.id !== 'won').map(s => ({
                        id: s.id,
                        name: s.label,
                        isCustom: false,
                      })),
                      ...customStages.map(s => ({
                        id: s.id,
                        name: s.name,
                        isCustom: true,
                      })),
                    ]}
                  />
                  
                  {/* Spacer para garantir scroll completo no mobile */}
                  <div className="flex-shrink-0 w-8 md:hidden" aria-hidden="true" />
                </div>
              </SortableContext>

              <DragOverlay>
                {activeDeal ? <DealCard deal={activeDeal} isDragging /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        </div>
      </div>

      {/* Floating Scroll Hint */}
      <PipelineScrollHint />

      {/* Mobile FAB to scroll to Add Stage */}
      <Button
        className="fixed bottom-24 right-4 z-50 rounded-full shadow-lg md:hidden h-14 w-14"
        size="icon"
        onClick={() => {
          const el = kanbanScrollRef.current;
          if (el) {
            el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
          }
        }}
        aria-label="Adicionar estágio"
      >
        <Plus className="h-6 w-6" />
      </Button>

        {/* Bulk Actions Bar */}
        <BulkActionsBar
          selectedCount={selectedDeals.size}
          stages={allStages.map(s => ({ id: s.id as PipelineStage, label: s.label }))}
          onMove={handleBulkMove}
          onCancel={handleCancelSelection}
        />

        {pendingGateInput && (
          <RequestApprovalDialog
            open={approvalDialogOpen}
            onClose={() => setApprovalDialogOpen(false)}
            gateInput={pendingGateInput}
            thresholdValue={pendingThreshold}
          />
        )}
      </div>

      <CreateDealDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSuccess={invalidateDeals}
        pipelineType={activePipeline}
      />

      <DealDetailsSheet
        deal={selectedDeal}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
        onUpdate={handleDealUpdate}
      />

      <LossReasonDialog
        open={isLossDialogOpen}
        onOpenChange={setIsLossDialogOpen}
        onConfirm={handleLossReasonConfirm}
        onCancel={handleLossReasonCancel}
        dealName={deals.find(d => d.id === pendingLossDeal?.dealId)?.lead.name}
      />

      <EditStageDialog
        open={isEditStageDialogOpen}
        onOpenChange={setIsEditStageDialogOpen}
        stage={editingStage}
        onSave={handleSaveStage}
      />

      <ReorderStagesDialog
        open={isReorderDialogOpen}
        onOpenChange={setIsReorderDialogOpen}
        stages={allStages.map(s => {
          const customStage = customStages.find(cs => `custom_${cs.id}` === s.id);
          return {
            id: s.id,
            name: s.label,
            color: s.color,
            isCustom: s.isCustom,
            isWonStage: customStage?.is_won_stage || s.id === 'won',
            isLostStage: customStage?.is_lost_stage || s.id === 'lost',
          };
        })}
        onSave={saveStageOrder}
      />

      <DealClosingDialog
        deal={pendingWonDeal}
        open={isCommissionDialogOpen}
        onOpenChange={(open) => {
          setIsCommissionDialogOpen(open);
          if (!open) setPendingWonDeal(null);
        }}
        onSuccess={() => {
          setPendingWonDeal(null);
          invalidateDeals(); // Reload deals to reflect updated unit status
        }}
      />

      <CreateProposalDialog
        open={isProposalDialogOpen}
        onOpenChange={(open) => {
          setIsProposalDialogOpen(open);
          if (!open) setProposalDealContext(null);
        }}
        onSuccess={() => {
          setProposalDealContext(null);
          invalidateDeals();
        }}
        dealContext={proposalDealContext}
      />

      <Dialog open={isCreatePipelineOpen} onOpenChange={setIsCreatePipelineOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Novo Pipeline</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Nome do pipeline (ex: Locações, Captações)"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePipeline()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreatePipelineOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreatePipeline} disabled={!newPipelineName.trim()}>Criar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Pipeline Dialog */}
      <Dialog open={isRenamePipelineOpen} onOpenChange={setIsRenamePipelineOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Renomear Pipeline</DialogTitle>
            <DialogDescription>Altere o nome do pipeline. A chave interna será preservada.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Input
              placeholder="Novo nome"
              value={renamePipelineValue}
              onChange={(e) => setRenamePipelineValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRenamePipeline()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenamePipelineOpen(false)}>Cancelar</Button>
            <Button onClick={handleRenamePipeline} disabled={!renamePipelineValue.trim()}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Pipeline Confirmation */}
      <AlertDialog open={isDeletePipelineOpen} onOpenChange={setIsDeletePipelineOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pipeline</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o pipeline "{customPipelines.find(p => p.pipeline_key === deletePipelineKey)?.name}"?
              As negociações associadas permanecerão no banco mas não serão exibidas em nenhum pipeline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePipeline} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Pipeline;
