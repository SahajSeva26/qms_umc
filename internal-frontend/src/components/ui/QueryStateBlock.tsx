import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface QueryStateBlockProps {
  isLoading: boolean
  error: unknown
  loadingLabel: string
  errorLabel: string
  children: ReactNode
  /** Wire to the query's own `refetch` to show a retry button — omit for a page that has none to offer. */
  onRetry?: () => void
}

// Shared loading/error/content switch used across every list page — content
// only renders once loading has finished and no error occurred.
const QueryStateBlock = ({ isLoading, error, loadingLabel, errorLabel, children, onRetry }: QueryStateBlockProps) => {
  if (isLoading) {
    return (
      <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
        {loadingLabel}
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-between gap-3 text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
        <span>{errorLabel}</span>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0">
            Retry
          </Button>
        )}
      </div>
    )
  }

  return <>{children}</>
}

export default QueryStateBlock
