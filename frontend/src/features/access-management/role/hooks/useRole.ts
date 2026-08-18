import { useGetEntity } from '@/hooks/useGetEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'

export const useRole = (id: string | undefined) => useGetEntity(roleKeys.detail, accessManagementService.getRole, id)
