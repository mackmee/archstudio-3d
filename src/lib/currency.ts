import { Currency, Language } from '@/store/usePreferencesStore';

export const DEFAULT_USD_TO_UZS_RATE = 12800;

/**
 * Converts a USD amount to the selected currency.
 */
export function convertFromUsd(
  amountUsd: number,
  currency: Currency,
  rate = DEFAULT_USD_TO_UZS_RATE
): number {
  if (currency === 'USD') return amountUsd;
  return Math.round(amountUsd * rate);
}

/**
 * Formats a USD amount into a localized currency string.
 * - In USD: e.g. "$1,250" or "$34.50"
 * - In UZS: e.g. "16 000 000 so‘m" (uz) or "16 000 000 сум" (ru)
 */
export function formatPrice(
  amountUsd: number,
  currency: Currency,
  language: Language = 'uz',
  rate = DEFAULT_USD_TO_UZS_RATE,
  options?: { showFraction?: boolean; compact?: boolean }
): string {
  if (currency === 'USD') {
    if (options?.showFraction && amountUsd % 1 !== 0) {
      return `$${amountUsd.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    }
    return `$${Math.round(amountUsd).toLocaleString('en-US')}`;
  }

  // UZS formatting
  const uzsAmount = Math.round(amountUsd * rate);

  // Group thousands with clean space separator: "12 500 000"
  const formattedNumber = uzsAmount
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  const unitLabel = language === 'uz' ? 'so‘m' : 'сум';

  return `${formattedNumber} ${unitLabel}`;
}

/**
 * Formats a unit price with its measurement unit.
 * e.g., "$28 / roll" or "358 400 so‘m / rulon"
 */
export function formatUnitPrice(
  amountUsd: number,
  unitLabel: string,
  currency: Currency,
  language: Language = 'uz',
  rate = DEFAULT_USD_TO_UZS_RATE
): string {
  const price = formatPrice(amountUsd, currency, language, rate);
  return `${price} / ${unitLabel}`;
}
