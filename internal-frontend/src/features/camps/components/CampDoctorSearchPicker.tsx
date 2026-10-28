import { useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useDoctorSearch } from '@/hooks/useDoctorSearch'
import type { DoctorEntity } from '@/types/doctor.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface CampDoctorSearchPickerProps {
  value: string
  label: string
  division: string | undefined
  onChange: (doctorId: string, doctorLabel: string) => void
  // Fires alongside onChange with the full picked entity (or null on clear) — lets a caller
  // default the camp location to the doctor's own location without a second lookup.
  onSelectDoctor?: (doctor: DoctorEntity | null) => void
  disabled?: boolean
}

// Platform-side: plain division-scoped name search. See DoctorDistancePicker for pharma's
// distance-sorted equivalent (/doctors/nearest is gated to camp:book, not reachable here).
const doctorLabel = (doctor: DoctorEntity) => `${doctor.name} (${doctor.pharmaCode})`

const CampDoctorSearchPicker = ({ value, label, division, onChange, onSelectDoctor, disabled }: CampDoctorSearchPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const searchQuery = { name: debouncedQuery.trim(), division, limit: '10' }
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
      searchPlaceholder={division ? 'Search doctor by name…' : 'Select a division first'}
      clearAriaLabel="Clear selected doctor"
      emptyQueryText={division ? "Type a doctor's name to search." : undefined}
      noResultsText="No matching doctors found."
      renderResult={(doctor) => <>{doctorLabel(doctor)}</>}
      isError={isError}
      errorText="Couldn't search doctors. Try again."
      onRetry={() => refetch()}
      disabled={disabled}
    />
  )
}

export default CampDoctorSearchPicker
