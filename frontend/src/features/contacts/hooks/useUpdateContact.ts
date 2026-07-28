import { useMutation, useQueryClient } from '@tanstack/react-query'
import { contactsService } from '@/features/contacts/contacts.service'
import type { UpdateContactPayload } from '@/types/contact.types'

// Mirrors `@/features/doctors/hooks/useUpdateDoctor.ts` exactly.
export const useUpdateContact = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateContactPayload) => contactsService.updateContact(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contact', id] })
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
    },
  })
}
