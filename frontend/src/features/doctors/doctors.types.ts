// Doctor Management domain types.
// TODO: entirely mock/frontend-only — no backend endpoints exist for doctors yet.

// Doctor itself is owned by camps.mock.ts / types/camp.types.ts (Camp Management's
// seed data) — re-exported here for convenience so this feature's own modules can
// import it from a doctors-local path without reaching into features/camps/.
export type { Doctor } from '@/types/camp.types'

export type EngagementBand = 'CHAMPION' | 'ACTIVE' | 'DORMANT' | 'INACTIVE' | 'NEW'

export interface EngagementStats {
  campCount: number
  closedCount: number
  upcomingCount: number
  patients: number
  rx: number
  avgRating: number
  lastDate: string | null
  daysSinceLast: number | null
}

export type ChurnRisk = 'NEW' | 'HIGH' | 'MEDIUM' | 'LOW'

export interface DoctorPrediction {
  churn: ChurnRisk
  conv: number
  rxUplift: number
  bestType: 'Screening' | 'Diet'
  nba: string
}

export interface DoctorBroadcast {
  id: string
  doctorIds: string[]
  channel: string
  message: string
  sentAt: string
  sentBy?: string
}
