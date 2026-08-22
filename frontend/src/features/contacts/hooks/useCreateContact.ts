import { useCreateEntity } from '@/hooks/useCreateEntity'
import { contactsService } from '@/features/contacts/contacts.service'
import { contactKeys } from '@/features/contacts/hooks/useContacts'
import type { CreateContactPayload } from '@/features/contacts/contact.types'

export const useCreateContact = () =>
  useCreateEntity((payload: CreateContactPayload) => contactsService.createContact(payload), contactKeys.all)
