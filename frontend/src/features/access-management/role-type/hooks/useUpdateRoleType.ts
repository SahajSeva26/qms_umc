import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleTypeKeys } from '@/features/access-management/role-type/hooks/useRoleTypes'
import type { UpdateRoleTypePayload } from '@/features/access-management/accessManagement.types'

export const useUpdateRoleType = (id: string) =>
  useUpdateEntity(
    (payload: UpdateRoleTypePayload) => accessManagementService.updateRoleType(id, payload),
    [roleTypeKeys.detail(id), roleTypeKeys.all],
  )
