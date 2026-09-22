import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { DOCTORS_ROUTES } from '@/features/doctors/doctors.routes'
import { SPECIALIZATION_OPTIONS } from '@/features/doctors/doctors.ui'
import { useNearestDoctors } from '@/features/doctors/hooks/useNearestDoctors'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DoctorSpecialization, NearestDoctorQuery } from '@/types/doctor.types'
import type { LocationValue } from '@/types/location.types'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'

// Bounds the free-text Limit input to a sane positive-integer range before it's ever sent —
// matches the project's default limit=10 convention, and stops 0/negative/non-numeric/huge
// values from reaching the backend as an unbounded or malformed query param.
const MAX_LIMIT = 100

// Query only fires once a location has been submitted — a lookup tool, not
// live-as-you-type. 35km search radius is server-fixed, not a form input here.
const NearestDoctorsPage = () => {
  const navigate = useNavigate()

  const [specialization, setSpecialization] = useState<DoctorSpecialization | 'ALL'>('ALL')
  const [location, setLocation] = useState<LocationValue | null>(null)
  const [limit, setLimit] = useState('10')
  const [query, setQuery] = useState<NearestDoctorQuery | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  // Same race as EditDoctorModal's Save — a stale `location` here would run a
  // real lookup from the wrong point, so block the same way.
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')

  const { data, isLoading, isFetching, error, refetch } = useNearestDoctors(query)
  const results = data?.data?.items ?? []

  const handleSearch = () => {
    if (locationResolution === 'loading') { setFormError('Still resolving the picked location — wait a moment and try again'); return }
    if (locationResolution === 'error') { setFormError('Retry or choose "Use this pin" for the location before searching'); return }
    if (!location?.coordinates) { setFormError('Pick a location on the map'); return }

    const trimmedLimit = limit.trim()
    const parsedLimit = trimmedLimit === '' ? 10 : Number(trimmedLimit)
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > MAX_LIMIT) {
      setFormError(`Limit must be a whole number between 1 and ${MAX_LIMIT}`)
      return
    }

    const [lng, lat] = location.coordinates
    setFormError(null)
    setQuery({ lng, lat, specialization: specialization === 'ALL' ? undefined : specialization, limit: String(parsedLimit) })
  }

  const handleRetry = () => {
    // Same query params — same TanStack Query key — so a plain re-click of "Find nearest"
    // isn't guaranteed to actually issue a new request. refetch() forces one explicitly.
    void refetch()
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(DOCTORS_ROUTES.DOCTORS)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to doctors
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
          Nearest doctors
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          Find registered doctors within 35 km of a point.
        </p>
      </div>

      <div
        className="rounded-xl border p-5 mb-5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Specialization
            </Label>
            <Select value={specialization} onValueChange={(v) => setSpecialization(v as DoctorSpecialization | 'ALL')}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v) => (v === 'ALL' ? 'All' : SPECIALIZATION_OPTIONS.find((s) => s.value === v)?.label ?? 'All')}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                {SPECIALIZATION_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Limit
            </Label>
            <Input type="text" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="10" />
          </div>
        </div>

        <div>
          <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Location
          </Label>
          <LocationPicker
            value={location}
            onChange={setLocation}
            defaultCountry="India"
            countryCode="IN"
            onResolutionStateChange={setLocationResolution}
          />
          {location?.coordinates && (
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              Latitude: {location.coordinates[1]} · Longitude: {location.coordinates[0]}
            </p>
          )}
        </div>

        {formError && (
          <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
            {formError}
          </div>
        )}

        <Button onClick={handleSearch} disabled={isFetching || locationResolution === 'loading'} className="mt-4">
          {isFetching ? 'Searching…' : locationResolution === 'loading' ? 'Resolving location…' : 'Find nearest'}
        </Button>
      </div>

      {query && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
        >
          {isLoading && (
            <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
              Searching…
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-center justify-between gap-3 text-[13px] px-4 py-3 bg-danger-soft text-danger">
              <span>Failed to search. Please try again.</span>
              <Button variant="outline" size="sm" onClick={handleRetry} disabled={isFetching} className="shrink-0">
                Retry
              </Button>
            </div>
          )}

          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Name</th>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Specialization</th>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>City</th>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Distance</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((doctor) => (
                    <tr key={doctor.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{doctor.name}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{doctor.specialization.toUpperCase()}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{doctor.location?.city ?? '—'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                        {doctor.distanceMeters == null ? '—' : `${(doctor.distanceMeters / 1000).toFixed(2)} km`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {results.length === 0 && (
                <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                  No doctors found within 35 km of this point.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NearestDoctorsPage
