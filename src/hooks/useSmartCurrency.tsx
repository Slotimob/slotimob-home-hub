import React from 'react';
import { useEffect, useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * Smart currency formatting hook that provides:
 * - Compact notation for smaller screens (10.5k, 1.2mi)
 * - Full notation for larger screens
 * - Tooltip component with exact value
 */

export function useSmartCurrency() {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      // Use compact notation on screens smaller than 1280px (xl breakpoint)
      setIsCompact(window.innerWidth < 1280);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const formatFull = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatCompact = (value: number): string => {
    const absValue = Math.abs(value);
    
    if (absValue >= 1_000_000) {
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
      // Replace "mi" with "mi" and "mil" with "k" for more compact display
      return formatted.replace(' mil', 'k').replace(' mi', 'mi');
    }
    
    if (absValue >= 1_000) {
      const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
        compactDisplay: 'short',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
      }).format(value);
      return formatted.replace(' mil', 'k');
    }
    
    // For smaller values, show full currency without decimals for compactness
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatSmart = (value: number): string => {
    return isCompact ? formatCompact(value) : formatFull(value);
  };

  return {
    isCompact,
    formatFull,
    formatCompact,
    formatSmart,
  };
}

/**
 * Smart currency display component with tooltip showing exact value
 */
interface SmartCurrencyProps {
  value: number;
  className?: string;
  forceCompact?: boolean;
  showTooltip?: boolean;
}

export function SmartCurrency({ 
  value, 
  className = '', 
  forceCompact = false,
  showTooltip = true 
}: SmartCurrencyProps) {
  const { isCompact, formatFull, formatCompact, formatSmart } = useSmartCurrency();
  
  const displayValue = forceCompact ? formatCompact(value) : formatSmart(value);
  const fullValue = formatFull(value);
  const shouldShowTooltip = showTooltip && (forceCompact || isCompact);

  if (!shouldShowTooltip) {
    return <span className={className}>{displayValue}</span>;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={`cursor-help ${className}`}>{displayValue}</span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="font-mono">{fullValue}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Inline formatting functions for use in templates
 */
export const formatCurrencyCompact = (value: number): string => {
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000) {
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
    return formatted.replace(' mil', 'k').replace(' mi', 'mi');
  }
  
  if (absValue >= 1_000) {
    const formatted = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
      compactDisplay: 'short',
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
    return formatted.replace(' mil', 'k');
  }
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export const formatCurrencyFull = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};
