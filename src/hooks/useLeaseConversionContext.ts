import { useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  propertyId: string;
  propertyName: string;
  estimatedValue?: number | null;
  businessType: 'rental' | 'sale';
}

// Key for sessionStorage to persist context across navigation
const CONTEXT_STORAGE_KEY = 'lease_conversion_context';

/**
 * Hook to manage the CRM → Contracts conversion flow.
 * Allows transporting deal context to the asset management module
 * and auto-opening the lease creation wizard with pre-filled data.
 */
export function useLeaseConversionContext() {
  const navigate = useNavigate();
  const location = useLocation();

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
      leadId: deal.lead.id,
      leadName: deal.lead.name,
      leadEmail: deal.lead.email,
      leadPhone: deal.lead.phone,
      propertyId: deal.property.id,
      propertyName: deal.property.name,
      estimatedValue: deal.estimated_value,
      businessType: 'rental',
    };
  }, []);

  /**
   * Navigate to the contracts tab with the deal context
   * The context is stored in sessionStorage and passed via URL state
   */
  const navigateToCreateLease = useCallback((context: LeaseConversionContext) => {
    // Store context in sessionStorage as backup
    sessionStorage.setItem(CONTEXT_STORAGE_KEY, JSON.stringify(context));

    // Navigate with state to the gestão contratos page
    navigate('/gestao/contratos', {
      state: {
        leaseConversion: context,
        autoOpenWizard: true,
      },
    });
  }, [navigate]);

  /**
   * Check if we have incoming conversion context
   * Returns the context if present and clears it from storage
   */
  const consumeConversionContext = useCallback((): LeaseConversionContext | null => {
    // First check URL state (React Router)
    const locationState = location.state as { 
      leaseConversion?: LeaseConversionContext;
      autoOpenWizard?: boolean;
    } | null;

    if (locationState?.leaseConversion) {
      // Clear the URL state to prevent re-triggering on refresh
      window.history.replaceState({}, document.title);
      
      // Also clear sessionStorage
      sessionStorage.removeItem(CONTEXT_STORAGE_KEY);
      
      return locationState.leaseConversion;
    }

    // Fallback: check sessionStorage
    const storedContext = sessionStorage.getItem(CONTEXT_STORAGE_KEY);
    if (storedContext) {
      try {
        const context = JSON.parse(storedContext) as LeaseConversionContext;
        // Clear after consuming
        sessionStorage.removeItem(CONTEXT_STORAGE_KEY);
        return context;
      } catch {
        sessionStorage.removeItem(CONTEXT_STORAGE_KEY);
      }
    }

    return null;
  }, [location.state]);

  /**
   * Check if auto-open wizard flag is set (without consuming)
   */
  const shouldAutoOpenWizard = useCallback((): boolean => {
    const locationState = location.state as { 
      autoOpenWizard?: boolean;
    } | null;

    return locationState?.autoOpenWizard === true;
  }, [location.state]);

  /**
   * Clear any pending conversion context
   */
  const clearContext = useCallback(() => {
    sessionStorage.removeItem(CONTEXT_STORAGE_KEY);
    // Clear URL state without navigation
    if (location.state) {
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  return {
    createContextFromDeal,
    navigateToCreateLease,
    consumeConversionContext,
    shouldAutoOpenWizard,
    clearContext,
  };
}
