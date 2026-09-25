import { useState } from 'react'
import { Button } from '@/components/ui/button'
import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import StateCityFilter from '@/components/widgets/location-picker/StateCityFilter'
import type { DoctorsFilterState } from '@/features/doctors/hooks/useDoctorsFilters'
import { SPECIALIZATION_OPTIONS } from '@/features/doctors/doctors.ui'
import type { DoctorSpecialization, DoctorStatus } from '@/types/doctor.types'

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
  /** From the Geography tab's "jump to roster" action, threaded down from DoctorsPage via RosterTab. */
  geographySeedKey?: number
  geographySeed?: { city: string; state: string } | null
}

// `status` is only honored server-side for callers with doctor:manage;
// others are hard-scoped to active regardless, so the control is rendered
// unconditionally but silently no-ops for them.
const DoctorFilterBar = ({ filters, setFilter, reset, geographySeedKey, geographySeed }: DoctorFilterBarProps) => {
  // Bumped on Reset to remount StateCityFilter (it doesn't sync props into state via an effect, so
  // a prop change alone wouldn't clear its text) — combined with geographySeedKey for the same reason.
  const [resetKey, setResetKey] = useState(0)
  const stateCityKey = `${resetKey}-${geographySeedKey ?? 0}`

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

        <StateCityFilter
          key={stateCityKey}
          city={filters.city}
          state={filters.state}
          externalStateSeed={geographySeed?.state}
          externalCitySeed={geographySeed?.city}
          onChange={({ city, state }) => {
            setFilter('city', city)
            setFilter('state', state)
          }}
        />

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            reset()
            setResetKey((k) => k + 1)
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  )
}

export default DoctorFilterBar
