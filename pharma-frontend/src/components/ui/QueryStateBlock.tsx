import type { ReactNode } from 'react'
import { Button } from '@qms/ui'

interface QueryStateBlockProps {
  isLoading: boolean
  error: unknown
  loadingLabel: string
  errorLabel: string
  children: ReactNode
  /** Wire to the query's own `refetch` to show a retry button — omit for a page that has none to offer. */
  onRetry?: () => void
  /** Shape-matched skeleton for the initial pending state — falls back to plain loading text if omitted. */
  loadingSkeleton?: ReactNode
  /** True during a background refetch with data already on screen — dims content instead of
   * replaying the full skeleton. Wire alongside `keepPreviousData`. */
  isFetching?: boolean
}

// Shared loading/error/content switch used across every list page — content
// only renders once loading has finished and no error occurred.
const QueryStateBlock = ({ isLoading, error, loadingLabel, errorLabel, children, onRetry, loadingSkeleton, isFetching }: QueryStateBlockProps) => {
  if (isLoading) {
    if (loadingSkeleton) return <>{loadingSkeleton}</>
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

  return (
    <div style={isFetching ? { opacity: 0.6, transition: 'opacity 150ms' } : undefined} aria-busy={isFetching || undefined}>
      {children}
    </div>
  )
}

export default QueryStateBlock
