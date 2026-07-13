import { FiEdit2 } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import UserAvatar from '@/components/ui/UserAvatar'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import { Button } from '@/components/ui/button'
import { formatDate, formatINR, formatPercent } from '@/utils/formatters'
import type { RepAssignment, RepTarget, SalesRep } from '@/types/salesdash.types'
import { CLIENT_NAMES, QUARTER } from '@/features/crm/sales/sales.mock'
import { TARGET_STATUS_META, firstNameOf, progressPct, splitName, tintStyle } from '@/features/crm/sales/sales.utils'

interface RepDrawerProps {
  rep: SalesRep | null
  reps: SalesRep[]
  targets: RepTarget[]
  assignments: RepAssignment[]
  isApprover: boolean
  onClose: () => void
  onEditTarget: (repId: string) => void
}

const RepDrawer = ({ rep, reps, targets, assignments, isApprover, onClose, onEditTarget }: RepDrawerProps) => {
  if (!rep) return <SideDrawer open={false} title="" onClose={onClose}><div /></SideDrawer>

  const { firstName, lastName } = splitName(rep.name)
  const target = targets.find((t) => t.repId === rep.id && t.quarter === QUARTER)
  const own = assignments.filter((a) => a.repId === rep.id)
  const manager = reps.find((r) => r.id === rep.reportsTo)
  const statusMeta = target ? TARGET_STATUS_META[target.status] : null

  return (
    <SideDrawer open title="Rep dashboard" onClose={onClose}>
      <div className="flex items-start gap-3 mb-4">
        <UserAvatar firstName={firstName} lastName={lastName} tone={rep.tone} size="lg" />
        <div className="min-w-0">
          <div className="text-[15px] font-bold" style={{ color: 'var(--qms-text)' }}>{rep.name}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{rep.role}</div>
          <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-soft)' }}>{rep.phone} · {rep.email}</div>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {statusMeta ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle(statusMeta.color)}>
                {statusMeta.label}
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={tintStyle('#94a3b8')}>No target</span>
            )}
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
            >
              {QUARTER}
            </span>
            {rep.relievedOn && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger">
                Relieved {formatDate(rep.relievedOn)}
              </span>
            )}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl border p-3.5 mb-4"
        style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      >
        <KeyValueGrid
          items={[
            { label: 'Target', value: target ? formatINR(target.target) : '—' },
            { label: 'Achieved', value: target ? formatINR(target.achieved) : '—' },
            { label: 'Pipeline', value: target ? formatINR(target.pipeline) : '—' },
            { label: 'Progress', value: target ? formatPercent(progressPct(target), 0) : '—' },
            { label: 'Accounts assigned', value: own.length },
            { label: 'Joined', value: formatDate(rep.joined) },
            { label: 'HQ', value: rep.hq },
            { label: 'Manager', value: manager ? firstNameOf(manager.name) : '—' },
          ]}
        />
      </div>

      <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        Assigned accounts
      </div>
      <div className="space-y-1.5 mb-4">
        {own.length === 0 && (
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No accounts assigned yet.</div>
        )}
        {own.map((a) => (
          <div
            key={`${a.repId}-${a.clientId}`}
            className="flex items-center justify-between rounded-lg border px-3 py-2"
            style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
          >
            <span className="text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>
              {CLIENT_NAMES[a.clientId] ?? a.clientId}
            </span>
            <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
              {a.divisionIds.length > 0 ? `${a.divisionIds.length} division${a.divisionIds.length === 1 ? '' : 's'}` : 'Whole account'}
            </span>
          </div>
        ))}
      </div>

      {target && (
        <div
          className="rounded-xl p-3 mb-4"
          style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)' }}
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--qms-text-muted)' }}>
            Target rationale
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--qms-text-soft)' }}>{target.rationale}</p>
          <div className="text-[10px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
            Set by {target.setBy} · {formatDate(target.setOn)}
          </div>
        </div>
      )}

      {isApprover && !rep.relievedOn && (
        <Button variant="outline" size="sm" onClick={() => onEditTarget(rep.id)}>
          <FiEdit2 data-icon="inline-start" /> Edit target
        </Button>
      )}
    </SideDrawer>
  )
}

export default RepDrawer
