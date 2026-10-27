import { useState } from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import SearchInput from '@/components/ui/SearchInput'
import { Button } from '@/components/ui/button'
import DatePicker from '@/components/ui/DatePicker'
import { LEAD_STATUS_LABEL } from '@/types/crm.types'
import type { LeadStatus } from '@/types/crm.types'
import type { CrmFilterState } from '@/features/crm/hooks/useCrmFilters'
import { THERAPIES } from '@/features/crm/crm.constants'

const STATUSES = Object.keys(LEAD_STATUS_LABEL) as LeadStatus[]
// Includes the 'ALL' sentinel alongside the real LEAD_STATUS_LABEL values, for the same
// SelectValue children render-prop fix as the search-field picker below.
const STATUS_FILTER_LABEL: Record<string, string> = { ALL: 'All stages', ...LEAD_STATUS_LABEL }

// Which CrmFilterState key the single search box writes into — picked via the dropdown next to it.
// Therapy is deliberately NOT here — it's a closed, pickable set (THERAPIES), so it gets its own
// select below rather than living in the free-text search box.
const SEARCH_FIELDS = ['code', 'q'] as const
type SearchField = (typeof SEARCH_FIELDS)[number]
const SEARCH_FIELD_LABEL: Record<SearchField, string> = {
  code: 'Code',
  q: 'Title',
}
const SEARCH_FIELD_PLACEHOLDER: Record<SearchField, string> = {
  code: 'Search by code...',
  q: 'Search by title...',
}

interface CrmFilterBarProps {
  filters: CrmFilterState
  setFilter: <K extends keyof CrmFilterState>(key: K, value: CrmFilterState[K]) => void
  reset: () => void
}

// '' means "all" in filter state, but empty-string SelectItem values are disallowed — mapped to
// the 'ALL' sentinel at each Select boundary.
const CrmFilterBar = ({ filters, setFilter, reset }: CrmFilterBarProps) => {
  const [searchField, setSearchField] = useState<SearchField>('q')

  const handleSearchFieldChange = (next: SearchField) => {
    if (next === searchField) return
    setSearchField(next)
    SEARCH_FIELDS.forEach((f) => setFilter(f, ''))
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <span className="text-[11px] font-bold uppercase tracking-wider mr-1" style={{ color: 'var(--qms-text-muted)' }}>
        Filter
      </span>

      <Select value={filters.status || 'ALL'} onValueChange={(v) => setFilter('status', (v as string) === 'ALL' ? '' : (v as LeadStatus))}>
        <SelectTrigger className="text-[12px]" aria-label="Filter by stage">
          <SelectValue placeholder="All stages">{(v: string) => STATUS_FILTER_LABEL[v] ?? v}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All stages</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>{LEAD_STATUS_LABEL[s]}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.focusTherapy || 'ALL'} onValueChange={(v) => setFilter('focusTherapy', (v as string) === 'ALL' ? '' : (v as string))}>
        <SelectTrigger className="text-[12px]" aria-label="Filter by therapy">
          <SelectValue placeholder="All therapies">{(v: string) => (v === 'ALL' ? 'All therapies' : v)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All therapies</SelectItem>
          {THERAPIES.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-1.5">
        <DatePicker value={filters.fyFrom} onChange={(v) => setFilter('fyFrom', v)} placeholder="FY from" className="w-32" />
        <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>–</span>
        <DatePicker value={filters.fyTo} onChange={(v) => setFilter('fyTo', v)} placeholder="FY to" className="w-32" />
      </div>

      <div className="flex items-center gap-1.5 ml-auto">
        <Select value={searchField} onValueChange={(v) => handleSearchFieldChange(v as SearchField)}>
          <SelectTrigger className="text-[12px] w-28" aria-label="Search by field">
            {/* base-ui's Select.Value shows the raw value string unless given a children render-prop
                to map it to a label — 'q' is the internal filter key, not something to show the user. */}
            <SelectValue>{(v: SearchField) => SEARCH_FIELD_LABEL[v]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SEARCH_FIELDS.map((f) => (
              <SelectItem key={f} value={f}>{SEARCH_FIELD_LABEL[f]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <SearchInput
          value={filters[searchField]}
          onChange={(v) => setFilter(searchField, v)}
          placeholder={SEARCH_FIELD_PLACEHOLDER[searchField]}
          className="text-[12px]"
          wrapperClassName="w-56"
        />
      </div>

      <Button variant="outline" size="sm" onClick={reset}>↺ Reset</Button>
    </div>
  )
}

export default CrmFilterBar
