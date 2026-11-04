import { useEmployees } from '@/features/access-management/employee/hooks/useEmployees'
import { useSession } from '@/hooks/useSession'

// The logged-in FO's own HR record — Employee links to a Role's User, not the Role itself.
export function useMyEmployee() {
  const { session } = useSession()
  const userId = session?.user.id
  const { data, isLoading, error, refetch } = useEmployees({ user: userId, limit: '1' }, !!userId)
  const employee = data?.data?.items?.[0] ?? null
  return { employee, isLoading, error, refetch }
}
