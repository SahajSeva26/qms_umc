// Shared formatting/lookup helpers for the OM-facing Incidents · SOS screen.
// Mirrors incidents.js's own small helper functions (fmtDt/fmtMins/deviceName/
// severityPill/statusPill) so every tab renders SLA + badges identically.

import {
  FiAlertTriangle, FiTool, FiPackage, FiUserX, FiMapPin, FiHelpCircle, FiClipboard,
} from 'react-icons/fi'
import type { IconType } from 'react-icons'
import type { Incident, IncidentCategory } from '@/features/fo/fo.types'
import { INCIDENT_CATEGORIES, SEVERITY_COLORS, STATUS_COLORS } from '@/features/fo/fo.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import { computeSlaState } from '@/features/fo/fo.service'

export const CATEGORY_ICON: Record<IncidentCategory, IconType> = {
  sos: FiAlertTriangle,
  machine_failure: FiTool,
  consumable_shortage: FiPackage,
  patient_escalation: FiUserX,
  gps_fraud: FiMapPin,
  inventory_mismatch: FiClipboard,
  other: FiHelpCircle,
}

export function categoryLabel(category: IncidentCategory): string {
  return INCIDENT_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

export function deviceName(devices: DeviceCatalogItem[], id?: string): string {
  if (!id) return '—'
  return devices.find((d) => d.id === id)?.name ?? id
}

// fmtDt — mirrors incidents.js's fmtDt(): "19 Jul, 3:45 PM" style, en-IN.
export function fmtDt(iso?: string): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

// fmtMins — mirrors incidents.js's fmtMins(): minutes under an hour as "N
// min", under a day as hours ("N.Nh"), otherwise days ("N.Nd").
export function fmtMins(m?: number): string {
  if (m == null) return '—'
  if (m < 60) return `${Math.round(m)} min`
  if (m < 1440) return `${(m / 60).toFixed(1)}h`
  return `${(m / 1440).toFixed(1)}d`
}

export interface SlaDisplay {
  elapsedMin: number
  slaMin: number
  pct: number
  breachedBy: number
  color: string
}

// slaDisplay — wraps fo.service's computeSlaState() into the prototype's bar
// (pct-of-SLA-consumed) + color-threshold shape (slaState() in
// incidents-data.js): red once breached, amber past 80%, else green.
export function slaDisplay(incident: Incident): SlaDisplay {
  const sla = computeSlaState(incident)
  const slaMin = incident.slaMinutes ?? 0
  const pct = slaMin ? Math.min(100, Math.round((100 * sla.minutesElapsed) / slaMin)) : 0
  const breachedBy = sla.breached ? Math.max(0, sla.minutesElapsed - slaMin) : 0
  const color = breachedBy > 0 ? 'var(--danger)' : pct > 80 ? 'var(--warning)' : 'var(--success)'
  return { elapsedMin: sla.minutesElapsed, slaMin, pct, breachedBy, color }
}

export function severityStyle(severity: Incident['severity']) {
  return SEVERITY_COLORS[severity] ?? SEVERITY_COLORS.LOW
}

export function statusStyle(status: Incident['status']) {
  return STATUS_COLORS[status] ?? STATUS_COLORS.CLOSED
}

export function statusLabel(status: Incident['status']): string {
  return status.replace(/_/g, ' ')
}

// Kanban column order — mirrors incidents.js tabBoard()'s `cols` array
// exactly (CANCELLED is deliberately excluded from the board; it's a side
// lane surfaced only via the All-tickets tab / status pill, same as source).
export const BOARD_COLUMNS: Incident['status'][] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED']

// Severity sort weight — mirrors tabBoard()'s inline {CRITICAL:0,HIGH:1,...} map.
const SEVERITY_WEIGHT: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, MED: 2, LOW: 3 }
export function severityWeight(severity: Incident['severity']): number {
  return SEVERITY_WEIGHT[severity] ?? 4
}
