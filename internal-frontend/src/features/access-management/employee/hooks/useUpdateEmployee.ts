import { useUpdateEntity } from '@/hooks/useUpdateEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { employeeKeys } from '@/features/access-management/employee/hooks/useEmployees'
import type { UpdateEmployeePayload } from '@/types/accessManagement.types'

export const useUpdateEmployee = (id: string) =>
  useUpdateEntity(
    (payload: UpdateEmployeePayload) => accessManagementService.updateEmployee(id, payload),
    [employeeKeys.detail(id), employeeKeys.all],
  )
