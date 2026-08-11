// Contact domain types — mirrors the real backend exactly. No state machine
// (status is a plain enum field) and no code/counter.

export type ContactType = 'customer' | 'platform'
export type ContactStatus = 'active' | 'inactive'

export interface ContactPopulatedUser {
  firstName: string
  lastName?: string
  email: string
}

/** Populated shape for Contact.division — nested relations carry Mongoose's raw `_id`, not a mapped `id`. */
export interface ContactPopulatedDivision {
  _id?: string
  name: string
  code: string
  therapy: string[]
}

// tenant is only ever a raw ObjectId string on contact.mapper.ts's response —
// no populate() call anywhere in contact.service.ts's get/search.
export interface ContactEntity {
  id: string
  tenant: string
  // Required for 'customer'-type contacts, unset for 'platform' ones.
  // Populated as {_id, name, code, therapy} on GET/search.
  division?: ContactPopulatedDivision | string | null
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
  division?: string
  page?: string
  limit?: string
}

// tenant required only for platform staff — contact.service.ts's
// resolveTenant() force-pins it to the caller's own tenant for a customer
// user and ignores whatever is sent here.
export interface CreateContactPayload {
  tenant?: string
  // Required when type is 'customer' (the default); optional for 'platform'.
  division?: string
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
