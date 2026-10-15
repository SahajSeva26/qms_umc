// Cross-module Analytics types — TODO: entirely mock/frontend-only, no backend
// endpoints exist yet. These cover data shapes the prototype's analytics.js
// reads that have no home in any other feature's types yet (P&L trend, AR aging).

export interface PnlTrendPoint {
  week: string
  amount: number
}

export interface PnlTrend {
  revenue: PnlTrendPoint[]
  expense: PnlTrendPoint[]
}

export interface ArAgingBucket {
  range: string
  amount: number
  share: number
}

export type AnalyticsTab = 'exec' | 'sales' | 'camps' | 'doctors' | 'fo' | 'financial'

export interface AnalyticsFilters {
  periodDays: number | 'all'
  clientId: string
}
