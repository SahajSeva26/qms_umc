// Shared UI-layer helpers for the HQ Mapping & Serviceability screen — status
// pill color tokens, CSV export, the India-bbox SVG projection, and the tab
// registry with role gating. Mirrors hq-serviceability.js's own STATE.filter /
// TABS / project()/renderMapSvg() and hq-mapping.js's mapping-view helpers,
// kept local to this feature's components folder like fo.ui.ts.
import type { UserRole } from '@/types/auth.types'
import type { HqTier, CityTier } from '@/features/hq/hq.types'

// ── Status pill tokens (hq-serviceability.js's .hq-pill.{green,yellow,orange,red}) ──
export const HQ_TIER_COLOR: Record<HqTier, { bg: string; fg: string; dot: string }> = {
  GREEN:  { bg: 'rgba(16,185,129,.16)', fg: '#047857', dot: '#10b981' },
  YELLOW: { bg: 'rgba(245,158,11,.18)', fg: '#92400e', dot: '#f59e0b' },
  ORANGE: { bg: 'rgba(249,115,22,.18)', fg: '#c2410c', dot: '#f97316' },
  RED:    { bg: 'rgba(244,63,94,.16)',  fg: '#b91c1c', dot: '#f43f5e' },
}

// classifyCity()'s distinct 3-tier vocabulary (GREEN/ORANGE/RED, no YELLOW) —
// same color values as HqTier's GREEN/ORANGE/RED but a separate lookup so the
// two classifiers never accidentally share a type.
export const CITY_TIER_COLOR: Record<CityTier, { bg: string; fg: string; dot: string }> = {
  GREEN:  HQ_TIER_COLOR.GREEN,
  ORANGE: HQ_TIER_COLOR.ORANGE,
  RED:    HQ_TIER_COLOR.RED,
}

export type HqTabId = 'admin' | 'sales' | 'ops' | 'coord' | 'map' | 'mapping' | 'hq' | 'fo' | 'bulk' | 'reports' | 'ai'

export interface HqTabDef {
  id: HqTabId
  label: string
  show: (role: UserRole | undefined) => boolean
}

// Exact port of hq-serviceability.js's TABS[].show() role predicates
// (isAdmin/isSales/isOpsManager/isCoord) — translated from the prototype's
// roleId() session lookup (admin/super_admin, sales_lead/sales_rep,
// om_screening/om_diet, camp_coord/diet_camp_coord) to this app's UserRole.
// navConfig.ts's own 'hqmapping' rolesAllowed list is WIDER than the
// prototype's per-tab gates (it includes fo/dedicated_fo/accounts/
// analytics_viewer/logistics so those roles can reach the page at all) — per
// the task's instruction to prefer a read-only view over hiding a tab
// entirely when the two sources disagree, every one of those "extra" roles
// still gets the tabs whose show() returns true for them below (map/mapping/
// reports are show:()=>true for everyone who can open the page; admin/sales/
// ops/coord/hq/fo/bulk/ai stay gated to the roles the prototype itself gates
// them to, since those are the tabs with write-affordances / operational
// escalation content the prototype deliberately restricts).
const isAdmin = (r?: UserRole) => r === 'super_admin' || r === 'admin'
const isSales = (r?: UserRole) => r === 'sales_lead' || r === 'sales_rep'
const isOpsManager = (r?: UserRole) => r === 'om_screening' || r === 'om_diet' || r === 'logistics'
const isCoord = (r?: UserRole) => r === 'camp_coord' || r === 'diet_camp_coord'

export const HQ_TABS: HqTabDef[] = [
  { id: 'admin', label: 'Admin · Coverage', show: (r) => isAdmin(r) || isOpsManager(r) },
  { id: 'sales', label: 'Sales · Live lookup', show: (r) => isAdmin(r) || isSales(r) || isOpsManager(r) || isCoord(r) },
  { id: 'ops', label: 'Ops · Gap analysis', show: (r) => isAdmin(r) || isOpsManager(r) },
  { id: 'coord', label: 'Coord · Assign camp', show: (r) => isAdmin(r) || isOpsManager(r) || isCoord(r) },
  { id: 'map', label: 'Live map', show: () => true },
  { id: 'mapping', label: 'Company → HQ mapping', show: () => true },
  { id: 'hq', label: 'HQ master', show: (r) => isAdmin(r) || isOpsManager(r) },
  { id: 'fo', label: 'FO master', show: (r) => isAdmin(r) || isOpsManager(r) },
  { id: 'bulk', label: 'Bulk City Check', show: (r) => isAdmin(r) || isOpsManager(r) || isSales(r) },
  { id: 'reports', label: 'Reports', show: () => true },
  { id: 'ai', label: 'AI insights', show: (r) => isAdmin(r) || isOpsManager(r) },
]

export function defaultHqTab(role: UserRole | undefined): HqTabId {
  if (isSales(role)) return 'sales'
  if (isOpsManager(role)) return 'ops'
  if (isCoord(role)) return 'coord'
  return 'admin'
}

// ── India bounding-box SVG projection — EXACT port of hq-serviceability.js's
// project()/renderMapSvg() (lat 6..37, lng 68..97 → 1000x700 viewBox). The
// 35km-ring radius is a flat degrees-to-px approximation that does NOT
// correct for latitude (cos(lat) foreshortening) — intentional per the
// prototype's own "// approx" comment, preserved as-is, not a bug to fix. ──
export const MAP_W = 1000
export const MAP_H = 700

export function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - 68) / (97 - 68)) * MAP_W
  const y = MAP_H - ((lat - 6) / (37 - 6)) * MAP_H
  return { x: Math.max(2, Math.min(MAP_W - 2, x)), y: Math.max(2, Math.min(MAP_H - 2, y)) }
}

// 35 km at the equator ≈ 0.315° lng, scaled to the SVG's lng-span-to-width
// ratio — same flat approximation the prototype uses for every ring
// regardless of latitude.
export function ringRadiusPx(radiusKm: number): number {
  return (radiusKm / (97 - 68)) * MAP_W * 0.92
}

export const STATE_ANCHORS: [string, number, number][] = [
  ['JK', 34.0, 76.5], ['HP', 31.5, 77.5], ['PB', 31.0, 75.5], ['HR', 29.0, 76.5],
  ['DL', 28.6, 77.2], ['UP', 26.8, 80.9], ['UK', 30.0, 78.5], ['RJ', 26.5, 73.7],
  ['GJ', 22.5, 71.5], ['MH', 19.0, 73.8], ['MP', 23.5, 77.0], ['CG', 21.5, 82.0],
  ['BR', 25.5, 85.1], ['JH', 23.6, 85.3], ['WB', 22.5, 88.0], ['OR', 20.5, 85.5],
  ['TG', 17.5, 79.0], ['AP', 16.5, 80.0], ['KA', 13.5, 76.0], ['TN', 11.0, 78.5],
  ['KL', 9.5, 76.5], ['GA', 15.3, 74.1], ['ML', 25.5, 91.5], ['AS', 26.1, 91.7],
  ['MN', 24.7, 93.9], ['NL', 26.0, 94.1], ['MZ', 23.5, 92.7], ['TR', 23.9, 91.3],
  ['AR', 27.5, 93.6], ['SK', 27.5, 88.6],
]

// ── CSV export — exact port of hq-serviceability.js's toCsv()/dl() pattern ──
function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (!rows.length) return ''
  const cols = Object.keys(rows[0])
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvEscape(r[c])).join(','))].join('\n')
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  const csv = toCsv(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// ── Printable report — exact port of hq-serviceability.js's printableReport()
// (window.open + write table HTML + window.print()), used by the Reports tab's
// PDF export action. ──
export function printableReport(title: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return
  const w = window.open('', '_blank')
  if (!w) return
  const cols = Object.keys(rows[0])
  w.document.write(`
    <!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      body { font-family: Inter, system-ui, sans-serif; padding:20px; color:#0f172a; }
      h1 { font-size:18px; margin:0 0 4px; }
      .sub { color:#64748b; font-size:11px; margin-bottom:14px; }
      table { width:100%; border-collapse:collapse; font-size:11px; }
      th, td { padding:6px 8px; border-bottom:1px solid #e5e7eb; text-align:left; }
      th { background:#f8fafc; font-weight:800; text-transform:uppercase; font-size:9.5px; }
      tr:nth-child(even) td { background:#f8fafc; }
    </style></head><body>
    <h1>${title}</h1>
    <div class="sub">QMS · ${new Date().toLocaleString('en-IN')} · ${rows.length.toLocaleString()} rows</div>
    <table><thead><tr>${cols.map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${r[c] == null ? '' : String(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <script>window.onload = () => { window.print(); };</script>
    </body></html>
  `)
  w.document.close()
}
