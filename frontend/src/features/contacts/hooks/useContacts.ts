import { useQuery } from '@tanstack/react-query'
import { contactsService } from '@/features/contacts/contacts.service'
import type { SearchContactQuery } from '@/types/contact.types'

// Mirrors `@/features/doctors/hooks/useDoctors.ts` exactly — `enabled`
// (default true) lets a caller (e.g. a mutation-only usage) skip the list
// fetch entirely.
export const useContacts = (query: SearchContactQuery, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ['contacts', query],
    queryFn: () => contactsService.searchContacts(query),
    enabled: options?.enabled ?? true,
  })
}
