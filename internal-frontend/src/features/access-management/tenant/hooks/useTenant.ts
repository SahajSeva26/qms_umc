import { useGetEntity } from '@/hooks/useGetEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { tenantKeys } from '@/features/access-management/tenant/hooks/useTenants'

export const useTenant = (id: string | undefined) => useGetEntity(tenantKeys.detail, accessManagementService.getTenant, id)
