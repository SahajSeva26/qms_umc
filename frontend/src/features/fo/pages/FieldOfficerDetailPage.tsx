import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiLock } from 'react-icons/fi'
import { useRole } from '@/features/access-management/role/hooks/useRole'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { useCreateGeoProfile } from '@/features/geo-profile/hooks/useCreateGeoProfile'
import { useUpdateGeoProfile } from '@/features/geo-profile/hooks/useUpdateGeoProfile'
import { profileToLocationValue, locationValueToCoordinates, locationValueToAddressPayload } from '@/features/geo-profile/utils/geoProfileLocationAdapter'
import { isFieldOfficerRole } from '@/features/geo-profile/utils/geoProfile.utils'
import { usePermission } from '@/hooks/usePermission'
import { FO_ROUTES } from '@/features/fo/fo.routes'
import RoleStatusPill from '@/features/access-management/role/components/RoleStatusPill'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { REQUIRED_ADDRESS_FIELDS, type LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import type { RoleEntity, RolePopulatedUser } from '@/types/accessManagement.types'
import type { LocationValue } from '@/types/location.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'

function userField<K extends keyof RolePopulatedUser>(user: RoleEntity['user'], key: K): RolePopulatedUser[K] | undefined {
  if (user === null || typeof user === 'string') return undefined
  return user[key]
}

function fullName(user: RoleEntity['user']): string {
  const first = userField(user, 'firstName')
  if (!first) return '—'
  return `${first} ${userField(user, 'lastName') ?? ''}`.trim()
}

function locationMissingRequiredAddress(location: LocationValue | null): boolean {
  if (!location?.coordinates) return false
  return REQUIRED_ADDRESS_FIELDS.some((f) => !location[f.key].trim())
}

// field-officer Roles live only under the platform tenant — same rule
// FieldOfficersPage.tsx enforces, since the route's own permission gate
// (tenant:manage/tenant:admin) alone would also admit a customer-tenant admin
// holding the same codes. Kept as a lightweight outer gate (no data hooks of
// its own) so a customer-tenant admin who navigates here directly is
// redirected before FieldOfficerDetailContent's role/GeoProfile queries ever
// fire, not after.
const FieldOfficerDetailPage = () => {
  const { session } = usePermission()

  if (session && session.tenant.type !== 'platform') {
    return <Navigate to="/unauthorized" replace />
  }

  return <FieldOfficerDetailContent />
}

// Card 1 of what will eventually be several: all-info + the location picker,
// kept together since a location edit needs no permission beyond viewing the
// FO today. Later, permission-gated additions (e.g. camp history, device
// assignments) belong in their own sibling card(s), each independently
// gate-able — not folded into this one.
const FieldOfficerDetailContent = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasPermission } = usePermission()
  const canManageLocation = hasPermission('geo-profile:manage')

  const { data: roleData, isLoading: roleLoading, error: roleError, refetch: refetchRole } = useRole(id)
  const fo = roleData?.data ?? null

  // The route only guarantees a platform-tenant session, not that the
  // requested Role id is actually a field-officer — a platform admin can
  // still open any Role id directly (e.g. a sales-rep's). The backend's
  // GeoProfile create path doesn't validate this either (confirmed: it
  // checks the Role exists and the 1:1 uniqueness, never that the linked
  // Role's RoleType matches the profile's own `type`), so this frontend
  // check is the only thing stopping a mismatched GeoProfile from being
  // created via this page. Logged as a backend gap in md-files/TODO.md
  // (gitignored, local-only — not visible in this diff).
  //
  // isFieldOfficer is deliberately three-valued (not a plain boolean) so the
  // GeoProfile query below can be gated on "confirmed FO", not "not yet known
  // to be non-FO" — while `fo` is still loading, isNotFieldOfficer alone would
  // read false and let the query fire for a role that turns out to be a
  // sales-rep once useRole resolves.
  const isFieldOfficer = fo ? isFieldOfficerRole(fo) : null
  const isNotFieldOfficer = isFieldOfficer === false

  const {
    data: geoData,
    isLoading: geoLoading,
    error: geoError,
    refetch: refetchGeo,
  } = useGeoProfiles({ role: id ?? '' }, !!id && isFieldOfficer === true)
  const geoProfile = geoData?.data?.items?.[0] ?? null

  const isLoading = roleLoading || (geoLoading && isFieldOfficer === true)
  const error = roleError

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(FO_ROUTES.FIELD_OFFICERS)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to FO Management
      </button>

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading field officer…"
        errorLabel="Failed to load this field officer. Please try again."
        onRetry={refetchRole}
      >
        {isNotFieldOfficer && (
          <div
            className="rounded-xl border p-5 flex items-center gap-3"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <FiLock size={16} style={{ color: 'var(--qms-text-muted)' }} />
            <span className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              This role is not a field officer.
            </span>
          </div>
        )}

        {fo && !isNotFieldOfficer && (
          <FieldOfficerInfoCard
            fo={fo}
            geoProfile={geoProfile}
            geoError={geoError}
            onRetryGeo={refetchGeo}
            canManageLocation={canManageLocation}
          />
        )}
      </QueryStateBlock>
    </div>
  )
}

interface FieldOfficerInfoCardProps {
  fo: RoleEntity
  geoProfile: GeoProfileEntity | null
  geoError: unknown
  onRetryGeo: () => void
  canManageLocation: boolean
}

const FieldOfficerInfoCard = ({ fo, geoProfile, geoError, onRetryGeo, canManageLocation }: FieldOfficerInfoCardProps) => {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="min-w-0">
          <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
            {fullName(fo.user)}
          </div>
          <div className="text-[12px] font-mono" style={{ color: 'var(--qms-text-muted)' }}>
            {fo.code}
          </div>
        </div>
        <RoleStatusPill status={fo.status} />
      </div>

      <div className="grid grid-cols-2 gap-y-2 text-[13px] mb-6">
        <span style={{ color: 'var(--qms-text-muted)' }}>Email</span>
        <span style={{ color: 'var(--qms-text)' }}>{userField(fo.user, 'email') || '—'}</span>
        <span style={{ color: 'var(--qms-text-muted)' }}>Phone</span>
        <span style={{ color: 'var(--qms-text)' }}>{userField(fo.user, 'phone') || '—'}</span>
        <span style={{ color: 'var(--qms-text-muted)' }}>Role</span>
        <span style={{ color: 'var(--qms-text)' }}>{typeof fo.type === 'object' && fo.type ? fo.type.name : '—'}</span>
        <span style={{ color: 'var(--qms-text-muted)' }}>Tenant</span>
        <span style={{ color: 'var(--qms-text)' }}>{typeof fo.tenant === 'object' && fo.tenant ? fo.tenant.name : '—'}</span>
      </div>

      <div className="pt-5" style={{ borderTop: '1px solid var(--qms-border)' }}>
        <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--qms-text)' }}>
          Location
        </h2>
        <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
          {geoProfile ? 'Coverage area and last known coordinates for this field officer.' : 'No location has been set for this field officer yet.'}
        </p>

        {!!geoError && (
          <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 mb-3 bg-danger-soft border border-danger text-danger">
            <span>Couldn't load location data.</span>
            <Button variant="outline" size="sm" onClick={onRetryGeo} className="shrink-0">
              Retry
            </Button>
          </div>
        )}

        {!geoError && canManageLocation && (
          <LocationForm roleId={fo.id} geoProfile={geoProfile} />
        )}

        {!geoError && !canManageLocation && (
          <ReadOnlyLocation geoProfile={geoProfile} />
        )}
      </div>
    </div>
  )
}

const ReadOnlyLocation = ({ geoProfile }: { geoProfile: GeoProfileEntity | null }) => {
  if (!geoProfile) {
    return (
      <div className="flex items-center gap-2 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
        <FiLock size={13} />
        No location on record.
      </div>
    )
  }
  const [lng, lat] = geoProfile.coordinates.length === 2 ? geoProfile.coordinates : [undefined, undefined]
  return (
    <div className="grid grid-cols-2 gap-y-2 text-[13px]">
      <span style={{ color: 'var(--qms-text-muted)' }}>Latitude</span><span style={{ color: 'var(--qms-text)' }}>{lat ?? '—'}</span>
      <span style={{ color: 'var(--qms-text-muted)' }}>Longitude</span><span style={{ color: 'var(--qms-text)' }}>{lng ?? '—'}</span>
      <span style={{ color: 'var(--qms-text-muted)' }}>Coverage radius</span><span style={{ color: 'var(--qms-text)' }}>{(geoProfile.coverageRadius / 1000).toString()} km</span>
    </div>
  )
}

interface LocationFormProps {
  roleId: string
  geoProfile: GeoProfileEntity | null
}

// Handles both cases a Role can be in — an existing 1:1 GeoProfile to edit,
// or none yet (create-on-save) — since the link is optional, not guaranteed
// to exist just because the Role does.
const LocationForm = ({ roleId, geoProfile }: LocationFormProps) => {
  const isCreateMode = !geoProfile
  const createGeoProfile = useCreateGeoProfile()
  const updateGeoProfile = useUpdateGeoProfile(geoProfile?.id ?? '')

  const [location, setLocation] = useState<LocationValue | null>(geoProfile ? profileToLocationValue(geoProfile) : null)
  const [locationDirty, setLocationDirty] = useState(false)
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const [coverageRadiusKm, setCoverageRadiusKm] = useState(geoProfile ? String(geoProfile.coverageRadius / 1000) : '')
  const [manualCoordinateEntry, setManualCoordinateEntry] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleLocationChange = (value: LocationValue) => {
    setLocation(value)
    setLocationDirty(true)
  }

  const hadAddress = !!geoProfile && REQUIRED_ADDRESS_FIELDS.some((f) => !!geoProfile[f.key])
  const staleAddressRisk = hadAddress && locationDirty && locationMissingRequiredAddress(location)

  const mutation = isCreateMode ? createGeoProfile : updateGeoProfile

  const handleSave = () => {
    const radiusKm = Number(coverageRadiusKm)

    if (locationResolution === 'loading') { setFormError('Still resolving the picked location — wait a moment and try again'); return }
    if (locationResolution === 'error') { setFormError('Retry or choose "Use this pin" for the location before saving'); return }
    if (isCreateMode && !location?.coordinates) { setFormError('Pick a location on the map'); return }

    setFormError(null)

    if (isCreateMode) {
      createGeoProfile.mutate({
        role: roleId,
        type: 'fo',
        coordinates: locationValueToCoordinates(location)!,
        coverageRadius: coverageRadiusKm ? radiusKm * 1000 : undefined,
        ...locationValueToAddressPayload(location),
      })
    } else {
      updateGeoProfile.mutate({
        coordinates: locationDirty ? locationValueToCoordinates(location) : undefined,
        coverageRadius: coverageRadiusKm ? radiusKm * 1000 : undefined,
        ...(locationDirty ? locationValueToAddressPayload(location) : {}),
      })
    }
  }

  return (
    <div>
      <LocationPicker
        value={location}
        onChange={handleLocationChange}
        onResolutionStateChange={setLocationResolution}
        onManualCoordinateEntry={() => setManualCoordinateEntry(true)}
        onLocationHintChange={setLocationHint}
        defaultCountry="India"
        countryCode="IN"
      />
      {location?.coordinates && (
        <p className="text-[11px] mt-1.5 mb-3" style={{ color: 'var(--qms-text-muted)' }}>
          Latitude: {location.coordinates[1]} · Longitude: {location.coordinates[0]}
        </p>
      )}
      <LocationAddressFields value={location} onChange={handleLocationChange} defaultCountry="India" locationHint={locationHint} />
      {staleAddressRisk && (
        <p className="text-[12px] rounded-lg px-3 py-2 mt-2 border border-warning bg-warning-soft text-warning">
          Saving now will keep this profile's old address paired with the new pin — complete the address above if that's not intended.
        </p>
      )}
      {!staleAddressRisk && manualCoordinateEntry && (
        <p className="text-[12px] rounded-lg px-3 py-2 mt-2 border border-warning bg-warning-soft text-warning">
          Coordinates were entered manually — review the address above, it wasn't confirmed against the new pin.
        </p>
      )}

      <div className="mt-4">
        <Label
          htmlFor="coverageRadius"
          className="text-[10px] font-semibold tracking-widest uppercase mb-2"
          style={{ color: 'var(--qms-text-muted)' }}
        >
          Coverage radius (km)
        </Label>
        <Input
          id="coverageRadius"
          type="text"
          inputMode="decimal"
          value={coverageRadiusKm}
          onChange={(e) => setCoverageRadiusKm(e.target.value)}
          placeholder="Default 35 km"
          className="max-w-xs"
        />
      </div>

      {mutation.isError && (
        <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
          {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Failed to save changes.'}
        </div>
      )}
      {mutation.isSuccess && (
        <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success mt-4">
          Saved.
        </div>
      )}
      {formError && (
        <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
          {formError}
        </div>
      )}

      <Button
        onClick={handleSave}
        disabled={mutation.isPending || locationResolution === 'loading'}
        className="mt-4"
      >
        {mutation.isPending ? 'Saving…' : locationResolution === 'loading' ? 'Resolving location…' : isCreateMode ? 'Save location' : 'Save changes'}
      </Button>
    </div>
  )
}

export default FieldOfficerDetailPage
