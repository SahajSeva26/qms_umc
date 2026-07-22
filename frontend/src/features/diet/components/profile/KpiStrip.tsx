import { FiUsers, FiTrendingUp, FiCheckCircle, FiAlertCircle, FiClock, FiPrinter } from 'react-icons/fi'
import type { DietitianProfileBundle } from '@/features/diet/dietitians.types'
import { fmtInr } from '@/features/diet/dietitians.service'

interface KpiStripProps {
  bundle: DietitianProfileBundle
}

interface TileSpec {
  label: string
  value: string
  sub: string
  color: string
  icon: typeof FiUsers
}

// §3 — 6 KPI tiles. Built as a plain colored tile (not the generic KpiTile
// primitive) so each tile's number color can be the exact per-metric hex the
// spec calls for, rather than KpiTile's fixed 6-tone palette.
const Tile = ({ label, value, sub, color, icon: Icon }: TileSpec) => (
  <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
      <Icon size={12} /> {label}
    </div>
    <div className="text-[20px] font-extrabold leading-tight" style={{ color }}>{value}</div>
    <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>
  </div>
)

const KpiStrip = ({ bundle }: KpiStripProps) => {
  const { camps, closed, upcoming, paymentRollup, details } = bundle
  const printing = details.printingChargePerCamp ?? 150

  const tiles: TileSpec[] = [
    {
      label: 'Total camps', value: String(camps.length),
      sub: `${closed.length} closed · ${upcoming.length} upcoming`,
      color: 'var(--qms-text)', icon: FiUsers,
    },
    {
      label: 'Earned', value: fmtInr(paymentRollup.eligibleAmount + paymentRollup.paidAmount + paymentRollup.upcomingAmount),
      sub: 'Across all camps', color: '#0d9488', icon: FiTrendingUp,
    },
    {
      label: 'Already paid', value: fmtInr(paymentRollup.paidAmount),
      sub: `${bundle.payments.length} payouts`, color: '#047857', icon: FiCheckCircle,
    },
    {
      label: 'Outstanding', value: fmtInr(paymentRollup.eligibleAmount),
      sub: 'READY camps', color: '#b91c1c', icon: FiAlertCircle,
    },
    {
      label: 'Reports pending', value: String(paymentRollup.reportPendingCamps),
      sub: 'Awaiting patient + photos', color: '#92400e', icon: FiClock,
    },
    {
      label: 'Printing / camp', value: `₹${printing}`,
      sub: 'Per-camp charge', color: 'var(--qms-text)', icon: FiPrinter,
    },
  ]

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
      {tiles.map((t) => <Tile key={t.label} {...t} />)}
    </div>
  )
}

export default KpiStrip
