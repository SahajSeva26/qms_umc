import { useQuery } from '@tanstack/react-query'
import * as clientsService from '@/features/crm/clients/clients.service'
import type { ClientsData } from '@/features/crm/clients/clients.service'

const EMPTY: ClientsData = {
  clients: [],
  divisions: [],
  mrs: [],
  projects: [],
  invoices: [],
  doctors: [],
}

// Read-only shared wrapper around CRM Clients' data — lets other features
// (Analytics) read clients/projects/invoices without importing
// features/crm/clients/ internals directly. Mirrors useAuth.ts's role as the
// sanctioned shared surface over features/auth/. Mutations stay in
// features/crm/clients/hooks/useClientsData.ts — only CRM Clients itself
// acts on this data.
// `enabled` (default true) lets a caller skip the request entirely — e.g.
// DashboardPage, where this data feeds super_admin-only blocks and every other
// role would otherwise fetch the payload and render none of it.
export const useClientsDataShared = (options?: { enabled?: boolean }) => {
  const { data = EMPTY, isLoading, error } = useQuery({
    queryKey: ['clients-data'],
    queryFn: clientsService.getData,
    enabled: options?.enabled ?? true,
  })
  return { ...data, isLoading, error }
}
