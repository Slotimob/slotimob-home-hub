import type { Database } from '@/integrations/supabase/types';

type UnitStatus = Database['public']['Enums']['unit_status'];

// Single Source of Truth for unit status styling
// Based on UnitStatsCards.tsx colors - ensures consistency across all views
export const UNIT_STATUS_STYLES: Record<UnitStatus, {
  label: string;
  // Hex color for direct use (e.g., kanban dots)
  hex: string;
  // RGB for glow effects
  rgb: string;
  // Tailwind classes for badges
  badgeClasses: string;
  // Tailwind classes for cards (background gradient)
  cardClasses: string;
  // Text color class
  textClass: string;
}> = {
  available: {
    label: 'Disponível',
    hex: '#22c55e',
    rgb: '34, 197, 94',
    badgeClasses: 'bg-green-500/15 text-green-600 border-green-500/30',
    cardClasses: 'border-green-500/30 bg-gradient-to-br from-green-500/20 to-transparent',
    textClass: 'text-green-600',
  },
  reserved: {
    label: 'Reservado',
    hex: '#eab308',
    rgb: '234, 179, 8',
    badgeClasses: 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30',
    cardClasses: 'border-yellow-500/30 bg-gradient-to-br from-yellow-500/20 to-transparent',
    textClass: 'text-yellow-600',
  },
  rented: {
    label: 'Alugado',
    hex: '#3b82f6',
    rgb: '59, 130, 246',
    badgeClasses: 'bg-blue-500/15 text-blue-600 border-blue-500/30',
    cardClasses: 'border-blue-500/30 bg-gradient-to-br from-blue-500/20 to-transparent',
    textClass: 'text-blue-600',
  },
  sold: {
    label: 'Vendido',
    hex: '#ef4444',
    rgb: '239, 68, 68',
    badgeClasses: 'bg-red-500/15 text-red-600 border-red-500/30',
    cardClasses: 'border-red-500/30 bg-gradient-to-br from-red-500/20 to-transparent',
    textClass: 'text-red-600',
  },
};

// Helper to get status label
export const getStatusLabel = (status: UnitStatus): string => {
  return UNIT_STATUS_STYLES[status]?.label || status;
};

// Helper to get status color hex
export const getStatusColor = (status: UnitStatus): string => {
  return UNIT_STATUS_STYLES[status]?.hex || '#6b7280';
};

// All available statuses in order
export const ALL_UNIT_STATUSES: UnitStatus[] = ['available', 'reserved', 'rented', 'sold'];
