import { useState } from 'react'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useMrPickerRoles } from '@/features/camps/hooks/useMrPickerRoles'
import type { RoleEntity } from '@/types/accessManagement.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface CampMrPickerProps {
  value: string
  label: string
  tenant: string | undefined
  onChange: (mrRoleId: string, mrLabel: string) => void
  disabled?: boolean
}

const mrLabel = (mr: RoleEntity) => `${mr.name} (${mr.code})`

// QMS-side MR picker for CampDetailPageReal — debounced, tenant-scoped, paginated search.
const CampMrPicker = ({ value, label, tenant, onChange, disabled }: CampMrPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { mrs, isFetching, error, hasMore, loadMore, refetch } = useMrPickerRoles(query, tenant, open)

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
      isFetching={isFetching && mrs.length === 0}
      getId={(mr) => mr.id}
      getLabel={mrLabel}
      searchPlaceholder={tenant ? 'Search MR by name…' : 'Select a company first'}
      clearAriaLabel="Clear selected MR"
      emptyQueryText={tenant ? 'Start typing to search MRs.' : undefined}
      noResultsText="No matching MRs found."
      renderResult={(mr) => <>{mrLabel(mr)}</>}
      isError={!!error}
      errorText="Couldn't search MRs. Try again."
      onRetry={() => refetch()}
      hasMore={hasMore}
      isLoadingMore={isFetching && mrs.length > 0}
      onLoadMore={loadMore}
      disabled={disabled}
    />
  )
}

export default CampMrPicker
