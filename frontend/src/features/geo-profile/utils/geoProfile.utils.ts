import type { RoleEntity } from '@/types/accessManagement.types'

export const isValidLatitude = (lat: number): boolean => {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90
}

export const isValidLongitude = (lng: number): boolean => {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180
}

// A GeoProfile.role must actually be a field-officer-typed Role when the
// profile's own type is 'fo' — the backend never enforces this (confirmed),
// so the form is the only place this mismatch can be caught. 'dietitian' has
// no corresponding RoleType at all (confirmed against ALLOWED_ROLETYPE_CODES
// — GeoProfile's type is deliberately decoupled from role-type), so there is
// nothing to filter/validate against for that case; it's left unfiltered.
export function isFieldOfficerRole(role: RoleEntity): boolean {
  return typeof role.type !== 'string' && role.type.code === 'field-officer'
}
