import { useState } from 'react'
import { FiCheck, FiChevronDown, FiChevronUp, FiClipboard, FiUser, FiX } from 'react-icons/fi'
import { useWeeklyPlansReal } from '@/features/crm/weeklyPlan/hooks/useWeeklyPlansReal'
import { useMoveWeeklyPlanStage } from '@/features/crm/weeklyPlan/hooks/useMoveWeeklyPlanStage'
import WeeklyPlanStatusPill from '@/features/crm/weeklyPlan/components/WeeklyPlanStatusPill'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'
import type { WeeklyPlanEntity, WeeklyPlanItem } from '@/types/weeklyPlan.types'

function fmtRange(aIso: string, bIso: string) {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
  return `${new Date(aIso).toLocaleDateString('en-IN', opts)} – ${new Date(bIso).toLocaleDateString('en-IN', opts)}`
}
function fmtVisitDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })
}
const roleName = (role: WeeklyPlanEntity['salesPerson']) => (typeof role === 'string' ? role : role.name)
const populatedName = (value: { name?: string } | string) => (typeof value === 'string' ? value : value.name)

// One planned visit's detail — shown when a pending plan is expanded, so the approver can see
// exactly what they're approving/rejecting, not just a count.
const VisitDetailRow = ({ visit, index }: { visit: WeeklyPlanItem; index: number }) => (
  <div className="rounded-lg border px-2.5 py-2" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
    <div className="flex items-center justify-between gap-2">
      <span className="text-[11.5px] font-bold">
        {index + 1}. {populatedName(visit.tenant)} · {populatedName(visit.division)}
      </span>
      <span className="text-[10.5px] shrink-0" style={{ color: 'var(--qms-text-muted)' }}>{fmtVisitDate(visit.date)}</span>
    </div>
    <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
      {populatedName(visit.contactPerson)}
      {typeof visit.contactPerson !== 'string' && visit.contactPerson.designation && ` · ${visit.contactPerson.designation}`}
    </div>
    {visit.agenda?.public && (
      <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text)' }}>{visit.agenda.public}</div>
    )}
    {visit.lead && typeof visit.lead !== 'string' && (
      <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
        Follow-up on lead <b>{visit.lead.code}</b> · {visit.lead.title} ({visit.lead.status})
      </div>
    )}
    {visit.invoice && typeof visit.invoice !== 'string' && (
      <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
        Collection visit for invoice <b>{visit.invoice.code}</b> ({visit.invoice.status})
      </div>
    )}
  </div>
)

// Decision row for one pending plan — collects a reason, required by the backend on every
// stage change (MoveStagePayloadSchema.reason: z.string().min(1)).
const DecisionRow = ({ plan, onDone }: { plan: WeeklyPlanEntity; onDone: () => void }) => {
  const [reason, setReason] = useState('')
  const [pendingAction, setPendingAction] = useState<'approved' | 'rejected' | null>(null)
  const [expanded, setExpanded] = useState(false)
  const moveStage = useMoveWeeklyPlanStage(plan.id)

  const decide = async (to: 'approved' | 'rejected') => {
    if (!reason.trim()) {
      setPendingAction(to)
      return
    }
    try {
      await moveStage.mutateAsync({ to, reason: reason.trim() })
      toast.success(`Plan ${to} · ${roleName(plan.salesPerson)}`)
      setReason('')
      setPendingAction(null)
      onDone()
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not update the plan.'))
    }
  }

  return (
    <div className="rounded-[10px] border p-2.5" style={{ borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-2 mb-1.5">
        <FiUser size={13} style={{ color: 'var(--qms-text-muted)' }} />
        <b className="text-[12.5px]">{roleName(plan.salesPerson)}</b>
        <span className="ml-auto"><WeeklyPlanStatusPill status={plan.status} /></span>
      </div>
      <div className="text-[11px] flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        {fmtRange(plan.startDate, plan.endDate)} · <b>{plan.plans.length}</b> visits planned
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold underline decoration-dotted"
          style={{ color: 'var(--qms-brand)' }}
        >
          {expanded ? <>Hide visits <FiChevronUp size={12} /></> : <>View visits <FiChevronDown size={12} /></>}
        </button>
      </div>

      {expanded && (
        <div className="space-y-1.5 mt-2">
          {plan.plans.map((visit, i) => (
            <VisitDetailRow key={visit.id ?? i} visit={visit} index={i} />
          ))}
        </div>
      )}

      {pendingAction && (
        <input
          autoFocus
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={`Reason for ${pendingAction === 'approved' ? 'approving' : 'rejecting'}...`}
          className="w-full h-8 rounded-lg border px-2.5 text-[12px] mt-2"
          style={{ borderColor: 'var(--qms-border)' }}
        />
      )}

      <div className="flex gap-1.5 mt-2">
        <Button type="button" size="sm" className="gap-1" disabled={moveStage.isPending || (pendingAction === 'approved' && !reason.trim())} onClick={() => decide('approved')}>
          <FiCheck size={13} /> Approve
        </Button>
        <Button type="button" variant="ghost" size="sm" className="gap-1 text-danger" disabled={moveStage.isPending || (pendingAction === 'rejected' && !reason.trim())} onClick={() => decide('rejected')}>
          <FiX size={13} /> Reject
        </Button>
      </div>
    </div>
  )
}

// Sales-Head-facing "weekly plans to approve" queue — mirrors the prototype's headPlansCard().
// Gated by weekly-plan:manage; the backend has no per-plan supervisor scoping yet, so any
// actor holding the permission can act on any pending plan, org-wide.
const WeeklyPlanApprovalQueueCard = () => {
  const { data, isLoading, isError, refetch } = useWeeklyPlansReal({ status: 'pending', limit: '20' })
  const plans = data?.data?.items ?? []
  const totalPending = data?.data?.count ?? plans.length
  const truncated = totalPending > plans.length

  return (
    <div className="rounded-[14px] border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <h3 className="flex items-center gap-2 text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>
        <FiClipboard size={15} /> Weekly plans to approve
        {!isLoading && !isError && (
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
            style={{ background: 'color-mix(in srgb, #f59e0b 16%, transparent)', color: '#b45309' }}
          >
            {totalPending}
          </span>
        )}
      </h3>
      <div className="text-[11px] mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>
        All pending plans org-wide, awaiting approval
        {truncated && <span> — showing {plans.length} of {totalPending}</span>}
      </div>

      {isLoading && <div className="text-[12px] py-2" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>}

      {isError && !isLoading && (
        <div className="text-[12px] py-2 text-danger">
          Couldn't load pending plans.{' '}
          <button type="button" className="underline decoration-dotted" onClick={() => void refetch()}>Retry</button>
        </div>
      )}

      {!isLoading && !isError && plans.length === 0 && (
        <div className="text-[12px] py-2" style={{ color: 'var(--qms-text-muted)' }}>No plans submitted yet.</div>
      )}

      {!isLoading && !isError && plans.length > 0 && (
        <div className="space-y-2">
          {plans.map((plan) => (
            <DecisionRow key={plan.id} plan={plan} onDone={() => void refetch()} />
          ))}
        </div>
      )}
    </div>
  )
}

export default WeeklyPlanApprovalQueueCard
