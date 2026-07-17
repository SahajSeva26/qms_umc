import { useQuery } from '@tanstack/react-query'
import { adminService } from '@/features/admin/admin.service'

export const useUser = (id: string | undefined) => {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => adminService.getUser(id as string),
    enabled: !!id,
  })
}
