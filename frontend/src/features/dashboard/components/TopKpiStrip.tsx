import type { DashboardFilterState } from '@/features/dashboard/dashboard.types'
import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'

interface TopKpiStripProps {
  filters: DashboardFilterState
}

// Renders whatever the data source returns for the active filters. It performs
// no scaling or derivation of its own — the filter-scoped values arrive
// pre-computed as `data.headline`, so no fabricated math can ever be applied
// on top of a real API response.
const TopKpiStrip = ({ filters }: TopKpiStripProps) => {
  const { data } = useDashboardData(filters)

  if (!data) return null

  return (
    <div className="mb-3.5">
      <h2 className="text-lg font-bold mb-0.5" style={{ color: 'var(--qms-text)' }}>Key pointers</h2>
      <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
        Headline numbers across the org · click any tile to drill
      </p>
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
        {data.headline.map((kpi) => (
          <MiniKpiCard key={kpi.id} label={kpi.label} data={kpi.data} />
        ))}
      </div>
    </div>
  )
}

export default TopKpiStrip
