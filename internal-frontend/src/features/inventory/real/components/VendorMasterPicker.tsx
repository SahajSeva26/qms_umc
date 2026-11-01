import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { vendorMasterService } from '@/features/inventory/real/vendorMaster.service'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import type { VendorMasterEntity } from '@/types/vendorMaster.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface VendorMasterPickerProps {
  value: string
  label: string
  onChange: (vendorId: string, vendorLabel: string) => void
}

const vendorLabel = (vendor: VendorMasterEntity) => `${vendor.name} (${vendor.code})`

// Never sends a `status` param — the backend's active-only default is exactly what a picker should offer.
const VendorMasterPicker = ({ value, label, onChange }: VendorMasterPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const searchQuery = { name: debouncedQuery.trim(), limit: '10' }
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['vendor-masters', 'picker', searchQuery],
    queryFn: () => vendorMasterService.searchVendorMasters(searchQuery),
    enabled: !!debouncedQuery.trim(),
  })
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<VendorMasterEntity>
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
      getId={(vendor) => vendor.id}
      getLabel={vendorLabel}
      searchPlaceholder="Search vendor by name..."
      clearAriaLabel="Clear selected vendor"
      emptyQueryText="Type a vendor name to search."
      noResultsText="No matching vendors found."
      renderResult={(vendor) => <>{vendorLabel(vendor)}</>}
      isError={isError}
      errorText="Couldn't search vendors. Try again."
      onRetry={() => refetch()}
    />
  )
}

export default VendorMasterPicker
