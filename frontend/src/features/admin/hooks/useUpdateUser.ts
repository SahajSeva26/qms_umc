import { useMutation, useQueryClient } from '@tanstack/react-query'
import { adminService } from '@/features/admin/admin.service'
import type { UpdateUserPayload } from '@/types/user.types'

export const useUpdateUser = (id: string) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: UpdateUserPayload) => adminService.updateUser(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', id] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
