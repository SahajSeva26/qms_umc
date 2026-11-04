import type { DedicatedProjectConfig, Assignment, Attendance, Screening } from '@/features/dedicatedops/dedicatedops.types'
import { DEFAULT_MANPOWER, DEFAULT_SOP } from '@/features/dedicatedops/dedicatedops.types'

// TODO: entirely mock — seeds one project (PRJ-432, Cipla · Respiratory Care)
// as already-converted-to-Dedicated so the screen has non-empty Live FOs/
// Compliance data to show on first load, matching the prototype's own seed
// intent (a demo needs at least one dedicated project to show anything).

function dPlus(days: number): string {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
}

function hoursAgoIso(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

export const SEED_PROJECT_CONFIG: Record<string, DedicatedProjectConfig> = {
  'PRJ-432': {
    type: 'Dedicated',
    manpowerRequired: { ...DEFAULT_MANPOWER, fo: 2, coordinator: 1 },
    deviceRequired: ['dev-spirom', 'dev-spo'],
    territory: { state: 'TN', district: 'Chennai', city: 'Chennai', zone: 'South', region: 'South India' },
    sopConfig: { ...DEFAULT_SOP },
  },
}

export const SEED_ASSIGNMENTS: Record<string, Assignment> = {
  'p-amit': {
    foId: 'p-amit', projectId: 'PRJ-432', doctorId: 'doc-007',
    clinicLabel: 'Dr Priya Iyer · Pulmonology Clinic', startDate: dPlus(-14),
    endDate: '', scheduleType: 'mon-sat',
    assignedAt: hoursAgoIso(14 * 24), assignedBy: 'Operations Manager', foName: 'Amit Singh',
  },
}

export const SEED_ATTENDANCE: Attendance[] = [
  {
    id: 'att-00001', foId: 'p-amit', projectId: 'PRJ-432', doctorId: 'doc-007',
    date: dPlus(0), checkInAt: hoursAgoIso(3), checkOutAt: '',
    geoLat: 13.0827, geoLng: 80.2707, selfieUrl: '/selfies/amit-today.jpg', clinicPhotoUrl: '/clinics/priya-iyer.jpg',
    status: 'IN_PROGRESS',
    audit: [{ at: hoursAgoIso(3), action: 'Checked in' }, { at: hoursAgoIso(2.8), action: 'Clinic photo uploaded' }],
  },
]

export const SEED_SCREENINGS: Screening[] = [
  { id: 'scr-00001', attendanceId: 'att-00001', foId: 'p-amit', projectId: 'PRJ-432', doctorId: 'doc-007', date: dPlus(0), at: hoursAgoIso(2.5), patientCode: 'P-10021', age: 54, gender: 'M', tests: { spo2: '96%' }, symptoms: 'Breathlessness', risk: 'Moderate', referredToDoctor: true },
  { id: 'scr-00002', attendanceId: 'att-00001', foId: 'p-amit', projectId: 'PRJ-432', doctorId: 'doc-007', date: dPlus(0), at: hoursAgoIso(2.1), patientCode: 'P-10022', age: 41, gender: 'F', tests: { spo2: '98%' }, symptoms: 'Cough', risk: 'Normal', referredToDoctor: false },
]
