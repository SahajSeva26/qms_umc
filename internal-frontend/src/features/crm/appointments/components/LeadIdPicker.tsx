import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import { LEAD_STATUS_LABEL } from '@/types/crm.types'
import type { LeadEntity } from '@/types/crm.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface LeadIdPickerProps {
  value: string
  label: string
  divisionId?: string
  onChange: (leadId: string, leadLabel: string, lead: LeadEntity | null) => void
}

const leadLabel = (lead: LeadEntity) => `${lead.title} (${lead.code})`

// Free-text typeahead over GET /leads?title=<keyword>; single-select, replaces value on pick.
const LeadIdPicker = ({ value, label, divisionId, onChange }: LeadIdPickerProps) => {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query)
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const searchQuery = { title: debouncedQuery.trim(), division: divisionId || undefined, limit: '10' }
  const { data, isFetching, isError, refetch } = useQuery({
    queryKey: ['leads', searchQuery],
    queryFn: () => crmService.searchLeads(searchQuery),
    enabled: !!debouncedQuery.trim(),
  })
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<LeadEntity>
      value={value}
      label={label}
      onChange={(id, nextLabel) => onChange(id, nextLabel, results.find((lead) => lead.id === id) ?? null)}
      query={query}
      onQueryChange={setQuery}
      open={open}
      onOpenChange={setOpen}
      containerRef={containerRef}
      results={results}
      isFetching={isFetching}
      isError={isError}
      errorText="Couldn't search leads."
      onRetry={() => { void refetch() }}
      getId={(lead) => lead.id}
      getLabel={leadLabel}
      searchPlaceholder="Search lead by title..."
      clearAriaLabel="Clear linked lead"
      emptyQueryText="Type a lead title to search."
      noResultsText="No matching leads found."
      renderResult={(lead) => (
        <>
          <span className="truncate">{leadLabel(lead)}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide shrink-0" style={{ color: 'var(--qms-text-muted)' }}>
            {LEAD_STATUS_LABEL[lead.status]}
          </span>
        </>
      )}
    />
  )
}

export default LeadIdPicker
