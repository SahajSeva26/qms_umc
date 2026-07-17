import { useMemo, useState } from 'react'
import { FiZap } from 'react-icons/fi'
import UserAvatar from '@/components/ui/UserAvatar'
import { formatINR, formatPercent } from '@/utils/formatters'
import type { RepTarget, SalesMeeting, SalesRep, TargetStatus } from '@/types/salesdash.types'
import { QUARTER } from '@/features/crm/sales/sales.mock'
import {
  TARGET_STATUS_META,
  computeRepPerformance,
  splitName,
  tintStyle,
} from '@/features/crm/sales/sales.utils'
import type { RepPerformance } from '@/features/crm/sales/sales.utils'

type RankBy = 'EFFORT' | 'OUTCOME'

interface PerformanceTabProps {
  reps: SalesRep[]
  targets: RepTarget[]
  meetings: SalesMeeting[]
  isApprover: boolean
  meRep: SalesRep | null
  onOpenRep: (repId: string) => void
}

const MEDALS = ['🥇', '🥈', '🥉']

// Shared "Effort Score" brand gradient — violet → brand blue, used for the
// intro banner icon and the effort bar fill so both read as one visual motif.
const EFFORT_GRADIENT = 'linear-gradient(135deg, #8b5cf6, #3b6dff)'
const EFFORT_GRADIENT_HORIZONTAL = 'linear-gradient(90deg, #8b5cf6, #3b6dff)'

const momPillColor = (pct: number) => {
  if (pct >= 80) return '#10b981'
  if (pct >= 50) return '#f59e0b'
  return '#f43f5e'
}

const PerformanceTab = ({ reps, targets, meetings, isApprover, meRep, onOpenRep }: PerformanceTabProps) => {
  const [rankBy, setRankBy] = useState<RankBy>('EFFORT')

  const ranked: RepPerformance[] = useMemo(() => {
    const rows = reps.map((rep) =>
      computeRepPerformance(rep, meetings, targets.find((t) => t.repId === rep.id && t.quarter === QUARTER))
    )
    return [...rows].sort((a, b) =>
      rankBy === 'EFFORT' ? b.effortScore - a.effortScore : b.achieved - a.achieved
    )
  }, [reps, targets, meetings, rankBy])

  const visible = isApprover ? ranked : ranked.filter((row) => row.rep.id === meRep?.id)
  const maxEffort = Math.max(1, ...ranked.map((row) => row.effortScore))

  const analysisCards = useMemo(() => {
    if (!isApprover) return null

    const statusMix = new Map<TargetStatus | 'UNSET', number>()
    for (const rep of reps) {
      const target = targets.find((t) => t.repId === rep.id && t.quarter === QUARTER)
      const key = target ? target.status : 'UNSET'
      statusMix.set(key, (statusMix.get(key) ?? 0) + 1)
    }

    const topProgress = [...ranked].sort((a, b) => b.progress - a.progress).slice(0, 3)

    const hqSplit = new Map<string, number>()
    for (const rep of reps) hqSplit.set(rep.hq || '—', (hqSplit.get(rep.hq || '—') ?? 0) + 1)

    return { statusMix, topProgress, hqSplit }
  }, [isApprover, reps, targets, ranked])

  return (
    <div>
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-3.5 mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(139,92,246,.08), rgba(36,81,240,.06))', border: '1px solid var(--qms-border)' }}
      >
        <div className="flex items-start gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
            style={{ background: EFFORT_GRADIENT }}
          >
            <FiZap size={14} />
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--qms-text-soft)' }}>
            <span className="font-bold" style={{ color: 'var(--qms-text)' }}>Effort Score</span>{' '}
            = meetings×3 + follow-ups×5 + new leads×4 + MOM%×0.4 + wins×8
          </p>
        </div>
        <div
          className="flex rounded-lg p-0.5"
          style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)' }}
        >
          {(['EFFORT', 'OUTCOME'] as RankBy[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setRankBy(mode)}
              className="px-3 py-1 rounded-md text-[11px] font-bold transition-all"
              style={
                rankBy === mode
                  ? { background: 'var(--qms-brand)', color: '#fff' }
                  : { color: 'var(--qms-text-muted)' }
              }
            >
              {mode === 'EFFORT' ? 'Effort' : 'Outcome'}
            </button>
          ))}
        </div>
      </div>

      <div
        className="rounded-2xl border overflow-x-auto mb-4"
        style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      >
        <table className="w-full text-left">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
              {['Rank', 'Rep', 'Meetings', 'Follow-ups', 'MOM on-time', 'Effort score', 'Achieved'].map((h) => (
                <th key={h} className="px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const rank = ranked.indexOf(row) + 1
              const { firstName, lastName } = splitName(row.rep.name)
              return (
                <tr
                  key={row.rep.id}
                  onClick={() => onOpenRep(row.rep.id)}
                  className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                  style={{ borderBottom: '1px solid var(--qms-border)' }}
                >
                  <td className="px-3.5 py-2.5 text-[14px] font-bold" style={{ color: 'var(--qms-text)' }}>
                    {MEDALS[rank - 1] ?? rank}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <UserAvatar firstName={firstName} lastName={lastName} tone={row.rep.tone} size="sm" />
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>{row.rep.name}</div>
                        <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>
                          {row.rep.role === 'Sales Head' ? 'Head' : 'KAM'} · {row.rep.hq}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{row.meetings}</span>
                    <span className="text-[10px] ml-1" style={{ color: 'var(--qms-text-muted)' }}>+{row.newLeads} new</span>
                  </td>
                  <td className="px-3.5 py-2.5 text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>
                    {row.followups}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle(momPillColor(row.momPct))}>
                      {row.momPct}%
                    </span>
                  </td>
                  <td className="px-3.5 py-2.5 min-w-36">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.round((row.effortScore / maxEffort) * 100)}%`,
                            background: EFFORT_GRADIENT_HORIZONTAL,
                          }}
                        />
                      </div>
                      <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{row.effortScore}</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{formatINR(row.achieved)}</span>
                    <span className="text-[10px] ml-1" style={{ color: 'var(--qms-text-muted)' }}>
                      {row.target > 0 ? formatPercent(row.progress, 0) : '—'} of target
                    </span>
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3.5 py-8 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                  No performance rows to show.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {analysisCards && (
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>
              Status mix
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[...analysisCards.statusMix.entries()].map(([status, count]) => {
                const meta = status === 'UNSET' ? { label: 'Unset', color: '#94a3b8' } : TARGET_STATUS_META[status]
                return (
                  <span key={status} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle(meta.color)}>
                    {meta.label} · {count}
                  </span>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>
              Top progress
            </div>
            <div className="space-y-1.5">
              {analysisCards.topProgress.map((row) => {
                const { firstName, lastName } = splitName(row.rep.name)
                return (
                  <div key={row.rep.id} className="flex items-center gap-2">
                    <UserAvatar firstName={firstName} lastName={lastName} tone={row.rep.tone} size="sm" />
                    <span className="text-[12px] font-semibold flex-1 truncate" style={{ color: 'var(--qms-text)' }}>{row.rep.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle('#3b6dff')}>
                      {row.progress}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <div className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>
              HQ split
            </div>
            <div className="space-y-1.5">
              {[...analysisCards.hqSplit.entries()].map(([hq, count]) => (
                <div key={hq} className="flex items-center justify-between">
                  <span className="text-[12px] font-medium" style={{ color: 'var(--qms-text-soft)' }}>{hq}</span>
                  <span className="text-[12px] font-bold" style={{ color: 'var(--qms-text)' }}>
                    {count} rep{count === 1 ? '' : 's'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PerformanceTab
