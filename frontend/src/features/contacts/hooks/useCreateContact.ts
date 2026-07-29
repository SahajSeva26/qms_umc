import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsService } from '@/features/contacts/contacts.service'
import type { CreateContactPayload } from '@/types/contact.types'

// Mirrors `@/features/doctors/hooks/useCreateDoctor.ts` exactly.
export const useCreateContact = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateContactPayload) => contactsService.createContact(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
