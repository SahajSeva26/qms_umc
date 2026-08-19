import { FiX } from 'react-icons/fi'
import { Input } from '@/components/ui/input'

interface AsyncPickerProps<TResult> {
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
  // Shown instead of a results list when the query is empty (e.g. a "type
  // to search" prompt for callers that never fetch on an empty query).
  emptyQueryText?: string
  // Shown when the query is empty but the fetch still ran and returned zero
  // results. Falls back to noResultsText if omitted.
  emptyResultsText?: string
  noResultsText: string
  dropdownClassName?: string
}

// Shared shell for a single-select, search-as-you-type dropdown field: an
// input that swaps for a chip-with-clear once a value is picked. Query
// state/fetching stays with the caller — this component only owns the JSX shell.
function AsyncPicker<TResult>({
  value, label, onChange, query, onQueryChange, open, onOpenChange, containerRef,
  results, isFetching, getId, getLabel, renderResult, searchPlaceholder, clearAriaLabel,
  emptyQueryText, emptyResultsText, noResultsText, dropdownClassName,
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
          onClick={() => { clearSelection(); onOpenChange(true) }}
          className="flex items-center gap-2 h-8 min-w-0 rounded-lg border px-2.5 text-[13px] cursor-pointer"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
        >
          <span className="flex-1 min-w-0 truncate">{label || value}</span>
          <button type="button" onClick={clearSelection} aria-label={clearAriaLabel}>
            <FiX size={13} style={{ color: 'var(--qms-text-muted)' }} />
          </button>
        </div>
      ) : (
        <Input
          placeholder={searchPlaceholder}
          value={query}
          onChange={(e) => { onQueryChange(e.target.value); onOpenChange(true) }}
          onFocus={() => onOpenChange(true)}
          className="text-[13px]"
        />
      )}

      {open && !value && (
        <div
          className={
            dropdownClassName ??
            'absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10'
          }
        >
          {isFetching && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>Searching…</div>
          )}
          {!isFetching && query.trim() && results.length === 0 && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>{noResultsText}</div>
          )}
          {!isFetching && !query.trim() && emptyQueryText && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>{emptyQueryText}</div>
          )}
          {!isFetching && !query.trim() && !emptyQueryText && results.length === 0 && (
            <div className="text-[12px] px-2 py-2" style={{ color: 'var(--qms-text-muted)' }}>{emptyResultsText ?? noResultsText}</div>
          )}
          {results.map((result) => (
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
        </div>
      )}
    </div>
  )
}

export default AsyncPicker
