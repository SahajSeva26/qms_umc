import { Button } from '@/components/ui/button'
import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DivisionsFilterState, DivisionsSearchBy } from '@/features/crm/divisions/hooks/useDivisionsFilters'
import type { DivisionStatus, DivisionTherapy } from '@/features/crm/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/features/crm/crm.constants'

const STATUS_OPTIONS: { value: DivisionStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]
const STATUS_LABEL_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))
const THERAPY_OPTIONS = Object.keys(DIVISION_THERAPY_LABEL) as DivisionTherapy[]

const SEARCH_BY_OPTIONS: { value: DivisionsSearchBy; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'code', label: 'Code' },
]
const SEARCH_BY_PLACEHOLDER: Record<DivisionsSearchBy, string> = {
  name: 'Search by name...',
  code: 'Search by code...',
}
// searchBy: 'name' maps to the state field `search`, which doubles as the
// general free-text query param.
const SEARCH_BY_STATE_KEY: Record<DivisionsSearchBy, 'search' | 'code'> = {
  name: 'search',
  code: 'code',
}

interface DivisionsFilterBarProps {
  filters: DivisionsFilterState
  setFilter: <K extends keyof DivisionsFilterState>(key: K, value: DivisionsFilterState[K]) => void
  reset: () => void
  // Only division:manage/tenant:manage callers can see non-active results;
  // hidden entirely for others rather than shown-but-dead.
  canSeeInactive: boolean
}

// No Tenant filter here — this bar only ever renders already-scoped to one
// company; `tenant: id` is passed directly to useDivisions elsewhere.
const DivisionsFilterBar = ({ filters, setFilter, reset, canSeeInactive }: DivisionsFilterBarProps) => {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* key forces remount so base-ui's Select re-decides controlled-vs-uncontrolled off the real value. */}
        <Select key={filters.searchBy || 'empty'} value={filters.searchBy} onValueChange={(v) => setFilter('searchBy', (v ?? 'name') as DivisionsSearchBy)}>
          <SelectTrigger className="text-[12px]">
            <SelectValue>{(v: string) => SEARCH_BY_OPTIONS.find((o) => o.value === v)?.label ?? 'Search by'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SEARCH_BY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <SearchInput
          value={filters[SEARCH_BY_STATE_KEY[filters.searchBy]]}
          onChange={(v) => setFilter(SEARCH_BY_STATE_KEY[filters.searchBy], v)}
          placeholder={SEARCH_BY_PLACEHOLDER[filters.searchBy]}
          className="w-56 text-[12px]"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {canSeeInactive ? (
          <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'active') as DivisionsFilterState['status'])}>
            <SelectTrigger className="text-[12px]">
              <SelectValue>{(v: string) => STATUS_LABEL_BY_VALUE.get(v as DivisionStatus) ?? 'Status'}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        ) : null}

        <Select value={filters.therapy} onValueChange={(v) => setFilter('therapy', (v ?? 'ALL') as DivisionsFilterState['therapy'])}>
          <SelectTrigger className="text-[12px]">
            <SelectValue>{(v: string) => (v === 'ALL' ? 'Therapy' : (DIVISION_THERAPY_LABEL[v as DivisionTherapy] ?? 'Therapy'))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {THERAPY_OPTIONS.map((t) => <SelectItem key={t} value={t}>{DIVISION_THERAPY_LABEL[t]}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  )
}

export default DivisionsFilterBar
