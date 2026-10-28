import { Component, type ReactNode } from 'react'
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi'
import { Button, isChunkLoadError } from '@qms/ui'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface DialogErrorBoundaryProps {
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

// Scoped to a single dialog/modal — a render crash inside it (or its lazy chunk failing to load)
// is contained here instead of bubbling to RouteErrorBoundary, which would replace the entire
// page behind it. Rendered in a REAL Dialog shell (not a bare div) so the fallback itself is
// still a proper accessible dialog with focus trap/Escape/backdrop — a user isn't left looking
// at an unstyled error floating over whatever was behind the crashed child.
//
// "Try again" (clear hasError, re-render children) only helps a genuinely re-runnable failure —
// e.g. a child throwing on a bad prop/response shape that a fresh render attempt can recover
// from. It does NOT help a failed `lazy(() => import(...))`: React permanently caches the
// REJECTED promise from a dynamic import() and will keep returning that same rejection on every
// future render of the same lazy component, so clearing this boundary's state alone would just
// re-throw the identical cached rejection forever. isChunkLoadError (shared with
// RouteErrorBoundary) detects that case from the thrown error's message and swaps the action to
// "Reload application" — the only fix for a stale/missing chunk hash, since a hard reload is
// what re-fetches a current index.html (and therefore a current chunk hash) in the first place.
class DialogErrorBoundary extends Component<DialogErrorBoundaryProps, DialogErrorBoundaryState> {
  state: DialogErrorBoundaryState = { hasError: false, isChunkFailure: false }

  static getDerivedStateFromError(error: unknown) {
    return { hasError: true, isChunkFailure: isChunkLoadError(error) }
  }

  handleClose = () => {
    this.setState({ hasError: false, isChunkFailure: false })
    this.props.onClose()
  }

  render() {
    if (this.state.hasError) {
      return (
        <Dialog open onOpenChange={(open) => { if (!open) this.handleClose() }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Something went wrong</DialogTitle>
            </DialogHeader>
            <div className="text-center py-4">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft">
                <FiAlertTriangle size={20} className="text-danger" />
              </div>
              <p className="text-[12px] mb-4" style={{ color: 'var(--qms-text-muted)' }}>
                {this.state.isChunkFailure
                  ? 'This dialog was updated since you loaded this page. Reload to get the latest version.'
                  : "This dialog couldn't be displayed."}
              </p>
              {this.state.isChunkFailure ? (
                <Button size="sm" onClick={() => window.location.reload()}>
                  <FiRefreshCw size={12} /> Reload application
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => this.setState({ hasError: false, isChunkFailure: false })}>
                  Try again
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )
    }

    return this.props.children
  }
}

export default DialogErrorBoundary
