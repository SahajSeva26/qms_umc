import { useMemo } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { usePermission } from '@/hooks/usePermission'
import { usePagination } from '@/hooks/usePagination'
import { useFilterState } from '@/hooks/useFilterState'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { FO_ROUTES } from '@/features/fo/fo.routes'
import CreateFoModal from '@/features/fo/components/CreateFoModal'
import { Button } from '@/components/ui/button'
import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import RoleStatusPill from '@/features/access-management/role/components/RoleStatusPill'
import { EMPTY_ARRAY } from '@/utils/emptyArray'
import type { RoleEntity, RolePopulatedUser, RoleStatus } from '@/types/accessManagement.types'
import type { GeoProfileEntity } from '@/types/geoProfile.types'

const PAGE_SIZE = 10

interface FieldOfficersFilterState {
  search: string
  status: RoleStatus | 'ALL'
}

const STATUS_OPTIONS: { value: RoleStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]
const STATUS_LABEL_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))

function userName(user: RoleEntity['user']): string {
  if (typeof user === 'string') return '—'
  const u = user as RolePopulatedUser
  if (!u?.firstName) return '—'
  return `${u.firstName} ${u.lastName ?? ''}`.trim()
}

function userEmail(user: RoleEntity['user']): string {
  if (typeof user === 'string') return '—'
  return (user as RolePopulatedUser)?.email || '—'
}

function userPhone(user: RoleEntity['user']): string {
  if (typeof user === 'string') return '—'
  return (user as RolePopulatedUser)?.phone || '—'
}

function locationLabel(geoProfile: GeoProfileEntity | undefined, isGeoLoading: boolean): string {
  if (isGeoLoading) return 'Loading…'
  const parts = [geoProfile?.city, geoProfile?.state].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}

// field-officer (RoleType + every real Role) lives only under the platform
// tenant — same access rule FoPage.tsx enforces, since the route's own
// permission gate (tenant:manage/tenant:admin) alone would also admit a
// customer-tenant admin holding the same codes. Kept as a lightweight outer
// gate (no data hooks of its own) so a customer-tenant admin who navigates
// here directly is redirected before FieldOfficersContent's role-type/role/
// GeoProfile queries ever fire, not after.
const FieldOfficersPage = () => {
  const { session } = usePermission()

  if (session && session.tenant.type !== 'platform') {
    return <Navigate to="/unauthorized" replace />
  }

  return <FieldOfficersContent />
}

const FieldOfficersContent = () => {
  const navigate = useNavigate()
  const { session, hasAnyPermission } = usePermission()
  // Belt-and-suspenders UI symmetry, not closing a real gap — anyone who can
  // already see this page (passed the route's FO_VIEW_PERMISSIONS gate)
  // already holds one of these two codes, same as RolesListPage's canCreateRole.
  const canCreateFo = hasAnyPermission(['tenant:admin', 'tenant:manage'])
  // Not guaranteed present the instant this renders — session can still be
  // loading independently of the outer platform-tenant gate. Treated the
  // same as foTypeId below: may start undefined, resolves later.
  const tenantId = session?.tenant.id
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const { filters, setFilter, reset } = useFilterState<FieldOfficersFilterState>({ search: '', status: 'ALL' })
  const debouncedSearch = useDebouncedValue(filters.search, 300)

  const {
    data: foTypeData,
    isLoading: typeLoading,
    error: typeError,
    refetch: refetchType,
  } = useRoleTypes({ code: 'field-officer', status: 'active' })
  const foTypeId = foTypeData?.data?.items[0]?.id

  const {
    data: roleData,
    isLoading: rolesLoading,
    error: rolesError,
    refetch: refetchRoles,
  } = useRoles(
    {
      type: foTypeId,
      status: filters.status === 'ALL' ? undefined : filters.status,
      user: debouncedSearch || undefined,
      page: String(page),
      limit: String(PAGE_SIZE),
    },
    !!foTypeId,
  )

  const fos = roleData?.data?.items ?? []
  const totalCount = roleData?.data?.count ?? 0

  // Kept out of the roster's own isLoading/error below — a GeoProfile outage
  // shouldn't blank out the whole (already-loaded) roster table, just the
  // Location column, with its own small retry.
  const {
    data: geoData,
    isLoading: geoLoading,
    error: geoError,
    refetch: refetchGeo,
  } = useGeoProfiles({ type: 'fo', limit: '200' })
  const geoItems = geoData?.data?.items ?? EMPTY_ARRAY
  const geoByRole = useMemo(() => new Map(geoItems.map((g) => [g.role, g])), [geoItems])

  const isLoading = typeLoading || rolesLoading
  const error = typeError || rolesError

  const handleFilterChange = <K extends keyof FieldOfficersFilterState>(key: K, value: FieldOfficersFilterState[K]) => {
    setFilter(key, value)
    resetToFirstPage()
  }

  const handleReset = () => {
    reset()
    resetToFirstPage()
  }

  return (
    <div className="w-full">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            FO Management
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Field officers across your organization.'}
          </p>
        </div>
        {canCreateFo && (
          tenantId && foTypeId ? (
            <CreateFoModal tenantId={tenantId} foTypeId={foTypeId} />
          ) : (
            <Button disabled className="shrink-0">
              <FiPlus size={14} /> Add FO
            </Button>
          )
        )}
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-2 p-2.5 mb-3 rounded-xl border"
        style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      >
        <SearchInput
          value={filters.search}
          onChange={(v) => handleFilterChange('search', v)}
          placeholder="Search by name or email..."
          className="w-56 text-[12px]"
        />

        <div className="flex flex-wrap items-center gap-2">
          <Select value={filters.status} onValueChange={(v) => handleFilterChange('status', (v ?? 'ALL') as FieldOfficersFilterState['status'])}>
            <SelectTrigger className="text-[12px]">
              <SelectValue>{(v: string) => (v === 'ALL' ? 'Status' : (STATUS_LABEL_BY_VALUE.get(v as RoleStatus) ?? 'Status'))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              {STATUS_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleReset}>
            Reset
          </Button>
        </div>
      </div>

      {geoError && (
        <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 mb-3 bg-danger-soft border border-danger text-danger">
          <span>Couldn't load field officer locations — the table below still shows everything else.</span>
          <Button variant="outline" size="sm" onClick={() => refetchGeo()} className="shrink-0">
            Retry
          </Button>
        </div>
      )}

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading field officers…"
        errorLabel="Failed to load field officers. Please try again."
        onRetry={() => { refetchType(); refetchRoles() }}
      >
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                    Name
                  </th>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                    Email
                  </th>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                    Phone
                  </th>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                    Status
                  </th>
                  <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                    Location
                  </th>
                </tr>
              </thead>
              <tbody>
                {fos.map((fo) => (
                  <tr
                    key={fo.id}
                    onClick={() => navigate(FO_ROUTES.FIELD_OFFICER_DETAIL.replace(':id', fo.id))}
                    className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ borderBottom: '1px solid var(--qms-border)' }}
                  >
                    <td className="px-4 py-2.5">
                      <Link
                        to={FO_ROUTES.FIELD_OFFICER_DETAIL.replace(':id', fo.id)}
                        className="block outline-none rounded focus-visible:ring-3 focus-visible:ring-ring/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-semibold truncate hover:underline" style={{ color: 'var(--qms-text)' }}>
                          {userName(fo.user)}
                        </div>
                        <div className="text-[11px] truncate font-mono" style={{ color: 'var(--qms-text-muted)' }}>
                          {fo.code}
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                      {userEmail(fo.user)}
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                      {userPhone(fo.user)}
                    </td>
                    <td className="px-4 py-2.5">
                      <RoleStatusPill status={fo.status} />
                    </td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                      {locationLabel(geoByRole.get(fo.id), geoLoading)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {fos.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No field officers found.
            </div>
          )}
        </div>

        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>
    </div>
  )
}

export default FieldOfficersPage
