import { useState } from 'react'
import { useMoveCampStage } from '@/features/camps/hooks/useMoveCampStage'
import { useAllocateFo } from '@/features/camps/hooks/useAllocateFo'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CAMP_TRANSITION_MAP } from '@/types/campReal.types'
import type { CampEntity, CampStatus } from '@/types/campReal.types'

interface CampStageMovePanelProps {
  camp: CampEntity
  canWrite: boolean
  canMoveStage: boolean
}

const CampStageMovePanel = ({ camp, canWrite, canMoveStage }: CampStageMovePanelProps) => {
  const moveStage = useMoveCampStage(camp.id)
  const allocateFo = useAllocateFo(camp.id)

  const [stageTo, setStageTo] = useState<CampStatus | ''>('')
  const [stageReason, setStageReason] = useState('')
  const [stageError, setStageError] = useState<string | null>(null)

  const legalNextStatuses = CAMP_TRANSITION_MAP[camp.status]

  const handleMoveStage = () => {
    if (!stageTo) { setStageError('Pick a stage to move to'); return }
    if (!stageReason.trim()) { setStageError('Reason is required'); return }
    setStageError(null)
    moveStage.mutate({ to: stageTo, reason: stageReason }, { onSuccess: () => { setStageTo(''); setStageReason('') } })
  }

  return (
    <div
      className="rounded-xl border p-5 mb-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Move stage</h2>
      {legalNextStatuses.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          This camp is in a terminal status — no further transitions are possible.
        </p>
      ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Move to
            </Label>
            <Select key={stageTo || 'empty'} value={stageTo || undefined} onValueChange={(v) => setStageTo(v as CampStatus)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select next stage" />
              </SelectTrigger>
              <SelectContent>
                {legalNextStatuses.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
              Reason
            </Label>
            <Textarea value={stageReason} onChange={(e) => setStageReason(e.target.value)} placeholder="Required" />
          </div>
          {stageError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">{stageError}</div>
          )}
          {moveStage.isError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              {(moveStage.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to move stage.'}
            </div>
          )}
          <Button onClick={handleMoveStage} disabled={moveStage.isPending || !canMoveStage} title={!canMoveStage ? 'You do not have permission to change this camp\'s stage' : undefined}>
            {moveStage.isPending ? 'Moving…' : 'Move stage'}
          </Button>
        </div>
      )}

      {!camp.fo && canWrite && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--qms-border)' }}>
          <p className="text-[12px] mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            No field officer assigned yet.
          </p>
          <Button variant="outline" onClick={() => allocateFo.mutate()} disabled={allocateFo.isPending}>
            {allocateFo.isPending ? 'Allocating…' : 'Auto-allocate nearest FO'}
          </Button>
          {allocateFo.isError && (
            <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-2">
              {(allocateFo.error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Could not allocate an FO.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CampStageMovePanel
