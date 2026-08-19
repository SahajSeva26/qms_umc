import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'
import type { UpdateRolePayload } from '@/types/accessManagement.types'

export const useUpdateRole = (id: string) =>
  useUpdateEntity((payload: UpdateRolePayload) => accessManagementService.updateRole(id, payload), [roleKeys.detail(id), roleKeys.all])
