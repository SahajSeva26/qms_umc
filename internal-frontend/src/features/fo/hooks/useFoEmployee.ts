import { useEmployees } from '@/features/access-management/employee/hooks/useEmployees'

// Employee links to a Role's User, not the Role itself — the caller must
// resolve `role.user._id` before this query can enable.
export function useFoEmployee(userId: string | undefined) {
  const { data, isLoading, error, refetch } = useEmployees({ user: userId, limit: '1' }, !!userId)
  const employee = data?.data?.items?.[0] ?? null
  return { employee, isLoading, error, refetch }
}
