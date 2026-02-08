import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PortfolioMetrics {
  // Total Portfolio Value
  totalPortfolioValue: number;
  totalAssetsCount: number;
  
  // Rental Yield (for managed assets only)
  annualRentalYield: number; // percentage
  monthlyRentalYield: number; // percentage
  totalAnnualRent: number;
  managedAssetsValue: number;
  managedAssetsCount: number;
  
  // Vacancy Rate (for managed assets only)
  vacancyRate: number; // percentage
  vacantUnitsCount: number;
  occupiedUnitsCount: number;
  totalManagedForVacancy: number;
}

const DEFAULT_METRICS: PortfolioMetrics = {
  totalPortfolioValue: 0,
  totalAssetsCount: 0,
  annualRentalYield: 0,
  monthlyRentalYield: 0,
  totalAnnualRent: 0,
  managedAssetsValue: 0,
  managedAssetsCount: 0,
  vacancyRate: 0,
  vacantUnitsCount: 0,
  occupiedUnitsCount: 0,
  totalManagedForVacancy: 0,
};

export function usePortfolioMetrics() {
  const [metrics, setMetrics] = useState<PortfolioMetrics>(DEFAULT_METRICS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const calculateMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch all units with relevant fields including intent_type for proper filtering
      const { data: units, error: unitsError } = await supabase
        .from('units')
        .select('id, status, market_value, rent_price, is_managed, is_occupied, intent_type');

      if (unitsError) throw unitsError;

      if (!units || units.length === 0) {
        setMetrics(DEFAULT_METRICS);
        return;
      }

      // 1. Total Portfolio Value (STOCK METRIC - All-time, no date filter)
      // Sum of market_value for assets with status "available", "rented", OR "reserved" (exclude only "sold")
      // Reserved assets are still under management and compose the portfolio
      const portfolioAssets = units.filter(
        u => u.status === 'available' || u.status === 'rented' || u.status === 'reserved'
      );
      
      const totalPortfolioValue = portfolioAssets.reduce(
        (sum, u) => sum + (Number(u.market_value) || 0),
        0
      );

      // 2. Rental Yield Calculation
      // Universe: Only assets where is_managed = true AND intent_type includes rental
      const managedRentalAssets = units.filter(
        u => u.is_managed === true && 
             (u.intent_type === 'rental' || u.intent_type === 'both')
      );
      
      const totalAnnualRent = managedRentalAssets.reduce(
        (sum, u) => sum + ((Number(u.rent_price) || 0) * 12),
        0
      );
      
      const managedAssetsValue = managedRentalAssets.reduce(
        (sum, u) => sum + (Number(u.market_value) || 0),
        0
      );

      // Yield = (Annual Rent / Asset Value) * 100
      const annualRentalYield = managedAssetsValue > 0 
        ? (totalAnnualRent / managedAssetsValue) * 100 
        : 0;
      
      const monthlyRentalYield = annualRentalYield / 12;

      // 3. Vacancy Rate Calculation
      // CRITICAL FIX: Only consider units with intent_type = 'rental' or 'both' AND is_managed = true
      // Units intended solely for 'sale' should NOT be part of vacancy calculation
      const rentalManagedAssets = units.filter(
        u => u.is_managed === true && 
             (u.intent_type === 'rental' || u.intent_type === 'both')
      );
      
      // Cross-validation: if status is 'rented', consider it occupied regardless of is_occupied flag
      const vacantUnits = rentalManagedAssets.filter(
        u => u.is_occupied === false && u.status !== 'rented'
      );
      const occupiedUnits = rentalManagedAssets.filter(
        u => u.is_occupied === true || u.status === 'rented'
      );

      // Vacancy Rate = (Vacant / Total Rental Managed) * 100
      const vacancyRate = rentalManagedAssets.length > 0
        ? (vacantUnits.length / rentalManagedAssets.length) * 100
        : 0;

      setMetrics({
        totalPortfolioValue,
        totalAssetsCount: portfolioAssets.length,
        annualRentalYield,
        monthlyRentalYield,
        totalAnnualRent,
        managedAssetsValue,
        managedAssetsCount: managedRentalAssets.length,
        vacancyRate,
        vacantUnitsCount: vacantUnits.length,
        occupiedUnitsCount: occupiedUnits.length,
        totalManagedForVacancy: rentalManagedAssets.length,
      });

    } catch (err: any) {
      console.error('Error calculating portfolio metrics:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    calculateMetrics();
  }, [calculateMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch: calculateMetrics,
  };
}
