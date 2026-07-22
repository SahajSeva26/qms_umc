// Screen-local types for the Dietitian Payment page (/billing/dietitian).
// The per-scope rollup here is deliberately separate from the shared
// dietitianPaymentRollup() in dietitians.service.ts (that one is global/
// unscoped — Dietitian Profiles' own KPI source). This screen re-derives the
// same shape but restricted to the coordinator-scoped camp set.

export interface ScopedDietitianRollup {
  dietitianId: string
  dietitianName: string
  hq: string
  states: string[]
  totalCamps: number
  readyCamps: number
  paidCamps: number
  pendingReports: number
  eligibleAmount: number
  upcomingAmount: number
  paidAmount: number
  toBePaid: number
  bankComplete: boolean
  printingCharge: number
}
