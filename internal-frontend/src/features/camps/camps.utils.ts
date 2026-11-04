import type { Camp, CampStage } from '@/types/camp.types'
import { DOCTORS } from '@/features/camps/camps.mock'

// REQUESTED/UPCOMING are split by whether an FO is assigned, not by raw `status`.
export function campStage(c: Camp): CampStage {
  if (c.status === 'CANCELLED_CHARGED') return 'CANCELLED_CHARGED'
  if (c.status === 'CANCELLED') return 'CANCELLED'
  if (c.status === 'CLOSED') {
    const hasPhotos = (c.photos?.length ?? 0) > 0
    const hasCount = (c.patientsDone || c.patientCount || 0) > 0
    const hasPerPatient = c.submissionCompleted === true
    return hasPhotos && hasCount && hasPerPatient ? 'COMPLETED' : 'COMPLETED_PENDING'
  }
  if (c.status === 'LIVE') return 'LIVE'
  return c.foId ? 'UPCOMING' : 'REQUESTED'
}

export function getDoctor(doctorId: string) {
  return DOCTORS.find((d) => d.id === doctorId)
}

export function isChargeableCancellation(c: Camp): boolean {
  const hoursUntil = (new Date(`${c.date}T00:00:00`).getTime() - Date.now()) / 3_600_000
  return hoursUntil < 24
}
