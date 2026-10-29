import { Component, createRef, type KeyboardEvent, type ReactNode } from 'react'
import { isChunkLoadError } from '@qms/ui'

export interface DialogErrorBoundaryProps {
  children: ReactNode
  /** Called when the fallback's Close button is clicked — must close the SAME dialog-open state
   * the crashed child was rendering from, or the parent is stuck believing its dialog is still
   * open (see each call site: the prop passed here is that site's existing close/setState(null)). */
  onClose: () => void
}

interface DialogErrorBoundaryState {
  hasError: boolean
  isChunkFailure: boolean
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

// Scoped to a single dialog/modal — a render crash inside it (or its lazy chunk failing to load)
// is contained here instead of bubbling to a route-level error boundary, which would replace the
// entire page behind it.
//
// Deliberately dependency-light and EAGER (never itself behind React.lazy): this boundary exists
// specifically to catch a failed `lazy(() => import(...))` for the dialog it wraps. If this
// boundary were ALSO lazy-loaded, a failure of ITS OWN chunk would have nothing left to catch the
// rejection, and the failure would bubble past it to a route-level boundary instead — the exact
// case this component exists to prevent. So it renders a plain, un-styled fallback (no @qms/ui
// Dialog/Button, no icon font, no @base-ui/react) rather than reaching for the real Dialog
// primitive — the wrapped child is free to render real Dialog chrome once it successfully loads,
// but the boundary's OWN fallback must not depend on anything that could itself fail to load.
// It's still a REAL modal despite being hand-rolled: aria-modal + focus entry/trap/restoration and
// Escape-to-close are implemented directly against the DOM below, with no new dependency.
//
// "Try again" (clear hasError, re-render children) only helps a genuinely re-runnable failure —
// e.g. a child throwing on a bad prop/response shape that a fresh render attempt can recover
// from. It does NOT help a failed `lazy(() => import(...))`: React permanently caches the
// REJECTED promise from a dynamic import() and will keep returning that same rejection on every
// future render of the same lazy component, so clearing this boundary's state alone would just
// re-throw the identical cached rejection forever. isChunkLoadError detects that case from the
// thrown error's message and swaps the action to "Reload application" — the only fix for a
// stale/missing chunk hash, since a hard reload is what re-fetches a current index.html (and
// therefore a current chunk hash) in the first place.
class DialogErrorBoundary extends Component<DialogErrorBoundaryProps, DialogErrorBoundaryState> {
  state: DialogErrorBoundaryState = { hasError: false, isChunkFailure: false }
  private panelRef = createRef<HTMLDivElement>()
  private previouslyFocused: HTMLElement | null = null

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, isChunkFailure: isChunkLoadError(error) }
  }

  componentDidMount() {
    // A child that throws during THIS component's very first render means `hasError` is already
    // true on mount — there is no earlier "false" render for componentDidUpdate to diff against,
    // so the initial-crash case is handled here instead.
    if (this.state.hasError) {
      this.previouslyFocused = document.activeElement as HTMLElement | null
      this.panelRef.current?.focus()
    }
  }

  componentDidUpdate(_prevProps: DialogErrorBoundaryProps, prevState: DialogErrorBoundaryState) {
    if (!prevState.hasError && this.state.hasError) {
      this.previouslyFocused = document.activeElement as HTMLElement | null
      this.panelRef.current?.focus()
    } else if (prevState.hasError && !this.state.hasError) {
      this.previouslyFocused?.focus()
      this.previouslyFocused = null
    }
  }

  componentWillUnmount() {
    if (this.state.hasError) {
      this.previouslyFocused?.focus()
    }
  }

  handleClose = () => {
    this.setState({ hasError: false, isChunkFailure: false })
    this.props.onClose()
  }

  handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation()
      this.handleClose()
      return
    }
    if (e.key !== 'Tab') return

    // Minimal focus trap: wrap Tab/Shift+Tab between the panel's first and last focusable
    // elements, so a keyboard user can't tab out to whatever is behind the overlay.
    const panel = this.panelRef.current
    if (!panel) return
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault()
      last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault()
      first.focus()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            ref={this.panelRef}
            role="alertdialog"
            aria-modal="true"
            aria-label="Something went wrong"
            tabIndex={-1}
            onKeyDown={this.handleKeyDown}
            className="w-full max-w-sm rounded-xl border bg-popover p-4 text-sm text-popover-foreground shadow-xl outline-none"
            style={{ borderColor: 'var(--qms-border, #d8e1f0)' }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[14px] font-semibold">Something went wrong</span>
              <button type="button" onClick={this.handleClose} aria-label="Close" className="text-[13px] opacity-70 hover:opacity-100">✕</button>
            </div>
            <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted, #6b7280)' }}>
              {this.state.isChunkFailure
                ? 'This dialog was updated since you loaded this page. Reload to get the latest version.'
                : "This dialog couldn't be displayed."}
            </p>
            {this.state.isChunkFailure ? (
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white"
                style={{ background: 'var(--qms-brand, #3b6dff)' }}
              >
                Reload application
              </button>
            ) : (
              <button
                type="button"
                onClick={() => this.setState({ hasError: false, isChunkFailure: false })}
                className="rounded-lg border px-3 py-1.5 text-[12px] font-semibold"
                style={{ borderColor: 'var(--qms-border, #d8e1f0)' }}
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default DialogErrorBoundary
