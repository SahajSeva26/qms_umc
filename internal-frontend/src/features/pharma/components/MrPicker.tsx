import { useState } from 'react'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useEligibleMrs } from '@/features/pharma/hooks/useEligibleMrs'
import type { RoleEntity } from '@/types/accessManagement.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface MrPickerProps {
  value: string
  label: string
  // Third arg is the MR's normalized division id (null if unreadable) — see BookCampForm's mismatch guard.
  onChange: (mrRoleId: string, mrLabel: string, mrDivisionId: string | null) => void
}

// Server-scopes results to the caller's own downline — never fetches
// more than the caller is actually allowed to book for.
const mrLabel = (mr: RoleEntity) => `${mr.name} (${mr.code})`

// Mongoose's raw .populate() output carries `_id`, not `id` — same convention as every other
// RolePopulated* field on RoleEntity.
const mrDivisionId = (mr: RoleEntity): string | null =>
  typeof mr.division === 'string' ? mr.division : mr.division?._id ?? null

const MrPicker = ({ value, label, onChange }: MrPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { mrs, isFetching, error, hasMore, loadMore, refetch } = useEligibleMrs(query, open)

  const handleChange = (mrRoleId: string, mrLabel: string) => {
    const mr = mrs.find((m) => m.id === mrRoleId)
    onChange(mrRoleId, mrLabel, mr ? mrDivisionId(mr) : null)
  }

  return (
    <AsyncPicker<RoleEntity>
      value={value}
      label={label}
      onChange={handleChange}
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
