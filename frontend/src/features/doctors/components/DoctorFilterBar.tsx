import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DoctorsFilterState } from '@/features/doctors/hooks/useDoctorsFilters'
import type { DoctorSpecialization, DoctorStatus } from '@/features/doctors/doctor.types'

// Backend enum only has these two values — do not add more.
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

// `status` is only honored server-side for callers with doctor:manage;
// others are hard-scoped to active regardless, so the control is rendered
// unconditionally but silently no-ops for them.
const DoctorFilterBar = ({ filters, setFilter, reset }: DoctorFilterBarProps) => (
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

      <Button variant="outline" size="sm" onClick={reset}>
        Reset
      </Button>
    </div>
  </div>
)

export default DoctorFilterBar
