import type { RoleEntity } from '@/types/accessManagement.types'

export const isValidLatitude = (lat: number): boolean => {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
}

export const isValidLongitude = (lng: number): boolean => {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180
}

// The backend never enforces that role.type matches the profile's type, so the form is the
// only place this mismatch is caught. role.type can populate to `null` for a dangling ref —
// treated as "not a match" rather than thrown on.
export function isFieldOfficerRole(role: RoleEntity): boolean {
  return typeof role.type === 'object' && role.type !== null && role.type.code === 'field-officer'
}

export function isDietitianRole(role: RoleEntity): boolean {
  return typeof role.type === 'object' && role.type !== null && role.type.code === 'dietitian'
}
