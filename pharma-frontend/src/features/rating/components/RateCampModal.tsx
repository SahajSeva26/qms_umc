import { useState } from 'react'
import { FiStar } from 'react-icons/fi'
import { Button } from '@qms/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { useRateCamp } from '@/features/rating/hooks/useRateCamp'
import { RATING_GROUNDS, type RatingGroundKey } from '@/features/rating/rating.constants'
import type { RatingEntity } from '@/types/rating.types'

type Scores = Record<RatingGroundKey, number>

const emptyScores = (): Scores => ({ onTime: 0, attire: 0, communication: 0 })
const scoresFrom = (rating: RatingEntity): Scores => ({ onTime: rating.onTime, attire: rating.attire, communication: rating.communication })

interface RateCampModalProps {
  open: boolean
  campId: string
  /** Present when editing an existing rating — pre-fills the picker and calls update, not create. */
  existing: RatingEntity | null
  onClose: () => void
}

// One star-button row per ground (onTime/attire/communication). No reason/feedback inputs —
// the backend model has no such fields.
const RateCampModal = ({ open, campId, existing, onClose }: RateCampModalProps) => {
  const [scores, setScores] = useState<Scores>(existing ? scoresFrom(existing) : emptyScores())
  const { rateCamp, updateRating, isSubmitting, isUpdating } = useRateCamp()
  const isSaving = isSubmitting || isUpdating

  const setGround = (key: RatingGroundKey, value: number) => setScores((prev) => ({ ...prev, [key]: value }))

  const allScored = RATING_GROUNDS.every((g) => scores[g.key] > 0)

  // useRateCamp already toasts on error — this catch only stops an unhandled rejection.
  const handleSubmit = async () => {
    try {
      if (existing) {
        await updateRating(existing.id, scores)
      } else {
        await rateCamp({ camp: campId, ...scores })
      }
      onClose()
    } catch {
      // already toasted by useRateCamp's onError
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{existing ? 'Edit rating' : 'Rate the field worker'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {RATING_GROUNDS.map((g) => (
            <div key={g.key} className="grid items-center gap-2" style={{ gridTemplateColumns: '110px 1fr 36px' }}>
              <div>
                <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{g.label}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{g.hint}</div>
              </div>
              <div className="inline-flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${g.label} ${n} of 5`}
                    aria-pressed={n <= scores[g.key]}
                    onClick={() => setGround(g.key, n)}
                    className="rounded-lg border flex items-center justify-center transition-transform hover:scale-110"
                    style={{
                      width: 28, height: 28,
                      color: n <= scores[g.key] ? '#f59e0b' : '#d1d5db',
                      borderColor: n <= scores[g.key] ? '#f59e0b' : 'var(--qms-border)',
                      background: n <= scores[g.key] ? 'rgba(245,158,11,.08)' : 'var(--qms-surface-card)',
                    }}
                  >
                    <FiStar size={14} fill={n <= scores[g.key] ? 'currentColor' : 'none'} />
                  </button>
                ))}
              </div>
              <div className="text-right text-[12px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{scores[g.key]}/5</div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!allScored || isSaving}>
            {existing ? 'Save changes' : 'Submit rating'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RateCampModal
