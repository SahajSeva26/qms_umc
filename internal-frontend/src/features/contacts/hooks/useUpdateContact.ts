import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { contactsService } from '@/features/contacts/contacts.service'
import { contactKeys } from '@/features/contacts/hooks/useContacts'
import type { UpdateContactPayload } from '@/types/contact.types'

export const useUpdateContact = (id: string) =>
  useUpdateEntity((payload: UpdateContactPayload) => contactsService.updateContact(id, payload), [contactKeys.detail(id), contactKeys.all])
