import api from '@/lib/api/api'
import type { ApiResponse, PaginatedResponse } from '@/types/common.types'
import type {
  ContactEntity,
  CreateContactPayload,
  SearchContactQuery,
  UpdateContactPayload,
} from '@/types/contact.types'

// Follows the exact pattern of `@/features/doctors/doctors.service.ts`: same
// shared `api` axios instance, same ApiResponse/PaginatedResponse envelope
// typing, a plain object export, no class/default export. No delete endpoint
// exists (contact.controller.ts has none) and no move-stage — status is a
// plain field updated via updateContact.

const searchContacts = async (query: SearchContactQuery) => {
  const res = await api.get<PaginatedResponse<ContactEntity>>('/contacts', { params: query })
  return res.data
}

const getContact = async (id: string) => {
  const res = await api.get<ApiResponse<ContactEntity>>(`/contacts/${id}`)
  return res.data
}

const createContact = async (payload: CreateContactPayload) => {
  const res = await api.post<ApiResponse<ContactEntity>>('/contacts', payload)
  return res.data
}

const updateContact = async (id: string, payload: UpdateContactPayload) => {
  const res = await api.put<ApiResponse<ContactEntity>>(`/contacts/${id}`, payload)
  return res.data
}

export const contactsService = {
  searchContacts,
  getContact,
  createContact,
  updateContact,
}
