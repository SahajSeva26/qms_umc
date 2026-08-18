import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { tenantKeys } from '@/features/access-management/tenant/hooks/useTenants'
import type { UpdateTenantPayload } from '@/types/accessManagement.types'

export const useUpdateTenant = (id: string) =>
  useUpdateEntity(
    (payload: UpdateTenantPayload) => accessManagementService.updateTenant(id, payload),
    [tenantKeys.detail(id), tenantKeys.all],
  )
