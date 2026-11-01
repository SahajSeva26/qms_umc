import type { CampStatus, CampType, BillingType } from '@/types/campReal.types'

// Matches backend/src/modules/operations/camp/camp.mapper.ts's
// CampMapper.toReportResponse (GET /camps/report) field-for-field.
export interface CampReport {
  summary: { totalCamps: number }
  byStatus: { status: CampStatus; count: number }[]
  byType: { type: CampType; count: number }[]
  byBillingType: { billingType: BillingType; count: number }[]
}
