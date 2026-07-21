// Shared tiny helpers for the Dietitian Profiles screen's sub-components.

export function initials(name: string): string {
  return (name || '?').split(' ').map((s) => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

export function fmtDate(d?: string | null): string {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
  } catch {
    return d
  }
}
