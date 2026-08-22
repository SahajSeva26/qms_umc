import { useCreateEntity } from '@/hooks/useCreateEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { tenantKeys } from '@/features/access-management/tenant/hooks/useTenants'
import type { CreateTenantPayload } from '@/features/access-management/accessManagement.types'

export const useCreateTenant = () =>
  useCreateEntity((payload: CreateTenantPayload) => accessManagementService.createTenant(payload), tenantKeys.all)
