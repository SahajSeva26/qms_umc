import { FiSearch } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { UsersFilterState } from '@/features/admin/hooks/useUsersFilters'
import type { UserStatus } from '@/types/user.types'

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'deleted', label: 'Deleted' },
]
const STATUS_LABEL_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))

interface TenantOption {
  id: string
  label: string
}

interface UsersFilterBarProps {
  filters: UsersFilterState
  setFilter: <K extends keyof UsersFilterState>(key: K, value: UsersFilterState[K]) => void
  reset: () => void
  tenantOptions: TenantOption[]
}

// The trigger shows the fixed dimension name ("Status", "Tenant") at the
// default "ALL" value, but switches to the selected option's own label once
// something specific is picked (e.g. "Active") — SelectValue's `children`
// function receives the current raw value, so this looks it up against the
// option list rather than always rendering the matched SelectItem's text
// (which would show "Active" but never fall back to "Status" at the default).
const UsersFilterBar = ({ filters, setFilter, reset, tenantOptions }: UsersFilterBarProps) => {
  const tenantLabelById = new Map(tenantOptions.map((t) => [t.id, t.label]))

  return (
    <div
      className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'ALL') as UsersFilterState['status'])}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (STATUS_LABEL_BY_VALUE.get(v as UserStatus) ?? 'Status'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select value={filters.tenant} onValueChange={(v) => setFilter('tenant', v ?? 'ALL')}>
        <SelectTrigger className="text-[12px]">
          <SelectValue>{(v: string) => (v === 'ALL' ? 'Tenant' : (tenantLabelById.get(v) ?? 'Tenant'))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All</SelectItem>
          {tenantOptions.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
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

export default UsersFilterBar
