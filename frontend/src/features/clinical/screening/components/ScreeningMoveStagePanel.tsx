import { useState } from 'react'
import { useMoveScreeningStage } from '@/features/clinical/screening/hooks/useMoveScreeningStage'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ScreeningEntity, ScreeningStatus } from '@/features/clinical/screening/screening.types'
import { getApiErrorMessage } from '@/utils/apiError'

interface ScreeningMoveStagePanelProps {
  screening: ScreeningEntity
  canMoveStage: boolean
}

// Two explicit actions rather than a generic dropdown (unlike CampStageMovePanel) —
// "Mark completed" needs its own disabled-until-consent guard a dropdown would obscure.
const ScreeningMoveStagePanel = ({ screening, canMoveStage }: ScreeningMoveStagePanelProps) => {
  const moveStage = useMoveScreeningStage()
  const [pendingAction, setPendingAction] = useState<ScreeningStatus | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (screening.status !== 'pending') {
    return null
  }

  const consentVerified = screening.consent?.verified === true

  const openAction = (to: ScreeningStatus) => {
    setPendingAction(to)
    setReason('')
    setError(null)
  }

  const handleConfirm = () => {
    if (!pendingAction) return
    if (!reason.trim()) { setError('Reason is required'); return }
    setError(null)
    moveStage.mutate(
      { id: screening.id, payload: { to: pendingAction, reason } },
      { onSuccess: () => setPendingAction(null) },
    )
  }

  return (
    <div className="rounded-xl border p-5 mb-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Move stage</h2>

      {!pendingAction ? (
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => openAction('completed')}
            disabled={!canMoveStage || !consentVerified}
            title={!consentVerified ? 'Patient consent must be verified before completing the screening' : undefined}
          >
            Mark completed
          </Button>
          <Button variant="outline" onClick={() => openAction('cancelled')} disabled={!canMoveStage}>
            Cancel screening
          </Button>
          {!consentVerified && (
            <p className="text-[11px] w-full mt-1" style={{ color: 'var(--qms-text-muted)' }}>
              Consent must be verified before this screening can be marked completed.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Reason for {pendingAction === 'completed' ? 'completing' : 'cancelling'}
            </Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required" />
          </div>
          {error && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">{error}</div>
          )}
          {moveStage.isError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {getApiErrorMessage(moveStage.error, 'Could not update this screening.')}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPendingAction(null)}>Back</Button>
            <Button onClick={handleConfirm} disabled={moveStage.isPending}>
              {moveStage.isPending ? 'Saving…' : `Confirm ${pendingAction === 'completed' ? 'completion' : 'cancellation'}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScreeningMoveStagePanel
