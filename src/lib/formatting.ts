/**
 * Shared formatting utilities for currency, dates, and measurements.
 * Consolidates duplicated formatting logic across the application.
 */

/**
 * Format a number as New Zealand Dollar currency (NZD)
 * @param price - Amount in dollars
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function formatNZD(price: number): string {
  return new Intl.NumberFormat('en-NZ', {
    style: 'currency',
    currency: 'NZD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price);
}

/**
 * Format a date string or Firestore timestamp for display
 * @param dateStr - ISO string or Firestore timestamp object
 * @returns Formatted date string (e.g., "Jan 15, 2024")
 */
export function formatDate(
  dateStr: string | { toDate: () => Date } | undefined,
): string {
  if (!dateStr) return 'N/A';

  let date: Date;
  if (typeof dateStr === 'string') {
    date = new Date(dateStr);
  } else if (dateStr && typeof dateStr === 'object' && 'toDate' in dateStr) {
    date = (dateStr as { toDate: () => Date }).toDate();
  } else {
    return 'N/A';
  }

  if (isNaN(date.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('en-NZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date);
}

/**
 * Format a kilometer measurement with comma separation
 * @param km - Kilometers value
 * @returns Formatted string (e.g., "123,456")
 */
export function formatKilometers(km: number): string {
  return new Intl.NumberFormat('en-NZ').format(km);
}

/**
 * Format a number as a percentage
 * @param value - Decimal value (e.g., 0.15 for 15%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string (e.g., "15%")
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return (value * 100).toFixed(decimals) + '%';
}
