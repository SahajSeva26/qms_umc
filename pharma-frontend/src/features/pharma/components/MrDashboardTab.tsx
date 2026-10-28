import { FiLayers, FiGrid, FiClock, FiCalendar, FiActivity, FiCheckCircle, FiXCircle, FiSlash, FiHeart, FiDroplet } from 'react-icons/fi'
import KpiTile from '@/components/ui/KpiTile'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePharmaMyCamps } from '@/features/pharma/hooks/usePharmaMyCamps'
import { CAMP_STATUS_LABEL, CAMP_STATUS_COLOR } from '@/components/widgets/camp/campStatus.constants'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'
import type { CampStatus, CampType } from '@/types/campReal.types'

// MR-only — GET /camps/my's RoleGuard admits only FO/Dietitian/Pharma MR; must never mount for
// HO/RSM/ASM. Driven by the server-computed `summary` (true totals), not the paginated `items`.
const STATUS_ICON: Record<CampStatus, typeof FiClock> = {
  requested: FiClock,
  confirmed: FiCalendar,
  live: FiActivity,
  closed: FiCheckCircle,
  cancelled: FiSlash,
  cancelled_charged: FiXCircle,
}

const TYPE_ICON: Record<CampType, typeof FiActivity> = {
  screening: FiActivity,
  diet: FiHeart,
  lab: FiDroplet,
}

function statusTone(status: CampStatus): 'brand' | 'teal' | 'emerald' | 'amber' | 'rose' | 'violet' {
  const hex = CAMP_STATUS_COLOR[status]
  if (hex === '#3b6dff') return 'brand'
  if (hex === '#10b981') return 'emerald'
  if (hex === '#14b8a6') return 'teal'
  if (hex === '#f59e0b') return 'amber'
  if (hex === '#f43f5e') return 'rose'
  return 'violet'
}

// Matches the real content's grid exactly (2 summary tiles + 6 status tiles, then the
// "Camp count by type" card) so the shimmer never jumps in size once data arrives.
const DASHBOARD_SKELETON = (
  <div aria-busy="true" aria-live="polite">
    <div className="grid gap-2.5 mb-3.5 animate-pulse" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-24 rounded-xl border" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }} />
      ))}
    </div>
    <div className="rounded-xl border p-3.5 animate-pulse" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <div className="h-4 w-36 rounded mb-2.5" style={{ background: 'var(--qms-surface-strong)' }} />
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-[10px] border" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }} />
        ))}
      </div>
    </div>
  </div>
)

const MrDashboardTab = () => {
  const { data, isLoading, error, refetch } = usePharmaMyCamps({ page: '1', limit: '10' })
  const summary = data?.data?.summary

  // Camp.type counts (screening/diet/lab), not project types — distinct entities.
  const distinctTypes = (summary?.typeCounts ?? []).filter((t) => t.count > 0).length
  const countFor = (status: CampStatus) => summary?.statusCounts.find((s) => s.status === status)?.count ?? 0

  return (
    <QueryStateBlock
      isLoading={isLoading}
      error={error}
      loadingLabel="Loading your camps…"
      errorLabel="Failed to load your camps. Please try again."
      onRetry={refetch}
      loadingSkeleton={DASHBOARD_SKELETON}
    >
      <div className="grid gap-2.5 mb-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))' }}>
        <KpiTile label="Camp types" value={String(distinctTypes)} sub="Across your camps" tone="violet" icon={FiLayers} />
        <KpiTile label="Total camps" value={String(summary?.totalCamps ?? 0)} sub="All camps in your scope" tone="brand" icon={FiGrid} />
        {(['requested', 'confirmed', 'live', 'closed', 'cancelled', 'cancelled_charged'] as CampStatus[]).map((status) => (
          <KpiTile
            key={status}
            label={CAMP_STATUS_LABEL[status]}
            value={String(countFor(status))}
            tone={statusTone(status)}
            icon={STATUS_ICON[status]}
          />
        ))}
      </div>

      {/* Sibling "Brand-wise Rx" card omitted (no Rx model) — this card runs full-width instead. */}
      <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="text-[13px] font-extrabold mb-2" style={{ color: 'var(--qms-text)' }}>Camp count by type</div>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {(['screening', 'diet', 'lab'] as CampType[]).map((type) => {
            const Icon = TYPE_ICON[type]
            const count = summary?.typeCounts.find((t) => t.type === type)?.count ?? 0
            return (
              <div
                key={type}
                className="rounded-[10px] border p-2.5"
                style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-brand)' }}>
                  <Icon size={13} /> {CAMP_TYPE_LABEL[type]}
                </div>
                <div className="font-extrabold text-[20px] mt-1" style={{ color: 'var(--qms-text)' }}>{count}</div>
              </div>
            )
          })}
        </div>
      </div>
    </QueryStateBlock>
  )
}

export default MrDashboardTab
