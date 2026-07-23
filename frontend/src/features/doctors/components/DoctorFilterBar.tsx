import { FiSearch } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DoctorsFilterState } from '@/features/doctors/hooks/useDoctorsFilters'
import type { DoctorSpecialization, DoctorStatus } from '@/types/doctor.types'

// Real backend enum — DOCTOR_SPECIALIZATION only has these two values
// (doctor.constants.ts). Do not add more; the mock-era 13-item specialty
// list this feature used to show has no backend counterpart.
const SPECIALIZATION_OPTIONS: { value: DoctorSpecialization; label: string }[] = [
  { value: 'cp', label: 'CP' },
  { value: 'gp', label: 'GP' },
]
const SPECIALIZATION_LABEL_BY_VALUE = new Map(SPECIALIZATION_OPTIONS.map((s) => [s.value, s.label]))

const STATUS_OPTIONS: { value: DoctorStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]
const STATUS_LABEL_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))

interface DoctorFilterBarProps {
  filters: DoctorsFilterState
  setFilter: <K extends keyof DoctorsFilterState>(key: K, value: DoctorsFilterState[K]) => void
  reset: () => void
}

// Same convention as RolesFilterBar.tsx. `status` is only actually honored
// server-side for callers with `doctor:manage` (doctor.service.ts's search()
// hard-scopes everyone else to status=active regardless of this control) —
// still rendered unconditionally, matching Tenants' own "no per-field
// permission gating" precedent (picking "Inactive" as a non-privileged
// caller just silently returns the same active-only results).
const DoctorFilterBar = ({ filters, setFilter, reset }: DoctorFilterBarProps) => (
  <div
    className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
    style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <Select value={filters.specialization} onValueChange={(v) => setFilter('specialization', (v ?? 'ALL') as DoctorsFilterState['specialization'])}>
      <SelectTrigger className="text-[12px]">
        <SelectValue>{(v: string) => (v === 'ALL' ? 'Specialization' : (SPECIALIZATION_LABEL_BY_VALUE.get(v as DoctorSpecialization) ?? 'Specialization'))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All</SelectItem>
        {SPECIALIZATION_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
      </SelectContent>
    </Select>

    <Select value={filters.status} onValueChange={(v) => setFilter('status', (v ?? 'ALL') as DoctorsFilterState['status'])}>
      <SelectTrigger className="text-[12px]">
        <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (STATUS_LABEL_BY_VALUE.get(v as DoctorStatus) ?? 'Status'))}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="ALL">All</SelectItem>
        {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
      </SelectContent>
    </Select>

    <Input
      type="text"
      value={filters.city}
      onChange={(e) => setFilter('city', e.target.value)}
      placeholder="City..."
      className="w-32 text-[12px]"
    />

    <Input
      type="text"
      value={filters.state}
      onChange={(e) => setFilter('state', e.target.value)}
      placeholder="State..."
      className="w-32 text-[12px]"
    />

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

export default DoctorFilterBar
