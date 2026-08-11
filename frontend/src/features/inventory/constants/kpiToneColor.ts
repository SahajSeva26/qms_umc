// Shared KPI tone → color map. Previously redeclared identically in
// InventoryKpiStrip.tsx and DashboardsTab.tsx — consolidated here so there's
// one source of truth. Same keys, same values, zero visual change.
import type { KpiTone } from '@/features/inventory/inventory.types'

export const KPI_TONE_COLOR: Record<KpiTone, string> = {
  brand: '#3b6dff',
  teal: '#14b8a6',
  emerald: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  violet: '#8b5cf6',
}
