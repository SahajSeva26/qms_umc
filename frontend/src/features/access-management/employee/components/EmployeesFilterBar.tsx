import { Button } from '@/components/ui/button'
import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { EmployeesFilterState } from '@/features/access-management/employee/hooks/useEmployeesFilters'
import type { EmployeeStatus } from '@/types/accessManagement.types'

const STATUS_OPTIONS: { value: EmployeeStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
]
const STATUS_LABEL_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))

interface TenantOption {
  id: string
  label: string
}

interface EmployeesFilterBarProps {
  filters: EmployeesFilterState
  setFilter: <K extends keyof EmployeesFilterState>(key: K, value: EmployeesFilterState[K]) => void
  reset: () => void
  // Only shown when the caller is a platform actor — the backend ignores this
  // filter entirely for customer actors (employee.service.ts's search()).
  tenantOptions?: TenantOption[]
}

const EmployeesFilterBar = ({ filters, setFilter, reset, tenantOptions }: EmployeesFilterBarProps) => {
  const tenantLabelById = new Map((tenantOptions ?? []).map((t) => [t.id, t.label]))

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
        <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'ALL') as EmployeesFilterState['status'])}>
          <SelectTrigger className="text-[12px]">
            <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (STATUS_LABEL_BY_VALUE.get(v as EmployeeStatus) ?? 'Status'))}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>

        {tenantOptions && (
          <Select value={filters.tenant} onValueChange={(v) => setFilter('tenant', v ?? 'ALL')}>
            <SelectTrigger className="text-[12px]">
              <SelectValue>{(v: string) => (v === 'ALL' ? 'Company' : (tenantLabelById.get(v) ?? 'Company'))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {tenantOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}

        <Button variant="outline" size="sm" onClick={reset}>
          Reset
        </Button>
      </div>
    </div>
  )
}

export default EmployeesFilterBar
