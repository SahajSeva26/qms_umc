// Matches the prototype's expiryBand() exactly (inventory-masters.js:68-76).
export type ExpiryBandCode = 'EXPIRED' | 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN'

export interface ExpiryBand {
  code: ExpiryBandCode
  label: string
  days: number
  css: 'red' | 'orange' | 'yellow' | 'green'
}

export const EXPIRY_BAND_COLOR: Record<ExpiryBand['css'], { bg: string; text: string }> = {
  green: { bg: 'rgba(16,185,129,.15)', text: '#059669' },
  yellow: { bg: 'rgba(234,179,8,.18)', text: '#a16207' },
  orange: { bg: 'rgba(249,115,22,.16)', text: '#c2410c' },
  red: { bg: 'rgba(244,63,94,.15)', text: '#e11d48' },
}

function daysFromNow(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export function expiryBand(expiryDate: string | undefined | null): ExpiryBand | null {
  if (!expiryDate) return null
  const d = daysFromNow(expiryDate)
  if (d < 0) return { code: 'EXPIRED', label: `Expired ${Math.abs(d)}d ago`, days: d, css: 'red' }
  if (d < 30) return { code: 'RED', label: `${d}d left`, days: d, css: 'red' }
  if (d < 90) return { code: 'ORANGE', label: `${d}d left`, days: d, css: 'orange' }
  if (d < 180) return { code: 'YELLOW', label: `${d}d left`, days: d, css: 'yellow' }
  return { code: 'GREEN', label: `${d}d left`, days: d, css: 'green' }
}

// Matches the prototype's remainingLabel() exactly (inventory-masters.js:77-83).
export function remainingLabel(expiryDate: string | undefined | null): string {
  if (!expiryDate) return '—'
  const d = daysFromNow(expiryDate)
  if (d < 0) return 'Expired'
  const months = Math.round(d / 30)
  return `${d}d${months >= 1 ? ` · ~${months}mo` : ''}`
}
