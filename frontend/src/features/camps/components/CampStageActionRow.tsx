import { useState } from 'react'
import type { IconType } from 'react-icons'
import type { ReactNode } from 'react'
import { FiCheckCircle, FiPlay, FiCheck, FiX } from 'react-icons/fi'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMoveCampStage } from '@/features/camps/hooks/useMoveCampStage'
import { CAMP_TRANSITION_MAP } from '@/types/campReal.types'
import type { CampEntity, CampStatus } from '@/types/campReal.types'

// Prototype's action row (camps.js:595-605) is one-click, no reason field — our real moveStage
// API requires a reason string, so each button here opens a reason-prompt dialog instead.
const STAGE_BUTTON: Partial<Record<CampStatus, { label: string; icon: IconType; danger?: boolean }>> = {
  confirmed: { label: 'Confirm', icon: FiCheckCircle },
  live: { label: 'Start (Live)', icon: FiPlay },
  closed: { label: 'Close', icon: FiCheck },
  cancelled: { label: 'Cancel', icon: FiX, danger: true },
  cancelled_charged: { label: 'Cancel (charged)', icon: FiX, danger: true },
}

interface CampStageActionRowProps {
  camp: CampEntity
  canMoveStage: boolean
  // Rendered as a sibling in the same flex row (e.g. "Run screening"), matching the
  // prototype's single bottom action row (camps.js:595-605).
  extraAction?: ReactNode
}

const CampStageActionRow = ({ camp, canMoveStage, extraAction }: CampStageActionRowProps) => {
  const moveStage = useMoveCampStage(camp.id)
  const [promptTarget, setPromptTarget] = useState<CampStatus | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const legalNextStatuses = CAMP_TRANSITION_MAP[camp.status]
  const showStageButtons = legalNextStatuses.length > 0 && canMoveStage
  if (!showStageButtons && !extraAction) return null

  const openPrompt = (to: CampStatus) => {
    setPromptTarget(to)
    setReason('')
    setError(null)
  }

  const handleConfirm = () => {
    if (!promptTarget) return
    if (!reason.trim()) { setError('Reason is required'); return }
    moveStage.mutate(
      { to: promptTarget, reason: reason.trim() },
      { onSuccess: () => setPromptTarget(null) },
    )
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {extraAction}
        {showStageButtons && legalNextStatuses.map((to) => {
          const meta = STAGE_BUTTON[to]
          if (!meta) return null
          const Icon = meta.icon
          return (
            <Button
              key={to}
              variant="outline"
              onClick={() => openPrompt(to)}
              className={meta.danger ? 'text-danger border-danger hover:bg-danger-soft' : undefined}
            >
              <Icon size={14} /> {meta.label}
            </Button>
          )
        })}
      </div>

      <Dialog open={promptTarget !== null} onOpenChange={(open) => !open && setPromptTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{promptTarget ? STAGE_BUTTON[promptTarget]?.label : ''} · {camp.code}</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Reason *
            </Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Required" rows={3} />
            {error && <p className="text-[12px] mt-2 text-danger">{error}</p>}
            {moveStage.isError && (
              <p className="text-[12px] mt-2 text-danger">
                {(moveStage.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to move stage.'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptTarget(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={moveStage.isPending}>
              {moveStage.isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CampStageActionRow
