import { useState, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { FiFlag, FiX, FiSend, FiList, FiPlus } from 'react-icons/fi'
import { useQaFeedback } from '@/features/qa-feedback/hooks/useQaFeedback'
import FeedbackCard from '@/features/qa-feedback/components/FeedbackCard'
import { usePagination } from '@/hooks/usePagination'
import PaginationControls from '@/components/ui/PaginationControls'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'


// 'menu' = the two-choice popover (View tickets here / New ticket); 'viewing' = this page's own
// ticket list, read-only. 'picking'/'commenting' are the existing create flow, now entered via menu.
type Phase = 'idle' | 'menu' | 'viewing' | 'picking' | 'commenting'

// Escapes a route for safe use inside the backend's unanchored $regex pageRoute filter, then anchors
// it — otherwise "/camps" (a substring match) would also return "/camps/new"'s and "/camps/screening"'s
// tickets, not just this exact page's.
const exactPageRouteFilter = (pathname: string) => `^${pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`

const PAGE_TICKETS_SIZE = 10

const FeedbackWidget = () => {
  const location = useLocation()
  const { createFeedback, isCreating } = useQaFeedback({}, false)
  const [phase, setPhase] = useState<Phase>('idle')
  const [pin, setPin] = useState<{ xPercent: number; yPercent: number; clientX: number; clientY: number } | null>(null)
  const [comment, setComment] = useState('')
  // Standard limit:10 page size (matches the rest of the app), with real pagination controls — the
  // count is server-side and honest, never silently truncated past a hidden cap.
  const { page: pageTicketsPage, setPage: setPageTicketsPage, totalPages: pageTicketsTotalPages, resetToFirstPage: resetPageTicketsPage } = usePagination(PAGE_TICKETS_SIZE)
  // Enabled only while actually viewing the list, so navigating away or staying idle never fires an
  // unused query.
  const { items: pageItems, count: pageItemsCount, isLoading: pageItemsLoading, error: pageItemsError } = useQaFeedback(
    { pageRoute: exactPageRouteFilter(location.pathname), limit: String(PAGE_TICKETS_SIZE), page: String(pageTicketsPage) },
    phase === 'viewing',
  )

  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const dragState = useRef<{ offsetX: number; offsetY: number } | null>(null)
  const justDragged = useRef(false)

  const handleDragStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    dragState.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const handleDragMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragState.current) return
    justDragged.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.min(Math.max(e.clientX - dragState.current.offsetX, 0), window.innerWidth - rect.width)
    const y = Math.min(Math.max(e.clientY - dragState.current.offsetY, 0), window.innerHeight - rect.height)
    setDragPos({ x, y })
  }

  const handleDragEnd = () => {
    dragState.current = null
  }

  const handleTriggerClick = () => {
    // A drag that moved the button shouldn't also open the menu.
    if (justDragged.current) {
      justDragged.current = false
      return
    }
    setPhase('menu')
  }

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
          onClick={handleTriggerClick}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          className="fixed z-100 flex items-center gap-2 rounded-full px-4 py-3 text-[13px] font-bold text-white shadow-lg transition-transform hover:scale-105 touch-none cursor-grab active:cursor-grabbing"
          style={{
            background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))',
            ...(dragPos
              ? { left: dragPos.x, top: dragPos.y, right: 'auto', bottom: 'auto' }
              : { bottom: '1.25rem', right: '1.25rem' }),
          }}
        >
          <FiFlag size={16} />
          Flag Issue
        </button>
      )}

      {phase === 'menu' && (
        <>
          <div className="fixed inset-0 z-90" onClick={reset} />
          <div
            className="fixed z-100 bottom-20 right-5 w-56 rounded-xl border p-1.5 shadow-xl"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
          >
            <button
              onClick={() => { resetPageTicketsPage(); setPhase('viewing') }}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-left transition-colors hover:bg-(--qms-surface-hover)"
              style={{ color: 'var(--qms-text)' }}
            >
              <FiList size={14} /> View tickets on this page
            </button>
            <button
              onClick={() => setPhase('picking')}
              className="w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-semibold text-left transition-colors hover:bg-(--qms-surface-hover)"
              style={{ color: 'var(--qms-text)' }}
            >
              <FiPlus size={14} /> New ticket
            </button>
          </div>
        </>
      )}

      {phase === 'viewing' && (
        <>
          <div className="fixed inset-0 z-90" onClick={reset} />
          <div
            className="fixed z-100 bottom-20 right-5 w-96 max-h-[70vh] rounded-xl border shadow-xl flex flex-col"
            style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2.5 border-b shrink-0" style={{ borderColor: 'var(--qms-border)' }}>
              <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>
                Tickets on this page{!pageItemsLoading && !pageItemsError ? ` (${pageItemsCount})` : ''}
              </span>
              <button onClick={reset} aria-label="Close" className="rounded-lg p-1 hover:bg-(--qms-surface-hover)">
                <FiX size={15} style={{ color: 'var(--qms-text-muted)' }} />
              </button>
            </div>
            <div className="overflow-y-auto p-2.5 space-y-2">
              {pageItemsLoading ? (
                <div className="text-[12px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading tickets…</div>
              ) : pageItemsError ? (
                <div className="text-[12px] py-6 text-center rounded-lg bg-danger-soft border border-danger text-danger">
                  Failed to load tickets for this page.
                </div>
              ) : pageItems.length === 0 ? (
                <div className="text-[12px] py-6 text-center rounded-lg border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
                  No tickets raised on this page yet.
                </div>
              ) : (
                <>
                  {pageItems.map((report) => <FeedbackCard key={report.id} report={report} compact />)}
                  <PaginationControls
                    page={pageTicketsPage}
                    totalPages={pageTicketsTotalPages(pageItemsCount)}
                    onPageChange={setPageTicketsPage}
                  />
                </>
              )}
            </div>
          </div>
        </>
      )}

      {phase === 'picking' && (
        <>
          <div className="fixed top-0 inset-x-0 z-100 flex items-center justify-between px-4 py-2.5" style={{ background: 'var(--qms-brand)' }}>
            <span className="text-[13px] font-bold text-white">Click the exact spot you want to flag</span>
            <button onClick={reset} aria-label="Cancel" className="rounded-lg p-1 hover:bg-white/20">
              <FiX size={16} className="text-white" />
            </button>
          </div>
          <div data-testid="feedback-pick-surface" className="fixed inset-0 z-90 cursor-crosshair" onClick={handlePick} />
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
