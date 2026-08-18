import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import SearchInput from '@/components/ui/SearchInput'
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
    className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 rounded-xl border"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <SearchInput
      value={filters.q}
      onChange={(v) => setFilter('q', v)}
      placeholder="Search title..."
      className="text-[12px]"
      wrapperClassName="w-56"
    />

    <div className="flex flex-wrap items-center gap-2">
      <Select value={filters.status || 'ALL'} onValueChange={(v) => setFilter('status', (v as string) === 'ALL' ? '' : (v as LeadStatus))}>
        <SelectTrigger className="text-[12px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{LEAD_STATUS_LABEL[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" size="sm" onClick={reset}>Reset</Button>
    </div>
  </div>
)

export default CrmFilterBar
