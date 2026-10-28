import { useEntityQuery } from '@/hooks/useEntityQuery'
import { createEntityKeys } from '@/hooks/entityQueryKeys'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import type { SearchEmployeeQuery } from '@/types/accessManagement.types'

export const employeeKeys = createEntityKeys<SearchEmployeeQuery>('employees', 'employee')

export const useEmployees = (query: SearchEmployeeQuery, enabled = true) =>
  useEntityQuery(employeeKeys, (q) => accessManagementService.searchEmployees(q), query, { enabled })
