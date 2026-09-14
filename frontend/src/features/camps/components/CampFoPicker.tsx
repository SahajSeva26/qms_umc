import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useNearestGeoProfiles } from '@/features/geo-profile/hooks/useNearestGeoProfiles'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'
import FoAvailabilityPill from '@/features/camps/components/FoAvailabilityPill'
import type { RoleEntity } from '@/types/accessManagement.types'
import type { NearestGeoProfileQuery } from '@/types/geoProfile.types'
import type { CampTimeSlotValue } from '@/types/campTimeSlot.constants'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface CampFoPickerProps {
  value: string
  label: string
  coordinates?: [number, number]
  date?: string
  timeSlot?: CampTimeSlotValue | ''
  onChange: (foRoleId: string, foLabel: string) => void
  disabled?: boolean
}

interface NearFoResult {
  role: RoleEntity
  distanceMeters: number
  /** Whether this FO is free at the queried date + time slot — always true
   * when nearestQuery didn't carry date/timeSlot (shouldn't happen, since
   * this picker always supplies both once isReady, but default-safe). */
  available: boolean
}

const NEAREST_LIMIT = 20

const foLabel = (fo: RoleEntity) => `${fo.name} (${fo.code})`

// Unlike MR (required), an empty selection is valid — but only means
// "auto-assign nearest FO" on create; on edit it just leaves the FO unchanged.
//
// Coverage radius is a HARD filter — a camp in Bihar must never even list a
// Gurugram-based FO, regardless of availability (the same rule auto-allocation,
// GET /geo-profiles/nearest, already enforces). Availability (busy on this
// exact date + time slot) is a SOFT filter by design: an in-range-but-busy FO
// still shows, for context, with an Available/Unavailable pill next to their
// distance — but can't be picked (see AsyncPicker's isResultDisabled). This
// intentionally diverges from CampMrPicker, which stays a plain tenant-scoped
// name search (MR eligibility was never about geography or scheduling).
const CampFoPicker = ({ value, label, coordinates, date, timeSlot, onChange, disabled }: CampFoPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const [lng, lat] = coordinates ?? []
  const hasCoordinates = Number.isFinite(lng) && Number.isFinite(lat)
  const hasDateAndSlot = !!date && !!timeSlot
  // Coverage alone isn't enough to call an FO eligible — they also need to be
  // free on this exact date + slot (the backend's own availability check,
  // now that /geo-profiles/nearest can annotate results with `available`).
  // Require date + timeSlot before this field is even usable, same as it
  // already requires a location — mirrors Company/Project gating Doctor.
  const isReady = hasCoordinates && hasDateAndSlot

  // Gate on `open` too, not just coordinates/date/slot — dragging the map pin
  // or editing address fields must never fire this fetch while the FO
  // dropdown itself isn't even open (see feedback_roletype_scoping_and_call_minimization).
  const nearestQuery: NearestGeoProfileQuery | null = open && isReady
    ? { type: 'fo', lng: lng as number, lat: lat as number, limit: String(NEAREST_LIMIT), date, timeSlot: timeSlot as CampTimeSlotValue }
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
        return role ? { role, distanceMeters: p.distance ?? 0, available: p.available !== false } : null
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

  const searchPlaceholder = !hasCoordinates
    ? 'Pick a location first'
    : !hasDateAndSlot
      ? 'Pick a date and time slot first'
      : 'Search FO by name…'
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
        renderResult={(item) => (
          <>
            <span className="min-w-0 truncate">{foLabel(item.role)} — {(item.distanceMeters / 1000).toFixed(1)} km</span>
            <FoAvailabilityPill available={item.available} />
          </>
        )}
        isResultDisabled={(item) => !item.available}
        isError={!!error}
        errorText="Couldn't search field officers. Try again."
        onRetry={() => { refetchNearest(); roleQueries.forEach((q) => q.refetch()) }}
        hasMore={false}
        disabled={disabled || !isReady}
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
