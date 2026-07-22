import { FiSearch } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TenantsFilterState } from '@/features/access-management/tenant/hooks/useTenantsFilters'
import type { TenantStatus } from '@/types/accessManagement.types'

const STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]
const STATUS_LABEL_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))

interface TenantsFilterBarProps {
  filters: TenantsFilterState
  setFilter: <K extends keyof TenantsFilterState>(key: K, value: TenantsFilterState[K]) => void
  reset: () => void
}

// Same convention as RoleTypesFilterBar.tsx: the trigger shows the fixed
// dimension name ("Status") at the default "ALL" value, switching to the
// selected option's own label once something specific is picked.
//
// Status filtering here is only honored server-side for callers with
// tenant:manage (tenant.validators.ts's SearchTenantQuery doc comment) —
// a caller without it is hard-scoped to status=active regardless of what
// this control is set to. The filter still renders unconditionally rather
// than being hidden per-permission (matches this list's existing "no
// per-field permission gating" precedent) — picking "Inactive" as a
// non-privileged caller just silently returns the same active-only results
// the backend would have returned anyway, not an error.
const TenantsFilterBar = ({ filters, setFilter, reset }: TenantsFilterBarProps) => {
  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'ALL') as TenantsFilterState['status'])}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (STATUS_LABEL_BY_VALUE.get(v as TenantStatus) ?? 'Status'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
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

export default TenantsFilterBar
