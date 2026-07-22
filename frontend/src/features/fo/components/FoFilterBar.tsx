import { FiSearch } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
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
  <div className="flex flex-wrap items-center gap-2 mb-3">
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
    <div className="relative flex-1 min-w-[180px]">
      <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
      <Input
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Search name, HQ, phone…"
        className="pl-7"
      />
    </div>
  </div>
)

export default FoFilterBar
