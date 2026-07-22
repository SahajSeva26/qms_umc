import { useQuery } from '@tanstack/react-query'
import { crmService } from '@/features/crm/crm.service'
import type { SearchDivisionQuery } from '@/types/crm.types'

// Thin useQuery wrapper, same pattern as access-management's useRoles/useTenants.
// Division search additionally accepts `lead:manage` as a permission gate
// (on top of division:manage/tenant:admin) specifically so a lead-manager-only
// caller can populate a division picker without needing division-admin rights
// — see division.routes.ts. `tenantId` (not `tenant`) is Division's real
// search-query field name.
export const useDivisions = (query: SearchDivisionQuery) => {
  return useQuery({
    queryKey: ['divisions', query],
    queryFn: () => crmService.searchDivisions(query),
  })
}
