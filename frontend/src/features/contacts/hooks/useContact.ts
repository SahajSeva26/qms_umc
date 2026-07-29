import { useQuery } from '@tanstack/react-query'
import { contactsService } from '@/features/contacts/contacts.service'

// Mirrors `@/features/access-management/role/hooks/useRole.ts` exactly.
export const useContact = (id: string | undefined) => {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => contactsService.getContact(id as string),
    enabled: !!id,
  })
}
