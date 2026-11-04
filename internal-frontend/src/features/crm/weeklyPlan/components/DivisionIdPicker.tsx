import { useState } from 'react'
import { useDivisions } from '@/features/crm/divisions/hooks/useDivisions'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import type { DivisionEntity } from '@/types/crm.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface DivisionIdPickerProps {
  value: string
  label: string
  tenantId?: string
  onChange: (divisionId: string, divisionLabel: string) => void
}

// Free-text search over GET /divisions?tenant=&name=<keyword> — no page cap, unlike a plain
// <Select> fed by a single fixed-limit page.
const DivisionIdPicker = ({ value, label, tenantId, onChange }: DivisionIdPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { data, isFetching, isError, refetch } = useDivisions(
    { tenant: tenantId, name: debouncedQuery.trim() || undefined, status: 'active', limit: '10' },
    !!tenantId,
  )
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<DivisionEntity>
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
      errorText="Couldn't search divisions."
      onRetry={() => { void refetch() }}
      getId={(division) => division.id}
      getLabel={(division) => division.name}
      searchPlaceholder={tenantId ? 'Search division...' : 'Select a company first'}
      clearAriaLabel="Clear selected division"
      emptyQueryText={tenantId ? 'Type a division name to search, or pick from the list.' : undefined}
      noResultsText="No matching divisions found."
      disabled={!tenantId}
      renderResult={(division) => <span className="truncate">{division.name}</span>}
    />
  )
}

export default DivisionIdPicker
