import { useState, useCallback } from 'react';
import { searchCep, CepData, formatCep } from '@/services/cepService';
import { useToast } from '@/hooks/use-toast';

export interface CepSearchResult extends CepData {
  success: boolean;
}

interface UseCepSearchOptions {
  /** Whether to include neighborhood in address field when there's no separate neighborhood field */
  includeNeighborhoodInAddress?: boolean;
}

export function useCepSearch(options: UseCepSearchOptions = {}) {
  const { toast } = useToast();
  const [isLoadingCep, setIsLoadingCep] = useState(false);

  /**
   * Search CEP and return address data
   * Shows toast on error
   */
  const searchCepData = useCallback(async (cep: string): Promise<CepSearchResult | null> => {
    const cleanCep = cep.replace(/\D/g, '');
    
    // Only search if we have 8 digits
    if (cleanCep.length !== 8) {
      return null;
    }

    setIsLoadingCep(true);

    try {
      const data = await searchCep(cleanCep);
      return { ...data, success: true };
    } catch (error: any) {
      toast({
        title: 'Erro ao buscar CEP',
        description: error.message,
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoadingCep(false);
    }
  }, [toast]);

  /**
   * Handle CEP blur event - searches and updates form data
   * @param cep - Current CEP value
   * @param updateFields - Function to update form fields
   */
  const handleCepBlur = useCallback(async (
    cep: string,
    updateFields: (data: {
      address?: string;
      neighborhood?: string;
      city?: string;
      state?: string;
    }) => void
  ) => {
    const result = await searchCepData(cep);
    
    if (result) {
      const updates: Record<string, string> = {
        city: result.city,
        state: result.state,
      };

      // If we have a neighborhood field, use it separately
      // Otherwise, append to address
      if (options.includeNeighborhoodInAddress && result.neighborhood) {
        updates.address = result.address 
          ? `${result.address}, ${result.neighborhood}` 
          : result.neighborhood;
      } else {
        updates.address = result.address;
        updates.neighborhood = result.neighborhood;
      }

      updateFields(updates);
    }
  }, [searchCepData, options.includeNeighborhoodInAddress]);

  return {
    isLoadingCep,
    searchCepData,
    handleCepBlur,
    formatCep,
  };
}
