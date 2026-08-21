import { useCreateEntity } from '@/hooks/useCreateEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { roleKeys } from '@/features/access-management/role/hooks/useRoles'
import type { CreateRolePayload } from '@/types/accessManagement.types'

// CreateRolePayload embeds a full `user: RegisterOwnerPayload` — backend creates
// the RoleType-bound user + Role together in one transaction (role.service.ts's `create`).
export const useCreateRole = () => useCreateEntity((payload: CreateRolePayload) => accessManagementService.createRole(payload), roleKeys.all)
