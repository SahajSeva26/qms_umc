import { useCreateEntity } from '@/hooks/useCreateEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { employeeKeys } from '@/features/access-management/employee/hooks/useEmployees'
import type { CreateEmployeePayload } from '@/types/accessManagement.types'

export const useCreateEmployee = () =>
  useCreateEntity((payload: CreateEmployeePayload) => accessManagementService.createEmployee(payload), employeeKeys.all)
