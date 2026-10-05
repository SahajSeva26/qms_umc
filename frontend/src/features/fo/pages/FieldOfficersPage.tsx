import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { FiPlus, FiUsers, FiCalendar, FiActivity, FiClock, FiShield, FiCpu, FiFileText, FiZap, FiCheckSquare } from 'react-icons/fi'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'
import { useGeoProfiles } from '@/features/geo-profile/hooks/useGeoProfiles'
import { usePermission } from '@/hooks/usePermission'
import { usePagination } from '@/hooks/usePagination'
import { useFilterState } from '@/hooks/useFilterState'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useFoRosterCamps } from '@/features/fo/hooks/useFoRosterCamps'
import { useFoRosterDevices } from '@/features/fo/hooks/useFoRosterDevices'
import { useFoTodayCamps, useFoActiveCount } from '@/features/fo/hooks/useFoTodayCamps'
import CreateFoModal from '@/features/fo/components/CreateFoModal'
import FoRosterCard from '@/features/fo/components/FoRosterCard'
import FoDevicesTable from '@/features/fo/components/FoDevicesTable'
import FoAssignmentsWeekGrid from '@/features/fo/components/FoAssignmentsWeekGrid'
import FoRealDrawer from '@/features/fo/components/FoRealDrawer'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@/components/ui/button'
import SearchInput from '@/components/ui/SearchInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { EMPTY_ARRAY } from '@/utils/emptyArray'
import type { RoleStatus } from '@/types/accessManagement.types'

const PAGE_SIZE = 10

type FoTab = 'roster' | 'assignments' | 'devices'

interface FieldOfficersFilterState {
  search: string
  status: RoleStatus | 'ALL'
}

const STATUS_OPTIONS: { value: RoleStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]
const STATUS_LABEL_BY_VALUE = new Map(STATUS_OPTIONS.map((s) => [s.value, s.label]))

// field-officer lives only under the platform tenant — this outer gate
// redirects before FieldOfficersContent's queries ever fire.
const FieldOfficersPage = () => {
  const { session } = usePermission()

  if (session && session.tenant.type !== 'platform') {
    return <Navigate to="/unauthorized" replace />
  }

  return <FieldOfficersContent />
}

const FieldOfficersContent = () => {
  const { session, hasAnyPermission } = usePermission()
  const canCreateFo = hasAnyPermission(['tenant:admin', 'tenant:manage'])
  const tenantId = session?.tenant.id
  const [tab, setTab] = useState<FoTab>('roster')
  const [openRoleId, setOpenRoleId] = useState<string | null>(null)
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

  const fos = roleData?.data?.items ?? EMPTY_ARRAY
  const totalCount = roleData?.data?.count ?? 0
  const roleIds = useMemo(() => fos.map((f) => f.id), [fos])

  const {
    data: geoData,
    error: geoError,
    refetch: refetchGeo,
  } = useGeoProfiles({ type: 'fo', limit: '200' })
  const geoItems = geoData?.data?.items ?? EMPTY_ARRAY
  const geoByRole = useMemo(() => new Map(geoItems.map((g) => [g.role, g])), [geoItems])

  const campSummaries = useFoRosterCamps(roleIds)
  const devicesByRole = useFoRosterDevices(roleIds)

  const todayCamps = useFoTodayCamps()
  const activeCount = useFoActiveCount(todayCamps.camps)

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

  // Only surfaces what's real (unassigned camps today); loading/error/known-
  // good are kept as distinct messages, and a truncated result says so.
  const aiText = todayCamps.isLoading
    ? "Checking today's camps…"
    : todayCamps.error
      ? "Couldn't check today's camps — try again."
      : todayCamps.unassignedCamps.length > 0
        ? `${todayCamps.unassignedCamps.length} camp(s) unassigned for today`
        : todayCamps.truncated
          ? 'All loaded camps have an FO assigned (more camps exist than shown).'
          : 'All camps today have an FO assigned.'

  return (
    <div className="w-full">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · FO Management</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>FO Operations</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {[
              { label: 'Roster · live', live: true },
              { label: 'Beat plan + serviceability', icon: FiCalendar },
              { label: 'Device handover', icon: FiCpu },
              { label: 'TA / DA claims', icon: FiFileText },
            ].map((chip) => (
              <span key={chip.label} className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                {chip.live ? <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--success)' }} /> : chip.icon && <chip.icon size={11} />}
                {chip.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {canCreateFo && tenantId && foTypeId && <CreateFoModal tenantId={tenantId} foTypeId={foTypeId} />}
          {canCreateFo && !(tenantId && foTypeId) && (
            <Button disabled className="shrink-0"><FiPlus size={14} /> Add FO</Button>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-4" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--qms-brand) 12%, transparent), color-mix(in oklab, var(--qms-teal) 12%, transparent))' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiZap size={15} color="#fff" />
          </div>
          <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>
            <span className="font-bold">FO copilot: </span>{aiText}
          </div>
        </div>
        <Button variant="outline" size="sm" disabled title="Not wired to anything real yet">
          Optimize
        </Button>
      </div>

      {todayCamps.error && (
        <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 mb-3 bg-danger-soft border border-danger text-danger">
          <span>Couldn't load today's camp data — the KPI tiles below may be inaccurate.</span>
          <Button variant="outline" size="sm" onClick={() => todayCamps.refetch()} className="shrink-0">Retry</Button>
        </div>
      )}

      {activeCount.error && (
        <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 mb-3 bg-danger-soft border border-danger text-danger">
          <span>Couldn't load the field officer roster count — Active FOs/Idle today may be inaccurate.</span>
          <Button variant="outline" size="sm" onClick={() => activeCount.refetch()} className="shrink-0">Retry</Button>
        </div>
      )}

      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
        <KpiTile
          label="Active FOs"
          value={activeCount.isLoading ? '…' : activeCount.error ? '—' : String(activeCount.totalActive)}
          sub={activeCount.error ? 'Failed to load — see banner below' : activeCount.roleTruncated ? 'More exist than shown' : undefined}
          tone={activeCount.error ? 'rose' : 'brand'}
          icon={FiUsers}
        />
        <KpiTile
          label="Today's camps"
          value={todayCamps.isLoading ? '…' : todayCamps.error ? '—' : String(todayCamps.totalCount)}
          sub={todayCamps.error ? 'Failed to load — see banner below' : `${todayCamps.liveCamps.length} live now`}
          tone={todayCamps.error ? 'rose' : 'teal'}
          icon={FiCalendar}
        />
        <KpiTile
          label="Unassigned"
          value={todayCamps.isLoading ? '…' : todayCamps.error ? '—' : String(todayCamps.unassignedCamps.length)}
          // Derived over a capped (200-row) camp list — can undercount past that.
          sub={todayCamps.error
            ? 'Failed to load — see banner below'
            : todayCamps.truncated ? 'May undercount — more data than shown' : 'Need an FO today'}
          tone="rose"
          icon={FiActivity}
        />
        <KpiTile
          label="Idle today"
          value={activeCount.isLoading || todayCamps.isLoading ? '…' : activeCount.error || todayCamps.error ? '—' : String(activeCount.idleCount)}
          // Cross-references two possibly-truncated lists — either cap can undercount.
          sub={activeCount.error || todayCamps.error
            ? 'Failed to load — see banner below'
            : activeCount.roleTruncated || todayCamps.truncated
              ? 'May undercount — more data than shown'
              : 'No camp today'}
          tone={activeCount.error || todayCamps.error ? 'rose' : 'brand'}
          icon={FiClock}
        />
      </div>

      <div className="flex gap-1 mb-4 border-b" style={{ borderColor: 'var(--qms-border)' }}>
        <button
          onClick={() => setTab('roster')}
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors"
          style={{ borderColor: tab === 'roster' ? 'var(--qms-brand)' : 'transparent', color: tab === 'roster' ? 'var(--qms-brand)' : 'var(--qms-text-muted)' }}
        >
          <FiShield size={13} /> Roster
        </button>
        <button
          onClick={() => setTab('assignments')}
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors"
          style={{ borderColor: tab === 'assignments' ? 'var(--qms-brand)' : 'transparent', color: tab === 'assignments' ? 'var(--qms-brand)' : 'var(--qms-text-muted)' }}
        >
          <FiCheckSquare size={13} /> Assignments
        </button>
        <button
          onClick={() => setTab('devices')}
          className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-semibold border-b-2 -mb-px transition-colors"
          style={{ borderColor: tab === 'devices' ? 'var(--qms-brand)' : 'transparent', color: tab === 'devices' ? 'var(--qms-brand)' : 'var(--qms-text-muted)' }}
        >
          <FiCpu size={13} /> Devices
        </button>
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
          <Button variant="outline" size="sm" onClick={handleReset}>Reset</Button>
        </div>
      </div>

      {geoError && (
        <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 mb-3 bg-danger-soft border border-danger text-danger">
          <span>Couldn't load field officer locations — the list below still shows everything else.</span>
          <Button variant="outline" size="sm" onClick={() => refetchGeo()} className="shrink-0">Retry</Button>
        </div>
      )}

      <QueryStateBlock
        isLoading={isLoading}
        error={error}
        loadingLabel="Loading field officers…"
        errorLabel="Failed to load field officers. Please try again."
        onRetry={() => { refetchType(); refetchRoles() }}
      >
        {tab === 'roster' ? (
          fos.length === 0 ? (
            <div className="px-4 py-10 text-center text-[13px] rounded-xl border" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
              No field officers found.
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
              {fos.map((fo) => (
                <FoRosterCard
                  key={fo.id}
                  role={fo}
                  geoProfile={geoByRole.get(fo.id)}
                  campSummary={campSummaries[fo.id]}
                  onOpen={setOpenRoleId}
                />
              ))}
            </div>
          )
        ) : tab === 'assignments' ? (
          <FoAssignmentsWeekGrid roles={fos} geoByRole={geoByRole} onOpen={setOpenRoleId} />
        ) : (
          <FoDevicesTable roles={fos} geoByRole={geoByRole} devicesByRole={devicesByRole} onOpen={setOpenRoleId} />
        )}

        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      <FoRealDrawer roleId={openRoleId} onClose={() => setOpenRoleId(null)} />
    </div>
  )
}

export default FieldOfficersPage
