import { useGetEntity } from '@/hooks/useGetEntity'
import { contactsService } from '@/features/contacts/contacts.service'
import { contactKeys } from '@/features/contacts/hooks/useContacts'

export const useContact = (id: string | undefined) => useGetEntity(contactKeys.detail, contactsService.getContact, id)
