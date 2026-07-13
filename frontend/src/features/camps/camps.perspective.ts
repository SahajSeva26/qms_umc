import type { UserRole } from '@/types/auth.types'

export type CampPerspective = 'internal' | 'pharma'

const PHARMA_ROLES: UserRole[] = ['pharma_ho', 'pharma_rsm', 'pharma_asm', 'pharma_mr']

export function perspectiveForRole(role: UserRole | undefined): CampPerspective {
  return role && PHARMA_ROLES.includes(role) ? 'pharma' : 'internal'
}

export function redactName(name: string, perspective: CampPerspective): string {
  return perspective === 'pharma' ? '████ ████' : name
}

export function redactPhone(_phone: string, perspective: CampPerspective): string {
  return perspective === 'pharma' ? '+91 ●●●●●●●●●●' : _phone
}
