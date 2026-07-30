export function showSalePrice(intentType?: string | null): boolean {
  return intentType === 'sale' || intentType === 'both';
}

export function showRentalPrice(intentType?: string | null): boolean {
  return intentType === 'rental' || intentType === 'both';
}
