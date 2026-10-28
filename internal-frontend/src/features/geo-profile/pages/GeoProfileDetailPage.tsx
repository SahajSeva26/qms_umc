import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiLock } from 'react-icons/fi'
import { GEO_PROFILE_ROUTES, GEO_PROFILE_TYPE_OPTIONS, GEO_PROFILE_STATUS_LABEL, GEO_PROFILE_STATUS_OPTIONS } from '@/features/geo-profile/geoProfile.constants'
import { profileToLocationValue, locationValueToCoordinates, locationValueToAddressPayload } from '@/features/geo-profile/utils/geoProfileLocationAdapter'
import { isFieldOfficerRole, isDietitianRole } from '@/features/geo-profile/utils/geoProfile.utils'
import { useGeoProfile } from '@/features/geo-profile/hooks/useGeoProfile'
import { useCreateGeoProfile } from '@/features/geo-profile/hooks/useCreateGeoProfile'
import { useUpdateGeoProfile } from '@/features/geo-profile/hooks/useUpdateGeoProfile'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { usePermission } from '@/hooks/usePermission'
import GeoProfileStatusPill from '@/features/geo-profile/components/GeoProfileStatusPill'
import LocationPicker from '@/components/widgets/location-picker/LocationPicker'
import LocationAddressFields from '@/components/widgets/location-picker/LocationAddressFields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GeoProfileEntity, GeoProfileStatus, GeoProfileType } from '@/types/geoProfile.types'
import type { LocationValue } from '@/types/location.types'
import { REQUIRED_ADDRESS_FIELDS, type LocationResolutionState } from '@/components/widgets/location-picker/location.types'
import type { RoleEntity } from '@/types/accessManagement.types'

interface AddressLikeFields {
  addressLine1?: string | null
  addressLine2?: string | null
  locality?: string | null
  city?: string | null
  state?: string | null
  pincode?: string | null
}

// Accepts both the persisted (`| null`) and LocationPicker (`| undefined`) address shapes.
function formatGeoProfileAddress(profile: AddressLikeFields): string | null {
  const line1 = [profile.addressLine1, profile.addressLine2, profile.locality].filter(Boolean).join(', ')
  const line2 = [profile.city, profile.state, profile.pincode].filter(Boolean).join(', ')
  return [line1, line2].filter(Boolean).join(' — ') || null
}

function locationMissingRequiredAddress(location: LocationValue | null): boolean {
  if (!location?.coordinates) return false
  return REQUIRED_ADDRESS_FIELDS.some((f) => !location[f.key].trim())
}

// `role` is immutable after create (1:1 link). Coordinates are stored [lng, lat] (GeoJSON order).
const GeoProfileDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const isCreateMode = !id
  const navigate = useNavigate()
  const { hasPermission } = usePermission()
  const canManage = hasPermission('geo-profile:manage')

  const { data, isLoading, error } = useGeoProfile(id)
  const geoProfile = data?.data ?? null

  // A 403 here is surfaced as "Restricted" instead of a raw ObjectId.
  const { data: rolesData, error: rolesError } = useRoles({ status: 'active', limit: '500' })
  const roles = rolesData?.data?.items ?? []
  const roleName = (r: string) => roles.find((x) => x.id === r)?.name ?? (rolesError ? 'Restricted' : r)

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate(GEO_PROFILE_ROUTES.GEO_PROFILES)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to field staff coverage
      </button>

      {/* Reads are open to everyone; writes need geo-profile:manage. */}
      {isCreateMode && !canManage && (
        <RestrictedNotice message="You don't have permission to create a geo profile." />
      )}

      {!isCreateMode && isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading geo profile…
        </div>
      )}

      {!isCreateMode && error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load geo profile. Please try again.
        </div>
      )}

      {isCreateMode && canManage && <CreateGeoProfileForm roles={roles} roleName={roleName} />}

      {!isCreateMode && geoProfile && !isLoading && (
        canManage
          ? <EditGeoProfileForm key={geoProfile.id} geoProfile={geoProfile} roleName={roleName} />
          : <ReadOnlyGeoProfileView geoProfile={geoProfile} roleName={roleName} />
      )}
    </div>
  )
}

const RestrictedNotice = ({ message }: { message: string }) => (
  <div
    className="rounded-xl border p-5 flex items-center gap-3"
    style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
  >
    <FiLock size={16} style={{ color: 'var(--qms-text-muted)' }} />
    <span className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>{message}</span>
  </div>
)

interface ReadOnlyGeoProfileViewProps {
  geoProfile: GeoProfileEntity
  roleName: (r: string) => string
}

const ReadOnlyGeoProfileView = ({ geoProfile, roleName }: ReadOnlyGeoProfileViewProps) => {
  const [lng, lat] = geoProfile.coordinates.length === 2 ? geoProfile.coordinates : [undefined, undefined]
  const address = formatGeoProfileAddress(geoProfile)
  return (
    <>
      <div
        className="rounded-xl border p-5 mb-5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate font-mono" style={{ color: 'var(--qms-text)' }}>
              {roleName(geoProfile.role)}
            </div>
            <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              {GEO_PROFILE_TYPE_OPTIONS.find((t) => t.value === geoProfile.type)?.label ?? geoProfile.type}
            </div>
          </div>
          <GeoProfileStatusPill status={geoProfile.status} />
        </div>
      </div>

      <div
        className="rounded-xl border p-5 mb-5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <div className="flex items-center gap-2 mb-4 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          <FiLock size={13} />
          You don't have permission to edit this geo profile.
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-[13px]" style={{ color: 'var(--qms-text)' }}>
          <span style={{ color: 'var(--qms-text-muted)' }}>Latitude</span><span>{lat ?? '—'}</span>
          <span style={{ color: 'var(--qms-text-muted)' }}>Longitude</span><span>{lng ?? '—'}</span>
          <span style={{ color: 'var(--qms-text-muted)' }}>Coverage radius</span><span>{geoProfile.coverageRadius / 1000} km</span>
          <span style={{ color: 'var(--qms-text-muted)' }}>Address</span><span>{address ?? '—'}</span>
        </div>
      </div>
    </>
  )
}

interface RoleNameLookupProps {
  roles: RoleEntity[]
  roleName: (r: string) => string
}

const CreateGeoProfileForm = ({ roles, roleName }: RoleNameLookupProps) => {
  const navigate = useNavigate()
  const createGeoProfile = useCreateGeoProfile()

  const [role, setRole] = useState('')
  const [type, setType] = useState<GeoProfileType | ''>('')
  const [location, setLocation] = useState<LocationValue | null>(null)
  // `location` isn't authoritative until this is 'idle' — the pin can move before onChange fires.
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const [coverageRadiusKm, setCoverageRadiusKm] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const roleMatchesType = type === 'dietitian' ? isDietitianRole : isFieldOfficerRole
  const roleOptions = type ? roles.filter(roleMatchesType) : []

  const handleSave = () => {
    const radiusKm = Number(coverageRadiusKm)

    if (!type) { setFormError('Type is required'); return }
    if (!role) { setFormError('Role is required'); return }
    const selectedRole = roles.find((r) => r.id === role)
    if (!selectedRole || !roleMatchesType(selectedRole)) {
      setFormError(`Selected role is not a ${type === 'dietitian' ? 'Dietitian' : 'Field Officer'} — pick a different role`)
      return
    }
    if (locationResolution === 'loading') { setFormError('Still resolving the picked location — wait a moment and try again'); return }
    if (locationResolution === 'error') { setFormError('Retry or choose "Use this pin" for the location before saving'); return }
    if (!location?.coordinates) { setFormError('Pick a location on the map'); return }

    setFormError(null)
    createGeoProfile.mutate(
      {
        role,
        type,
        coordinates: locationValueToCoordinates(location)!,
        coverageRadius: coverageRadiusKm ? radiusKm * 1000 : undefined,
        ...locationValueToAddressPayload(location),
      },
      {
        onSuccess: (res) => {
          if (res.data?.id) {
            navigate(GEO_PROFILE_ROUTES.GEO_PROFILE_DETAIL.replace(':id', res.data.id))
          }
        },
      },
    )
  }

  return (
    <>
      <div
        className="rounded-xl border p-5 mb-5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <div className="text-lg font-bold" style={{ color: 'var(--qms-text)' }}>
          New geo profile
        </div>
      </div>

      <div
        className="rounded-xl border p-5 mb-5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
          Details
        </h2>

        <div className="space-y-4">
          <div>
            <Label
              htmlFor="type"
              className="text-[10px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--qms-text-muted)' }}
            >
              Type
            </Label>
            <Select
              value={type}
              onValueChange={(v) => {
                const next = v as GeoProfileType
                setType(next)
                setRole('')
              }}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select type">
                  {(v) => GEO_PROFILE_TYPE_OPTIONS.find((t) => t.value === v)?.label ?? 'Select type'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GEO_PROFILE_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label
              htmlFor="role"
              className="text-[10px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--qms-text-muted)' }}
            >
              Role
            </Label>
            <Select value={role} onValueChange={(v) => setRole(v ?? '')} disabled={!type}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder={type ? 'Select role' : 'Select type first'}>
                  {(v) => roleName(v as string)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              {type === 'dietitian'
                ? 'Only dietitian-typed roles are shown here.'
                : type === 'fo'
                  ? 'Only field-officer-typed roles are shown here.'
                  : 'Pick a type to see matching roles.'} A role may back at most one geo profile — this link is immutable after create.
            </p>
          </div>

          <div>
            <Label
              className="text-[10px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--qms-text-muted)' }}
            >
              Location
            </Label>
            <LocationPicker
              value={location}
              onChange={setLocation}
              onResolutionStateChange={setLocationResolution}
              onLocationHintChange={setLocationHint}
              defaultCountry="India"
              countryCode="IN"
            />
            {location?.coordinates && (
              <p className="text-[11px] mt-1.5 mb-3" style={{ color: 'var(--qms-text-muted)' }}>
                Latitude: {location.coordinates[1]} · Longitude: {location.coordinates[0]}
              </p>
            )}
            <LocationAddressFields value={location} onChange={setLocation} defaultCountry="India" locationHint={locationHint} />
          </div>

          <div>
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
            />
          </div>
        </div>

        {createGeoProfile.isError && (
          <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
            {(createGeoProfile.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Failed to save changes.'}
          </div>
        )}

        {formError && (
          <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
            {formError}
          </div>
        )}

        <Button
          onClick={handleSave}
          disabled={createGeoProfile.isPending || locationResolution === 'loading'}
          className="mt-4"
        >
          {createGeoProfile.isPending ? 'Saving…' : locationResolution === 'loading' ? 'Resolving location…' : 'Create geo profile'}
        </Button>
      </div>
    </>
  )
}

interface EditGeoProfileFormProps {
  geoProfile: GeoProfileEntity
  roleName: (r: string) => string
}

const EditGeoProfileForm = ({ geoProfile, roleName }: EditGeoProfileFormProps) => {
  const updateGeoProfile = useUpdateGeoProfile(geoProfile.id)

  const [type, setType] = useState<GeoProfileType>(geoProfile.type)
  const [location, setLocation] = useState<LocationValue | null>(profileToLocationValue(geoProfile))
  // Only send coordinates/address when actually touched, so an untouched load doesn't resend them.
  const [locationDirty, setLocationDirty] = useState(false)
  const [locationResolution, setLocationResolution] = useState<LocationResolutionState>('idle')
  const [locationHint, setLocationHint] = useState<string | null>(null)
  const [coverageRadiusKm, setCoverageRadiusKm] = useState(String(geoProfile.coverageRadius / 1000))
  const [status, setStatus] = useState<GeoProfileStatus>(geoProfile.status)
  const [formError, setFormError] = useState<string | null>(null)
  // Distinct from staleAddressRisk: this fires even when the address still looks complete,
  // since manual entry means no geocoder actually confirmed it against the pin.
  const [manualCoordinateEntry, setManualCoordinateEntry] = useState(false)

  const handleLocationChange = (value: LocationValue) => {
    setLocation(value)
    setLocationDirty(true)
  }

  // A lone field (e.g. just `city`) still counts as prior data that could go stale.
  const hadAddress = REQUIRED_ADDRESS_FIELDS.some((f) => !!geoProfile[f.key])
  // Address is optional server-side, so this only warns, never blocks.
  const staleAddressRisk = hadAddress && locationDirty && locationMissingRequiredAddress(location)

  const handleSave = () => {
    const radiusKm = Number(coverageRadiusKm)

    if (locationResolution === 'loading') { setFormError('Still resolving the picked location — wait a moment and try again'); return }
    if (locationResolution === 'error') { setFormError('Retry or choose "Use this pin" for the location before saving'); return }

    setFormError(null)
    updateGeoProfile.mutate({
      type: type || undefined,
      coordinates: locationDirty ? locationValueToCoordinates(location) : undefined,
      coverageRadius: coverageRadiusKm ? radiusKm * 1000 : undefined,
      status: status || undefined,
      ...(locationDirty ? locationValueToAddressPayload(location) : {}),
    })
  }

  return (
    <>
      <div
        className="rounded-xl border p-5 mb-5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate font-mono" style={{ color: 'var(--qms-text)' }}>
              {roleName(geoProfile.role)}
            </div>
            <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              {GEO_PROFILE_TYPE_OPTIONS.find((t) => t.value === geoProfile.type)?.label ?? geoProfile.type}
            </div>
          </div>
          <GeoProfileStatusPill status={geoProfile.status} />
        </div>
      </div>

      <div
        className="rounded-xl border p-5 mb-5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
          Edit geo profile
        </h2>

        <div className="space-y-4">
          <div>
            <Label
              htmlFor="type"
              className="text-[10px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--qms-text-muted)' }}
            >
              Type
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as GeoProfileType)}>
              <SelectTrigger id="type" className="w-full">
                <SelectValue placeholder="Select type">
                  {(v) => GEO_PROFILE_TYPE_OPTIONS.find((t) => t.value === v)?.label ?? 'Select type'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GEO_PROFILE_TYPE_OPTIONS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label
              className="text-[10px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--qms-text-muted)' }}
            >
              Location
            </Label>
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
          </div>

          <div>
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
            />
          </div>

          <div>
            <Label
              htmlFor="status"
              className="text-[10px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--qms-text-muted)' }}
            >
              Status
            </Label>
            <Select value={status} onValueChange={(v) => setStatus(v as GeoProfileStatus)}>
              <SelectTrigger id="status" className="w-full">
                <SelectValue placeholder="Select status">
                  {(v) => GEO_PROFILE_STATUS_LABEL[v as GeoProfileStatus] ?? 'Select status'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {GEO_PROFILE_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {updateGeoProfile.isError && (
          <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
            {(updateGeoProfile.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
              'Failed to save changes.'}
          </div>
        )}
        {updateGeoProfile.isSuccess && (
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
          disabled={updateGeoProfile.isPending || locationResolution === 'loading'}
          className="mt-4"
        >
          {updateGeoProfile.isPending ? 'Saving…' : locationResolution === 'loading' ? 'Resolving location…' : 'Save changes'}
        </Button>
      </div>
    </>
  )
}

export default GeoProfileDetailPage
