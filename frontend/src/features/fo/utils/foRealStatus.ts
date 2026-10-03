import type { CampEntity } from '@/types/campReal.types'

// Real-data equivalent of the deleted mock foLiveStatus — works off a real
// CampEntity's lowercase status enum.
export type FoRealStatus = 'AT_CAMP' | 'ON_ROUTE' | 'ACTIVE' | 'IDLE' | 'UNKNOWN'

export const FO_STATUS_LABEL: Record<FoRealStatus, string> = {
  AT_CAMP: 'At camp',
  ON_ROUTE: 'En route',
  ACTIVE: 'Active',
  IDLE: 'Idle',
  UNKNOWN: 'Status unknown',
}

// Matches the prototype's .fo-status-* classes (fo-manager.js:56-60) — each
// status has its own fixed background/text pair, not a shared token.
export const FO_STATUS_BG: Record<FoRealStatus, string> = {
  AT_CAMP: 'rgba(59,109,255,.15)',
  ON_ROUTE: 'rgba(245,158,11,.15)',
  ACTIVE: 'rgba(16,185,129,.15)',
  IDLE: 'rgba(148,163,184,.2)',
  UNKNOWN: 'rgba(148,163,184,.2)',
}

export const FO_STATUS_COLOR: Record<FoRealStatus, string> = {
  AT_CAMP: 'var(--qms-brand)',
  ON_ROUTE: '#d97706',
  ACTIVE: '#059669',
  IDLE: '#475569',
  UNKNOWN: '#475569',
}

// Before the per-FO camp query resolves, and again if it fails, the caller
// must not report IDLE — that's a real, positive claim this data can't back yet.
export function foRealStatus(todayCamp: CampEntity | null, upcomingCount: number, dataUnavailable = false): FoRealStatus {
  if (dataUnavailable) return 'UNKNOWN'
  if (todayCamp) {
    if (todayCamp.status === 'live') return 'AT_CAMP'
    if (todayCamp.status === 'confirmed' || todayCamp.status === 'requested') return 'ON_ROUTE'
  }
  if (upcomingCount > 0) return 'ACTIVE'
  return 'IDLE'
}

export function initials(name: string) {
  return name.split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}
