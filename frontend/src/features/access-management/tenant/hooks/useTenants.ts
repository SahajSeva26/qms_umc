import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SearchTenantQuery } from '@/types/accessManagement.types'

export const tenantKeys = createEntityKeys<SearchTenantQuery>('tenants', 'tenant')

export const useTenants = (query: SearchTenantQuery, enabled = true) =>
  useEntityQuery(tenantKeys, (q) => accessManagementService.searchTenants(q), query, { enabled })
