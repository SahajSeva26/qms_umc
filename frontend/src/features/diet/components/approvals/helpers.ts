// Small, page-scoped display helpers for the Diet Coordinator Workspace
// (/diet/approvals) — pure formatting/derivation, not part of the shared
// dietitians.service.ts data layer since these have no business-logic value
// outside this screen's rendering. Exact port of diet-approvals.js's own
// initials()/stringToColor()/fmtDate()/fmtDt()/csvDownload() helpers.
import { toast } from '@/components/ui/sonner'
import { initials, stringToColor } from '@/features/diet/utils/personDisplay'
import type { Camp } from '@/types/camp.types'
import { resolveCoordinatorId, coordScopedCamps } from '@/features/diet/services/dietScope.service'
import { useDietPermissions } from '@/features/diet/hooks/useDietPermissions'
import type { UserRole } from '@/types/auth.types'

// initials()/stringToColor() now live in utils/personDisplay.ts — they were
// duplicated across four Diet components. Re-exported here so this screen's
// existing `from './helpers'` imports keep working.
export { initials, stringToColor }

export function fmtDate(iso: string | undefined | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function fmtDateYear(iso: string | undefined | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtDt(iso: string | undefined | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

// csvDownload() — generic CSV export: header from Object.keys(rows[0]),
// quote/escape values containing " , or newline, Blob download.
export function csvDownload(filename: string, rows: Record<string, unknown>[]) {
  if (!rows.length) {
    toast.info('Nothing to export')
    return
  }
  const headers = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? '' : String(v)
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
    return s
  }
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast.success(`Downloaded ${filename}`)
}

// userName() — session.name equivalent: firstName + ' ' + lastName.
export function userName(user: { firstName: string; lastName: string } | null | undefined): string {
  if (!user) return ''
  return `${user.firstName} ${user.lastName}`.trim()
}

// Coordinator-scope resolution shared by every tab on this page.
export function useScope(role: UserRole | undefined, name: string) {
  const { canManageDiet: adminLike } = useDietPermissions(role || '')
  const coordId = adminLike ? null : resolveCoordinatorId(name)
  const scoped = adminLike || !!coordId
  return { adminLike, coordId, scoped }
}

export function dietCampsForScope(camps: Camp[], adminLike: boolean, coordId: string | null): Camp[] {
  if (adminLike || !coordId) return camps.filter((c) => c.type === 'Diet')
  return coordScopedCamps(camps, coordId).filter((c) => c.type === 'Diet')
}
