import { useState } from 'react'
import type { IconType } from 'react-icons'
import type { ReactNode } from 'react'
import { FiCheckCircle, FiPlay, FiCheck, FiX } from 'react-icons/fi'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMoveCampStage } from '@/features/camps/hooks/useMoveCampStage'
import { useActivateCamp } from '@/features/camps/hooks/useActivateCamp'
import { isCampActivatableToday } from '@/features/camps/campsReal.utils'
import { formatDate } from '@/utils/formatters'
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
  // The camp's assigned FO/dietitian can start their own confirmed camp — role-gated on the
  // backend (PATCH /camps/:id/activate), not covered by canMoveStage's camp:manage check.
  canActivate?: boolean
  // Rendered as a sibling in the same flex row (e.g. "Run screening"), matching the
  // prototype's single bottom action row (camps.js:595-605).
  extraAction?: ReactNode
}

// 'live' isn't a real moveStage target when the viewer can only activate (not manage) — the
// activate mutation takes an optional reason, not the required one moveStage enforces.
const ACTIVATE_PROMPT = 'activate' as const
type PromptTarget = CampStatus | typeof ACTIVATE_PROMPT

const CampStageActionRow = ({ camp, canMoveStage, canActivate = false, extraAction }: CampStageActionRowProps) => {
  const moveStage = useMoveCampStage(camp.id)
  const activate = useActivateCamp(camp.id)
  const [promptTarget, setPromptTarget] = useState<PromptTarget | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const legalNextStatuses = CAMP_TRANSITION_MAP[camp.status]
  const showStageButtons = legalNextStatuses.length > 0 && canMoveStage
  // Only offer the activate button when the manager path isn't already showing the same transition.
  const showActivateButton = camp.status === 'confirmed' && canActivate && !(showStageButtons && legalNextStatuses.includes('live'))
  // Backend 422s PATCH /activate before the camp's scheduled day — disable (not hide) and explain,
  // rather than let the FO/dietitian hit a predictable failure.
  const activatableToday = isCampActivatableToday(camp.date)
  if (!showStageButtons && !showActivateButton && !extraAction) return null

  const openPrompt = (to: PromptTarget) => {
    setPromptTarget(to)
    setReason('')
    setError(null)
  }

  const activeMutation = promptTarget === ACTIVATE_PROMPT ? activate : moveStage

  const handleConfirm = () => {
    if (!promptTarget) return
    if (promptTarget === ACTIVATE_PROMPT) {
      activate.mutate(
        { reason: reason.trim() || undefined },
        { onSuccess: () => setPromptTarget(null) },
      )
      return
    }
    if (!reason.trim()) { setError('Reason is required'); return }
    moveStage.mutate(
      { to: promptTarget, reason: reason.trim() },
      { onSuccess: () => setPromptTarget(null) },
    )
  }

  const promptTitle = promptTarget === ACTIVATE_PROMPT ? 'Start (Live)' : promptTarget ? STAGE_BUTTON[promptTarget]?.label : ''

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {extraAction}
        {showActivateButton && (
          <div className="flex flex-col gap-1">
            <Button
              variant="outline"
              onClick={() => openPrompt(ACTIVATE_PROMPT)}
              disabled={!activatableToday}
            >
              <FiPlay size={14} /> Start (Live)
            </Button>
            {/* A disabled Button has pointer-events-none, so a `title` tooltip never shows on
                hover — render the explanation as visible text instead (also works on touch). */}
            {!activatableToday && (
              <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                Available on {formatDate(camp.date)}
              </span>
            )}
          </div>
        )}
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
            <DialogTitle>{promptTitle} · {camp.code}</DialogTitle>
          </DialogHeader>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Reason {promptTarget === ACTIVATE_PROMPT ? '(optional)' : '*'}
            </Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={promptTarget === ACTIVATE_PROMPT ? 'Optional' : 'Required'} rows={3} />
            {error && <p className="text-[12px] mt-2 text-danger">{error}</p>}
            {activeMutation.isError && (
              <p className="text-[12px] mt-2 text-danger">
                {(activeMutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update the camp.'}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromptTarget(null)}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={activeMutation.isPending}>
              {activeMutation.isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default CampStageActionRow
