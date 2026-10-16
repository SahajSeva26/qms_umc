import { useDashboardData } from '@/features/dashboard/hooks/useDashboardData'
import MiniKpiCard from '@/features/dashboard/components/MiniKpiCard'

// Renders data.headline verbatim — no client-side scaling/derivation.
const TopKpiStrip = () => {
  const { data } = useDashboardData()

  if (!data) return null

  return (
    <div className="mb-3.5">
      <h2 className="text-lg font-bold mb-0.5" style={{ color: 'var(--qms-text)' }}>Key pointers</h2>
      <p className="text-[12px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
        Current snapshot within your access scope
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
