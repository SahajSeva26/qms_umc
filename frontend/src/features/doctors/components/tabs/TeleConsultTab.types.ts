// Tele Consultation is its own mini-module — persisted via doctors.service.ts's
// qms.doctors.teleconsults localStorage key (mirrors the prototype's
// loadStore/persistStore('teleconsults', ...) so bookings survive a reload.
export type TeleMode = 'Video' | 'Phone' | 'Chat'
export type TeleStatus = 'SCHEDULED' | 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'

export interface TeleConsult {
  id: string
  patientName: string
  phone: string
  condition: string
  referredFrom?: string
  doctorId: string
  date: string
  time: string
  mode: TeleMode
  status: TeleStatus
  notes?: string
  rx?: string
}
