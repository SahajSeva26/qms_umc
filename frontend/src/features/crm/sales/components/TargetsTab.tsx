import { useMemo } from 'react'
import { Button } from '@/components/ui/button'
import UserAvatar from '@/components/ui/UserAvatar'
import { formatINR } from '@/utils/formatters'
import type { RepAssignment, RepTarget, SalesRep, TargetStatus } from '@/types/salesdash.types'
import { CLIENT_NAMES, QUARTER } from '@/features/crm/sales/sales.mock'
import { TARGET_STATUS_META, progressPct, splitName, tintStyle } from '@/features/crm/sales/sales.utils'

interface TargetsTabProps {
  reps: SalesRep[]
  targets: RepTarget[]
  assignments: RepAssignment[]
  isApprover: boolean
  meRep: SalesRep | null
  onEditTarget: (repId: string) => void
}

const RING_COLORS: Record<TargetStatus, string> = {
  EXCEEDED: '#10b981',
  ON_TRACK: 'var(--qms-brand)',
  AT_RISK: '#f59e0b',
  BREACHED: '#f43f5e',
}

// SVG progress ring — same dasharray technique as the CRM ScoreDonut.
const ProgressRing = ({ progress, status }: { progress: number; status: TargetStatus }) => {
  const size = 88
  const radius = 36
  const circumference = 2 * Math.PI * radius
  const dash = (Math.min(progress, 100) / 100) * circumference

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--qms-surface-strong)" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={RING_COLORS[status]}
          strokeWidth={8}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[15px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{progress}%</span>
      </div>
    </div>
  )
}

const TargetsTab = ({ reps, targets, assignments, isApprover, meRep, onEditTarget }: TargetsTabProps) => {
  const scoped = isApprover ? reps : reps.filter((r) => r.id === meRep?.id)

  const kpis = useMemo(() => {
    const quarterTargets = targets.filter((t) => t.quarter === QUARTER)
    const totalTarget = quarterTargets.reduce((sum, t) => sum + t.target, 0)
    const totalAchieved = quarterTargets.reduce((sum, t) => sum + t.achieved, 0)
    const totalPipeline = quarterTargets.reduce((sum, t) => sum + t.pipeline, 0)
    const withTarget = reps.filter((r) => quarterTargets.some((t) => t.repId === r.id)).length
    const overall = totalTarget > 0 ? Math.round((totalAchieved / totalTarget) * 100) : 0
    return [
      { label: 'Quarter target', value: formatINR(totalTarget), sub: QUARTER },
      { label: 'Achieved', value: formatINR(totalAchieved), sub: `${overall}% of target` },
      { label: 'Pipeline', value: formatINR(totalPipeline), sub: 'weighted open value' },
      { label: 'Reps tracked', value: String(reps.length), sub: `${withTarget} with target · ${reps.length - withTarget} unset` },
    ]
  }, [reps, targets])

  return (
    <div>
      {isApprover && (
        <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
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
      )}

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {scoped.map((rep) => {
          const { firstName, lastName } = splitName(rep.name)
          const target = targets.find((t) => t.repId === rep.id && t.quarter === QUARTER)
          const statusMeta = target ? TARGET_STATUS_META[target.status] : null
          const clients = assignments.filter((a) => a.repId === rep.id)

          return (
            <div
              key={rep.id}
              className="rounded-2xl border p-4"
              style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <UserAvatar firstName={firstName} lastName={lastName} tone={rep.tone} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{rep.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{rep.role}</div>
                </div>
                {statusMeta ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={tintStyle(statusMeta.color)}>
                    {statusMeta.label}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={tintStyle('#94a3b8')}>No target</span>
                )}
              </div>

              <div className="flex items-center gap-4 mb-3">
                {target ? (
                  <ProgressRing progress={progressPct(target)} status={target.status} />
                ) : (
                  <div
                    className="w-22 h-22 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                    style={{ border: '8px solid var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}
                  >
                    unset
                  </div>
                )}
                <div className="grid grid-cols-1 gap-1.5 flex-1">
                  {[
                    { label: 'Target', value: target ? formatINR(target.target) : '—' },
                    { label: 'Achieved', value: target ? formatINR(target.achieved) : '—' },
                    { label: 'Pipeline', value: target ? formatINR(target.pipeline) : '—' },
                  ].map((stat) => (
                    <div key={stat.label} className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>
                        {stat.label}
                      </span>
                      <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {clients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {clients.map((a) => (
                    <span
                      key={`${a.repId}-${a.clientId}`}
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
                    >
                      {CLIENT_NAMES[a.clientId] ?? a.clientId}
                      {a.divisionIds.length > 0 ? ` · ${a.divisionIds.length} div` : ''}
                    </span>
                  ))}
                </div>
              )}

              {target && (
                <p
                  className="text-[11px] leading-relaxed mb-3 line-clamp-2"
                  style={{ color: 'var(--qms-text-muted)' }}
                  title={target.rationale}
                >
                  {target.rationale} — {target.setBy}
                </p>
              )}

              {isApprover && !rep.relievedOn && (
                <Button variant="outline" size="sm" onClick={() => onEditTarget(rep.id)}>
                  {target ? 'Edit target' : 'Set target'}
                </Button>
              )}
            </div>
          )
        })}
        {scoped.length === 0 && (
          <div className="col-span-full text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
            No reps to show.
          </div>
        )}
      </div>
    </div>
  )
}

export default TargetsTab
