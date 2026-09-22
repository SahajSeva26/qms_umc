import { employeeFieldsSchema, type EmployeeFieldsValues } from '@/features/access-management/employee/schemas/employee.schemas'
import { useReshapingResolver } from '@/hooks/useReshapingResolver'
import type { BankDetails, EmployeeProfile } from '@/types/accessManagement.types'
import type { LocationValue } from '@/types/location.types'

// The backend's optional string fields are `.min(1).optional()` or a format regex — undefined is
// fine, but a plain '' from an untouched <Input> fails validation with a 400.
export function dropBlankStrings<T extends object>(obj: T | undefined): T | undefined {
  if (!obj) return obj
  const cleaned = Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key, typeof value === 'string' && value === '' ? undefined : value]),
  ) as T
  return cleaned
}

export const EMPTY_EMPLOYEE_FIELDS_VALUES: EmployeeFieldsValues = {
  phone: '',
  doj: '',
  dol: '',
  reason: '',
  status: undefined,
  salary: undefined,
  daRule: undefined,
  aadharNumber: '',
  panNumber: '',
  bankDetails: undefined,
  location: undefined,
  profile: undefined,
}

// `daRule` needs special handling: register('daRule.value', {valueAsNumber:true}) on an untouched
// form creates `{ value: NaN }` rather than `undefined`, so its `.optional()` never triggers.
export const useEmployeeFieldsResolver = () =>
  useReshapingResolver<EmployeeFieldsValues, EmployeeFieldsValues>({
    schema: employeeFieldsSchema,
    toPayload: (values) => ({
      ...values,
      phone: values.phone || undefined,
      dol: values.dol || undefined,
      reason: values.reason || undefined,
      aadharNumber: values.aadharNumber || undefined,
      panNumber: values.panNumber || undefined,
      daRule: values.daRule?.type ? values.daRule : undefined,
    }),
  })

// Drops blank optional fields (object and sub-fields alike) so a fully-empty section doesn't
// send '' where the backend's Zod schema requires undefined.
export function toEmployeeFieldsPayload(values: EmployeeFieldsValues) {
  return {
    type: 'field-officer' as const,
    doj: values.doj,
    dol: values.dol || undefined,
    reason: values.reason || undefined,
    status: values.status || undefined,
    salary: values.salary,
    daRule: values.daRule ? { type: values.daRule.type, value: values.daRule.value! } : undefined,
    aadharNumber: values.aadharNumber || undefined,
    panNumber: values.panNumber || undefined,
    bankDetails: dropBlankStrings<BankDetails>(values.bankDetails),
    location: dropBlankStrings<LocationValue>(values.location),
    profile: dropBlankStrings<EmployeeProfile>(values.profile),
  }
}
