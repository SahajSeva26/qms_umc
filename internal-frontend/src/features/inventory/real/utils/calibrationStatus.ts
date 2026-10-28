// Matches the prototype's calibStatus() exactly (inventory.js:240-245).
export type CalibrationStatusCode = 'OVERDUE' | 'DUE_SOON' | 'OK' | 'UNSCHEDULED'

export interface CalibrationStatus {
  code: CalibrationStatusCode
  label: string
  days: number | null
}

// SOON is amber (matches the prototype's .inv-status-SOON, inventory.js:78)
// — not orange, which the prototype reserves for expiry bands, a different scale.
export const CALIBRATION_STATUS_COLOR: Record<CalibrationStatusCode, { bg: string; text: string }> = {
  OVERDUE: { bg: 'rgba(244,63,94,.15)', text: '#e11d48' },
  DUE_SOON: { bg: 'rgba(245,158,11,.15)', text: '#d97706' },
  OK: { bg: 'rgba(16,185,129,.15)', text: '#059669' },
  UNSCHEDULED: { bg: 'var(--qms-surface-strong)', text: 'var(--qms-text-muted)' },
}

function daysFromNow(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export function calibrationStatus(nextCalibrationDate: string | undefined | null): CalibrationStatus {
  if (!nextCalibrationDate) return { code: 'UNSCHEDULED', label: 'Not scheduled', days: null }
  const days = daysFromNow(nextCalibrationDate)
  if (days < 0) return { code: 'OVERDUE', label: `Overdue · ${Math.abs(days)}d`, days }
  if (days < 14) return { code: 'DUE_SOON', label: `Due in ${days}d`, days }
  return { code: 'OK', label: `Calibrated · next ${days}d`, days }
}
