import { useState } from 'react'
import { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { useSession } from '@/hooks/useSession'
import type { Tenant } from '@/types/accessManagement.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface TenantIdPickerProps {
  value: string
  label: string
  onChange: (tenantId: string, tenantLabel: string) => void
}

// Free-text search over GET /tenants?name=<keyword>, no page cap. A non-manager is scoped to
// their own book or an unassigned tenant; tenant:manage keeps full visibility.
const TenantIdPicker = ({ value, label, onChange }: TenantIdPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const { open, setOpen, containerRef } = useAsyncPickerState()
  const { session, hasPermission } = useSession()

  const scopedToOwnBook = !hasPermission('tenant:manage')

  const { data, isFetching, isError, refetch } = useTenants({
    name: debouncedQuery.trim() || undefined,
    status: 'active',
    salesRep: scopedToOwnBook ? session?.role.id : undefined,
    limit: '10',
  })
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<Tenant>
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
      isError={isError}
      errorText="Couldn't search companies."
      onRetry={() => { void refetch() }}
      getId={(tenant) => tenant.id}
      getLabel={(tenant) => tenant.name}
      searchPlaceholder="Search company..."
      clearAriaLabel="Clear selected company"
      emptyQueryText="Type a company name to search."
      noResultsText="No matching companies found."
      renderResult={(tenant) => <span className="truncate">{tenant.name}</span>}
    />
  )
}

export default TenantIdPicker
