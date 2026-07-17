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
export const useClientsDataShared = () => {
  const { data = EMPTY, isLoading, error } = useQuery({ queryKey: ['clients-data'], queryFn: clientsService.getData })
  return { ...data, isLoading, error }
}
