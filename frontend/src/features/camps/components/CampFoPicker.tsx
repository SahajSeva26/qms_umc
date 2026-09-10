import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useNearestGeoProfiles } from '@/features/geo-profile/hooks/useNearestGeoProfiles'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { NearestGeoProfileQuery } from '@/types/geoProfile.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface CampFoPickerProps {
  value: string
  label: string
  coordinates?: [number, number]
  onChange: (foRoleId: string, foLabel: string) => void
  disabled?: boolean
}

interface NearFoResult {
  role: RoleEntity
  distanceMeters: number
}

const NEAREST_LIMIT = 20

const foLabel = (fo: RoleEntity) => `${fo.name} (${fo.code})`

// Unlike MR (required), an empty selection is valid — but only means
// "auto-assign nearest FO" on create; on edit it just leaves the FO unchanged.
//
// Eligibility here is coverage-radius-based, not name-search: a camp in
// Bihar must never offer a Gurugram-based FO just because their name
// matches — the same rule auto-allocation (GET /geo-profiles/nearest)
// already enforces. This intentionally diverges from CampMrPicker, which
// stays a plain tenant-scoped name search (MR eligibility was never about
// geography).
const CampFoPicker = ({ value, label, coordinates, onChange, disabled }: CampFoPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const [lng, lat] = coordinates ?? []
  const hasCoordinates = Number.isFinite(lng) && Number.isFinite(lat)

  // Gate on `open` too, not just coordinates — dragging the map pin or
  // editing address fields must never fire this fetch while the FO
  // dropdown itself isn't even open (see feedback_roletype_scoping_and_call_minimization).
  const nearestQuery: NearestGeoProfileQuery | null = open && hasCoordinates
    ? { type: 'fo', lng: lng as number, lat: lat as number, limit: String(NEAREST_LIMIT) }
    : null

  const { data: nearestData, isFetching: isFetchingNearest, error: nearestError, refetch: refetchNearest } = useNearestGeoProfiles(nearestQuery)
  const nearestProfiles = nearestData?.data?.items ?? []
  const nearestTruncated = nearestProfiles.length === NEAREST_LIMIT

  const roleQueries = useQueries({
    queries: nearestProfiles.map((p) => ({
      queryKey: roleKeys.detail(p.role),
      queryFn: () => accessManagementService.getRole(p.role),
      enabled: !!nearestQuery,
    })),
  })
  const isFetchingRoles = roleQueries.some((q) => q.isFetching)
  const roleQueryError = roleQueries.find((q) => q.error)?.error
  // useQueries returns a fresh array every render — key the memo on a stable
  // identifier instead of `roleQueries` itself.
  const roleDataVersion = roleQueries.map((q) => q.dataUpdatedAt).join(',')

  const nearFos: NearFoResult[] = useMemo(() => {
    const roleById = new Map<string, RoleEntity>()
    roleQueries.forEach((q) => {
      const role = q.data?.data
      if (role) roleById.set(role.id, role)
    })
    return nearestProfiles
      .map((p) => {
        const role = roleById.get(p.role)
        return role ? { role, distanceMeters: p.distance ?? 0 } : null
      })
      .filter((item): item is NearFoResult => item !== null)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on roleDataVersion, not roleQueries itself (see comment above)
  }, [nearestProfiles, roleDataVersion])

  const trimmedQuery = query.trim().toLowerCase()
  const filteredFos = trimmedQuery
    ? nearFos.filter((item) => item.role.name.toLowerCase().includes(trimmedQuery) || item.role.code.toLowerCase().includes(trimmedQuery))
    : nearFos

  const isFetching = isFetchingNearest || isFetchingRoles
  const error = nearestError || roleQueryError

  const searchPlaceholder = !hasCoordinates ? 'Pick a location first' : 'Search FO by name…'
  const noResultsText = !trimmedQuery
    ? "No field officers' coverage reaches this location."
    : 'No in-range field officers match that name.'

  return (
    <div>
      <AsyncPicker<NearFoResult>
        value={value}
        label={label}
        onChange={onChange}
        query={query}
        onQueryChange={setQuery}
        open={open}
        onOpenChange={setOpen}
        containerRef={containerRef}
        results={filteredFos}
        isFetching={isFetching && filteredFos.length === 0}
        getId={(item) => item.role.id}
        getLabel={(item) => foLabel(item.role)}
        searchPlaceholder={searchPlaceholder}
        clearAriaLabel="Clear selected FO"
        noResultsText={noResultsText}
        renderResult={(item) => <>{foLabel(item.role)} — {(item.distanceMeters / 1000).toFixed(1)} km</>}
        isError={!!error}
        errorText="Couldn't search field officers. Try again."
        onRetry={() => { refetchNearest(); roleQueries.forEach((q) => q.refetch()) }}
        hasMore={false}
        disabled={disabled || !hasCoordinates}
      />
      {nearestTruncated && !error && (
        <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          Showing the {NEAREST_LIMIT} nearest field officers — some in-range FOs may not be listed.
        </p>
      )}
    </div>
  )
}

export default CampFoPicker
