import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useGeoProfile } from '@/features/geo-profile/hooks/useGeoProfile'
import { useCreateGeoProfile } from '@/features/geo-profile/hooks/useCreateGeoProfile'
import { useUpdateGeoProfile } from '@/features/geo-profile/hooks/useUpdateGeoProfile'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { GEO_PROFILE_ROUTES } from '@/features/geo-profile/geoProfile.routes'
import GeoProfileStatusPill from '@/features/geo-profile/components/GeoProfileStatusPill'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { GeoProfileStatus, GeoProfileType } from '@/types/geoProfile.types'

const TYPE_OPTIONS: { value: GeoProfileType; label: string }[] = [
  { value: 'fo', label: 'Field Officer' },
  { value: 'dietitian', label: 'Dietitian' },
]

// Combined create-flow + edit page, mirrors
// `@/features/access-management/role/pages/RoleDetailPage.tsx`'s overall shape
// (back link, header summary card, editable card, save button wired to a
// mutation with isPending/isError feedback) but far simpler — GeoProfile has
// no embedded user/permission-ceiling logic, just role link + type +
// coordinates + coverage radius + status.
//
// Per geoProfile.validators.ts / geoProfile.service.ts:
// - `role` is required on create, immutable afterward (1:1 link, unique) —
//   the picker is disabled once a profile already exists.
// - `tenant` is never sent by the client — the server derives it from the
//   linked role.
// - coordinates are stored [lng, lat] (GeoJSON order) — the form collects
//   latitude/longitude as two separate human-friendly inputs and assembles
//   the tuple in the right order right before submit.
const GeoProfileDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const isCreateMode = !id
  const navigate = useNavigate()

  const { data, isLoading, error } = useGeoProfile(id)
  const geoProfile = data?.data ?? null

  const { data: rolesData } = useRoles({})
  const roles = rolesData?.data?.items ?? []

  const createGeoProfile = useCreateGeoProfile()
  const updateGeoProfile = useUpdateGeoProfile(id ?? '')

  const [role, setRole] = useState('')
  const [type, setType] = useState<GeoProfileType | ''>('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [coverageRadiusKm, setCoverageRadiusKm] = useState('')
  const [status, setStatus] = useState<GeoProfileStatus | ''>('')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (geoProfile && !isCreateMode) {
      setRole(geoProfile.role)
      setType(geoProfile.type)
      if (geoProfile.coordinates.length === 2) {
        setLongitude(String(geoProfile.coordinates[0]))
        setLatitude(String(geoProfile.coordinates[1]))
      }
      setCoverageRadiusKm(String(geoProfile.coverageRadius / 1000))
      setStatus(geoProfile.status)
    }
  }, [geoProfile, isCreateMode])

  const handleSave = () => {
    const lat = Number(latitude)
    const lng = Number(longitude)
    const radiusKm = Number(coverageRadiusKm)

    if (isCreateMode) {
      if (!role) { setFormError('Role is required'); return }
      if (!type) { setFormError('Type is required'); return }
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) { setFormError('Latitude must be a number between -90 and 90'); return }
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) { setFormError('Longitude must be a number between -180 and 180'); return }

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
      return
    }

    if (latitude && (!Number.isFinite(lat) || lat < -90 || lat > 90)) { setFormError('Latitude must be a number between -90 and 90'); return }
    if (longitude && (!Number.isFinite(lng) || lng < -180 || lng > 180)) { setFormError('Longitude must be a number between -180 and 180'); return }

    setFormError(null)
    updateGeoProfile.mutate({
      type: type || undefined,
      coordinates: latitude && longitude ? [lng, lat] : undefined,
      coverageRadius: coverageRadiusKm ? radiusKm * 1000 : undefined,
      status: status || undefined,
    })
  }

  const mutation = isCreateMode ? createGeoProfile : updateGeoProfile
  const roleName = (r: string) => roles.find((x) => x.id === r)?.name ?? r

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

      {(isCreateMode || (geoProfile && !isLoading)) && (
        <>
          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            {isCreateMode ? (
              <div className="text-lg font-bold" style={{ color: 'var(--qms-text)' }}>
                New geo profile
              </div>
            ) : (
              geoProfile && (
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-lg font-bold truncate font-mono" style={{ color: 'var(--qms-text)' }}>
                      {roleName(geoProfile.role)}
                    </div>
                    <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                      {TYPE_OPTIONS.find((t) => t.value === geoProfile.type)?.label ?? geoProfile.type}
                    </div>
                  </div>
                  <GeoProfileStatusPill status={geoProfile.status} />
                </div>
              )
            )}
          </div>

          <div
            className="rounded-xl border p-5 mb-5"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>
              {isCreateMode ? 'Details' : 'Edit geo profile'}
            </h2>

            <div className="space-y-4">
              {isCreateMode && (
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
              )}

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
                      {(v) => TYPE_OPTIONS.find((t) => t.value === v)?.label ?? 'Select type'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {TYPE_OPTIONS.map((t) => (
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

              {!isCreateMode && (
                <div>
                  <Label
                    htmlFor="status"
                    className="text-[10px] font-semibold tracking-widest uppercase mb-2"
                    style={{ color: 'var(--qms-text-muted)' }}
                  >
                    Status
                  </Label>
                  <Select value={status || undefined} onValueChange={(v) => setStatus(v as GeoProfileStatus)}>
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue placeholder="Select status">
                        {(v) => (v === 'active' ? 'Active' : v === 'inactive' ? 'Inactive' : 'Select status')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {mutation.isError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                  'Failed to save changes.'}
              </div>
            )}
            {mutation.isSuccess && !isCreateMode && (
              <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success mt-4">
                Saved.
              </div>
            )}

            {formError && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
                {formError}
              </div>
            )}

            <Button onClick={handleSave} disabled={mutation.isPending} className="mt-4">
              {mutation.isPending ? 'Saving…' : isCreateMode ? 'Create geo profile' : 'Save changes'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

export default GeoProfileDetailPage
