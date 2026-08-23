import { useCreateEntity } from '@/hooks/useCreateEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleTypeKeys } from '@/features/access-management/role-type/hooks/useRoleTypes'
import type { CreateRoleTypePayload } from '@/features/access-management/accessManagement.types'

export const useCreateRoleType = () =>
  useCreateEntity((payload: CreateRoleTypePayload) => accessManagementService.createRoleType(payload), roleTypeKeys.all)
