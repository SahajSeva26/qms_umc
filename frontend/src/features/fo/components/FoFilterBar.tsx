import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import type { FoLiveStatus } from '@/features/fo/components/fo.ui'

export interface FoFilters {
  state: string
  status: string
  search: string
}

interface FoFilterBarProps {
  filters: FoFilters
  onChange: (patch: Partial<FoFilters>) => void
  states: string[]
}

const STATUS_OPTIONS: (FoLiveStatus | 'ALL')[] = ['ALL', 'AT_CAMP', 'ON_ROUTE', 'ACTIVE', 'IDLE']

const FoFilterBar = ({ filters, onChange, states }: FoFilterBarProps) => (
  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
    <SearchInput
      value={filters.search}
      onChange={(v) => onChange({ search: v })}
      placeholder="Search name, HQ, phone…"
      wrapperClassName="min-w-[180px]"
    />

    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.state} onValueChange={(v) => onChange({ state: v ?? 'ALL' })}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="State" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All states</SelectItem>
          {states.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={filters.status} onValueChange={(v) => onChange({ status: v ?? 'ALL' })}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s === 'ALL' ? 'All statuses' : s.replace('_', ' ')}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  </div>
)

export default FoFilterBar
