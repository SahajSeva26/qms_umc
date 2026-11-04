// Mirror of the backend's employee.constants.ts EMPLOYEE_DEPARTMENTS / DESIGNATIONS_BY_DEPARTMENT
// (reused by the contact module server-side — contact.validators.ts imports the same constants).
// Keep these two files in sync if the backend list ever changes.

export const CONTACT_DEPARTMENTS = {
  MARKETING: 'marketing',
  PURCHASE: 'purchase',
  ACCOUNT: 'account',
  LOGISTIC: 'logistic',
} as const

export type ContactDepartment = (typeof CONTACT_DEPARTMENTS)[keyof typeof CONTACT_DEPARTMENTS]

export const CONTACT_DEPARTMENT_LABEL: Record<ContactDepartment, string> = {
  [CONTACT_DEPARTMENTS.MARKETING]: 'Marketing',
  [CONTACT_DEPARTMENTS.PURCHASE]: 'Purchase',
  [CONTACT_DEPARTMENTS.ACCOUNT]: 'Account',
  [CONTACT_DEPARTMENTS.LOGISTIC]: 'Logistic',
}

const GENERIC_DESIGNATIONS = [
  { key: 'executive', name: 'Executive' },
  { key: 'manager', name: 'Manager' },
  { key: 'head', name: 'Head' },
  { key: 'other', name: 'Other' },
] as const

export const DESIGNATIONS_BY_DEPARTMENT: Record<ContactDepartment, { key: string; name: string }[]> = {
  [CONTACT_DEPARTMENTS.MARKETING]: [
    { key: 'jrpmt', name: 'Jr PMT' },
    { key: 'pmt', name: 'PMT' },
    { key: 'sr.pmt', name: 'Sr.PMT' },
    { key: 'gpm', name: 'GPM' },
    { key: 'sr.gpm', name: 'Sr.GPM' },
    { key: 'marketingmanager', name: 'Marketing Manager' },
    { key: 'divisionhead', name: 'Division Head' },
    { key: 'buhead', name: 'BU Head' },
    { key: 'gm', name: 'GM' },
    { key: 'sr.gm', name: 'Sr.GM' },
    { key: 'vp', name: 'VP' },
    { key: 'sr.vp', name: 'Sr.VP' },
    { key: 'president', name: 'President' },
    { key: 'other', name: 'Other' },
  ],
  [CONTACT_DEPARTMENTS.PURCHASE]: [...GENERIC_DESIGNATIONS],
  [CONTACT_DEPARTMENTS.ACCOUNT]: [...GENERIC_DESIGNATIONS],
  [CONTACT_DEPARTMENTS.LOGISTIC]: [...GENERIC_DESIGNATIONS],
}

export function designationLabel(department: string | undefined, designationKey: string | undefined): string | undefined {
  if (!department || !designationKey) return designationKey
  return DESIGNATIONS_BY_DEPARTMENT[department as ContactDepartment]?.find((d) => d.key === designationKey)?.name ?? designationKey
}
