import { useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useDoctorSearch } from '@/hooks/useDoctorSearch'
import type { DoctorEntity } from '@/types/doctor.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface DoctorNameDivisionPickerProps {
  value: string
  label: string
  division: string | null
  onChange: (doctorId: string, doctorLabel: string) => void
  // Fires alongside onChange with the full picked entity (or null on clear) — lets the caller
  // default the camp location to the doctor's own location.
  onSelectDoctor?: (doctor: DoctorEntity | null) => void
  disabled?: boolean
}

const doctorLabel = (doctor: DoctorEntity) => `${doctor.name} (${doctor.pharmaCode})`

// MR-portal's "pick any doctor in my division first" search — deliberately NOT distance-sorted
// (unlike DoctorDistancePicker, which needs a location to search near). Doctor-picking here has
// no location dependency at all; see BookCampForm's range check for what happens once a location
// is later picked and the doctor turns out to be far from it.
const DoctorNameDivisionPicker = ({ value, label, division, onChange, onSelectDoctor, disabled }: DoctorNameDivisionPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const searchQuery = { name: debouncedQuery.trim(), division: division ?? undefined, limit: '10' }
  const { data, isFetching, isError, refetch } = useDoctorSearch(searchQuery, {
    enabled: !!debouncedQuery.trim() && !!division,
  })
  const results = data?.data?.items ?? []

  const handleChange = (doctorId: string, doctorLabel: string) => {
    onChange(doctorId, doctorLabel)
    onSelectDoctor?.(results.find((d) => d.id === doctorId) ?? null)
  }

  return (
    <AsyncPicker<DoctorEntity>
      value={value}
      label={label}
      onChange={handleChange}
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      containerRef={containerRef}
      results={results}
      isFetching={isFetching}
      getId={(doctor) => doctor.id}
      getLabel={doctorLabel}
      searchPlaceholder={division ? 'Search doctor by name…' : "Can't resolve your division"}
      clearAriaLabel="Clear selected doctor"
      emptyQueryText={division ? "Type a doctor's name to search." : undefined}
      noResultsText="No matching doctors found."
      renderResult={(doctor) => <>{doctorLabel(doctor)}</>}
      isError={isError}
      errorText="Couldn't search doctors. Try again."
      onRetry={() => refetch()}
      disabled={disabled || !division}
    />
  )
}

export default DoctorNameDivisionPicker
