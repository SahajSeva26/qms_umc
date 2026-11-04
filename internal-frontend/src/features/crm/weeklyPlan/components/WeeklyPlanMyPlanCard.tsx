import { useState } from 'react'
import { FiCalendar, FiCheckCircle, FiRefreshCw, FiSend } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import { useWeeklyPlansReal } from '@/features/crm/weeklyPlan/hooks/useWeeklyPlansReal'
import { useMoveWeeklyPlanStage } from '@/features/crm/weeklyPlan/hooks/useMoveWeeklyPlanStage'
import WeeklyPlanStatusPill from '@/features/crm/weeklyPlan/components/WeeklyPlanStatusPill'
import WeeklyPlanFormDialog from '@/features/crm/weeklyPlan/components/WeeklyPlanFormDialog'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'
// Local-timezone-safe — see WeeklyPlanFormDialog.tsx's comment on why these, not toISOString().
import { startOfWeek, addDays, dayKey } from '@/utils/calendarDate'
import type { WeeklyPlanEntity } from '@/types/weeklyPlan.types'

function fmtRange(a: Date, b: Date) {
  const opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' }
  return `${a.toLocaleDateString('en-IN', opts)} – ${b.toLocaleDateString('en-IN', opts)}`
}

// most recent stage-history entry landing on `to` — used to show who approved/rejected and why.
function latestEntryTo(plan: WeeklyPlanEntity, to: WeeklyPlanEntity['status']) {
  return [...plan.stageHistory].reverse().find((e) => e.to === to)
}

// KAM-facing "my weekly plan" card — reads/writes the real backend (no auto-generate/report
// half; that part has no backend support).
const WeeklyPlanMyPlanCard = () => {
  const { session } = useSession()
  const myRoleId = session?.role.id
  const nextWeekStart = startOfWeek(addDays(new Date(), 7))
  const nextWeekEnd = addDays(nextWeekStart, 6)

  // Bound to the exact Monday–Sunday window, not "from next Monday onward" — an open-ended
  // dateFrom would surface a plan for a LATER week instead of this one if more than one exists.
  const { data, isLoading, isError, refetch } = useWeeklyPlansReal(
    { salesPerson: myRoleId, dateFrom: dayKey(nextWeekStart), dateTo: dayKey(nextWeekEnd), limit: '1' },
    { enabled: !!myRoleId },
  )
  const existing: WeeklyPlanEntity | undefined = data?.data?.items?.[0]

  const [dialogOpen, setDialogOpen] = useState(false)
  const [resubmitReason, setResubmitReason] = useState('')
  const moveStage = useMoveWeeklyPlanStage(existing?.id ?? '')

  const handleResubmit = async () => {
    if (!resubmitReason.trim()) return
    try {
      await moveStage.mutateAsync({ to: 'pending', reason: resubmitReason.trim() })
      toast.success('Plan resubmitted for approval')
      setResubmitReason('')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Could not resubmit the plan.'))
    }
  }

  return (
    <div className="rounded-[14px] border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <h3 className="flex items-center gap-2 text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>
        <FiCalendar size={15} /> Next-week plan
      </h3>
      <div className="text-[11px] mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>
        {fmtRange(nextWeekStart, nextWeekEnd)}
      </div>

      {isLoading && (
        <div className="text-[12px] py-2" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
      )}

      {isError && !isLoading && (
        <div className="text-[12px] py-2 text-danger">
          Couldn't load your weekly plan.{' '}
          <button type="button" className="underline decoration-dotted" onClick={() => void refetch()}>Retry</button>
        </div>
      )}

      {!isLoading && !isError && existing && (
        <>
          <div className="grid grid-cols-4 gap-2 mb-2">
            <div className="text-center py-2 px-1 rounded-lg" style={{ background: 'color-mix(in srgb, var(--qms-brand) 5%, transparent)' }}>
              <b className="block text-[17px] font-extrabold" style={{ color: 'var(--qms-brand)' }}>{existing.plans.length}</b>
              <span className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Planned</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <WeeklyPlanStatusPill status={existing.status} />
            <Button type="button" variant="ghost" size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
              <FiRefreshCw size={13} /> Edit
            </Button>
          </div>
          {existing.status === 'approved' && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg px-2.5 py-2" style={{ background: 'color-mix(in srgb, #047857 10%, transparent)' }}>
              <FiCheckCircle size={14} className="shrink-0 mt-0.5" style={{ color: '#047857' }} />
              <p className="text-[11px]" style={{ color: 'var(--qms-text)' }}>
                <b>Approved</b>
                {(() => {
                  const entry = latestEntryTo(existing, 'approved')
                  if (!entry) return '.'
                  const by = entry.actor?.name ? ` by ${entry.actor.name}` : ''
                  return `${by}${entry.reason ? ` — "${entry.reason}"` : ''}`
                })()}
              </p>
            </div>
          )}
          {existing.status === 'rejected' && (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                Rejected — adjust your plan and resubmit with a reason.
              </p>
              <div className="flex gap-1.5">
                <input
                  value={resubmitReason}
                  onChange={(e) => setResubmitReason(e.target.value)}
                  placeholder="Reason for resubmitting..."
                  className="flex-1 h-8 rounded-lg border px-2.5 text-[12px]"
                  style={{ borderColor: 'var(--qms-border)' }}
                />
                <Button type="button" size="sm" disabled={!resubmitReason.trim() || moveStage.isPending} onClick={handleResubmit}>
                  Resubmit
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && !isError && !existing && (
        <>
          <div className="text-[12px] py-2" style={{ color: 'var(--qms-text-muted)' }}>
            No plan submitted for this week yet.
          </div>
          <Button type="button" size="sm" className="gap-1.5" onClick={() => setDialogOpen(true)}>
            <FiSend size={13} /> Submit weekly plan
          </Button>
        </>
      )}

      <WeeklyPlanFormDialog
        key={existing?.id ?? 'new'}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={() => { void refetch() }}
        plan={existing}
      />
    </div>
  )
}

export default WeeklyPlanMyPlanCard
