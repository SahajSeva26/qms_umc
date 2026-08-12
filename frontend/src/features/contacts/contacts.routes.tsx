import type { RouteObject } from 'react-router-dom'
import { lazyRoute } from '@/lib/router/lazyRoute'

export const CONTACT_ROUTES = {
  CONTACTS: '/crm/contacts',
}

// Matches contact.routes.ts's real GET guard exactly: contact:search,
// contact:manage, tenant:manage, tenant:admin (OR semantics).
const CONTACT_VIEW_PERMISSIONS = ['contact:search', 'contact:manage', 'tenant:manage', 'tenant:admin']

export const contactsRoutes: RouteObject[] = [
  {
    path: CONTACT_ROUTES.CONTACTS,
    lazy: lazyRoute(() => import('./pages/ContactsPage'), CONTACT_VIEW_PERMISSIONS),
  },
]
