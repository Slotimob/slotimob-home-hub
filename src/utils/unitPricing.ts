export function showSalePrice(intentType?: string | null): boolean {
  return intentType === 'sale' || intentType === 'both';
}

export function showRentalPrice(intentType?: string | null): boolean {
  return intentType === 'rental' || intentType === 'both';
}

export function formatCurrencyBRL(value: number | null | undefined): string {
  if (value === null || value === undefined) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
