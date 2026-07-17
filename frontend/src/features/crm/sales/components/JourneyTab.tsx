import { useMemo, useState } from 'react'
import UserAvatar from '@/components/ui/UserAvatar'
import { formatDate, formatPercent } from '@/utils/formatters'
import type { Journey, SalesMeeting, SalesRep } from '@/types/salesdash.types'
import { CADENCE_COLORS, computeJourneys, daysBetween, splitName, tintStyle } from '@/features/crm/sales/sales.utils'
import JourneyDrawer from '@/features/crm/sales/components/JourneyDrawer'

interface JourneyTabProps {
  meetings: SalesMeeting[]
  reps: SalesRep[]
}

const healthPill = (journey: Journey) => {
  if (journey.won) return { label: 'Won · PO', color: '#10b981' }
  if (journey.stuck) return { label: `Stuck ${journey.daysSinceLast}d`, color: '#f43f5e' }
  if (journey.followupCount > 0) return { label: 'Active', color: '#3b6dff' }
  return { label: 'New', color: '#94a3b8' }
}

const JourneyTab = ({ meetings, reps }: JourneyTabProps) => {
  const [ownerFilter, setOwnerFilter] = useState('ALL')
  const [openKey, setOpenKey] = useState<string | null>(null)

  const journeys = useMemo(() => computeJourneys(meetings, reps), [meetings, reps])
  const owners = useMemo(() => [...new Set(journeys.map((j) => j.ownerName).filter(Boolean))].sort(), [journeys])
  const visible = ownerFilter === 'ALL' ? journeys : journeys.filter((j) => j.ownerName === ownerFilter)

  const kpis = useMemo(() => {
    const total = journeys.length
    const won = journeys.filter((j) => j.won)
    const stuck = journeys.filter((j) => j.stuck).length
    const open = journeys.filter((j) => !j.won && !j.lost).length
    const avgTouch = total > 0 ? journeys.reduce((sum, j) => sum + j.totalTouchpoints, 0) / total : 0
    const avgDaysToPo =
      won.length > 0
        ? Math.round(won.reduce((sum, j) => sum + daysBetween(j.anchorDate, j.lastTouch), 0) / won.length)
        : null
    return [
      { label: 'Open opportunities', value: String(open), sub: `${total} journeys tracked` },
      { label: 'Avg touchpoints', value: total > 0 ? avgTouch.toFixed(1) : '—', sub: 'per journey' },
      { label: 'POs generated', value: String(won.length), sub: total > 0 ? `${formatPercent((won.length / total) * 100, 0)} conversion` : 'no journeys yet' },
      { label: 'Avg days to PO', value: avgDaysToPo === null ? '—' : `${avgDaysToPo}d`, sub: 'first meeting → PO' },
      { label: 'Stuck >14d', value: String(stuck), sub: 'no touch in 2 weeks' },
    ]
  }, [journeys])

  const openJourney = journeys.find((j) => j.key === openKey) ?? null

  if (meetings.length === 0) {
    return (
      <div
        className="rounded-2xl border py-14 text-center"
        style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      >
        <div className="text-[14px] font-bold mb-1" style={{ color: 'var(--qms-text)' }}>No meetings yet</div>
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No meetings yet — book one from Appointments.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-xl border p-3"
            style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
          >
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--qms-text-muted)' }}>
              {kpi.label}
            </div>
            <div className="text-xl font-extrabold" style={{ color: 'var(--qms-text)' }}>{kpi.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {['ALL', ...owners].map((owner) => (
          <button
            key={owner}
            onClick={() => setOwnerFilter(owner)}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
            style={
              ownerFilter === owner
                ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
                : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
            }
          >
            {owner === 'ALL' ? `All ${journeys.length}` : owner}
          </button>
        ))}
      </div>

      <div
        className="rounded-2xl border overflow-x-auto"
        style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      >
        <table className="w-full text-left">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
              {['Account / Contact', 'Owner', 'First meeting', 'Follow-ups', 'Cadence', 'Last touch', 'Health'].map((h) => (
                <th key={h} className="px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((journey) => {
              const health = healthPill(journey)
              const owner = splitName(journey.ownerName || '—')
              return (
                <tr
                  key={journey.key}
                  onClick={() => setOpenKey(journey.key)}
                  className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ borderBottom: '1px solid var(--qms-border)' }}
                >
                  <td className="px-3.5 py-2.5">
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>{journey.account}</div>
                    <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{journey.contact}</div>
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <UserAvatar firstName={owner.firstName} lastName={owner.lastName} tone={journey.ownerTone} size="sm" />
                      <span className="text-[12px] font-medium" style={{ color: 'var(--qms-text-soft)' }}>{owner.firstName || '—'}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-[12px] whitespace-nowrap" style={{ color: 'var(--qms-text-soft)' }}>
                    {formatDate(journey.anchorDate)}
                  </td>
                  <td className="px-3.5 py-2.5 text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>
                    {journey.followupCount}
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle(CADENCE_COLORS[journey.cadenceBand])}>
                      {journey.cadenceBand}
                    </span>
                    {journey.cadenceBand !== 'NONE' && (
                      <span className="text-[10px] ml-1.5" style={{ color: 'var(--qms-text-muted)' }}>avg {journey.avgGapDays}d</span>
                    )}
                  </td>
                  <td className="px-3.5 py-2.5 text-[12px] whitespace-nowrap" style={{ color: 'var(--qms-text-soft)' }}>
                    {formatDate(journey.lastTouch)}
                    <span className="text-[10px] ml-1.5" style={{ color: 'var(--qms-text-muted)' }}>{journey.daysSinceLast}d ago</span>
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle(health.color)}>{health.label}</span>
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3.5 py-8 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                  No journeys for this owner.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <JourneyDrawer journey={openJourney} onClose={() => setOpenKey(null)} />
    </div>
  )
}

export default JourneyTab
