import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { doctorsService } from '@/features/doctors/doctors.service'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import type { DoctorEntity } from '@/types/doctor.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface DoctorPickerProps {
  value: string
  label: string
  onChange: (doctorId: string, doctorLabel: string) => void
}

// GET /doctors search has no AuthorizeMiddleware beyond login — any pharma
// role can search doctors without a specific permission (confirmed against
// doctor.routes.ts). Debounced, paginated (limit:10) typeahead — never
// loads the full doctor directory.
const doctorLabel = (doctor: DoctorEntity) => `${doctor.name} (${doctor.pharmaCode})`

const DoctorPicker = ({ value, label, onChange }: DoctorPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const searchQuery = { name: debouncedQuery.trim(), limit: '10' }
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['pharma', 'doctor-picker', searchQuery],
    queryFn: () => doctorsService.searchDoctors(searchQuery),
    enabled: !!debouncedQuery.trim(),
  })
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<DoctorEntity>
      value={value}
      label={label}
      onChange={onChange}
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      containerRef={containerRef}
      results={results}
      isFetching={isFetching}
      getId={(doctor) => doctor.id}
      getLabel={doctorLabel}
      searchPlaceholder="Search doctor by name…"
      clearAriaLabel="Clear selected doctor"
      emptyQueryText="Type a doctor's name to search."
      noResultsText="No matching doctors found."
      renderResult={(doctor) => <>{doctorLabel(doctor)}</>}
      isError={isError}
      errorText="Couldn't search doctors. Try again."
      onRetry={() => refetch()}
    />
  )
}

export default DoctorPicker
