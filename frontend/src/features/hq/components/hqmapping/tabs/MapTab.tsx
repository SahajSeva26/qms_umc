import { useMemo } from 'react'
import { FiMap } from 'react-icons/fi'
import type { ClassifiedHq, GeoFo } from '@/features/hq/hq.types'
import HqMapSvg from '@/features/hq/components/hqmapping/HqMapSvg'

interface MapTabProps {
  rows: ClassifiedHq[]
  fos: GeoFo[]
  radiusKm: number
  onOpenHq: (id: string) => void
}

// Exact port of hq-serviceability.js's renderMap()/renderHeatmap() (lines
// 989-1090) — the SVG coverage map plus the HQ-count-by-state heatmap grid.
const MapTab = ({ rows, fos, radiusKm, onOpenHq }: MapTabProps) => {
  const byState = useMemo(() => {
    const m: Record<string, { total: number; green: number }> = {}
    rows.forEach((r) => {
      const s = r.state || '—'
      if (!m[s]) m[s] = { total: 0, green: 0 }
      m[s].total++
      if (r.status === 'GREEN') m[s].green++
    })
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total)
  }, [rows])
  const max = Math.max(1, ...byState.map(([, b]) => b.total))

  return (
    <div>
      <div className="rounded-2xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="flex items-center gap-1.5 text-[13px] font-extrabold"><FiMap size={14} /> Live coverage map</span>
          <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>Haversine · {radiusKm} KM rings · seeded/uploaded coordinates</span>
        </div>
        <HqMapSvg rows={rows} fos={fos} radiusKm={radiusKm} onOpenHq={onOpenHq} />
      </div>

      <div className="rounded-2xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[13px] font-extrabold mb-2.5">Heatmap · HQ count by state</div>
        <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))' }}>
          {byState.map(([s, b]) => {
            const intensity = b.total / max
            const pct = b.total ? Math.round((b.green / b.total) * 100) : 0
            return (
              <div
                key={s}
                className="rounded-md grid place-items-center text-[10.5px] font-extrabold p-1.5 text-center"
                style={{ aspectRatio: '1/1', background: `rgba(124,92,255,${0.12 + intensity * 0.7})`, color: intensity > 0.55 ? '#fff' : '#1f2937' }}
              >
                {s}<br /><span className="text-[9px] font-semibold">{b.total} · {pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default MapTab
