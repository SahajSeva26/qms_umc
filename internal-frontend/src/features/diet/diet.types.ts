// Diet Camp Management domain types. Diet camps are NOT a separate entity —
// they are the same shared Camp (types/camp.types.ts) filtered by
// `type === 'Diet'`, matching the prototype exactly (diet-camps.js reads/
// writes the same qms.master.camps store as Camp Management). This file
// only holds the genuinely-separate entities: Dietitian roster, reminder
// log, media log, online assessments, and the Tele Dietitian booking flow.
// TODO: entirely mock/frontend-only — no backend endpoints exist yet.

export type DietitianStatus = 'ACTIVE' | 'ON_HOLD' | 'INACTIVE'

export interface Dietitian {
  id: string
  code: string
  name: string
  email: string
  phone: string
  qualification: string
  resumeUrl: string
  interviewed: boolean
  remuneration: number
  ta: number
  da: number
  printing: number
  address: string
  gmap?: string
  state: string
  city: string
  machinesAssigned: string[]
  status: DietitianStatus
  joined: string
}

// Derived UI pipeline stage — computed live from Camp fields, never stored
// (mirrors dietStage() exactly, diet-camps.js:423-436).
export type DietStage = 'REQUESTED' | 'ASSIGNED' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED' | 'CHARGED'

export type ReminderStatus = 'PENDING' | 'SENT' | 'CONFIRMED' | 'DECLINED' | 'NO_RESPONSE'
export type ReminderRecipient = 'FO' | 'DIETITIAN' | 'LABTECH' | 'MANPOWER' | 'DOCTOR'
export type ReminderWindow = 'T48' | 'T24' | 'T2'

export type CampReminderLog = Record<ReminderWindow, Record<ReminderRecipient, ReminderStatus>>

export interface MediaItem {
  kind: 'photo' | 'video'
  url: string
  caption: string
  by: string
  when: string
}

export type ActivityLevel = 'Sedentary' | 'Light' | 'Moderate' | 'Active'

export interface OnlineAssessment {
  id: string
  campId: string
  patientName: string
  patientCode: string
  age: number
  gender: string
  heightCm: number
  weightKg: number
  bmi: number
  waist: number
  activity: ActivityLevel
  conditions: string
  recall: string
  assessment: string
  kcal: number
  dietPlan: string
  dietitianId: string
  channel: 'VIDEO' | 'IVR'
  date: string
}

export type TeleConsultMode = 'Video' | 'Phone' | 'Chat'
export type TeleConsultStatus = 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'

export interface TeleConsult {
  id: string
  patientName: string
  phone: string
  condition: string
  dietitianId: string
  clientId: string
  date: string
  time: string
  mode: TeleConsultMode
  status: TeleConsultStatus
  notes: string
  plan: string
}

export function bmiOf(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return Math.round((weightKg / (m * m)) * 10) / 10
}

export function bmiBand(bmi: number): string {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}
