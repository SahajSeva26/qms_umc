import { FiUsers, FiUserCheck, FiUserX, FiPauseCircle, FiTrash2, FiLock } from 'react-icons/fi'
import KpiTile, { type KpiTone } from '@/components/ui/KpiTile'
import type { UserReport } from '@/types/userReport.types'

interface UsersKpiStripProps {
  report: UserReport
}

const UsersKpiStrip = ({ report }: UsersKpiStripProps) => {
  const { summary, security } = report

  const tiles: { key: string; label: string; value: number; tone: KpiTone; icon: typeof FiUsers }[] = [
    { key: 'total', label: 'Total users', value: summary.totalUsers, tone: 'brand', icon: FiUsers },
    { key: 'active', label: 'Active', value: summary.active, tone: 'emerald', icon: FiUserCheck },
    { key: 'inactive', label: 'Inactive', value: summary.inactive, tone: 'teal', icon: FiUserX },
    { key: 'suspended', label: 'Suspended', value: summary.suspended, tone: 'amber', icon: FiPauseCircle },
    { key: 'deleted', label: 'Deleted', value: summary.deleted, tone: 'rose', icon: FiTrash2 },
    { key: 'locked', label: 'Locked accounts', value: security.lockedAccounts, tone: 'violet', icon: FiLock },
  ]

  return (
    <div className="mb-5">
      <p className="text-[11px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Platform overview — all users
      </p>

      <div className="grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <KpiTile key={tile.key} label={tile.label} value={String(tile.value)} tone={tile.tone} icon={tile.icon} />
        ))}
      </div>
    </div>
  )
}

export default UsersKpiStrip
