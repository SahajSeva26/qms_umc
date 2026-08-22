import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiLock } from 'react-icons/fi'
import { GEO_PROFILE_ROUTES, GEO_PROFILE_TYPE_OPTIONS, GEO_PROFILE_STATUS_LABEL, GEO_PROFILE_STATUS_OPTIONS } from '@/features/geo-profile/geoProfile.constants'
import { isValidLatitude, isValidLongitude } from '@/features/geo-profile/utils/geoProfile.utils'
import { useGeoProfile } from '@/features/geo-profile/hooks/useGeoProfile'
import { useCreateGeoProfile } from '@/features/geo-profile/hooks/useCreateGeoProfile'
import { useUpdateGeoProfile } from '@/features/geo-profile/hooks/useUpdateGeoProfile'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { usePermission } from '@/hooks/usePermission'
import GeoProfileStatusPill from '@/features/geo-profile/components/GeoProfileStatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GeoProfileEntity, GeoProfileStatus, GeoProfileType } from '@/features/geo-profile/geoProfile.types'
import type { RoleEntity } from '@/features/access-management/accessManagement.types'

// `role` is required on create and immutable afterward (1:1 link, unique).
// Coordinates are stored [lng, lat] (GeoJSON order); the form collects lat/lng separately and assembles the tuple on submit.
const GeoProfileDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const isCreateMode = !id
  const navigate = useNavigate()
  const { hasPermission } = usePermission()
  const canManage = hasPermission('geo-profile:manage')

  const { data, isLoading, error } = useGeoProfile(id)
  const geoProfile = data?.data ?? null

  // GET /roles requires role:get/search/manage; a caller without it gets a 403 here,
  // surfaced below as "Restricted" instead of a raw ObjectId.
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

      {/* key={geoProfile.id} forces a fresh mount/draft per record so a background refetch never clobbers an in-progress edit. */}
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
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [coverageRadiusKm, setCoverageRadiusKm] = useState('')
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = () => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    const radiusKm = Number(coverageRadiusKm)

    if (!role) { setFormError('Role is required'); return }
    if (!type) { setFormError('Type is required'); return }
    if (latitude.trim() === '' || !isValidLatitude(lat)) { setFormError('Latitude must be a number between -90 and 90'); return }
    if (longitude.trim() === '' || !isValidLongitude(lng)) { setFormError('Longitude must be a number between -180 and 180'); return }

    setFormError(null)
    createGeoProfile.mutate(
      {
        role,
        type,
        coordinates: [lng, lat],
        coverageRadius: coverageRadiusKm ? radiusKm * 1000 : undefined,
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
              htmlFor="role"
              className="text-[10px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--qms-text-muted)' }}
            >
              Role
            </Label>
            <Select value={role || undefined} onValueChange={(v) => setRole(v ?? '')}>
              <SelectTrigger id="role" className="w-full">
                <SelectValue placeholder="Select role">
                  {(v) => roleName(v as string)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
              A role may back at most one geo profile — this link is immutable after create.
            </p>
          </div>

          <div>
            <Label
              htmlFor="type"
              className="text-[10px] font-semibold tracking-widest uppercase mb-2"
              style={{ color: 'var(--qms-text-muted)' }}
            >
              Type
            </Label>
            <Select value={type || undefined} onValueChange={(v) => setType(v as GeoProfileType)}>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="latitude"
                className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                style={{ color: 'var(--qms-text-muted)' }}
              >
                Latitude
              </Label>
              <Input
                id="latitude"
                type="text"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 29.2183"
              />
            </div>
            <div>
              <Label
                htmlFor="longitude"
                className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                style={{ color: 'var(--qms-text-muted)' }}
              >
                Longitude
              </Label>
              <Input
                id="longitude"
                type="text"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 79.5130"
              />
            </div>
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

        <Button onClick={handleSave} disabled={createGeoProfile.isPending} className="mt-4">
          {createGeoProfile.isPending ? 'Saving…' : 'Create geo profile'}
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
  const [latitude, setLatitude] = useState(geoProfile.coordinates.length === 2 ? String(geoProfile.coordinates[1]) : '')
  const [longitude, setLongitude] = useState(geoProfile.coordinates.length === 2 ? String(geoProfile.coordinates[0]) : '')
  const [coverageRadiusKm, setCoverageRadiusKm] = useState(String(geoProfile.coverageRadius / 1000))
  const [status, setStatus] = useState<GeoProfileStatus>(geoProfile.status)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSave = () => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    const radiusKm = Number(coverageRadiusKm)

    if (latitude && (latitude.trim() === '' || !isValidLatitude(lat))) { setFormError('Latitude must be a number between -90 and 90'); return }
    if (longitude && (longitude.trim() === '' || !isValidLongitude(lng))) { setFormError('Longitude must be a number between -180 and 180'); return }

    setFormError(null)
    updateGeoProfile.mutate({
      type: type || undefined,
      coordinates: latitude && longitude ? [lng, lat] : undefined,
      coverageRadius: coverageRadiusKm ? radiusKm * 1000 : undefined,
      status: status || undefined,
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label
                htmlFor="latitude"
                className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                style={{ color: 'var(--qms-text-muted)' }}
              >
                Latitude
              </Label>
              <Input
                id="latitude"
                type="text"
                inputMode="decimal"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="e.g. 29.2183"
              />
            </div>
            <div>
              <Label
                htmlFor="longitude"
                className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                style={{ color: 'var(--qms-text-muted)' }}
              >
                Longitude
              </Label>
              <Input
                id="longitude"
                type="text"
                inputMode="decimal"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="e.g. 79.5130"
              />
            </div>
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

        <Button onClick={handleSave} disabled={updateGeoProfile.isPending} className="mt-4">
          {updateGeoProfile.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </>
  )
}

export default GeoProfileDetailPage
