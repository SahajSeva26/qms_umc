import { FiSearch } from 'react-icons/fi'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LEAD_STATUS_LABEL } from '@/types/crm.types'
import type { LeadStatus } from '@/types/crm.types'
import type { CrmFilterState } from '@/features/crm/hooks/useCrmFilters'

const STATUSES = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]

interface CrmFilterBarProps {
  filters: CrmFilterState
  setFilter: <K extends keyof CrmFilterState>(key: K, value: CrmFilterState[K]) => void
  reset: () => void
}

// The filter state uses '' for "all", but empty-string SelectItem values are
// disallowed — map '' <-> the 'ALL' sentinel at the Select boundary.
const CrmFilterBar = ({ filters, setFilter, reset }: CrmFilterBarProps) => (
  <div
    className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <Select value={filters.status || 'ALL'} onValueChange={(v) => setFilter('status', (v as string) === 'ALL' ? '' : (v as LeadStatus))}>
      <SelectTrigger className="text-[12px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All statuses</SelectItem>
        {STATUSES.map((s) => (
          <SelectItem key={s} value={s}>{LEAD_STATUS_LABEL[s]}</SelectItem>
        ))}
      </SelectContent>
    </Select>

    <div className="relative w-56">
      <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10" style={{ color: 'var(--qms-text-muted)' }} />
      <Input
        type="text"
        value={filters.q}
        onChange={(e) => setFilter('q', e.target.value)}
        placeholder="Search title, contact, division..."
        className="pl-7 text-[12px]"
      />
    </div>

    <Button variant="outline" size="sm" onClick={reset}>Reset</Button>
  </div>
)

export default CrmFilterBar
