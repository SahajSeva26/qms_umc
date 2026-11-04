import { FiGrid, FiCheckCircle, FiPlayCircle } from 'react-icons/fi'
import KpiTile from '@/components/ui/KpiTile'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePharmaMyCamps } from '@/features/camps'
import { CAMP_STATUS_LABEL } from '@/components/widgets/camp/campStatus.constants'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'
import type { CampStatus, CampType } from '@/types/campReal.types'

// Shared dashboard for HO/RSM/ASM — mirrors MrDashboardTab, driven by the real server-computed
// `summary`. Unique-doctors/total-patients tiles dropped (not computable from summary alone).
const PharmaDashboardTab = () => {
  const { data, isLoading, error, refetch } = usePharmaMyCamps({ page: '1', limit: '10' })
  const summary = data?.data?.summary
  const countForStatus = (status: CampStatus) => summary?.statusCounts.find((s) => s.status === status)?.count ?? 0
  const countForType = (type: CampType) => summary?.typeCounts.find((t) => t.type === type)?.count ?? 0

  return (
    <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading your camps…" errorLabel="Failed to load your camps. Please try again." onRetry={refetch}>
      <div className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
        <KpiTile label="Total camps" value={String(summary?.totalCamps ?? 0)} tone="brand" icon={FiGrid} />
        <KpiTile label="Live" value={String(countForStatus('live'))} tone="emerald" icon={FiPlayCircle} />
        <KpiTile label="Closed" value={String(countForStatus('closed'))} tone="teal" icon={FiCheckCircle} />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>By status</div>
          <div className="space-y-1.5">
            {(['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged'] as CampStatus[]).map((status) => (
              <div key={status} className="flex items-center justify-between text-[13px]">
                <span style={{ color: 'var(--qms-text)' }}>{CAMP_STATUS_LABEL[status]}</span>
                <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{countForStatus(status)}</span>
              </div>
            ))}
            {(summary?.totalCamps ?? 0) === 0 && (
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No camps yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>By camp type</div>
          <div className="space-y-1.5">
            {(['screening', 'diet', 'lab'] as CampType[]).map((type) => (
              <div key={type} className="flex items-center justify-between text-[13px]">
                <span style={{ color: 'var(--qms-text)' }}>{CAMP_TYPE_LABEL[type]}</span>
                <span className="font-bold" style={{ color: 'var(--qms-text)' }}>{countForType(type)}</span>
              </div>
            ))}
            {(summary?.totalCamps ?? 0) === 0 && (
              <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No camps yet.</p>
            )}
          </div>
        </div>
      </div>
    </QueryStateBlock>
  )
}

export default PharmaDashboardTab
