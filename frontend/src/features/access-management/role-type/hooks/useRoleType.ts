import { useGetEntity } from '@/hooks/useGetEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleTypeKeys } from '@/features/access-management/role-type/hooks/useRoleTypes'

export const useRoleType = (id: string | undefined) => useGetEntity(roleTypeKeys.detail, accessManagementService.getRoleType, id)
