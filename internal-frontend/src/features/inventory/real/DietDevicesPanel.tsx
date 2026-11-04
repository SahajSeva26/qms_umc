import { lazy, Suspense, useState } from 'react'
import { FiCpu, FiPlus, FiUsers } from 'react-icons/fi'
import { useRole } from '@/features/access-management'
import { useGeoProfiles } from '@/features/geo-profile'
import { useInventoryAssignments } from '@/features/inventory/real/hooks/useInventoryAssignments'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import PaginationControls from '@/components/ui/PaginationControls'
import { usePagination } from '@/hooks/usePagination'
import { usePermission } from '@/hooks/usePermission'
import type { GeoProfileEntity } from '@/types/geoProfile.types'
import type { FieldStaffRole } from '@/hooks/useFieldStaffRoster'

const DirectAssignmentModal = lazy(() => import('@/features/inventory/real/components/DirectAssignmentModal'))

const PAGE_SIZE = 10
const ROLE_READ_PERMISSIONS = ['role:get', 'tenant:manage', 'tenant:admin']

interface DietitianDeviceRowProps {
  profile: GeoProfileEntity
  canResolveRole: boolean
  canManage: boolean
  onManage: (fieldStaff: FieldStaffRole) => void
}

const DietitianDeviceRow = ({ profile, canResolveRole, canManage, onManage }: DietitianDeviceRowProps) => {
  const roleQuery = useRole(canResolveRole ? profile.role : undefined)
  const assignmentsQuery = useInventoryAssignments({
    assignee: profile.role,
    inventoryType: 'InventoryDevice',
    page: '1',
    limit: '10',
  })
  const role = roleQuery.data?.data
  const user = role?.user && typeof role.user === 'object' ? role.user : null
  const name = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : role?.name || 'Dietitian profile'
  const location = [profile.city, profile.state].filter(Boolean).join(', ') || 'Location not recorded'
  const assignments = assignmentsQuery.data?.data?.items ?? []

  return (
    <div className="grid min-h-14 grid-cols-1 border-b last:border-b-0 sm:grid-cols-[220px_1fr]" style={{ borderColor: 'var(--qms-border)' }}>
      <div className="px-3 py-2.5 sm:border-r" style={{ borderColor: 'var(--qms-border)' }}>
        <div className="truncate text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>{name}</div>
        <div className="truncate text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{location}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
        {assignmentsQuery.isLoading ? (
          <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Loading assigned devices…</span>
        ) : assignmentsQuery.error ? (
          <button type="button" onClick={() => assignmentsQuery.refetch()} className="text-[11px] font-semibold" style={{ color: 'var(--qms-danger)' }}>
            Device assignments failed · Retry
          </button>
        ) : assignments.length > 0 ? (
          assignments.map((assignment) => (
            <span
              key={assignment.id}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold"
              style={{ background: 'rgba(16,185,129,.12)', color: '#059669' }}
              title={assignment.inventory.serialNumber ?? assignment.inventory.id}
            >
              <FiCpu size={11} /> {assignment.inventory.serialNumber ?? 'Assigned device'}
            </span>
          ))
        ) : (
          <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>No devices handed over.</span>
        )}
        {canManage && (
          <button
            type="button"
            onClick={() => onManage({ role: profile.role, name, code: role?.code ?? profile.role, kind: 'dietitian' })}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold"
            style={{ borderColor: 'color-mix(in srgb, var(--qms-brand) 35%, var(--qms-border))', color: 'var(--qms-brand)' }}
          >
            <FiPlus size={11} /> Manage
          </button>
        )}
      </div>
    </div>
  )
}

const DietDevicesPanel = () => {
  const { hasAnyPermission } = usePermission()
  const canResolveRole = hasAnyPermission(ROLE_READ_PERMISSIONS)
  const canManage = hasAnyPermission(['inventory-assignment:manage'])
  const { page, setPage, totalPages } = usePagination(PAGE_SIZE)
  const [managedStaff, setManagedStaff] = useState<FieldStaffRole | null>(null)
  const profilesQuery = useGeoProfiles({ type: 'dietitian', status: 'active', page: String(page), limit: String(PAGE_SIZE) })
  const profiles = profilesQuery.data?.data?.items ?? []
  const count = profilesQuery.data?.data?.count ?? 0

  return (
    <QueryStateBlock
      isLoading={profilesQuery.isLoading}
      error={profilesQuery.error}
      loadingLabel="Loading dietitian device matrix…"
      errorLabel="Failed to load dietitian device assignments."
      onRetry={profilesQuery.refetch}
    >
      <section className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="flex items-center gap-2 border-b px-3 py-3" style={{ borderColor: 'var(--qms-border)' }}>
          <span className="grid size-7 place-items-center rounded-lg text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiUsers size={13} />
          </span>
          <div>
            <h2 className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Dietitian × device matrix</h2>
            <p className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{count} active dietitian coverage profiles</p>
          </div>
        </div>
        {profiles.map((profile) => (
          <DietitianDeviceRow
            key={profile.id}
            profile={profile}
            canResolveRole={canResolveRole}
            canManage={canManage}
            onManage={setManagedStaff}
          />
        ))}
        {profiles.length === 0 && (
          <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
            No active dietitian profiles found.
          </div>
        )}
      </section>
      <PaginationControls page={page} totalPages={totalPages(count)} onPageChange={setPage} />
      {managedStaff && (
        <Suspense fallback={<div role="status" className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Opening assignment editor…</div>}>
          <DirectAssignmentModal fieldStaff={[managedStaff]} onClose={() => setManagedStaff(null)} />
        </Suspense>
      )}
    </QueryStateBlock>
  )
}

export default DietDevicesPanel
