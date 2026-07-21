// Small, page-scoped display helpers for the Diet Coordinator Workspace
// (/diet/approvals) — pure formatting/derivation, not part of the shared
// dietitians.service.ts data layer since these have no business-logic value
// outside this screen's rendering. Exact port of diet-approvals.js's own
// initials()/stringToColor()/fmtDate()/fmtDt()/csvDownload() helpers.
import { toast } from '@/components/ui/sonner'
import type { Camp } from '@/types/camp.types'
import { isAdminLike, resolveCoordinatorId, coordScopedCamps } from '@/features/diet/dietitians.service'
import type { UserRole } from '@/types/auth.types'

export function initials(n: string | undefined | null): string {
  return (n || '?')
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const PALETTE = ['#3b6dff', '#a855f7', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#14b8a6', '#7c5cff', '#f43f5e', '#84cc16']

export function stringToColor(s: string | undefined | null): string {
  let h = 0
  const input = s || ''
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

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
  const adminLike = isAdminLike(role || '')
  const coordId = adminLike ? null : resolveCoordinatorId(name)
  const scoped = adminLike || !!coordId
  return { adminLike, coordId, scoped }
}

export function dietCampsForScope(camps: Camp[], adminLike: boolean, coordId: string | null): Camp[] {
  if (adminLike || !coordId) return camps.filter((c) => c.type === 'Diet')
  return coordScopedCamps(camps, coordId).filter((c) => c.type === 'Diet')
}
