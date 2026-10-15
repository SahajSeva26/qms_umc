import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { AnalyticsFilters } from '@/types/analytics.types'

interface FoAnalyticsPeriodFilterProps {
  periodDays: AnalyticsFilters['periodDays']
  onChange: (periodDays: AnalyticsFilters['periodDays']) => void
}

const PERIOD_OPTIONS: { id: AnalyticsFilters['periodDays']; label: string }[] = [
  { id: 30, label: 'Last 30 days' },
  { id: 90, label: 'Last 90 days' },
  { id: 180, label: 'Last 6 months' },
  { id: 365, label: 'Last 12 months' },
  { id: 'all', label: 'All time' },
]

// Period only — no client filter (FOs aren't scoped to a pharma client) and no export/schedule
// placeholders (those belong to the legacy mock analytics shell, not this real-data page).
const FoAnalyticsPeriodFilter = ({ periodDays, onChange }: FoAnalyticsPeriodFilterProps) => (
  <div
    className="flex flex-wrap items-center gap-2 p-2.5 mb-4 rounded-xl border"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <Select value={String(periodDays)} onValueChange={(v) => onChange(v === 'all' ? 'all' : Number(v))}>
      <SelectTrigger className="text-[12px]"><SelectValue /></SelectTrigger>
      <SelectContent>
        {PERIOD_OPTIONS.map((p) => (
          <SelectItem key={String(p.id)} value={String(p.id)}>{p.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)

export default FoAnalyticsPeriodFilter
