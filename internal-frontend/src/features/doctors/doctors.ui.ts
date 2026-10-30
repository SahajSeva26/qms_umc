// Re-exported for existing features/doctors/ consumers — the actual single source of truth now
// lives in types/doctor.types.ts (neutral layer), since cross-feature/shared widget components
// also need these and importing a feature's own ui.ts from outside that feature isn't allowed.
export { SPECIALIZATION_OPTIONS, SPECIALIZATION_LABEL } from '@/types/doctor.types'

export function initials(name: string): string {
  return (name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
}
