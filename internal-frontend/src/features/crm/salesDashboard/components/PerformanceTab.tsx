import { FiDownload } from 'react-icons/fi'
import type { RepPerformanceRow } from '@/features/crm/salesDashboard/salesDashboard.performance'
import { formatINR } from '@/utils/formatters'
import UserAvatar from '@/components/ui/UserAvatar'

interface PerformanceTabProps {
  rows: RepPerformanceRow[]
  // Both the leaderboard and its real Meetings/Follow-ups columns depend on the lead sweep AND the
  // appointment sweep — either failing must show a retry, never a silently-empty "No active reps"
  // (which reads as a real, good-news empty state rather than an unknown one).
  isLoading: boolean
  isError: boolean
  onRetry: () => void
}

const MEDALS = ['🥇', '🥈', '🥉']

// Matches the prototype's .score-mini pill (sales.js:797) — hi/md/lo win-rate coloring.
function winRateToneColor(winRate: number): { background: string; color: string } {
  if (winRate >= 50) return { background: 'rgba(16,185,129,.14)', color: '#059669' }
  if (winRate >= 30) return { background: 'rgba(245,158,11,.14)', color: '#d97706' }
  return { background: 'rgba(244,63,94,.14)', color: '#e11d48' }
}

// Matches the prototype's Team Leaderboard card (.card/.card-head/.tbl, sales.js:750-776) — but
// sorted by real Won Value (not the prototype's fake Effort Score), and missing the 3 columns that
// have no honest real backing: Effort Score, MoM On-time %, Achieved/Target. See
// salesDashboard.performance.ts for why each of those was dropped rather than faked.
// Meetings/Follow-ups/All-time Leads/Won/Lost/Win Rate/Won Value are ALL-TIME counts — no date
// range exists yet for this dashboard (the prototype's own "for this period" framing was dropped
// rather than left misleadingly attached to all-time data).
const PerformanceTab = ({ rows, isLoading, isError, onRetry }: PerformanceTabProps) => {
  const topWinRate = rows.slice().sort((a, b) => b.winRate - a.winRate).slice(0, 5)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-[20px] border h-64 animate-pulse" style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }} />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-center gap-3 text-[13px] rounded-[20px] border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
        <span>Couldn't load team performance.</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border px-3 py-1.5 font-medium"
          style={{ borderColor: 'var(--qms-border-strong)', color: 'var(--qms-text)' }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[20px] border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)' }}>
        <div className="flex items-center justify-between gap-2.5 px-4.5 py-3.5" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          <div>
            <h3 className="text-[15px] font-bold" style={{ color: 'var(--qms-text)', letterSpacing: '-0.01em' }}>Team Leaderboard</h3>
            <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Ranked by <b>Won Value</b></div>
          </div>
          <button
            type="button"
            disabled
            title="Export is not available yet"
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold shrink-0 opacity-60 cursor-not-allowed"
            style={{ borderColor: 'var(--qms-border-strong)', color: 'var(--qms-text-soft)' }}
          >
            <FiDownload size={14} /> Export
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] px-3 py-2.5" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)' }}>Rank</th>
                <th className="text-left text-[11px] font-bold uppercase tracking-[0.06em] px-3 py-2.5" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)' }}>Rep</th>
                <th className="text-center text-[11px] font-bold uppercase tracking-[0.06em] px-3 py-2.5" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)' }}>Meetings</th>
                <th className="text-center text-[11px] font-bold uppercase tracking-[0.06em] px-3 py-2.5" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)' }}>Follow-ups</th>
                <th className="text-center text-[11px] font-bold uppercase tracking-[0.06em] px-3 py-2.5" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)' }}>All-time Leads</th>
                <th className="text-center text-[11px] font-bold uppercase tracking-[0.06em] px-3 py-2.5" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)' }}>Win Rate</th>
                <th className="text-right text-[11px] font-bold uppercase tracking-[0.06em] px-3 py-2.5" style={{ color: 'var(--qms-text-muted)', borderBottom: '1px solid var(--qms-border)' }}>Won Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center text-[11px] py-7.5" style={{ color: 'var(--qms-text-muted)' }}>No active reps</td>
                </tr>
              )}
              {rows.map((row, i) => (
                <tr key={row.repId} style={{ borderBottom: i === rows.length - 1 ? undefined : '1px solid var(--qms-border)' }}>
                  <td className="px-3 py-2.5 font-extrabold text-[14px]" style={{ color: 'var(--qms-text)' }}>{MEDALS[i] ?? i + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar firstName={row.repName.split(' ')[0]} lastName={row.repName.split(' ')[1]} size="sm" />
                      <span className="font-bold text-[13px]" style={{ color: 'var(--qms-text)' }}>{row.repName}</span>
                    </div>
                  </td>
                  <td className="text-center font-bold px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{row.meetings}</td>
                  <td className="text-center font-bold px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{row.followUps}</td>
                  <td className="text-center font-bold px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{row.newLeads}</td>
                  <td className="text-center font-bold px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>{row.winRate.toFixed(1)}%</td>
                  <td className="text-right font-bold px-3 py-2.5" style={{ color: 'var(--qms-text)' }}>
                    {formatINR(row.wonValue)}
                    <div className="text-[11px] font-normal" style={{ color: 'var(--qms-text-muted)' }}>{row.won} won · {row.winRate.toFixed(0)}%</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Matches the prototype's "Top win-rate" card (sales.js:792-800). Status mix and HQ split
          (the other 2 cards in that row) are skipped — both need data we don't have (a Targets
          module; a location/HQ field on Role), and a placeholder-only card wouldn't add real value. */}
      <div className="rounded-[20px] border p-4.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)' }}>
        <div className="mb-3">
          <h3 className="text-[15px] font-bold" style={{ color: 'var(--qms-text)', letterSpacing: '-0.01em' }}>Top win-rate</h3>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>All-time hit rate</div>
        </div>
        {topWinRate.length === 0 ? (
          <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No data</p>
        ) : (
          <div className="flex flex-col">
            {topWinRate.map((row, i) => {
              const tone = winRateToneColor(row.winRate)
              return (
                <div
                  key={row.repId}
                  className="flex items-center justify-between py-1.5"
                  style={{ borderBottom: i === topWinRate.length - 1 ? undefined : '1px dashed var(--qms-border)' }}
                >
                  <div className="flex items-center gap-2">
                    <UserAvatar firstName={row.repName.split(' ')[0]} lastName={row.repName.split(' ')[1]} size="sm" />
                    <span className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{row.repName.split(' ')[0]}</span>
                  </div>
                  <span
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold"
                    style={{ background: tone.background, color: tone.color }}
                  >
                    {row.winRate.toFixed(0)}%
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default PerformanceTab
