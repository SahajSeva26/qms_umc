import type { ArAgingBucket, PnlTrend } from '@/types/analytics.types'

// TODO: entirely mock — no backend endpoints exist for analytics yet.
// PNL_TREND / AR_AGING mirror the vanilla-JS prototype's accounts-data.js
// (12-week fixed series — NOT period/client scoped, matching analytics.js's
// own behavior for these two charts specifically).

export const PNL_TREND: PnlTrend = {
  revenue: [
    { week: 'W22', amount: 6200000 }, { week: 'W23', amount: 6800000 }, { week: 'W24', amount: 7100000 },
    { week: 'W25', amount: 6900000 }, { week: 'W26', amount: 7400000 }, { week: 'W27', amount: 7800000 },
    { week: 'W28', amount: 8100000 }, { week: 'W29', amount: 7600000 }, { week: 'W30', amount: 8400000 },
    { week: 'W31', amount: 8900000 }, { week: 'W32', amount: 9200000 }, { week: 'W33', amount: 9600000 },
  ],
  expense: [
    { week: 'W22', amount: 4400000 }, { week: 'W23', amount: 4600000 }, { week: 'W24', amount: 4900000 },
    { week: 'W25', amount: 4700000 }, { week: 'W26', amount: 5100000 }, { week: 'W27', amount: 5300000 },
    { week: 'W28', amount: 5600000 }, { week: 'W29', amount: 5200000 }, { week: 'W30', amount: 5800000 },
    { week: 'W31', amount: 6100000 }, { week: 'W32', amount: 6300000 }, { week: 'W33', amount: 6600000 },
  ],
}

export const AR_AGING: ArAgingBucket[] = [
  { range: '0-30 days', amount: 3200000, share: 38 },
  { range: '31-60 days', amount: 2400000, share: 29 },
  { range: '61-90 days', amount: 1600000, share: 19 },
  { range: '90+ days', amount: 1200000, share: 14 },
]
