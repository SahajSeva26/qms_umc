import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiDownload, FiPlus } from 'react-icons/fi'
import { useTenant } from '@/features/access-management/tenant/hooks/useTenant'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useRole } from '@/features/access-management/role/hooks/useRole'
import { useProjects } from '@/features/projects'
import { PROJECT_TYPE_LABEL } from '@/types/project.types'
import { useInvoiceReport } from '@/features/billing'
import { useDivisionsShared } from '@/hooks/useDivisionsShared'
import {
  useDivisionsFilters,
  DivisionsFilterBar,
  DivisionsTable,
  CreateDivisionModal,
  DIVISION_ROUTES,
  divisionService,
  downloadDivisionsCsv,
} from '@/features/crm/divisions'
import EditTenantModal from '@/features/access-management/tenant/components/EditTenantModal'
import TenantHeader from '@/features/access-management/tenant/components/TenantHeader'
import { TenantKpiGrid, TenantKpiTile, TenantMiniBreakdown, TenantSectionLabel } from '@/features/access-management/tenant/components/TenantKpiTile'
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

// Mirrors the backend's REPORT_MAX_LIMIT (tenant.service.ts) — widest page report=true allows.
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
  // Matches GET /divisions's own route guard exactly (division:manage/tenant:admin/lead:manage).
  const canViewDivisions = hasAnyPermission(['division:manage', 'tenant:admin', 'lead:manage'])
  // division.service.ts's `tenant` filter is honored only for lead:manage/division:manage — a
  // tenant:admin-only caller's filter is silently dropped server-side, so hide the section instead of showing all tenants.
  const canFilterDivisionsByTenant = hasAnyPermission(['lead:manage', 'division:manage'])
  // division.service.ts's `status` filter is honored only for division:manage/tenant:admin, not tenant:manage.
  const canSeeInactiveDivisions = hasAnyPermission(['division:manage', 'tenant:admin'])
  // POST /divisions requires division:manage only, not lead:manage — gated separately so a lead:manage-only viewer doesn't 403 on click.
  const canCreateDivision = hasPermission('division:manage')

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

  const { data: divisionsData, isLoading: divisionsLoading, error: divisionsError } = useDivisionsShared(
    {
      tenant: tenant?.id,
      name: filters.searchBy === 'name' ? debouncedSearch || undefined : undefined,
      code: filters.searchBy === 'code' ? debouncedCode || undefined : undefined,
      therapy: filters.therapy === 'ALL' ? undefined : filters.therapy,
      status: filters.status,
      limit: '10',
      report: 'true',
    },
    canViewDivisions && canFilterDivisionsByTenant && !!tenant?.id,
  )
  const divisions = divisionsData?.data?.items ?? []
  const totalDivisions = divisionsData?.data?.count ?? 0

  // Separate count-only fetch (limit:'1') so this is independent of the filtered/paginated table above.
  const { data: activeDivisionsData } = useDivisionsShared(
    { tenant: tenant?.id, status: 'active', limit: '1' },
    canSeeInactiveDivisions && canFilterDivisionsByTenant && !!tenant?.id,
  )
  const { data: inactiveDivisionsData } = useDivisionsShared(
    { tenant: tenant?.id, status: 'inactive', limit: '1' },
    canSeeInactiveDivisions && canFilterDivisionsByTenant && !!tenant?.id,
  )
  const activeDivisionCount = activeDivisionsData?.data?.count
  const inactiveDivisionCount = inactiveDivisionsData?.data?.count
  const divisionPenetrationPct =
    activeDivisionCount !== undefined && inactiveDivisionCount !== undefined && (activeDivisionCount + inactiveDivisionCount) > 0
      ? Math.round((activeDivisionCount / (activeDivisionCount + inactiveDivisionCount)) * 100)
      : null

  // Tenant search has no id filter, so this is scoped via `code` — but the backend's code filter is
  // an unanchored regex, so items[0] isn't safe; exact-matched client-side below instead.
  const canSearchTenantKpis = hasAnyPermission(['tenant:search', 'tenant:manage'])
  const { data: tenantReportData, isLoading: tenantKpisLoading, isError: tenantKpisErrored, refetch: refetchTenantKpis } = useTenants(
    { code: tenant?.code, report: 'true', limit: String(REPORT_MAX_LIMIT) },
    canSearchTenantKpis && !!tenant?.code,
  )
  const tenantStats = tenantReportData?.data?.items.find((t) => t.code === tenant?.code)?.stats
  const totalProjectCount = tenantStats?.totalProjects
  const totalMrCount = tenantStats?.mrs
  const totalBilled = tenantStats?.billed
  // Keeps loading/error/no-exact-match distinct from "Coming soon" (unbuilt), since this is a live fetch that can fail.
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

  // Separate from tenantKpiTileValue above — a different query (useInvoiceReport, id-filtered, no code-regex ambiguity).
  const outstandingTileValue = (): ReactNode => {
    if (!canViewInvoiceReport) {
      return <span style={{ color: 'var(--qms-text-muted)' }} className="italic text-[14px] font-bold">Restricted</span>
    }
    if (outstandingLoading) {
      return <span style={{ color: 'var(--qms-text-muted)' }} className="italic text-[14px] font-bold">Loading…</span>
    }
    if (outstandingError) {
      return (
        <button
          onClick={() => void refetchOutstanding()}
          className="italic text-[14px] font-bold underline decoration-dotted text-danger"
        >
          Unable to load — retry
        </button>
      )
    }
    return formatINR(totalOutstanding ?? 0)
  }

  // `tenant` search filter is honored only for project:manage (see project.service.ts) — matches
  // ProjectsPage's own PROJECT_CLIENT_FILTER_PERMISSIONS gate for the same filter.
  const canFilterProjectsByTenant = hasPermission('project:manage')
  const { data: projectReportData, isLoading: projectTypesLoading, isError: projectTypesErrored } = useProjects(
    { tenant: tenant?.id, report: 'true', limit: '1' },
    canFilterProjectsByTenant && !!tenant?.id,
  )
  const projectTypeBreakdown = (projectReportData?.data?.report?.byType ?? []).filter((entry) => entry.count > 0)

  // Gated to match GET /invoices/report's own AuthorizeMiddleware, independent of the frontend's /billing/crm route guard.
  const canViewInvoiceReport = hasAnyPermission(['invoice:search', 'invoice:manage', 'tenant:manage'])
  const { report: invoiceReport, isLoading: outstandingLoading, error: outstandingError, refetch: refetchOutstanding } = useInvoiceReport(
    { tenant: tenant?.id },
    canViewInvoiceReport && !!tenant?.id,
  )
  const totalOutstanding = invoiceReport
    ? invoiceReport.statusCounts
        .filter((s) => s.status !== 'paid' && s.status !== 'cancelled')
        .reduce((sum, s) => sum + s.total, 0)
    : undefined

  const [exportingDivisions, setExportingDivisions] = useState(false)
  // Exports both statuses explicitly — an unfiltered search defaults to active-only (division.service.ts).
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

          <TenantSectionLabel>Client KPIs</TenantSectionLabel>
          <TenantKpiGrid className="mb-5">
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
            <TenantKpiTile label="Outstanding" sub="Non-paid, non-cancelled invoices" value={outstandingTileValue()} />
            <TenantMiniBreakdown
              label="Project Types"
              rows={
                !canFilterProjectsByTenant
                  ? [{ name: 'Screening / Diet / Lab / Mixed', value: <span className="italic">Restricted</span> }]
                  : projectTypesLoading
                    ? [{ name: 'Screening / Diet / Lab / Mixed', value: <span className="italic">Loading…</span> }]
                    : projectTypesErrored
                      ? [{ name: 'Screening / Diet / Lab / Mixed', value: <span className="italic">Unable to load</span> }]
                      : projectTypeBreakdown.length === 0
                        ? [{ name: 'Screening / Diet / Lab / Mixed', value: <span className="italic">No projects yet</span> }]
                        : projectTypeBreakdown.map((entry) => ({ name: PROJECT_TYPE_LABEL[entry.type] ?? entry.type, value: entry.count }))
              }
            />
          </TenantKpiGrid>

          {canViewDivisions && !canFilterDivisionsByTenant && (
            <div className="px-4 py-6 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
              Divisions can't be scoped to this specific company with your current permissions
              (needs division:manage or lead:manage) — hidden rather than showing an incorrectly
              wide list.
            </div>
          )}

          {canViewDivisions && canFilterDivisionsByTenant && (
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
                  {canCreateDivision && (
                    <Button
                      onClick={() => setCreateDivisionOpen(true)}
                      className="text-white"
                      style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
                    >
                      <FiPlus size={14} /> New Division
                    </Button>
                  )}
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

          {createDivisionOpen && canCreateDivision && (
            <CreateDivisionModal onClose={() => setCreateDivisionOpen(false)} defaultTenantId={tenant.id} />
          )}
        </>
      )}
    </div>
  )
}

export default TenantDetailPage
