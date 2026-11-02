import { useState } from 'react'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { useAsyncPickerState } from '@/hooks/useAsyncPickerState'
import type { ContactEntity } from '@/types/contact.types'
import AsyncPicker from '@/components/ui/AsyncPicker'

interface ContactPersonIdPickerProps {
  value: string
  label: string
  divisionId?: string
  onChange: (contactId: string, contactLabel: string) => void
}

// Free-text search over GET /contacts?division=&name=<keyword> — useContacts debounces `name`
// internally. No page cap, unlike a plain <Select> fed by a single fixed-limit page.
const ContactPersonIdPicker = ({ value, label, divisionId, onChange }: ContactPersonIdPickerProps) => {
  const [query, setQuery] = useState('')
  const { open, setOpen, containerRef } = useAsyncPickerState()

  const { data, isFetching, isError, refetch } = useContacts(
    { division: divisionId, name: query.trim() || undefined, status: 'active', limit: '10' },
    { enabled: !!divisionId },
  )
  const results = data?.data?.items ?? []

  return (
    <AsyncPicker<ContactEntity>
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
      errorText="Couldn't search contacts."
      onRetry={() => { void refetch() }}
      getId={(contact) => contact.id}
      getLabel={(contact) => contact.name}
      searchPlaceholder={divisionId ? 'Search contact...' : 'Select a division first'}
      clearAriaLabel="Clear selected contact"
      emptyQueryText={divisionId ? 'Type a contact name to search, or pick from the list.' : undefined}
      noResultsText="No matching contacts found."
      disabled={!divisionId}
      renderResult={(contact) => <span className="truncate">{contact.name}</span>}
    />
  )
}

export default ContactPersonIdPicker
