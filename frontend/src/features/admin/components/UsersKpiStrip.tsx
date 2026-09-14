import { FiUsers, FiUserCheck, FiUserX, FiPauseCircle, FiTrash2, FiLock } from 'react-icons/fi'
import KpiTile, { type KpiTone } from '@/components/ui/KpiTile'
import LineChart from '@/features/analytics/components/charts/LineChart'
import type { UserReport } from '@/types/userReport.types'

interface UsersKpiStripProps {
  report: UserReport
}

// Day-granularity periods ('YYYY-MM-DD') are too wide for the chart's fixed
// width even with every-other-label hidden; month periods are left as-is.
const formatTrendLabel = (period: string) => (period.length === 10 ? period.slice(5) : period)

const UsersKpiStrip = ({ report }: UsersKpiStripProps) => {
  const { summary, security, trends } = report

  const tiles: { key: string; label: string; value: number; tone: KpiTone; icon: typeof FiUsers }[] = [
    { key: 'total', label: 'Total users', value: summary.totalUsers, tone: 'brand', icon: FiUsers },
    { key: 'active', label: 'Active', value: summary.active, tone: 'emerald', icon: FiUserCheck },
    { key: 'inactive', label: 'Inactive', value: summary.inactive, tone: 'teal', icon: FiUserX },
    { key: 'suspended', label: 'Suspended', value: summary.suspended, tone: 'amber', icon: FiPauseCircle },
    { key: 'deleted', label: 'Deleted', value: summary.deleted, tone: 'rose', icon: FiTrash2 },
    { key: 'locked', label: 'Locked accounts', value: security.lockedAccounts, tone: 'violet', icon: FiLock },
  ]

  const registrations = trends.registrations.data

  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Platform overview — all users
      </p>

      <div className="grid gap-2.5 mb-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <KpiTile key={tile.key} label={tile.label} value={String(tile.value)} tone={tile.tone} icon={tile.icon} />
        ))}
      </div>

      <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          Registration trend
        </p>
        {registrations.length === 0 ? (
          <p className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
            No registrations in this period.
          </p>
        ) : (
          <LineChart
            series={[{ label: 'Registrations', color: '#3b6dff', data: registrations.map((d) => d.count) }]}
            labels={registrations.map((d) => d.period)}
            formatY={(v) => String(Math.round(v))}
            formatLabel={formatTrendLabel}
          />
        )}
      </div>
    </div>
  )
}

export default UsersKpiStrip
