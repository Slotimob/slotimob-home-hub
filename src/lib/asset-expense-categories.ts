import {
  Receipt,
  Building2,
  Wrench,
  Briefcase,
  Zap,
  ShieldCheck,
  Hammer,
  PaintRoller,
  Megaphone,
  Sparkles,
  Shield,
  Scale,
  DoorOpen,
  MoreHorizontal,
  type LucideIcon,
} from 'lucide-react';

export const ASSET_EXPENSE_CATEGORIES = {
  iptu: { label: 'IPTU', icon: Receipt, color: '#ef4444' },
  condo_fee: { label: 'Condomínio', icon: Building2, color: '#f97316' },
  maintenance: { label: 'Manutenção', icon: Wrench, color: '#eab308' },
  management_fee: { label: 'Taxa de administração', icon: Briefcase, color: '#84cc16' },
  utilities: { label: 'Água/Luz/Gás', icon: Zap, color: '#06b6d4' },
  insurance: { label: 'Seguro', icon: ShieldCheck, color: '#3b82f6' },
  property_tax: { label: 'Outros tributos', icon: Receipt, color: '#a855f7' },
  repairs: { label: 'Reparos', icon: Hammer, color: '#ec4899' },
  renovation: { label: 'Reforma', icon: PaintRoller, color: '#f43f5e' },
  marketing: { label: 'Marketing/Anúncios', icon: Megaphone, color: '#10b981' },
  cleaning: { label: 'Limpeza', icon: Sparkles, color: '#14b8a6' },
  security: { label: 'Segurança', icon: Shield, color: '#6366f1' },
  legal_fees: { label: 'Honorários jurídicos', icon: Scale, color: '#8b5cf6' },
  vacancy_costs: { label: 'Custos de vacância', icon: DoorOpen, color: '#64748b' },
  other: { label: 'Outros', icon: MoreHorizontal, color: '#94a3b8' },
} as const;

export type AssetExpenseCategory = keyof typeof ASSET_EXPENSE_CATEGORIES;

export const ASSET_EXPENSE_CATEGORY_LIST = Object.entries(ASSET_EXPENSE_CATEGORIES).map(
  ([key, val]) => ({ key: key as AssetExpenseCategory, ...val })
);
