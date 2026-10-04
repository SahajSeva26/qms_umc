import { useState } from 'react'
import { doctorsService } from '@/features/doctors/doctors.service'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useQuery } from '@tanstack/react-query'
import { doctorKeys } from '@/hooks/doctorKeys'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface DoctorAsyncPickerProps {
  value: string
  label: string
  onChange: (doctorId: string, doctorLabel: string) => void
}

interface DoctorResult {
  id: string
  name: string
  pharmaCode: string
}

const doctorLabel = (d: DoctorResult) => `${d.name} (${d.pharmaCode})`

// A plain name-search picker, not the coordinate-based DoctorDistancePicker used in camp booking.
// Lives under components/widgets/, not components/ui/, since it imports the Doctors feature's own service directly.
const DoctorAsyncPicker = ({ value, label, onChange }: DoctorAsyncPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: doctorKeys.list({ name: debouncedQuery.trim(), limit: '10' }),
    queryFn: () => doctorsService.searchDoctors({ name: debouncedQuery.trim(), limit: '10' }),
    enabled: open && !!debouncedQuery.trim(),
  })
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<DoctorResult>
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
      isError={isError}
      errorText="Couldn't search doctors. Try again."
      onRetry={() => void refetch()}
      getId={(d) => d.id}
      getLabel={doctorLabel}
      searchPlaceholder="Search doctor by name..."
      clearAriaLabel="Clear selected doctor"
      emptyQueryText="Type a doctor name to search."
      noResultsText="No matching doctors found."
      dropdownClassName="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-h-64 overflow-y-auto"
      renderResult={(d) => <>{doctorLabel(d)}</>}
    />
  )
}

export default DoctorAsyncPicker
