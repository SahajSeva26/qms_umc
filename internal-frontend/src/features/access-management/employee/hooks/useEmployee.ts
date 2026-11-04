import { useGetEntity } from '@/hooks/useGetEntity'
import { accessManagementService } from '@/features/access-management/accessManagement.service'
import { employeeKeys } from '@/features/access-management/employee/hooks/useEmployees'

export const useEmployee = (id: string | undefined) => useGetEntity(employeeKeys.detail, accessManagementService.getEmployee, id)
