import { useMemo } from 'react'
import { FiGrid, FiCheckCircle, FiUserCheck, FiPlayCircle, FiUsers } from 'react-icons/fi'
import KpiTile from '@/components/ui/KpiTile'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePharmaCamps } from '@/features/pharma/hooks/usePharmaCamps'
import { CAMP_STATUS_LABEL } from '@/components/widgets/camp/campStatus.constants'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'
import type { CampEntity, CampStatus, CampType } from '@/types/campReal.types'
import { EMPTY_ARRAY } from '@/utils/emptyArray'

// GET /camps/report is camp:manage/tenant:manage only, so pharma field force computes KPIs
// client-side from the plain search endpoint's own-scoped results instead, capped at this limit.
const AGGREGATE_LIMIT = '200'

function doctorId(doctor: CampEntity['doctor']): string {
  return typeof doctor === 'string' ? doctor : (doctor as { _id?: string })._id ?? ''
}

// Partial MR dashboard — only tiles backed by real fields are shown. Brand-wise Rx stays log-only
// (no Rx/prescription concept anywhere in the backend).
const PharmaDashboardTab = () => {
  const { data, isLoading, error, refetch } = usePharmaCamps({ limit: AGGREGATE_LIMIT, report: 'true' })
  const camps = data?.data?.items ?? EMPTY_ARRAY
  const totalCount = data?.data?.count ?? 0
  // Breakdowns below are computed only over the capped `camps` page — past this limit they're a sample, not a true total.
  const isTruncated = camps.length < totalCount

  const stats = useMemo(() => {
    const byStatus: Partial<Record<CampStatus, number>> = {}
    const byType: Partial<Record<CampType, number>> = {}
    const doctorIds = new Set<string>()
    let totalPatients = 0
    for (const camp of camps) {
      byStatus[camp.status] = (byStatus[camp.status] ?? 0) + 1
      byType[camp.type] = (byType[camp.type] ?? 0) + 1
      const id = doctorId(camp.doctor)
      if (id) doctorIds.add(id)
      totalPatients += camp.stats?.patients ?? 0
    }
    return { byStatus, byType, uniqueDoctors: doctorIds.size, totalPatients }
  }, [camps])

  return (
    <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading your camps…" errorLabel="Failed to load your camps. Please try again." onRetry={refetch}>
      {isTruncated && (
        <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
          Showing your latest {camps.length} of {totalCount} camps — the breakdowns below reflect this sample, not your full history.
        </p>
      )}
      <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
        <KpiTile label={isTruncated ? 'Camps (latest)' : 'Total camps'} value={String(camps.length)} tone="brand" icon={FiGrid} />
        <KpiTile label="Live" value={String(stats.byStatus.live ?? 0)} tone="emerald" icon={FiPlayCircle} />
        <KpiTile label="Closed" value={String(stats.byStatus.closed ?? 0)} tone="teal" icon={FiCheckCircle} />
        <KpiTile label="Unique doctors" value={String(stats.uniqueDoctors)} tone="violet" icon={FiUserCheck} />
        <KpiTile label="Total patients" value={String(stats.totalPatients)} tone="amber" icon={FiUsers} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>By status</div>
          <div className="space-y-1.5">
            {(Object.entries(stats.byStatus) as [CampStatus, number][]).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between text-[13px]">
                <span style={{ color: 'var(--qms-text)' }}>{CAMP_STATUS_LABEL[status]}</span>
                <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{count}</span>
              </div>
            ))}
            {Object.keys(stats.byStatus).length === 0 && (
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No camps yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>By camp type</div>
          <div className="space-y-1.5">
            {(Object.entries(stats.byType) as [CampType, number][]).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between text-[13px]">
                <span style={{ color: 'var(--qms-text)' }}>{CAMP_TYPE_LABEL[type]}</span>
                <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{count}</span>
              </div>
            ))}
            {Object.keys(stats.byType).length === 0 && (
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No camps yet.</p>
            )}
          </div>
        </div>
      </div>
    </QueryStateBlock>
  )
}

export default PharmaDashboardTab
