import type { EngagementBand, ChurnRisk } from '@/features/doctors/doctors.types'

// Same 9-field set as CampWizard's inline "add new doctor" form
// (features/camps/components/CampWizard.tsx) — do not invent a different
// specialty list here. Full 13-item list from the prototype's camps-data.js
// QMS_CAMPS.SPECIALTIES (was previously missing CP/Hepatologist/Ophthalmologist/
// Chest Physician/Nephrologist, which made those specialties unselectable).
export const SPECIALTIES = ['CP', 'GP', 'Endocrinologist', 'Cardiologist', 'Pulmonologist', 'Orthopedic', 'Gynecologist', 'Neurologist', 'Hepatologist', 'Ophthalmologist', 'Chest Physician', 'Nephrologist', 'Others']

// Shared band/churn color+label lookups used across every tab + the drawer —
// kept in one place so the pill styling stays identical everywhere it appears.
export const BAND_COLOR: Record<EngagementBand, string> = {
  CHAMPION: '#8b5cf6',
  ACTIVE: '#10b981',
  DORMANT: '#f59e0b',
  INACTIVE: '#f43f5e',
  NEW: '#14b8a6',
}

export const BAND_LABEL: Record<EngagementBand, string> = {
  CHAMPION: 'Champion',
  ACTIVE: 'Active',
  DORMANT: 'Dormant',
  INACTIVE: 'Inactive',
  NEW: 'New',
}

export const CHURN_COLOR: Record<ChurnRisk, string> = {
  HIGH: '#f43f5e',
  MEDIUM: '#f59e0b',
  LOW: '#10b981',
  NEW: '#14b8a6',
}

export function initials(name: string): string {
  return (name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
}
