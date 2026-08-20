import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { inventoryMasterService } from '@/features/inventory/real/inventoryMaster.service'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import type { InventoryMasterEntity, InventoryMasterType } from '@/types/inventoryMaster.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface InventoryMasterItemPickerProps {
  value: string
  label: string
  onChange: (itemId: string, itemLabel: string) => void
  type: InventoryMasterType
}

const itemLabel = (item: InventoryMasterEntity) => `${item.name} (${item.code})`

// Free-text typeahead over GET /inventory-masters, scoped to type.
const InventoryMasterItemPicker = ({ value, label, onChange, type }: InventoryMasterItemPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const searchQuery = { name: debouncedQuery.trim(), type, limit: '10' }
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['inventory-masters', 'item-picker', searchQuery],
    queryFn: () => inventoryMasterService.searchInventoryMasters(searchQuery),
    enabled: !!debouncedQuery.trim(),
  })
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<InventoryMasterEntity>
      value={value}
      label={label}
      onChange={onChange}
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      containerRef={containerRef}
      results={results}
      isFetching={isFetching}
      getId={(item) => item.id}
      getLabel={itemLabel}
      searchPlaceholder="Search catalog item by name..."
      clearAriaLabel="Clear selected item"
      emptyQueryText="Type an item name to search."
      noResultsText="No matching catalog items found."
      renderResult={(item) => <>{itemLabel(item)}</>}
      isError={isError}
      errorText="Couldn't search the catalog. Try again."
      onRetry={() => refetch()}
    />
  )
}

export default InventoryMasterItemPicker
