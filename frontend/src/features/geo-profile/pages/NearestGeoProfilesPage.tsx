import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { GEO_PROFILE_ROUTES, GEO_PROFILE_TYPE_OPTIONS } from '@/features/geo-profile/geoProfile.constants'
import { locationValueToCoordinates } from '@/features/geo-profile/utils/geoProfileLocationAdapter'
import { useNearestGeoProfiles } from '@/features/geo-profile/hooks/useNearestGeoProfiles'
import { useRoles, roleKeys } from '@/features/access-management/role/hooks/useRoles'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import GeoProfileStatusPill from '@/features/geo-profile/components/GeoProfileStatusPill'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GeoProfileType, NearestGeoProfileQuery } from '@/types/geoProfile.types'
import type { LocationValue } from '@/types/location.types'
import type { LocationResolutionState } from '@/components/widgets/location-picker/location.types'

// Query only fires once a valid type + lat/lng have been submitted — this is
// a lookup tool, not a live-as-you-type search.
const NearestGeoProfilesPage = () => {
  const navigate = useNavigate()

  const [type, setType] = useState<GeoProfileType>('fo')
  const [location, setLocation] = useState<LocationValue | null>(null)
  const [limit, setLimit] = useState('10')
  const [query, setQuery] = useState<NearestGeoProfileQuery | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  // Same race as GeoProfileDetailPage's Save: a pin can visibly move (or
  // fail to resolve) before `location` itself updates. Searching from a
  // stale `location` here doesn't silently lose data the way a no-op save
  // would, but it does run a real allocation lookup from the wrong point —
  // block "Find nearest" the same way Save is blocked.
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')

  const { data, isLoading, isFetching, error } = useNearestGeoProfiles(query)
  const results = data?.data?.items ?? []

  // Backend flattens `role` to a bare ObjectId string, so we resolve names client-side.
  const { data: rolesData } = useRoles({ status: 'active', limit: '500' })
  const activeRoles = rolesData?.data?.items ?? []

  // An active GeoProfile can point at a Role deactivated afterward; resolve those ids too.
  const activeRoleIds = new Set(activeRoles.map((r) => r.id))
  const missingRoleIds = [...new Set(results.map((p) => p.role))].filter((id) => !activeRoleIds.has(id))
  const missingRoleQueries = useQueries({
    queries: missingRoleIds.map((id) => ({
      queryKey: roleKeys.detail(id),
      queryFn: () => accessManagementService.getRole(id),
    })),
  })

  // useQueries returns a fresh array every render, so `missingRoleQueries`
  // itself is never a stable dep — key the memo on a plain identifier that
  // actually changes only when the underlying data does.
  const missingRoleDataVersion = missingRoleQueries.map((q) => q.dataUpdatedAt).join(',')
  const roleLabelById = useMemo(() => {
    const map = new Map(activeRoles.map((r) => [r.id, r.name]))
    for (const q of missingRoleQueries) {
      const role = q.data?.data
      if (role) map.set(role.id, role.name)
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on missingRoleDataVersion, not missingRoleQueries itself (see comment above)
  }, [activeRoles, missingRoleDataVersion])

  const handleSearch = () => {
    if (locationResolution === 'loading') { setFormError('Still resolving the picked location — wait a moment and try again'); return }
    if (locationResolution === 'error') { setFormError('Retry or choose "Use this pin" for the location before searching'); return }
    const coordinates = locationValueToCoordinates(location)
    if (!coordinates) { setFormError('Pick a location on the map'); return }
    const [lng, lat] = coordinates
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Type
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as GeoProfileType)}>
              <SelectTrigger className="w-full">
                <SelectValue>{(v) => GEO_PROFILE_TYPE_OPTIONS.find((t) => t.value === v)?.label ?? 'Select type'}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GEO_PROFILE_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
                      <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>{roleLabelById.get(profile.role) ?? profile.role}</td>
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
