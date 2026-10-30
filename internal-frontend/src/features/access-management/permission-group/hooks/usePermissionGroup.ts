import { useGetEntity } from '@/hooks/useGetEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { permissionGroupKeys } from '@/features/access-management/permission-group/hooks/usePermissionGroups'

export const usePermissionGroup = (id: string | undefined) =>
  useGetEntity(permissionGroupKeys.detail, accessManagementService.getPermissionGroup, id)
