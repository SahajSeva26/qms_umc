export function formatRelativeTime(isoDate: string): string {
  const then = new Date(isoDate).getTime()
  if (Number.isNaN(then)) return ''

  const diffMs = Date.now() - then
  const diffSec = Math.round(diffMs / 1000)

  if (diffSec < 60) return 'just now'

  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHour = Math.round(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`

  const diffDay = Math.round(diffHour / 24)
  if (diffDay < 7) return `${diffDay}d ago`

  return new Date(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}
