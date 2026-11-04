import { ACCESS_MANAGEMENT_ROUTES } from '@/features/access-management/accessManagement.paths'

// Derived from (not duplicated from) ACCESS_MANAGEMENT_ROUTES — accessManagement.paths.ts is the
// canonical source for these two URLs; this just gives the Employee sub-feature its own narrower
// name for them, without a second hardcoded literal that could drift out of sync on a rename.
export const EMPLOYEE_ROUTES = {
  EMPLOYEES: ACCESS_MANAGEMENT_ROUTES.EMPLOYEES,
  EMPLOYEE_DETAIL: ACCESS_MANAGEMENT_ROUTES.EMPLOYEE_DETAIL,
}
