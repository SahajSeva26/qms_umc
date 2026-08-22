import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { adminService } from '@/features/admin/admin.service'
import { userKeys } from '@/features/admin/hooks/useUsers'
import type { UpdateUserPayload } from '@/features/admin/user.types'

export const useUpdateUser = (id: string) =>
  useUpdateEntity((payload: UpdateUserPayload) => adminService.updateUser(id, payload), [userKeys.detail(id), userKeys.all])
