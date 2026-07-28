// Contact domain types — mirrors the real backend exactly:
// backend/src/modules/crm/contact/{contact.model,contact.constants,contact.validators}.ts
//
// Contact has no state machine (status is a plain updatable enum field, not
// gated behind a moveStage-style endpoint) and no code/counter — confirmed
// via contact.constants.ts's COUNTER_ENTITY_TYPES list, which omits 'contact'.

export type ContactType = 'customer' | 'platform'
export type ContactStatus = 'active' | 'inactive'

export interface ContactPopulatedUser {
  firstName: string
  lastName?: string
  email: string
}

// tenant is only ever a raw ObjectId string on contact.mapper.ts's response —
// no populate() call anywhere in contact.service.ts's get/search.
export interface ContactEntity {
  id: string
  tenant: string
  name: string
  designation?: string
  email?: string
  phone?: string
  location?: string
  type: ContactType
  // Populated {firstName, lastName?, email} when the contact has a linked
  // login account, null otherwise — contact.mapper.ts always resolves this
  // (unlike tenant, which stays a raw id).
  user: ContactPopulatedUser | null
  hasLogin: boolean
  status: ContactStatus
  createdAt: string
  updatedAt: string
}

export interface SearchContactQuery {
  name?: string
  type?: ContactType
  status?: ContactStatus
  // Only honored for platform staff — contact.service.ts silently pins
  // customer-tenant callers to their own tenant regardless of this filter.
  tenant?: string
  page?: string
  limit?: string
}

// tenant required only for platform staff — contact.service.ts's
// resolveTenant() force-pins it to the caller's own tenant for a customer
// user and ignores whatever is sent here.
export interface CreateContactPayload {
  tenant?: string
  name: string
  designation?: string
  email?: string
  phone?: string
  location?: string
  type?: ContactType
  user?: string
}

// tenant is NOT editable — a contact never changes the company it belongs to.
export interface UpdateContactPayload {
  name?: string
  designation?: string
  email?: string
  phone?: string
  location?: string
  type?: ContactType
  user?: string
  status?: ContactStatus
}
