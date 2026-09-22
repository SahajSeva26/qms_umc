import { useState } from 'react'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useNearestDoctors } from '@/hooks/useNearestDoctors'
import { isForbiddenError, getApiErrorMessage } from '@/utils/apiError'
import type { DoctorEntity, NearestDoctorQuery } from '@/types/doctor.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface DoctorDistancePickerProps {
  value: string
  label: string
  coordinates?: [number, number]
  onChange: (doctorId: string, doctorLabel: string) => void
  disabled?: boolean
}

const NEAREST_LIMIT = 20

const doctorLabel = (doctor: DoctorEntity) => `${doctor.name} (${doctor.pharmaCode})`

// Pharma-side: distance-sorted via /doctors/nearest, division-scoped server-side to the caller's
// own role — no division param needed. See CampDoctorSearchPicker for the platform equivalent.
const DoctorDistancePicker = ({ value, label, coordinates, onChange, disabled }: DoctorDistancePickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const [lng, lat] = coordinates ?? []
  const isReady = Number.isFinite(lng) && Number.isFinite(lat)

  // Gate on `open` too — dragging the map pin must never fire this while the dropdown is closed.
  const nearestQuery: NearestDoctorQuery | null = open && isReady
    ? { lng: lng as number, lat: lat as number, limit: String(NEAREST_LIMIT) }
    : null

  const { data, isFetching, error, refetch } = useNearestDoctors(nearestQuery)
  const nearestDoctors = data?.data?.items ?? []
  const nearestTruncated = nearestDoctors.length === NEAREST_LIMIT

  const trimmedQuery = query.trim().toLowerCase()
  const filteredDoctors = trimmedQuery
    ? nearestDoctors.filter((d) => d.name.toLowerCase().includes(trimmedQuery) || d.pharmaCode.toLowerCase().includes(trimmedQuery))
    : nearestDoctors

  // A 403 usually means no division assigned, but could be a permissions drift — always surface
  // the real API message; only the fallback text differs by branch.
  const forbidden = isForbiddenError(error)
  const errorText = getApiErrorMessage(
    error,
    forbidden ? "Your account isn't assigned to a division." : "Couldn't search doctors. Try again.",
  )

  return (
    <div>
      <AsyncPicker<DoctorEntity>
        value={value}
        label={label}
        onChange={onChange}
        query={query}
        onQueryChange={setQuery}
        open={open}
        onOpenChange={setOpen}
        containerRef={containerRef}
        results={filteredDoctors}
        isFetching={isFetching && filteredDoctors.length === 0}
        getId={(doctor) => doctor.id}
        getLabel={doctorLabel}
        searchPlaceholder={isReady ? 'Search doctor by name…' : 'Pick a location first'}
        clearAriaLabel="Clear selected doctor"
        noResultsText="No matching doctors found."
        renderResult={(doctor) => <>{doctorLabel(doctor)} — {((doctor.distanceMeters ?? 0) / 1000).toFixed(1)} km</>}
        isError={!!error}
        errorText={errorText}
        onRetry={() => refetch()}
        disabled={disabled || !isReady}
      />
      {nearestTruncated && !error && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          Showing the {NEAREST_LIMIT} nearest doctors — some in-range doctors may not be listed.
        </p>
      )}
    </div>
  )
}

export default DoctorDistancePicker
