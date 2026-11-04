import { useState } from 'react'
import { FiActivity, FiCpu, FiEdit2, FiMap, FiMapPin, FiMessageCircle, FiNavigation, FiUser, FiUsers } from 'react-icons/fi'
import { useRole } from '@/features/access-management'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import GeoProfileStatusPill from '@/features/geo-profile/components/GeoProfileStatusPill'
import SideDrawer from '@/components/ui/SideDrawer'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import type { RoleEntity } from '@/types/accessManagement.types'

const PAGE_SIZE = 10
const ROLE_READ_PERMISSIONS = ['role:get', 'tenant:manage', 'tenant:admin']

function roleDisplayName(role: RoleEntity | null | undefined): string | null {
  if (!role) return null
  if (role.user && typeof role.user === 'object') {
    return [role.user.firstName, role.user.lastName].filter(Boolean).join(' ')
  }
  return role.name || null
}

function formatAddress(profile: GeoProfileEntity) {
  return [profile.addressLine1, profile.addressLine2, profile.locality, profile.city, profile.state, profile.pincode]
    .filter(Boolean)
    .join(', ') || 'No registered coverage address'
}

interface DietitianProfileCardProps {
  profile: GeoProfileEntity
  canResolveRole: boolean
  onOpen: () => void
}

const DietitianProfileCard = ({ profile, canResolveRole, onOpen }: DietitianProfileCardProps) => {
  const roleQuery = useRole(canResolveRole ? profile.role : undefined)
  const role = roleQuery.data?.data
  const name = roleDisplayName(role) ?? 'Dietitian profile'

  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-xl border p-3.5 text-left transition-colors hover:bg-(--qms-surface-hover)"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl text-white"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiUser size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{name}</div>
          <div className="mt-0.5 flex items-start gap-1 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            <FiMapPin className="mt-0.5 shrink-0" size={11} />
            <span className="line-clamp-2">{formatAddress(profile)}</span>
          </div>
        </div>
        <GeoProfileStatusPill status={profile.status} />
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-2.5" style={{ borderColor: 'var(--qms-border)' }}>
        <div>
          <div className="text-[12px] font-extrabold" style={{ color: 'var(--qms-text)' }}>
            {(profile.coverageRadius / 1000).toLocaleString()} km
          </div>
          <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Coverage radius</div>
        </div>
        <div>
          <div className="truncate text-[12px] font-extrabold" style={{ color: 'var(--qms-text)' }}>
            {role && role.user && typeof role.user === 'object' ? role.user.phone || '—' : '—'}
          </div>
          <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Phone</div>
        </div>
      </div>
    </button>
  )
}

interface DietitianProfileDrawerProps {
  profile: GeoProfileEntity | null
  canResolveRole: boolean
  canManage: boolean
  onClose: () => void
}

const DietitianProfileDrawer = ({ profile, canResolveRole, canManage, onClose }: DietitianProfileDrawerProps) => {
  const roleQuery = useRole(profile && canResolveRole ? profile.role : undefined)
  const assignmentsQuery = useInventoryAssignments({
    assignee: profile?.role ?? '',
    inventoryType: 'InventoryDevice',
    page: '1',
    limit: '10',
  }, !!profile)
  const campsQuery = useCampsReal({
    type: 'diet',
    dietitian: profile?.role,
    page: '1',
    limit: '10',
    report: 'true',
  }, !!profile)
  if (!profile) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const role = roleQuery.data?.data
  const name = roleDisplayName(role) ?? 'Dietitian profile'
  const user = role?.user && typeof role.user === 'object' ? role.user : null
  const coordinates = profile.coordinates.length === 2
    ? `${profile.coordinates[1]}, ${profile.coordinates[0]}`
    : 'Not recorded'
  const mapsHref = profile.coordinates.length === 2
    ? `https://www.google.com/maps/search/?api=1&query=${profile.coordinates[1]},${profile.coordinates[0]}`
    : null
  const assignments = assignmentsQuery.data?.data?.items ?? []
  const camps = campsQuery.data?.data?.items ?? []
  const campCount = campsQuery.data?.data?.count ?? 0

  return (
    <SideDrawer open title={name} onClose={onClose} widthClassName="max-w-xl">
      <div className="mb-5 flex items-start gap-3.5">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-2xl text-white"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiUser size={23} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[17px] font-bold" style={{ color: 'var(--qms-text)' }}>{name}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            Dietitian · {(profile.coverageRadius / 1000).toLocaleString()} km coverage
          </div>
          <div className="mt-2"><GeoProfileStatusPill status={profile.status} /></div>
        </div>
      </div>

      <section className="mb-4">
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>
          <FiMapPin /> Coverage and location
        </h3>
        <div className="rounded-xl border p-4 text-[13px]" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="font-semibold" style={{ color: 'var(--qms-text)' }}>{formatAddress(profile)}</div>
          <div className="mt-2 grid grid-cols-2 gap-3" style={{ color: 'var(--qms-text-muted)' }}>
            <span>Radius: {(profile.coverageRadius / 1000).toLocaleString()} km</span>
            <span>Coordinates: {coordinates}</span>
          </div>
          {mapsHref && (
            <a href={mapsHref} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[12px] font-semibold" style={{ color: 'var(--qms-brand)' }}>
              <FiMap size={13} /> Open in Google Maps
            </a>
          )}
        </div>
      </section>

      <section>
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>
          <FiUsers /> Contact
        </h3>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          {roleQuery.isLoading ? (
            <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Loading contact details…</p>
          ) : user ? (
            <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-2 text-[13px]">
              <dt style={{ color: 'var(--qms-text-muted)' }}>Email</dt><dd style={{ color: 'var(--qms-text)' }}>{user.email}</dd>
              <dt style={{ color: 'var(--qms-text-muted)' }}>Phone</dt><dd style={{ color: 'var(--qms-text)' }}>{user.phone || '—'}</dd>
              <dt style={{ color: 'var(--qms-text-muted)' }}>Role code</dt><dd style={{ color: 'var(--qms-text)' }}>{role?.code}</dd>
            </dl>
          ) : (
            <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              {canResolveRole ? 'Contact details could not be loaded.' : 'Contact details require role-read access.'}
            </p>
          )}
        </div>
      </section>

      <section className="mt-4">
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>
          <FiCpu /> Machines assigned ({assignmentsQuery.data?.data?.count ?? 0})
        </h3>
        <div className="rounded-xl border p-4" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          {assignmentsQuery.isLoading ? (
            <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading assigned devices…</p>
          ) : assignmentsQuery.error ? (
            <button type="button" onClick={() => assignmentsQuery.refetch()} className="text-[12px] font-semibold" style={{ color: 'var(--qms-danger)' }}>Failed to load devices · Retry</button>
          ) : assignments.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {assignments.map((assignment) => (
                <span key={assignment.id} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold" style={{ background: 'rgba(16,185,129,.12)', color: '#059669' }}>
                  <FiCpu size={11} /> {assignment.inventory.serialNumber ?? 'Assigned device'}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No devices handed over.</p>
          )}
        </div>
      </section>

      <section className="mt-4">
        <h3 className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>
          <FiActivity /> Camp history ({campCount})
        </h3>
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          {campsQuery.isLoading ? (
            <p className="p-4 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading camp history…</p>
          ) : campsQuery.error ? (
            <button type="button" onClick={() => campsQuery.refetch()} className="m-4 text-[12px] font-semibold" style={{ color: 'var(--qms-danger)' }}>Failed to load camp history · Retry</button>
          ) : camps.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[11px]">
                <thead><tr className="border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                  <th className="px-3 py-2 text-left">Camp</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">City</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Patients</th>
                </tr></thead>
                <tbody>{camps.map((camp) => (
                  <tr key={camp.id} className="border-b last:border-b-0" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>
                    <td className="px-3 py-2 font-semibold">{camp.code}</td><td className="px-3 py-2">{camp.date?.slice(0, 10) ?? '—'}</td><td className="px-3 py-2">{camp.location?.city ?? '—'}</td><td className="px-3 py-2 capitalize">{camp.status.replaceAll('_', ' ')}</td><td className="px-3 py-2 text-right">{camp.stats?.patientsCompleted ?? 0}/{camp.patientExpectation}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No camps yet.</p>
          )}
        </div>
      </section>

      <div className="mt-5 flex flex-wrap gap-2">
        {canManage && (
          <a href={`/geo-profiles/${profile.id}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12px] font-semibold text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiEdit2 size={13} /> Edit profile
          </a>
        )}
        {user?.phone && (
          <a href={`https://wa.me/${user.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>
            <FiMessageCircle size={13} /> WhatsApp
          </a>
        )}
        <button type="button" onClick={onClose} className="ml-auto h-9 rounded-lg border px-3 text-[12px] font-semibold" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>Close</button>
      </div>
    </SideDrawer>
  )
}

const DietitianRosterPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canResolveRole = hasAnyPermission(ROLE_READ_PERMISSIONS)
  const canManage = hasAnyPermission(['geo-profile:manage'])
  const { page, setPage, totalPages } = usePagination(PAGE_SIZE)
  const [selectedProfile, setSelectedProfile] = useState<GeoProfileEntity | null>(null)
  const query = useGeoProfiles({ type: 'dietitian', status: 'active', page: String(page), limit: String(PAGE_SIZE) })
  const profiles = query.data?.data?.items ?? []
  const count = query.data?.data?.count ?? 0

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Dietitian coverage roster</h2>
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
            {!query.isLoading && !query.error ? `${count} active coverage profiles` : 'Coverage, location and contact details.'}
          </p>
        </div>
        <span className="grid size-9 place-items-center rounded-xl" style={{ background: 'rgba(20,184,166,.12)', color: 'var(--qms-teal)' }}>
          <FiNavigation size={16} />
        </span>
      </div>

      <QueryStateBlock
        isLoading={query.isLoading}
        error={query.error}
        loadingLabel="Loading dietitians…"
        errorLabel="Failed to load dietitian coverage profiles."
        onRetry={query.refetch}
      >
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {profiles.map((profile) => (
            <DietitianProfileCard
              key={profile.id}
              profile={profile}
              canResolveRole={canResolveRole}
              onOpen={() => setSelectedProfile(profile)}
            />
          ))}
        </div>
        {profiles.length === 0 && (
          <div className="rounded-xl border px-4 py-10 text-center text-[13px]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
            No active dietitian coverage profiles found.
          </div>
        )}
        <PaginationControls page={page} totalPages={totalPages(count)} onPageChange={setPage} />
      </QueryStateBlock>

      <DietitianProfileDrawer profile={selectedProfile} canResolveRole={canResolveRole} canManage={canManage} onClose={() => setSelectedProfile(null)} />
    </div>
  )
}

export default DietitianRosterPanel
