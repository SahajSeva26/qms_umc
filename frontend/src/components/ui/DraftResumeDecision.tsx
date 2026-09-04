import { FiClock } from 'react-icons/fi'
import { Button } from '@/components/ui/button'

interface DraftResumeDecisionProps {
  itemLabel: string
  onResume: () => void
  onDiscard: () => void
}

// Shown instead of any editable step content whenever a saved draft exists
// and hasn't been resumed or discarded yet — no form field renders alongside
// this, so nothing typed here can be silently overwritten by whichever
// choice the user makes next.
const DraftResumeDecision = ({ itemLabel, onResume, onDiscard }: DraftResumeDecisionProps) => (
  <div className="flex flex-col items-center justify-center gap-3 py-14 text-center px-6">
    <span
      className="inline-flex items-center justify-center w-10 h-10 rounded-full"
      style={{ background: 'color-mix(in oklab, var(--qms-brand) 10%, transparent)', color: 'var(--qms-brand)' }}
    >
      <FiClock size={18} />
    </span>
    <div>
      <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>
        You have an unsaved {itemLabel} from earlier
      </div>
      <p className="text-[12px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
        Continue where you left off, or start fresh.
      </p>
    </div>
    <div className="flex gap-2 mt-1">
      <Button type="button" variant="ghost" onClick={onDiscard} style={{ border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}>
        Discard
      </Button>
      <Button
        type="button"
        onClick={onResume}
        className="font-bold text-white"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), #3b6dff 60%, var(--qms-teal))' }}
      >
        Resume
      </Button>
    </div>
  </div>
)

export default DraftResumeDecision
