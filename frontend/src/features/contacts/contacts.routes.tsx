import type { RouteObject } from 'react-router-dom'
import RequirePermission from '@/components/layouts/RequirePermission'
import ContactsPage from './pages/ContactsPage'

export const CONTACT_ROUTES = {
  CONTACTS: '/crm/contacts',
}

// Matches contact.routes.ts's real GET guard exactly: contact:search,
// contact:manage, tenant:manage, tenant:admin (OR semantics).
const CONTACT_VIEW_PERMISSIONS = ['contact:search', 'contact:manage', 'tenant:manage', 'tenant:admin']

export const contactsRoutes: RouteObject[] = [
  {
    path: CONTACT_ROUTES.CONTACTS,
    element: (
      <RequirePermission anyOf={CONTACT_VIEW_PERMISSIONS}>
        <ContactsPage />
      </RequirePermission>
    ),
  },
]
