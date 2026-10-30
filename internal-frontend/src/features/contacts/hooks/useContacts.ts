import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { contactsService } from '@/features/contacts/contacts.service'
import type { SearchContactQuery } from '@/types/contact.types'

export const contactKeys = createEntityKeys<SearchContactQuery>('contacts', 'contact')

// Debounces `name` (the only free-text field) internally so every caller gets
// it for free, rather than relying on each call site to wire up its own
// useDebouncedValue before passing a search string in here.
export const useContacts = (query: SearchContactQuery, options?: { enabled?: boolean }) => {
  const debouncedName = useDebouncedValue(query.name, 300)
  return useEntityQuery(contactKeys, (q) => contactsService.searchContacts(q), { ...query, name: debouncedName }, options)
}
