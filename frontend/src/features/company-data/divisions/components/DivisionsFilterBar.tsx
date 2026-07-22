import { FiSearch } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DivisionsFilterState } from '@/features/company-data/divisions/hooks/useDivisionsFilters'
import type { DivisionStatus, DivisionTherapy } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'

const STATUS_OPTIONS: { value: DivisionStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]
const STATUS_LABEL_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))
const THERAPY_OPTIONS = Object.keys(DIVISION_THERAPY_LABEL) as DivisionTherapy[]

interface DivisionsFilterBarProps {
  filters: DivisionsFilterState
  setFilter: <K extends keyof DivisionsFilterState>(key: K, value: DivisionsFilterState[K]) => void
  reset: () => void
}

// Same convention as RoleTypesFilterBar.tsx — no Tenant filter here, unlike
// that one, since Divisions is scoped to the caller's own tenant only
// (a tenant admin never sees another company's divisions; the backend's
// own ctx.where() scoping enforces this regardless of what this UI sends).
const DivisionsFilterBar = ({ filters, setFilter, reset }: DivisionsFilterBarProps) => {
  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'ALL') as DivisionsFilterState['status'])}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (STATUS_LABEL_BY_VALUE.get(v as DivisionStatus) ?? 'Status'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.therapy} onValueChange={(v) => setFilter('therapy', (v ?? 'ALL') as DivisionsFilterState['therapy'])}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Therapy' : (DIVISION_THERAPY_LABEL[v as DivisionTherapy] ?? 'Therapy'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {THERAPY_OPTIONS.map((t) => <SelectItem key={t} value={t}>{DIVISION_THERAPY_LABEL[t]}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className="relative">
        <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
        <Input
          type="text"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder="Search by name..."
          className="w-56 pl-7 text-[12px]"
        />
      </div>

      <Button variant="outline" size="sm" onClick={reset}>
        Reset
      </Button>
    </div>
  )
}

export default DivisionsFilterBar
