import {
  FileText,
  ClipboardCheck,
  TrendingUp,
  User,
  Wrench,
  CalendarDays,
  Hammer,
  StickyNote,
  type LucideIcon,
} from "lucide-react";

/** Categorias da view `asset_timeline`. */
export type TimelineCategory =
  | "contrato"
  | "inquilino"
  | "manutencao"
  | "vistoria"
  | "visita_reuniao"
  | "benfeitoria"
  | "reajuste"
  | "nota";

export interface AssetTimelineEvent {
  broker_id: string | null;
  unit_id: string | null;
  property_id: string | null;
  occurred_on: string | null;
  occurred_at: string | null;
  category: string | null;
  event_type: string | null;
  title: string | null;
  detail: string | null;
  source_table: string | null;
  source_id: string | null;
  lease_id: string | null;
  contact_id: string | null;
}

interface CategoryDef {
  label: string;
  icon: LucideIcon;
  /** Classes com tokens semânticos (sem cores fixas). */
  iconClass: string;
}

/** Ordem dos chips de filtro. */
export const TIMELINE_CATEGORIES: { value: TimelineCategory; label: string }[] = [
  { value: "contrato", label: "Contratos" },
  { value: "inquilino", label: "Inquilinos" },
  { value: "manutencao", label: "Manutenções" },
  { value: "vistoria", label: "Vistorias" },
  { value: "visita_reuniao", label: "Visitas e reuniões" },
  { value: "benfeitoria", label: "Benfeitorias" },
  { value: "reajuste", label: "Reajustes" },
  { value: "nota", label: "Notas e ocorrências" },
];

export const CATEGORY_DEFS: Record<TimelineCategory, CategoryDef> = {
  contrato: { label: "Contrato", icon: FileText, iconClass: "bg-primary/10 text-primary" },
  inquilino: { label: "Inquilino", icon: User, iconClass: "bg-accent text-accent-foreground" },
  manutencao: { label: "Manutenção", icon: Wrench, iconClass: "bg-secondary text-secondary-foreground" },
  vistoria: { label: "Vistoria", icon: ClipboardCheck, iconClass: "bg-primary/10 text-primary" },
  visita_reuniao: { label: "Visita/Reunião", icon: CalendarDays, iconClass: "bg-accent text-accent-foreground" },
  benfeitoria: { label: "Benfeitoria", icon: Hammer, iconClass: "bg-secondary text-secondary-foreground" },
  reajuste: { label: "Reajuste", icon: TrendingUp, iconClass: "bg-primary/10 text-primary" },
  nota: { label: "Nota", icon: StickyNote, iconClass: "bg-muted text-muted-foreground" },
};

/** Rótulos por event_type (quando o título da view vier vazio). */
export const EVENT_TYPE_LABELS: Record<string, string> = {
  contract_start: "Início do contrato",
  contract_renewal: "Renovação do contrato",
  contract_end: "Encerramento do contrato",
  contract_signed: "Contrato assinado",
  inspection_entry: "Vistoria de entrada",
  inspection_exit: "Vistoria de saída",
  keys_returned: "Devolução de chaves",
  rent_adjustment: "Reajuste de aluguel",
  tenant_in: "Entrada de inquilino",
  tenant_out: "Saída de inquilino",
  improvement: "Benfeitoria",
};

export function categoryDef(category: string | null | undefined): CategoryDef {
  return CATEGORY_DEFS[(category as TimelineCategory) || "nota"] ?? CATEGORY_DEFS.nota;
}

export function eventTitle(e: AssetTimelineEvent): string {
  return e.title || EVENT_TYPE_LABELS[e.event_type || ""] || categoryDef(e.category).label;
}
