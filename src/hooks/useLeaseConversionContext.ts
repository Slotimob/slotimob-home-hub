import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Deal } from '@/pages/Pipeline';

// Interface for the context data transported from CRM to Contracts
export interface LeaseConversionContext {
  dealId: string;
  unitId: string;
  unitNumber: string;
  leadId: string;
  leadName: string;
  leadEmail?: string | null;
  leadPhone?: string | null;
  propertyId: string | null;
  propertyName: string;
  estimatedValue?: number | null;
  businessType: 'rental' | 'sale';
}

/**
 * Hook to manage the CRM → Contracts conversion flow.
 * Allows transporting deal context to the asset management module
 * and auto-opening the lease creation wizard with pre-filled data.
 */
export function useLeaseConversionContext() {
  const navigate = useNavigate();

  /**
   * Extract conversion context from a deal object
   */
  const createContextFromDeal = useCallback((deal: Deal): LeaseConversionContext | null => {
    // Only rental deals can be converted to leases
    if (deal.business_type !== 'rental') {
      return null;
    }

    // Must have a unit attached
    if (!deal.unit?.id) {
      return null;
    }

    return {
      dealId: deal.id,
      unitId: deal.unit.id,
      unitNumber: deal.unit.unit_number,
      leadId: deal.lead?.id ?? '',
      leadName: deal.lead?.name ?? '',
      leadEmail: deal.lead?.email ?? null,
      leadPhone: deal.lead?.phone ?? null,
      propertyId: deal.property?.id ?? null,
      propertyName: deal.property?.name ?? deal.unit?.unit_number ?? '',
      estimatedValue: deal.estimated_value,
      businessType: 'rental',
    };
  }, []);

  /**
   * Navigate to the contracts tab with the deal context
   * The context is stored in sessionStorage and passed via URL state
   */
  const navigateToCreateLease = useCallback((context: LeaseConversionContext) => {
    navigate(`/gestao/contratos/novo?unitId=${context.unitId}&dealId=${context.dealId}`);
  }, [navigate]);

  return {
    createContextFromDeal,
    navigateToCreateLease,
  };
}
