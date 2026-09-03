import { FiX } from 'react-icons/fi'
import { Input } from '@/components/ui/input'

interface AsyncPickerProps<TResult> {
  /** Associates a <label htmlFor> with the search input — omit for pickers with no such label. */
  id?: string
  value: string
  label: string
  onChange: (id: string, label: string) => void
  query: string
  onQueryChange: (query: string) => void
  open: boolean
  onOpenChange: (open: boolean) => void
  containerRef: React.RefObject<HTMLDivElement | null>
  results: TResult[]
  isFetching: boolean
  getId: (result: TResult) => string
  getLabel: (result: TResult) => string
  renderResult: (result: TResult) => React.ReactNode
  searchPlaceholder: string
  clearAriaLabel: string
  // Shown when the query is empty and the caller never fetches on an empty query.
  emptyQueryText?: string
  /** Shown when the query is empty but the fetch ran anyway and found nothing; falls back to noResultsText. */
  emptyResultsText?: string
  noResultsText: string
  dropdownClassName?: string
  // Takes priority over the other empty/no-results states.
  isError?: boolean
  errorText?: string
  onRetry?: () => void
  /** Appends the next page's results to `results` rather than replacing them (typeahead "load more", not a page-flip). */
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  disabled?: boolean
  /** Rendered above the results list, only once results are actually present and ready (never during fetching/error/empty). */
  resultsBanner?: React.ReactNode
}

// Shared shell for a single-select, search-as-you-type dropdown field. Query state stays with the caller.
function AsyncPicker<TResult>({
  id, value, label, onChange, query, onQueryChange, open, onOpenChange, containerRef,
  results, isFetching, getId, getLabel, renderResult, searchPlaceholder, clearAriaLabel,
  emptyQueryText, emptyResultsText, noResultsText, dropdownClassName,
  isError, errorText, onRetry,
  hasMore, isLoadingMore, onLoadMore,
  disabled,
  resultsBanner,
}: AsyncPickerProps<TResult>) {
  const pickResult = (result: TResult) => {
    onChange(getId(result), getLabel(result))
    onQueryChange('')
    onOpenChange(false)
  }

  const clearSelection = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onChange('', '')
    onQueryChange('')
  }

  return (
    <div ref={containerRef} className="relative">
      {value ? (
        <div
          id={id}
          onClick={() => { if (disabled) return; clearSelection(); onOpenChange(true) }}
          className="flex items-center gap-2 h-8 min-w-0 rounded-lg border px-2.5 text-[13px]"
          style={{
            borderColor: 'var(--qms-border)',
            color: 'var(--qms-text)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <span className="flex-1 min-w-0 truncate">{label || value}</span>
          <button type="button" onClick={clearSelection} aria-label={clearAriaLabel} disabled={disabled}>
            <FiX size={13} style={{ color: 'var(--qms-text-muted)' }} />
          </button>
        </div>
      ) : (
        <Input
          id={id}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => { onQueryChange(e.target.value); onOpenChange(true) }}
          onFocus={() => onOpenChange(true)}
          className="text-[13px]"
          disabled={disabled}
        />
      )}

      {open && !value && !disabled && (
        <div
          className={
            dropdownClassName ??
            'absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10'
          }
        >
          {isFetching && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Searching…</div>
          )}
          {!isFetching && isError && (
            <div className="flex items-center justify-between gap-2 text-[12px] px-2 py-2 text-danger">
              <span>{errorText ?? 'Search failed. Try again.'}</span>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="shrink-0 font-semibold underline decoration-dotted underline-offset-2 hover:no-underline"
                >
                  Retry
                </button>
              )}
            </div>
          )}
          {!isFetching && !isError && query.trim() && results.length === 0 && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>{noResultsText}</div>
          )}
          {!isFetching && !isError && !query.trim() && emptyQueryText && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>{emptyQueryText}</div>
          )}
          {!isFetching && !isError && !query.trim() && !emptyQueryText && results.length === 0 && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>{emptyResultsText ?? noResultsText}</div>
          )}
          {!isFetching && !isError && results.length > 0 && resultsBanner}
          {!isError && results.map((result) => (
            <button
              key={getId(result)}
              type="button"
              onClick={() => pickResult(result)}
              className="w-full flex items-center justify-between gap-2 text-left text-[13px] px-2 py-1.5 rounded-md transition-colors hover:bg-(--qms-surface-hover)"
              style={{ color: 'var(--qms-text)' }}
            >
              {renderResult(result)}
            </button>
          ))}
          {!isError && hasMore && (
            <button
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
              className="w-full text-center text-[12px] font-semibold px-2 py-1.5 rounded-md transition-colors hover:bg-(--qms-surface-hover) disabled:opacity-60"
              style={{ color: 'var(--qms-brand)' }}
            >
              {isLoadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default AsyncPicker
