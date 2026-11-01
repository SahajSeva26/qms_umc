import { useGetEntity } from '@/hooks/useGetEntity'
import { adminService } from '@/features/admin/admin.service'
import { userKeys } from '@/features/admin/hooks/useUsers'

export const useUser = (id: string | undefined) => useGetEntity(userKeys.detail, adminService.getUser, id)
