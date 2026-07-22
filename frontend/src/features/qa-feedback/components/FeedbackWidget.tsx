import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { FiCheckSquare, FiX, FiSend } from 'react-icons/fi'
import { useQaFeedback } from '@/features/qa-feedback/hooks/useQaFeedback'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// Global "To Do" trigger — mounted once in AppLayout.tsx (sibling to
// Sidebar/Topbar/main), so it's available on every authenticated page.
//
// Flow: click the trigger -> the whole viewport becomes clickable (a
// transparent full-screen overlay tracks the cursor) -> tester clicks the
// exact live element/spot they want to flag -> a small comment popover
// appears anchored at that click point -> submit. No screenshot is
// captured or stored — this is a lightweight text-comment + rough-position
// report, not a visual one (deliberately dropped after an earlier version
// captured a full-page image via html2canvas-pro; removed because
// screenshot storage wasn't feasible to support right now).
//
// pinXPercent/pinYPercent are captured as a PERCENTAGE of the page's
// current viewport (0-100) at click time, not raw pixels — same
// resolution-independence rationale as the backend model's own comment.

type Phase = 'idle' | 'picking' | 'commenting'

const FeedbackWidget = () => {
  const location = useLocation()
  const { createFeedback, isCreating } = useQaFeedback()
  const [phase, setPhase] = useState<Phase>('idle')
  const [pin, setPin] = useState<{ xPercent: number; yPercent: number; clientX: number; clientY: number } | null>(null)
  const [comment, setComment] = useState('')

  const reset = () => {
    setPhase('idle')
    setPin(null)
    setComment('')
  }

  const handlePick = (e: React.MouseEvent<HTMLDivElement>) => {
    const xPercent = (e.clientX / window.innerWidth) * 100
    const yPercent = (e.clientY / window.innerHeight) * 100
    setPin({ xPercent, yPercent, clientX: e.clientX, clientY: e.clientY })
    setPhase('commenting')
  }

  const handleSubmit = async () => {
    if (!pin || !comment.trim()) return
    try {
      await createFeedback({
        pageRoute: location.pathname,
        pageTitle: document.title || undefined,
        pinXPercent: pin.xPercent,
        pinYPercent: pin.yPercent,
        comment: comment.trim(),
      })
      reset()
    } catch {
      // no-op: useQaFeedback's onError already toasted
    }
  }

  // Popover anchoring: flip to the left/above the click point when it's
  // near the right/bottom edge, so the box never renders off-screen.
  const popoverStyle: React.CSSProperties = pin
    ? {
        position: 'fixed',
        left: pin.clientX > window.innerWidth - 340 ? pin.clientX - 320 : pin.clientX + 16,
        top: pin.clientY > window.innerHeight - 220 ? pin.clientY - 200 : pin.clientY + 16,
      }
    : {}

  return (
    <>
      {phase === 'idle' && (
        <button
          onClick={() => setPhase('picking')}
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full px-4 py-3 text-[13px] font-bold text-white shadow-lg transition-transform hover:scale-105"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiCheckSquare size={16} />
          To Do
        </button>
      )}

      {phase === 'picking' && (
        <>
          <div className="fixed top-0 inset-x-0 z-100 flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--qms-brand)' }}>
            <span className="text-[13px] font-bold text-white">Click the exact spot you want to flag</span>
            <button onClick={reset} aria-label="Cancel" className="rounded-lg p-1 hover:bg-white/20">
              <FiX size={16} className="text-white" />
            </button>
          </div>
          <div className="fixed inset-0 z-90 cursor-crosshair" onClick={handlePick} />
        </>
      )}

      {phase === 'commenting' && pin && (
        <>
          <div className="fixed inset-0 z-90" onClick={reset} />
          <div
            className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-lg z-95 pointer-events-none"
            style={{ position: 'fixed', left: pin.clientX, top: pin.clientY, background: 'var(--qms-brand)' }}
          />
          <div
            className="z-100 w-80 rounded-xl border p-3 shadow-xl space-y-2"
            style={{ ...popoverStyle, borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What's wrong here? Be as specific as you can…"
              rows={3}
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="secondary" onClick={reset}>Cancel</Button>
              <Button size="sm" onClick={handleSubmit} disabled={isCreating || !comment.trim()}>
                <FiSend size={13} /> {isCreating ? 'Submitting…' : 'Submit'}
              </Button>
            </div>
          </div>
        </>
      )}
    </>
  )
}

export default FeedbackWidget
