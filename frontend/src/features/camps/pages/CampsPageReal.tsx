import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiPlus } from 'react-icons/fi'
import { useCampsReal } from '@/features/camps/hooks/useCampsReal'
import { useCampsRealFilters } from '@/features/camps/hooks/useCampsRealFilters'
import { usePermission } from '@/hooks/usePermission'
import CampsFilterBarReal from '@/features/camps/components/CampsFilterBarReal'
import CampsKpiStripReal from '@/features/camps/components/CampsKpiStripReal'
import CampTableReal from '@/features/camps/components/CampTableReal'
import PaginationControls from '@/components/ui/PaginationControls'
import { Button } from '@/components/ui/button'
import type { BillingType, CampStatus, CampType } from '@/types/campReal.types'

// camp.routes.ts's real GUARD for create/update/moveStage/allocate is
// [camp:manage, tenant:manage] — a camp:search-only actor (e.g. an FO, whose
// RoleType only grants search+get) can legitimately read/list camps but the
// backend 403s any write. Hiding the "New camp" button for that case avoids
// sending them into a create flow that can only ever fail — found via a
// live low-privilege-user test pass (the button was visible and the route
// was reachable, but POST correctly still 403'd server-side; this is a UX
// gap, not a real security hole, since the backend never trusted the UI).
const CAMP_WRITE_PERMISSIONS = ['camp:manage', 'tenant:manage']

const PAGE_SIZE = 20
const AGGREGATE_LIMIT = 1000
const ALL_STATUSES: CampStatus[] = ['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged']

// Rebuilt from scratch against the real backend contract
// (backend/src/modules/operations/camp/**) — replaces the entirely mock/
// localStorage previous build. Real 6-status state machine (not the old
// mock's 10-status enum + derived "stage" concept), real fo/mr/asm/rsm as
// Role references, no teleconsult/close-out/reminders/resource-assignment
// (zero backend support for any of those). Same server-side search+
// pagination+aggregate-KPI pattern as DoctorsPage.tsx.
const CampsPageReal = () => {
  const navigate = useNavigate()
  const { hasAnyPermission } = usePermission()
  const canWrite = hasAnyPermission(CAMP_WRITE_PERMISSIONS)
  const { filters, setFilter, reset } = useCampsRealFilters()
  const [page, setPage] = useState(1)

  const activeStatus = filters.status

  const { data, isLoading, error } = useCampsReal({
    status: activeStatus === 'ALL' ? undefined : activeStatus,
    type: filters.type === 'ALL' ? undefined : (filters.type as CampType),
    billingType: filters.billingType === 'ALL' ? undefined : (filters.billingType as BillingType),
    city: filters.city || undefined,
    state: filters.state || undefined,
    dateFrom: filters.dateFrom || undefined,
    dateTo: filters.dateTo || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const camps = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  // Aggregate, unpaginated fetch (mirrors DoctorsPage.tsx's activeDoctors/
  // inactiveDoctors pattern) so the KPI strip's per-status counts reflect the
  // WHOLE dataset, not just the current page.
  const { data: allData } = useCampsReal({ limit: String(AGGREGATE_LIMIT) })
  const allCamps = allData?.data?.items ?? []
  const counts = useMemo(() => {
    const result: Record<CampStatus, number> = {
      requested: 0, confirmed: 0, live: 0, closed: 0, cancelled: 0, cancelled_charged: 0,
    }
    for (const c of allCamps) {
      if (ALL_STATUSES.includes(c.status)) result[c.status] += 1
    }
    return result
  }, [allCamps])

  const handleFilterChange = <K extends keyof typeof filters>(key: K, value: (typeof filters)[K]) => {
    setFilter(key, value)
    setPage(1)
  }

  const handleReset = () => {
    reset()
    setPage(1)
  }

  return (
    <div className="max-w-6xl">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>
            Camp Management
          </h1>
          <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Screening / Diet / Lab camps, wired to the real backend.'}
          </p>
        </div>
        {canWrite && (
          <Button
            onClick={() => navigate('/camps/new')}
            className="text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New camp
          </Button>
        )}
      </div>

      <CampsKpiStripReal
        counts={counts}
        total={allCamps.length}
        activeStatus={activeStatus}
        onSelectStatus={(s) => handleFilterChange('status', s)}
      />

      <CampsFilterBarReal filters={filters} setFilter={handleFilterChange} reset={handleReset} />

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading camps…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load camps. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <CampTableReal camps={camps} onOpen={(id) => navigate(`/camps/${id}`)} />
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  )
}

export default CampsPageReal
