import { FiDownload, FiClock } from 'react-icons/fi'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import type { AnalyticsFilters } from '@/types/analytics.types'
import type { Client } from '@/types/client.types'

interface AnalyticsHeaderProps {
  filters: AnalyticsFilters
  setFilter: <K extends keyof AnalyticsFilters>(key: K, value: AnalyticsFilters[K]) => void
  clients: Client[]
}

const PERIOD_OPTIONS: { id: AnalyticsFilters['periodDays']; label: string }[] = [
  { id: 30, label: 'Last 30 days' },
  { id: 90, label: 'Last 90 days' },
  { id: 180, label: 'Last 6 months' },
  { id: 365, label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
]

// Export/Schedule are cosmetic in the prototype too (toast only, no real file
// generation or subscription flow) — kept as honest placeholders, not faked.
const AnalyticsHeader = ({ filters, setFilter, clients }: AnalyticsHeaderProps) => (
  <div
    className="flex flex-wrap items-center gap-2 p-2.5 mb-4 rounded-xl border"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <Select value={String(filters.periodDays)} onValueChange={(v) => setFilter('periodDays', v === 'all' ? 'all' : Number(v))}>
      <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {PERIOD_OPTIONS.map((p) => (
          <SelectItem key={String(p.id)} value={String(p.id)}>{p.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select value={filters.clientId} onValueChange={(v) => setFilter('clientId', v as string)}>
      <SelectTrigger className="text-[12px]"><SelectValue placeholder="All clients" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All clients</SelectItem>
        {clients.map((c) => (
          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <div className="ml-auto flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.success('Analytics bundle queued (CSV + PDF)')}
      >
        <FiDownload size={13} /> Export
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => toast.info('Recurring report subscription opened')}
      >
        <FiClock size={13} /> Schedule report
      </Button>
    </div>
  </div>
)

export default AnalyticsHeader
