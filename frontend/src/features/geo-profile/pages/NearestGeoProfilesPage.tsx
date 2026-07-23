import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useNearestGeoProfiles } from '@/features/geo-profile/hooks/useNearestGeoProfiles'
import { GEO_PROFILE_ROUTES } from '@/features/geo-profile/geoProfile.routes'
import GeoProfileStatusPill from '@/features/geo-profile/components/GeoProfileStatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GeoProfileType, NearestGeoProfileQuery } from '@/types/geoProfile.types'

const TYPE_OPTIONS: { value: GeoProfileType; label: string }[] = [
  { value: 'fo', label: 'Field Officer' },
  { value: 'dietitian', label: 'Dietitian' },
]

// Exercises the allocation endpoint (GET /geo-profiles/nearest): given a type
// + point, returns active field staff of that type whose OWN coverage radius
// reaches the point, nearest first, each annotated with `distance` (meters).
// Query only fires once a valid type + lat/lng have been submitted — this is
// a lookup tool, not a live-as-you-type search.
const NearestGeoProfilesPage = () => {
  const navigate = useNavigate()

  const [type, setType] = useState<GeoProfileType>('fo')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [limit, setLimit] = useState('10')
  const [query, setQuery] = useState<NearestGeoProfileQuery | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const { data, isLoading, isFetching, error } = useNearestGeoProfiles(query)
  const results = data?.data?.items ?? []

  const handleSearch = () => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) { setFormError('Latitude must be a number between -90 and 90'); return }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) { setFormError('Longitude must be a number between -180 and 180'); return }
    setFormError(null)
    setQuery({ type, lat, lng, limit: limit || undefined })
  }

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(GEO_PROFILE_ROUTES.GEO_PROFILES)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to field staff coverage
      </button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
          Nearest field staff
        </h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          Find the nearest active Field Officers / Dietitians whose own coverage radius reaches a point — the same
          allocation lookup used for camp assignment.
        </p>
      </div>

      <div
        className="rounded-xl border p-5 mb-5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Type
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as GeoProfileType)}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v) => TYPE_OPTIONS.find((t) => t.value === v)?.label ?? 'Select type'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Latitude
            </Label>
            <Input type="text" inputMode="decimal" value={latitude} onChange={(e) => setLatitude(e.target.value)} placeholder="e.g. 29.2183" />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Longitude
            </Label>
            <Input type="text" inputMode="decimal" value={longitude} onChange={(e) => setLongitude(e.target.value)} placeholder="e.g. 79.5130" />
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Limit
            </Label>
            <Input type="text" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} placeholder="10" />
          </div>
        </div>

        {formError && (
          <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
            {formError}
          </div>
        )}

        <Button onClick={handleSearch} disabled={isFetching} className="mt-4">
          {isFetching ? 'Searching…' : 'Find nearest'}
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
            <div className="text-[13px] px-4 py-3 bg-danger-soft text-danger">
              Failed to search. Please try again.
            </div>
          )}

          {!isLoading && !error && (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Role</th>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Distance</th>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Coverage radius</th>
                    <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((profile) => (
                    <tr key={profile.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
                      <td className="px-4 py-2.5 font-mono font-semibold" style={{ color: 'var(--qms-text)' }}>{profile.role}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                        {profile.distance !== undefined ? `${(profile.distance / 1000).toFixed(2)} km` : '—'}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{(profile.coverageRadius / 1000).toLocaleString()} km</td>
                      <td className="px-4 py-2.5"><GeoProfileStatusPill status={profile.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {results.length === 0 && (
                <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                  No field staff of this type reach this point within their coverage radius.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NearestGeoProfilesPage
