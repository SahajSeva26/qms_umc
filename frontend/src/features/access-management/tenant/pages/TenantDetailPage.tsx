import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiDownload, FiPlus } from 'react-icons/fi'
import { useTenant } from '@/features/access-management/tenant/hooks/useTenant'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRole } from '@/features/access-management/role/hooks/useRole'
import { useDivisions } from '@/features/crm/divisions/hooks/useDivisions'
import { useDivisionsFilters } from '@/features/crm/divisions/hooks/useDivisionsFilters'
import DivisionsFilterBar from '@/features/crm/divisions/components/DivisionsFilterBar'
import DivisionsTable from '@/features/crm/divisions/components/DivisionsTable'
import CreateDivisionModal from '@/features/crm/divisions/components/CreateDivisionModal'
import EditTenantModal from '@/features/access-management/tenant/components/EditTenantModal'
import TenantHeader from '@/features/access-management/tenant/components/TenantHeader'
import { TenantKpiGrid, TenantKpiTile, TenantMiniBreakdown, TenantSectionLabel } from '@/features/access-management/tenant/components/TenantKpiTile'
import { DIVISION_ROUTES } from '@/features/crm/divisions/divisions.routes'
import { divisionService } from '@/features/crm/divisions/division.service'
import { downloadDivisionsCsv } from '@/features/crm/divisions/division.export'
import { warnIfExportTruncated } from '@/utils/csvExport'
import { usePermission } from '@/hooks/usePermission'
import { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
import { Button } from '@/components/ui/button'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'
import { formatINR } from '@/utils/formatters'
import type { DivisionEntity } from '@/types/crm.types'
import type { RolePopulatedUser, Tenant } from '@/types/accessManagement.types'

// Mirrors the backend's own REPORT_MAX_LIMIT (tenant.service.ts) — the largest page report=true
// will serve in one call, used here to fetch as wide a result set as possible before matching the
// exact code client-side (see the Projects KPI comment below for why an exact match is needed).
const REPORT_MAX_LIMIT = 20

function formatTenantAddress(address: Tenant['address']): string | null {
  if (!address) return null
  const line1 = [address.addressLine1, address.addressLine2, address.locality].filter(Boolean).join(', ')
  const line2 = [address.city, address.state, address.pincode].filter(Boolean).join(', ')
  return [line1, line2].filter(Boolean).join(' — ') || null
}

const TenantDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useTenant(id)
  const tenant = data?.data ?? null

  const { hasPermission, hasAnyPermission } = usePermission()
  const canManageTenant = hasPermission('tenant:manage')
  const canManageSystem = hasPermission('system:manage')
  const canViewRole = hasAnyPermission(['role:get', 'role:search', 'role:manage'])
  const canViewDivisions = hasAnyPermission(['division:manage', 'tenant:admin', 'lead:manage'])
  const canSeeInactiveDivisions = hasAnyPermission(['division:manage', 'tenant:manage'])

  const { data: ownerRoleData } = useRole(tenant?.owner)
  const ownerRole = ownerRoleData?.data ?? null
  const ownerUser = ownerRole && typeof ownerRole.user !== 'string' ? (ownerRole.user as RolePopulatedUser) : null
  const ownerName = ownerUser?.firstName ? `${ownerUser.firstName} ${ownerUser.lastName ?? ''}`.trim() : null
  const ownerEmailSuffix = ownerName && ownerUser?.email ? ownerUser.email : null
  const tenantAddress = tenant ? formatTenantAddress(tenant.address) : null

  const [editOpen, setEditOpen] = useState(false)
  const [createDivisionOpen, setCreateDivisionOpen] = useState(false)

  const { filters, setFilter, reset } = useDivisionsFilters()
  const debouncedSearch = useDebouncedValue(filters.search, 300)
  const debouncedCode = useDebouncedValue(filters.code, 300)

  const { data: divisionsData, isLoading: divisionsLoading, error: divisionsError } = useDivisions(
    {
      tenant: tenant?.id,
      name: filters.searchBy === 'name' ? debouncedSearch || undefined : undefined,
      code: filters.searchBy === 'code' ? debouncedCode || undefined : undefined,
      therapy: filters.therapy === 'ALL' ? undefined : filters.therapy,
      status: filters.status,
      limit: '10',
    },
    canViewDivisions && !!tenant?.id,
  )
  const divisions = divisionsData?.data?.items ?? []
  const totalDivisions = divisionsData?.data?.count ?? 0

  // Independent of the filtered/paginated list above (whose own `count` shifts with
  // whatever status filter the table's own dropdown is set to) — count-only, `limit:
  // '1'`, so this never fetches the actual rows twice. Only division:manage/tenant:admin
  // can even see the inactive count at all, so the metric is gated the same way.
  const { data: activeDivisionsData } = useDivisions(
    { tenant: tenant?.id, status: 'active', limit: '1' },
    canSeeInactiveDivisions && !!tenant?.id,
  )
  const { data: inactiveDivisionsData } = useDivisions(
    { tenant: tenant?.id, status: 'inactive', limit: '1' },
    canSeeInactiveDivisions && !!tenant?.id,
  )
  const activeDivisionCount = activeDivisionsData?.data?.count
  const inactiveDivisionCount = inactiveDivisionsData?.data?.count
  const divisionPenetrationPct =
    activeDivisionCount !== undefined && inactiveDivisionCount !== undefined && (activeDivisionCount + inactiveDivisionCount) > 0
      ? Math.round((activeDivisionCount / (activeDivisionCount + inactiveDivisionCount)) * 100)
      : null

  // Projects/MRs/Billing — reuse the same report=true per-tenant aggregation the list page uses
  // (search.ts getTenantStats, now includes `mrs` and `billed` alongside project/camp counts).
  // Tenant search has no id/tenant filter, so this is scoped via `code` instead — BUT the backend's
  // code filter is an UNANCHORED regex ($regex, no ^$), so e.g. code "acme" also matches
  // "acme-pharma". Picking items[0] blindly can silently show a DIFFERENT tenant's stats. Mitigated
  // here by matching the exact code client-side within the (report-capped, max 20) result page —
  // genuinely safe only when the real match is within that page; a tenant whose code collides with
  // 20+ others sorted newer would still be missed. The correct fix is a backend exact-match contract
  // (an `id`/`tenant` filter on GET /tenants, or an anchored code match) — not done here, logged in
  // md-files/ui-revisions.md. Also requires tenant:search/tenant:manage (see the canSearchTenantKpis
  // gate below) even though this page itself only needs tenant:get to load.
  const canSearchTenantKpis = hasAnyPermission(['tenant:search', 'tenant:manage'])
  const { data: tenantReportData, isLoading: tenantKpisLoading, isError: tenantKpisErrored, refetch: refetchTenantKpis } = useTenants(
    { code: tenant?.code, report: 'true', limit: String(REPORT_MAX_LIMIT) },
    canSearchTenantKpis && !!tenant?.code,
  )
  const tenantStats = tenantReportData?.data?.items.find((t) => t.code === tenant?.code)?.stats
  const totalProjectCount = tenantStats?.totalProjects
  const totalMrCount = tenantStats?.mrs
  const totalBilled = tenantStats?.billed
  // Distinguishes "genuinely not built yet" (Outstanding/Project Types) from this fetch's own
  // loading/error/no-exact-match states — a failed or in-flight report=true request must not
  // silently read as "Coming soon" (that phrase should mean unbuilt functionality, not a fetch
  // problem). "No exact match" is the documented unanchored-code-regex limitation (see the comment
  // above) — still surfaced honestly rather than folded into a generic error.
  const tenantKpiTileValue = (value: number | undefined, format: (v: number) => ReactNode = (v) => v) => {
    if (!canSearchTenantKpis) {
      return <span style={{ color: 'var(--qms-text-muted)' }} className="italic text-[14px] font-bold">Restricted</span>
    }
    if (tenantKpisLoading) {
      return <span style={{ color: 'var(--qms-text-muted)' }} className="italic text-[14px] font-bold">Loading…</span>
    }
    if (tenantKpisErrored) {
      return (
        <button
          onClick={() => void refetchTenantKpis()}
          className="italic text-[14px] font-bold underline decoration-dotted text-danger"
        >
          Unable to load — retry
        </button>
      )
    }
    if (value === undefined) {
      return <span style={{ color: 'var(--qms-text-muted)' }} className="italic text-[14px] font-bold">No exact match</span>
    }
    return format(value)
  }

  const [exportingDivisions, setExportingDivisions] = useState(false)
  // Exports the whole tenant's division set — both statuses, not just whatever
  // the on-screen filter happens to show, and not just the current
  // filtered/paginated page (the table itself caps at limit:'10' with no page
  // control). The backend defaults an unfiltered search to active-only
  // (division.service.ts), so "the whole set" needs an explicit fetch per
  // status; canSeeInactiveDivisions gates whether the inactive half is even
  // visible to this caller (matches the same gate already used for the
  // Divisions table's own status filter/penetration metric on this page).
  const handleExportDivisions = async () => {
    if (!tenant) return
    setExportingDivisions(true)
    try {
      const statuses = canSeeInactiveDivisions ? (['active', 'inactive'] as const) : (['active'] as const)
      const results = await Promise.all(
        statuses.map((status) => divisionService.searchDivisions({ tenant: tenant.id, status, limit: '1000' })),
      )
      const divisions = results.flatMap((res) => res.data.items)
      const realTotal = results.reduce((sum, res) => sum + res.data.count, 0)
      warnIfExportTruncated(divisions.length, realTotal)
      downloadDivisionsCsv(divisions, `${tenant.code}-divisions-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to export divisions.'))
    } finally {
      setExportingDivisions(false)
    }
  }

  return (
    <div className="w-full">
      <button
        onClick={() => navigate(TENANT_ROUTES.TENANTS)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to Client Management
      </button>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading company…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load company. Please try again.
        </div>
      )}

      {tenant && !isLoading && (
        <>
          <TenantHeader
            tenant={tenant}
            canManageTenant={canManageTenant}
            canViewRole={canViewRole}
            ownerName={ownerName}
            ownerUser={ownerUser}
            ownerEmailSuffix={ownerEmailSuffix}
            tenantAddress={tenantAddress}
            divisionPenetrationPct={divisionPenetrationPct}
            onEditClick={() => setEditOpen(true)}
          />

          {/* Prototype's "Client KPIs" strip — Active Divisions/Projects/Total MRs/Billing are real;
              Outstanding/Project Types need backend work logged in md-files/ui-revisions.md. */}
          <TenantSectionLabel>Client KPIs</TenantSectionLabel>
          <TenantKpiGrid>
            <TenantKpiTile
              label="Active Divisions"
              value={canSeeInactiveDivisions && activeDivisionCount !== undefined ? activeDivisionCount : totalDivisions}
            />
            <TenantKpiTile label="Projects" value={tenantKpiTileValue(totalProjectCount)} />
            <TenantKpiTile label="Total MRs" value={tenantKpiTileValue(totalMrCount)} />
            <TenantKpiTile
              label="Billing"
              sub="Excludes draft/cancelled"
              value={tenantKpiTileValue(totalBilled, formatINR)}
            />
            <TenantKpiTile label="Outstanding" value={<span style={{ color: '#8b5cf6' }} className="italic text-[14px] font-bold">Coming soon</span>} />
            <TenantMiniBreakdown
              label="Project Types"
              rows={[{ name: 'Screening / Diet / Lab / Mixed', value: <span className="italic">Coming soon</span> }]}
            />
          </TenantKpiGrid>

          {canViewDivisions && (
            <div>
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-1 h-3.5 rounded-sm shrink-0" style={{ background: '#8b5cf6' }} />
                    <h2 className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>Divisions</h2>
                  </div>
                  <p className="text-[12px] mt-0.5 ml-3" style={{ color: 'var(--qms-text-muted)' }}>
                    {!divisionsLoading && !divisionsError ? `${totalDivisions} total` : 'Divisions under this company.'}
                    {divisionPenetrationPct !== null && (
                      <span> · Penetration: <span className="font-semibold" style={{ color: 'var(--qms-text-soft)' }}>{divisionPenetrationPct}%</span></span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportDivisions}
                    disabled={exportingDivisions || totalDivisions === 0}
                  >
                    <FiDownload size={14} /> {exportingDivisions ? 'Exporting…' : 'Export'}
                  </Button>
                  <Button
                    onClick={() => setCreateDivisionOpen(true)}
                    className="text-white"
                    style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
                  >
                    <FiPlus size={14} /> New Division
                  </Button>
                </div>
              </div>

              <DivisionsFilterBar filters={filters} setFilter={setFilter} reset={reset} canSeeInactive={canSeeInactiveDivisions} />

              {divisionsLoading && (
                <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                  Loading divisions…
                </div>
              )}

              {divisionsError && !divisionsLoading && (
                <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                  Failed to load divisions. Please try again.
                </div>
              )}

              {!divisionsLoading && !divisionsError && (
                <DivisionsTable
                  divisions={divisions}
                  onRowClick={(division: DivisionEntity) => navigate(DIVISION_ROUTES.DIVISION_DETAIL.replace(':id', division.id))}
                />
              )}
            </div>
          )}

          {editOpen && (
            <EditTenantModal
              tenant={tenant}
              canManageTenant={canManageTenant}
              canManageSystem={canManageSystem}
              onClose={() => setEditOpen(false)}
            />
          )}

          {createDivisionOpen && (
            <CreateDivisionModal onClose={() => setCreateDivisionOpen(false)} defaultTenantId={tenant.id} />
          )}
        </>
      )}
    </div>
  )
}

export default TenantDetailPage
