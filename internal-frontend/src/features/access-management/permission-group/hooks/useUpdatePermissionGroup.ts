import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { permissionGroupKeys } from '@/features/access-management/permission-group/hooks/usePermissionGroups'
import type { UpdatePermissionGroupPayload } from '@/types/accessManagement.types'

export const useUpdatePermissionGroup = (id: string) =>
  useUpdateEntity(
    (payload: UpdatePermissionGroupPayload) => accessManagementService.updatePermissionGroup(id, payload),
    [permissionGroupKeys.detail(id), permissionGroupKeys.all],
  )
