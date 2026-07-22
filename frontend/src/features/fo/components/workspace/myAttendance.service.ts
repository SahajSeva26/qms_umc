// Tiny local mock store for AttendanceModule's own check-in/check-out logs —
// deliberately NOT the shared dedicatedops.service store (that's a different
// feature's data). Reuses the Attendance type shape from dedicatedops.types
// since it's already a close structural match, per the task spec.
import type { Attendance } from '@/features/dedicatedops/dedicatedops.types'

const KEY = 'qms.fo.myAttendance'

function load(foId: string): Attendance[] {
  try {
    const raw = localStorage.getItem(KEY)
    const all: Attendance[] = raw ? JSON.parse(raw) : []
    return all.filter((a) => a.foId === foId)
  } catch {
    return []
  }
}

function persist(foId: string, records: Attendance[]) {
  try {
    const raw = localStorage.getItem(KEY)
    const all: Attendance[] = raw ? JSON.parse(raw) : []
    const others = all.filter((a) => a.foId !== foId)
    localStorage.setItem(KEY, JSON.stringify([...others, ...records]))
  } catch {
    // demo persistence only — safe to ignore quota/serialization errors
  }
}

export function getMyAttendance(foId: string): Attendance[] {
  return load(foId).sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function checkIn(foId: string, campId: string | undefined, dataUrl: string, geo: { lat: number; lng: number; accuracy?: number } | null): Attendance[] {
  const records = load(foId)
  const today = new Date().toISOString().slice(0, 10)
  const existing = records.find((a) => a.date === today)
  const now = new Date().toISOString()
  const next: Attendance = existing
    ? { ...existing, checkInAt: now, selfieUrl: dataUrl, geoLat: geo?.lat ?? null, geoLng: geo?.lng ?? null, audit: [...existing.audit, { at: now, action: 'CHECK_IN' }] }
    : {
        id: `ATT-${foId}-${today}`,
        foId,
        projectId: campId ?? '',
        doctorId: '',
        date: today,
        checkInAt: now,
        checkOutAt: '',
        geoLat: geo?.lat ?? null,
        geoLng: geo?.lng ?? null,
        selfieUrl: dataUrl,
        clinicPhotoUrl: '',
        status: 'IN_PROGRESS',
        audit: [{ at: now, action: 'CHECK_IN' }],
      }
  const merged = existing ? records.map((a) => (a.date === today ? next : a)) : [next, ...records]
  persist(foId, merged)
  return getMyAttendance(foId)
}

export function checkOut(foId: string, dataUrl: string, geo: { lat: number; lng: number; accuracy?: number } | null): Attendance[] {
  const records = load(foId)
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()
  const existing = records.find((a) => a.date === today)
  if (!existing) return getMyAttendance(foId)
  const next: Attendance = {
    ...existing,
    checkOutAt: now,
    clinicPhotoUrl: dataUrl,
    clinicPhotoLat: geo?.lat,
    clinicPhotoLng: geo?.lng,
    clinicPhotoAccuracy: geo?.accuracy,
    status: 'CLOSED',
    audit: [...existing.audit, { at: now, action: 'CHECK_OUT' }],
  }
  persist(foId, records.map((a) => (a.date === today ? next : a)))
  return getMyAttendance(foId)
}
