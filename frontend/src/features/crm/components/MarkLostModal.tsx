import { useState } from 'react'
import { LOST_CATEGORIES } from '@/features/crm/crm.mock'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { markLostSchema } from '@/features/crm/schemas/lead.schemas'

interface MarkLostModalProps {
  onConfirm: (category: string, reason: string) => void
  onCancel: () => void
}

const MarkLostModal = ({ onConfirm, onCancel }: MarkLostModalProps) => {
  const [category, setCategory] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = () => {
    const result = markLostSchema.safeParse({ category, reason })
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? 'Category and reason are both required.')
      return
    }
    onConfirm(result.data.category, result.data.reason)
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel() }}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Mark lead as lost</DialogTitle>
        </DialogHeader>

        <div>
          <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Category *
          </Label>
          <div className="grid grid-cols-2 gap-1.5">
            {LOST_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat)
                  setError(null)
                }}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border text-left transition-all"
                style={
                  category === cat
                    ? { background: 'var(--danger-soft)', borderColor: 'var(--danger)', color: 'var(--danger)' }
                    : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }
                }
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
            Reason *
          </Label>
          <Textarea
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              setError(null)
            }}
            rows={3}
            className="text-[13px]"
            aria-invalid={!!error}
          />
          {error && <p className="text-[11px] mt-1 text-danger">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm}>Confirm lost</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MarkLostModal
