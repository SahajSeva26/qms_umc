import { FiLayers, FiGrid, FiClock, FiCalendar, FiActivity, FiCheckCircle, FiXCircle, FiSlash, FiHeart, FiDroplet } from 'react-icons/fi'
import KpiTile from '@/components/ui/KpiTile'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import { usePharmaMyCamps } from '@/features/pharma/hooks/usePharmaMyCamps'
import { CAMP_STATUS_LABEL, CAMP_STATUS_COLOR } from '@/components/widgets/camp/campStatus.constants'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'
import type { CampStatus, CampType } from '@/types/campReal.types'

// MR-ONLY dashboard — GET /camps/my's RoleGuard admits only Field Officer, Dietitian, and Pharma MR
// (camp.routes.ts), so this must never be mounted for HO/RSM/ASM — see PharmaPortalPage.tsx, which
// renders this only when roleTypeCode === 'pharma-mr' and falls back to the generic
// PharmaDashboardTab (GET /camps, open to all 4 pharma roles) otherwise.
//
// Driven entirely by GET /camps/my's server-computed `summary` (totalCamps, statusCounts,
// typeCounts across the caller's FULL own-scoped camp history), not the paginated `items` page
// itself — so these are true totals, never a capped sample.
//
// Cloned from the prototype's mr-portal.js tabDashboard, with 3 deliberate real-data departures:
// 1. "Unique doctors"/"Total patients" stay OUT — /camps/my's summary has no such aggregate, and
//    deriving either from the current page's items would silently understate them past page 1.
// 2. The prototype's Upcoming/Ongoing/Completed split re-buckets a raw "confirmed" camp by
//    comparing its date to today (dashboardStatus() in mr-data.js) — that needs each camp's real
//    date, which only exists on the (capped) items page, not the summary aggregate. Rather than add
//    a second full camp sweep just for this, the 6 tiles below show the real backend CampStatus
//    values as-is (Requested/Confirmed/Live/Closed/Cancelled/Cancelled (Charged)), reusing the same
//    CAMP_STATUS_LABEL/CAMP_STATUS_COLOR already used elsewhere in this app.
// 3. "Brand-wise Rx (closed camps)" and the pending-FO-rating banner are omitted entirely — no
//    Rx/prescription model and no camp rating field exist anywhere in the real backend.
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

const MrDashboardTab = () => {
  const { data, isLoading, error, refetch } = usePharmaMyCamps({ page: '1', limit: '10' })
  const summary = data?.data?.summary

  // The response supplies Camp.type counts (screening/diet/lab), not "project types" — a camp type
  // and a project type are different real entities in this app; label accordingly.
  const distinctTypes = (summary?.typeCounts ?? []).filter((t) => t.count > 0).length
  const countFor = (status: CampStatus) => summary?.statusCounts.find((s) => s.status === status)?.count ?? 0

  return (
    <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading your camps…" errorLabel="Failed to load your camps. Please try again." onRetry={refetch}>
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

      {/* Matches the prototype's "Camp count by project type" card (mr-portal.js tabDashboard) —
          real counts from summary.typeCounts, fixed 3-column sub-tile grid. The prototype's sibling
          "Brand-wise Rx" card is omitted (no Rx model in the real backend), so this card runs
          full-width instead of sharing a 2-column row with a card that can't exist. */}
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
