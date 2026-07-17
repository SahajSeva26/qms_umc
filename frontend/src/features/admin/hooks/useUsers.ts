import { useQuery } from '@tanstack/react-query'
import { adminService } from '@/features/admin/admin.service'
import type { SearchUserQuery } from '@/types/user.types'

export const useUsers = (query: SearchUserQuery) => {
  return useQuery({
    queryKey: ['users', query],
    queryFn: () => adminService.searchUsers(query),
  })
}
