import { Button } from '@/components/ui/button'
import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TenantsFilterState } from '@/features/access-management/tenant/hooks/useTenantsFilters'
import type { TenantStatus, TenantType } from '@/types/accessManagement.types'

const STATUS_OPTIONS: { value: TenantStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]
const STATUS_LABEL_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))

const TYPE_OPTIONS: { value: TenantType; label: string }[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'platform', label: 'Platform' },
]
const TYPE_LABEL_BY_VALUE = new Map(TYPE_OPTIONS.map((t) => [t.value, t.label]))

interface TenantsFilterBarProps {
  filters: TenantsFilterState
  setFilter: <K extends keyof TenantsFilterState>(key: K, value: TenantsFilterState[K]) => void
  reset: () => void
  // system:manage only — everyone else never even sees this control, let
  // alone can change it away from the page's own customer-tenant scope.
  canFilterByType: boolean
}

// Status filtering here is only honored server-side for callers with
// tenant:manage — others are hard-scoped to status=active regardless.
const TenantsFilterBar = ({ filters, setFilter, reset, canFilterByType }: TenantsFilterBarProps) => {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <SearchInput
        value={filters.search}
        onChange={(v) => setFilter('search', v)}
        placeholder="Search by name..."
        className="w-56 text-[12px]"
      />

      <div className="flex flex-wrap items-center gap-2">
        {canFilterByType && (
          <Select value={filters.type} onValueChange={(v) => setFilter('type', (v ?? 'customer') as TenantsFilterState['type'])}>
            <SelectTrigger className="text-[12px]">
              <SelectValue>{(v: string) => (v === 'ALL' ? 'Type' : (TYPE_LABEL_BY_VALUE.get(v as TenantType) ?? 'Type'))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {TYPE_OPTIONS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'ALL') as TenantsFilterState['status'])}>
          <SelectTrigger className="text-[12px]">
            <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (STATUS_LABEL_BY_VALUE.get(v as TenantStatus) ?? 'Status'))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  )
}

export default TenantsFilterBar
