import { useState } from 'react'
import axios, { type AxiosInstance } from 'axios'
import { FiStar } from 'react-icons/fi'
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@qms/ui'
import { RATING_GROUNDS, useRateCamp, type RatingGroundKey, type RatingEntity } from '@qms/core'

type Scores = Record<RatingGroundKey, number>

const emptyScores = (): Scores => ({ onTime: 0, attire: 0, communication: 0 })
const scoresFrom = (rating: RatingEntity): Scores => ({ onTime: rating.onTime, attire: rating.attire, communication: rating.communication })

export interface RateCampModalProps {
  open: boolean
  campId: string
  /** Present when editing an existing rating — pre-fills the picker and calls update, not create. */
  existing: RatingEntity | null
  onClose: () => void
  /** The CALLING app's own configured axios instance — same convention as @qms/core's getMe(api). */
  api: AxiosInstance
  /** Each app's own toast function — both currently re-export the same `sonner` toast via
   * @qms/ui's Toaster, so this is typically just `import { toast } from '@qms/ui'`. */
  toast: { success: (msg: string) => void; error: (msg: string) => void }
  /** Each app's own axios-error-to-message extractor. */
  getErrorMessage: (err: unknown, fallback: string) => string
  /** Only supplied by CampRatingSection's create-only branch (no read capability at all — see
   * CampRatingAccess.canCreate without canSearch/canReadOwn): called with the backend's own
   * message when a create 409s because a rating already exists — the viewer has no way to SEE
   * that rating, so this surfaces a durable, honest explanation in the section instead of just a
   * toast, and closes the modal (there's nothing left to submit). Omitted for every other caller,
   * which already shows the existing rating inline and would never hit this 409 in the first
   * place (its own "Rate camp"/"Edit rating" buttons are gated on there being no existing rating). */
  onCreateConflict?: (message: string) => void
}

// One star-button row per ground — no reason/feedback inputs, the backend model has none. Always
// reachable (create when unrated, edit when already rated), unlike the prototype which hides it.
const RateCampModal = ({ open, campId, existing, onClose, api, toast, getErrorMessage, onCreateConflict }: RateCampModalProps) => {
  const [scores, setScores] = useState<Scores>(existing ? scoresFrom(existing) : emptyScores())
  const { rateCamp, updateRating, isSubmitting, isUpdating } = useRateCamp({ api, toast, getErrorMessage })
  const isSaving = isSubmitting || isUpdating

  const setGround = (key: RatingGroundKey, value: number) => setScores((prev) => ({ ...prev, [key]: value }))

  const allScored = RATING_GROUNDS.every((g) => scores[g.key] > 0)

  // useRateCamp's own mutations already toast — this catch only stops an unhandled rejection.
  // Only a genuine 409 (the backend's "already rated" conflict) is treated as unrecoverable for a
  // create-only caller — any other failure (network, 5xx, validation) leaves the modal open with
  // the viewer's scores intact so they can retry, same as every other caller.
  const handleSubmit = async () => {
    try {
      if (existing) {
        await updateRating(existing.id, scores)
      } else {
        await rateCamp({ camp: campId, ...scores })
      }
      onClose()
    } catch (err) {
      const isConflict = axios.isAxiosError(err) && err.response?.status === 409
      if (onCreateConflict && !existing && isConflict) {
        onCreateConflict(getErrorMessage(err, 'A rating already exists for this camp.'))
        onClose()
      }
      // already toasted by useRateCamp's onError; modal stays open for anything else
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
