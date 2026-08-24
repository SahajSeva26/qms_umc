import { useState } from 'react'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useEligibleMrs } from '@/features/pharma/hooks/useEligibleMrs'
import type { RoleEntity } from '@/types/accessManagement.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface MrPickerProps {
  value: string
  label: string
  onChange: (mrRoleId: string, mrLabel: string) => void
}

// Server-scopes results to the caller's own downline — never fetches
// more than the caller is actually allowed to book for.
const mrLabel = (mr: RoleEntity) => `${mr.name} (${mr.code})`

const MrPicker = ({ value, label, onChange }: MrPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { mrs, isFetching, error, hasMore, loadMore, refetch } = useEligibleMrs(query, open)

  return (
    <AsyncPicker<RoleEntity>
      value={value}
      label={label}
      onChange={onChange}
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      containerRef={containerRef}
      results={mrs}
      // Only the very first page shows the "Searching…" state — a load-more
      // fetch keeps the existing results visible with its own Loading… label.
      isFetching={isFetching && mrs.length === 0}
      getId={(mr) => mr.id}
      getLabel={mrLabel}
      searchPlaceholder="Search MR by name…"
      clearAriaLabel="Clear selected MR"
      emptyQueryText="Start typing to search your team."
      noResultsText="No matching MRs found."
      renderResult={(mr) => <>{mrLabel(mr)}</>}
      isError={!!error}
      errorText="Couldn't load your team's MRs. Try again."
      onRetry={() => refetch()}
      hasMore={hasMore}
      isLoadingMore={isFetching && mrs.length > 0}
      onLoadMore={loadMore}
    />
  )
}

export default MrPicker
