import { FiRefreshCw, FiX } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import { callSafely } from '@/components/widgets/upload/callSafely'

// Small presentational rows for useEntityImageUpload's feedback rendering — split out because
// react-refresh's lint rule flags a file mixing a hook export with component exports.

export const ErrorBanner = ({ message }: { message: string }) => (
  <div className="text-[11px] rounded-lg px-2.5 py-1.5 bg-danger-soft border border-danger text-danger wrap-break-word">
    {message}
  </div>
)

// Non-blocking: the replacement itself recovered (e.g. the old file was confirmed restored), so this
// is dismissible on its own — but cleanup may still need action, shown separately via CleanupLine.
export const WarningBanner = ({ message, onDismiss }: { message: string; onDismiss: () => void }) => (
  <div className="flex items-start gap-2 text-[11px] rounded-lg px-2.5 py-1.5 bg-warning-soft border border-warning text-warning wrap-break-word">
    <span className="flex-1">{message}</span>
    <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
      <FiX size={13} />
    </button>
  </div>
)

export const RetryRow = ({ label, onRetry }: { label: string; onRetry: () => void }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-[11px] text-danger wrap-break-word">{label}</span>
    <Button type="button" size="xs" variant="outline" onClick={() => callSafely(onRetry)}>
      <FiRefreshCw size={11} /> Retry
    </Button>
  </div>
)

export const CleanupLine = ({ status, onRetry }: { status: 'cleanup-failed' | 'cleanup-uncertain'; onRetry: () => void }) => (
  <div className="flex flex-wrap items-center gap-2">
    <span className="text-[10.5px] wrap-break-word" style={{ color: 'var(--qms-text-muted)' }}>
      {status === 'cleanup-failed'
        ? "The failed upload couldn't be cleaned up."
        : "Cleanup of the failed upload is unconfirmed."}
    </span>
    <Button type="button" size="xs" variant="outline" onClick={() => callSafely(onRetry)}>
      Retry cleanup
    </Button>
  </div>
)
