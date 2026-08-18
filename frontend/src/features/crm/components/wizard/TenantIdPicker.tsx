import { useState } from 'react'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface TenantIdPickerProps {
  value: string
  label: string
  onChange: (tenantId: string, tenantLabel: string) => void
}

interface TenantResult {
  id: string
  name: string
  code: string
}

const tenantLabel = (t: TenantResult) => `${t.name} (${t.code})`

// Same shape as LeadIdPicker.tsx — a single search box whose results appear
// automatically as you type, rather than a separate text box + dropdown.
const TenantIdPicker = ({ value, label, onChange }: TenantIdPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, 300)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { data, isFetching } = useTenants(
    { name: debouncedQuery.trim() || undefined, status: 'active', limit: '20' },
    open,
  )
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<TenantResult>
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
      getId={(t) => t.id}
      getLabel={tenantLabel}
      searchPlaceholder="Search company by name..."
      clearAriaLabel="Clear selected company"
      noResultsText="No matching companies found."
      emptyResultsText="No companies found."
      dropdownClassName="absolute left-0 right-0 top-full mt-1 z-50 p-1.5 rounded-lg bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 max-h-64 overflow-y-auto"
      renderResult={(t) => <>{tenantLabel(t)}</>}
    />
  )
}

export default TenantIdPicker
