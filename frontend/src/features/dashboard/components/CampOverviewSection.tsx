import { FiMapPin } from 'react-icons/fi'
import { useCampReport } from '@/features/camps/hooks/useCampReport'
import { CAMP_STATUS_COLOR, CAMP_STATUS_LABEL } from '@/features/camps/components/CampStatusPillReal'
import { usePermission } from '@/hooks/usePermission'
import type { CampType, BillingType } from '@/types/campReal.types'
import SectionCard from '@/features/dashboard/components/SectionCard'
import QueryStateBlock from '@/components/ui/QueryStateBlock'

// GET /camps/report requires this exact set — stricter than camp:search.
const CAMP_REPORT_PERMISSIONS = ['camp:manage', 'tenant:manage']

const CAMP_TYPE_LABEL: Record<CampType, string> = {
  screening: 'Screening',
  diet: 'Diet',
  lab: 'Lab',
}

const BILLING_TYPE_LABEL: Record<BillingType, string> = {
  billable: 'Billable',
  void: 'Void',
}

interface CountPillProps {
  label: string
  count: number
  color?: string
}

const CountPill = ({ label, count, color }: CountPillProps) => (
  <div
    className="rounded-lg border px-2.5 py-1.5 flex items-center gap-1.5"
    style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}
  >
    {color && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
    <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{label}</span>
    <span className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>{count}</span>
  </div>
)

// Only what GET /camps/report actually provides — no month/day trend, no
// forecast, no Diet/Screening-only filtering. The prior CampReportSection
// read from the separate mock localStorage camps layer and did client-side
// run-rate projection math with no backend equivalent; both are gone, not
// ported, per the explicit decision to show only real backend data.
// Gates its own fetch on camp:manage/tenant:manage independently of whatever
// gate the caller applies — DashboardPage.tsx already conditionally mounts
// this component, but re-checking here means this component stays safe even
// if it's ever reused in a spot that isn't already permission-gated.
const CampOverviewSection = () => {
  const { hasAnyPermission } = usePermission()
  const canViewReport = hasAnyPermission(CAMP_REPORT_PERMISSIONS)
  const { data, isLoading, isError, refetch } = useCampReport(canViewReport)
  const report = data?.data

  return (
    <SectionCard
      icon={FiMapPin}
      iconGradient="linear-gradient(135deg, #3b6dff, #14b8a6)"
      title="Camp overview"
      subtitle="Current operational distribution"
    >
      <QueryStateBlock
        isLoading={isLoading}
        error={isError}
        loadingLabel="Loading camp overview…"
        errorLabel="Failed to load camp overview."
        onRetry={refetch}
      >
        {report && (
          <>
            <div className="text-2xl font-extrabold mb-4" style={{ color: 'var(--qms-text)' }}>
              {report.summary.totalCamps}
              <span className="text-[11px] font-semibold uppercase tracking-wide ml-2" style={{ color: 'var(--qms-text-muted)' }}>
                Total camps
              </span>
            </div>

            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Status</p>
              <div className="flex flex-wrap gap-1.5">
                {report.byStatus.map((s) => (
                  <CountPill key={s.status} label={CAMP_STATUS_LABEL[s.status]} count={s.count} color={CAMP_STATUS_COLOR[s.status]} />
                ))}
              </div>
            </div>

            <div className="mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Camp Type</p>
              <div className="flex flex-wrap gap-1.5">
                {report.byType.map((t) => (
                  <CountPill key={t.type} label={CAMP_TYPE_LABEL[t.type]} count={t.count} />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>Billing Type</p>
              <div className="flex flex-wrap gap-1.5">
                {report.byBillingType.map((b) => (
                  <CountPill key={b.billingType} label={BILLING_TYPE_LABEL[b.billingType]} count={b.count} />
                ))}
              </div>
            </div>
          </>
        )}
      </QueryStateBlock>
    </SectionCard>
  )
}

export default CampOverviewSection
