/**
 * Currency Utilities for Brazilian Real (BRL)
 * Converts numeric values to words in Brazilian Portuguese
 */

const UNIDADES = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove',
  'dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'
];

const DEZENAS = [
  '', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'
];

const CENTENAS = [
  '', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 
  'seiscentos', 'setecentos', 'oitocentos', 'novecentos'
];

/**
 * Converts a number (0-999) to words in Portuguese
 */
function convertHundreds(num: number): string {
  if (num === 0) return '';
  if (num === 100) return 'cem';
  
  const centena = Math.floor(num / 100);
  const dezenaUnidade = num % 100;
  
  let result = '';
  
  if (centena > 0) {
    result = CENTENAS[centena];
  }
  
  if (dezenaUnidade > 0) {
    if (result) result += ' e ';
    
    if (dezenaUnidade < 20) {
      result += UNIDADES[dezenaUnidade];
    } else {
      const dezena = Math.floor(dezenaUnidade / 10);
      const unidade = dezenaUnidade % 10;
      
      result += DEZENAS[dezena];
      
      if (unidade > 0) {
        result += ' e ' + UNIDADES[unidade];
      }
    }
  }
  
  return result;
}

/**
 * Converts a number (0-999,999,999,999) to words in Portuguese
 */
function convertToWords(num: number): string {
  if (num === 0) return 'zero';
  if (num < 0) return 'menos ' + convertToWords(Math.abs(num));
  
  // Handle decimals by rounding to 2 decimal places
  num = Math.round(num * 100) / 100;
  
  const bilhao = Math.floor(num / 1000000000);
  const milhao = Math.floor((num % 1000000000) / 1000000);
  const milhar = Math.floor((num % 1000000) / 1000);
  const centena = Math.floor(num % 1000);
  
  const parts: string[] = [];
  
  // Billions
  if (bilhao > 0) {
    if (bilhao === 1) {
      parts.push('um bilhão');
    } else {
      parts.push(convertHundreds(bilhao) + ' bilhões');
    }
  }
  
  // Millions
  if (milhao > 0) {
    if (milhao === 1) {
      parts.push('um milhão');
    } else {
      parts.push(convertHundreds(milhao) + ' milhões');
    }
  }
  
  // Thousands
  if (milhar > 0) {
    if (milhar === 1) {
      parts.push('mil');
    } else {
      parts.push(convertHundreds(milhar) + ' mil');
    }
  }
  
  // Hundreds
  if (centena > 0) {
    parts.push(convertHundreds(centena));
  }
  
  // Join with proper connectors
  if (parts.length === 0) return 'zero';
  
  if (parts.length === 1) return parts[0];
  
  // Check if we need "e" connector based on Portuguese grammar rules
  // Use "e" when the last part is less than 100 or is exactly a round hundred
  const lastPart = centena;
  const needsE = lastPart > 0 && (lastPart < 100 || lastPart % 100 === 0);
  
  if (parts.length === 2) {
    if (needsE && centena > 0 && centena < 100) {
      return parts[0] + ' e ' + parts[1];
    }
    // For cases like "mil e cem" or "mil e duzentos"
    if (milhar > 0 && centena > 0 && centena <= 100) {
      return parts[0] + ' e ' + parts[1];
    }
    if (milhar > 0 && centena > 100 && centena % 100 === 0) {
      return parts[0] + ' e ' + parts[1];
    }
    return parts.join(', ');
  }
  
  // For 3+ parts, join all but last with comma, then "e" before last if appropriate
  const allButLast = parts.slice(0, -1).join(', ');
  const last = parts[parts.length - 1];
  
  if (centena > 0 && centena < 100) {
    return allButLast + ' e ' + last;
  }
  
  return allButLast + ', ' + last;
}

/**
 * Capitalizes the first letter of a string
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Formats a BRL currency value to words in Brazilian Portuguese
 * 
 * @param value - The numeric value to convert (e.g., 1500.50)
 * @returns The value written in words (e.g., "um mil e quinhentos reais e cinquenta centavos")
 * 
 * @example
 * formatCurrencyToWords(1) // "um real"
 * formatCurrencyToWords(1.50) // "um real e cinquenta centavos"
 * formatCurrencyToWords(1500) // "um mil e quinhentos reais"
 * formatCurrencyToWords(2350.75) // "dois mil, trezentos e cinquenta reais e setenta e cinco centavos"
 * formatCurrencyToWords(1000000) // "um milhão de reais"
 */
export function formatCurrencyToWords(value: number): string {
  if (value === 0) return 'zero reais';
  if (isNaN(value)) return '';
  
  // Handle negative values
  const isNegative = value < 0;
  value = Math.abs(value);
  
  // Separate integer and decimal parts
  const integerPart = Math.floor(value);
  const decimalPart = Math.round((value - integerPart) * 100);
  
  const parts: string[] = [];
  
  // Convert integer part (reais)
  if (integerPart > 0) {
    const reaisText = convertToWords(integerPart);
    
    // Check if we need "de" before "reais" (for millions, billions)
    const needsDe = integerPart >= 1000000 && integerPart % 1000000 === 0;
    
    if (integerPart === 1) {
      parts.push(reaisText + ' real');
    } else if (needsDe) {
      parts.push(reaisText + ' de reais');
    } else {
      parts.push(reaisText + ' reais');
    }
  }
  
  // Convert decimal part (centavos)
  if (decimalPart > 0) {
    const centavosText = convertToWords(decimalPart);
    
    if (decimalPart === 1) {
      parts.push(centavosText + ' centavo');
    } else {
      parts.push(centavosText + ' centavos');
    }
  }
  
  // Handle case where only centavos
  if (integerPart === 0 && decimalPart > 0) {
    // Already handled above
  }
  
  let result = parts.join(' e ');
  
  // Add negative prefix if needed
  if (isNegative) {
    result = 'menos ' + result;
  }
  
  return result;
}

/**
 * Formats a currency value with both numeric and written forms
 * 
 * @param value - The numeric value
 * @returns Formatted string like "R$ 1.500,00 (um mil e quinhentos reais)"
 */
export function formatCurrencyWithWords(value: number): string {
  const numericFormat = value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
  
  const wordsFormat = formatCurrencyToWords(value);
  const capitalizedWords = capitalize(wordsFormat);
  
  return `${numericFormat} (${capitalizedWords})`;
}

/**
 * Parses a Brazilian currency string to a number
 * 
 * @param currencyStr - String like "R$ 1.500,00" or "1500,00"
 * @returns The numeric value
 */
export function parseBRLCurrency(currencyStr: string): number {
  if (!currencyStr) return 0;
  
  // Remove R$, spaces, and thousand separators
  let cleaned = currencyStr
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  
  const value = parseFloat(cleaned);
  return isNaN(value) ? 0 : value;
}

/**
 * Helper function to convert a number to ordinal words in Portuguese
 * Useful for contract clauses referencing "terceira parcela", etc.
 */
export function numberToOrdinal(num: number, gender: 'masculine' | 'feminine' = 'masculine'): string {
  const masculineOrdinals = [
    '', 'primeiro', 'segundo', 'terceiro', 'quarto', 'quinto',
    'sexto', 'sétimo', 'oitavo', 'nono', 'décimo',
    'décimo primeiro', 'décimo segundo'
  ];
  
  const feminineOrdinals = [
    '', 'primeira', 'segunda', 'terceira', 'quarta', 'quinta',
    'sexta', 'sétima', 'oitava', 'nona', 'décima',
    'décima primeira', 'décima segunda'
  ];
  
  const ordinals = gender === 'masculine' ? masculineOrdinals : feminineOrdinals;
  
  if (num >= 1 && num < ordinals.length) {
    return ordinals[num];
  }
  
  // For larger numbers, just return the numeric form with º/ª
  return num + (gender === 'masculine' ? 'º' : 'ª');
}

/**
 * Converts a number to cardinal words (for use in contracts)
 * This is a simpler wrapper around convertToWords for external use
 */
export function numberToWords(num: number): string {
  return convertToWords(num);
}
