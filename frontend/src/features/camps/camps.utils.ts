import type { Camp, CampStage } from '@/types/camp.types'
import { DOCTORS } from '@/features/camps/camps.mock'

// Mirrors the prototype's campStage() exactly — this is a real behavioral rule,
// not cosmetic: REQUESTED/UPCOMING are split by whether an FO is assigned,
// regardless of raw `status` being REQUESTED or CONFIRMED/SCHEDULED.
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

export function isCampOnHold(_c: Camp): boolean {
  // TODO: prototype derives this from device-fault status (window.QMS_isCampOnHold),
  // which we have no device/inventory module for yet — always false for now.
  return false
}

export function isChargeableCancellation(c: Camp): boolean {
  const hoursUntil = (new Date(`${c.date}T00:00:00`).getTime() - Date.now()) / 3_600_000
  return hoursUntil < 24
}
