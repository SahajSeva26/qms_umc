import { useState } from 'react'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useTenantScopedRolePicker } from '@/features/camps/hooks/useTenantScopedRolePicker'
import type { RoleEntity } from '@/types/accessManagement.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface CampFoPickerProps {
  value: string
  label: string
  tenant: string | undefined
  onChange: (foRoleId: string, foLabel: string) => void
  disabled?: boolean
}

const foLabel = (fo: RoleEntity) => `${fo.name} (${fo.code})`

// QMS-side Field Officer picker for CampDetailPageReal — debounced,
// tenant-scoped, paginated search. Thin UI wrapper over
// useTenantScopedRolePicker, shared with CampMrPicker. Unlike MR (required),
// this field is optional — an empty selection (value='') is a genuine,
// valid state meaning "auto-assign the nearest FO," which AsyncPicker's own
// empty-value rendering already handles with no special-casing needed here.
const CampFoPicker = ({ value, label, tenant, onChange, disabled }: CampFoPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { roles: fos, isFetching, error, hasMore, loadMore, refetch } = useTenantScopedRolePicker(query, tenant, 'field-officer', open)

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
      results={fos}
      isFetching={isFetching && fos.length === 0}
      getId={(fo) => fo.id}
      getLabel={foLabel}
      searchPlaceholder={tenant ? 'Search FO by name…' : 'Select a company first'}
      clearAriaLabel="Clear selected FO"
      emptyQueryText={tenant ? 'Start typing to search FOs.' : undefined}
      noResultsText="No matching field officers found."
      renderResult={(fo) => <>{foLabel(fo)}</>}
      isError={!!error}
      errorText="Couldn't search field officers. Try again."
      onRetry={() => refetch()}
      hasMore={hasMore}
      isLoadingMore={isFetching && fos.length > 0}
      onLoadMore={loadMore}
      disabled={disabled}
    />
  )
}

export default CampFoPicker
