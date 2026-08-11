import { FiSearch } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DivisionsFilterState, DivisionsSearchBy } from '@/features/crm/divisions/hooks/useDivisionsFilters'
import type { DivisionStatus, DivisionTherapy } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'

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
// searchBy: 'name' maps to the state field `search` (not `name` — that field
// was never renamed since it doubles as the general free-text query already
// wired through TenantDetailPage.tsx's `name` request param).
const SEARCH_BY_STATE_KEY: Record<DivisionsSearchBy, 'search' | 'code'> = {
  name: 'search',
  code: 'code',
}

interface DivisionsFilterBarProps {
  filters: DivisionsFilterState
  setFilter: <K extends keyof DivisionsFilterState>(key: K, value: DivisionsFilterState[K]) => void
  reset: () => void
  // division.service.ts only honors a status override (or any non-active
  // result at all) for a caller holding division:manage/tenant:manage —
  // showing "Inactive" to anyone else would be an option that silently does
  // nothing when picked, so it's hidden entirely rather than shown-but-dead.
  canSeeInactive: boolean
}

// Same convention as RoleTypesFilterBar.tsx — no Tenant filter here, unlike
// that one, since this bar only ever renders already-scoped-to-one-company
// (TenantDetailPage.tsx passes `tenant: id` alongside these fields directly
// to useDivisions, not via this bar) — a tenant admin caller is additionally
// force-scoped to their own tenant server-side regardless (contextBuilder.ts's
// ctx.where()), so there's never a case where an unscoped cross-tenant
// Tenant filter would be useful here.
// Matches the real backend search fields exactly: name, code, therapy,
// status — no more, no less (division.validators.ts's SearchDivisionQuerySchema).
//
// One search box, not two — `searchBy` picks which of `search`/`code` the
// box currently reads/writes (both stay in state independently so switching
// modes never loses what was already typed under the other one), and
// TenantDetailPage.tsx only ever sends the field matching the active mode.
const DivisionsFilterBar = ({ filters, setFilter, reset, canSeeInactive }: DivisionsFilterBarProps) => {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <div className="flex flex-wrap items-center gap-2">
        {/* key={filters.searchBy || 'empty'} forces a fresh mount so base-ui's
            Select re-decides controlled-vs-uncontrolled off the real value
            instead of whatever it resolved on its very first render — same
            fix already applied throughout this codebase (RoleTypeDetailPage.tsx
            et al.) for this exact class of error. */}
        <Select key={filters.searchBy || 'empty'} value={filters.searchBy} onValueChange={(v) => setFilter('searchBy', (v ?? 'name') as DivisionsSearchBy)}>
          <SelectTrigger className="text-[12px]">
            <SelectValue>{(v: string) => SEARCH_BY_OPTIONS.find((o) => o.value === v)?.label ?? 'Search by'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SEARCH_BY_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <div className="relative">
          <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
          <Input
            type="text"
            value={filters[SEARCH_BY_STATE_KEY[filters.searchBy]]}
            onChange={(e) => setFilter(SEARCH_BY_STATE_KEY[filters.searchBy], e.target.value)}
            placeholder={SEARCH_BY_PLACEHOLDER[filters.searchBy]}
            className="w-56 pl-7 text-[12px]"
          />
        </div>
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
