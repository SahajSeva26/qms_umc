import type { DoctorSpecialization } from '@/types/doctor.types'

export function initials(name: string): string {
  return (name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
}

export const SPECIALIZATION_OPTIONS: { value: DoctorSpecialization; label: string }[] = [
  { value: 'cp', label: 'CP' },
  { value: 'gp', label: 'GP' },
]
