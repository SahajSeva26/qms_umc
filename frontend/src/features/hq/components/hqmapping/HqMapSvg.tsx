import type { ClassifiedHq, GeoFo } from '@/features/hq/hq.types'
import { project, ringRadiusPx, STATE_ANCHORS, MAP_W, MAP_H } from '@/features/hq/components/hqmapping/hq.ui'
import { HQ_TIER_COLOR } from '@/features/hq/components/hqmapping/hq.ui'

interface HqMapSvgProps {
  rows: ClassifiedHq[]
  fos: GeoFo[]
  radiusKm: number
  onOpenHq: (id: string) => void
}

// Exact port of hq-serviceability.js's project()/renderMapSvg() (lines
// 1004-1073) — India bounding-box (lat 6..37, lng 68..97) projected to a
// 1000x700 SVG viewBox, state-code labels at fixed anchor points, FO dots
// with a 35 KM ring (flat degrees-to-px approximation, NOT latitude-corrected
// — intentional per the prototype's own "// approx" comment), and HQ dots
// colored by tier. Background 5° grid lines preserved as-is.
const HqMapSvg = ({ rows, fos, radiusKm, onOpenHq }: HqMapSvgProps) => {
  const geoFos = fos.filter((f) => typeof f.lat === 'number')
  const ringPx = ringRadiusPx(radiusKm)

  const grid: { x1: number; y1: number; x2: number; y2: number }[] = []
  for (let lng = 70; lng <= 95; lng += 5) {
    const p1 = project(6, lng)
    const p2 = project(37, lng)
    grid.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
  }
  for (let lat = 10; lat <= 35; lat += 5) {
    const p1 = project(lat, 68)
    const p2 = project(lat, 97)
    grid.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y })
  }

  return (
    <div className="relative rounded-2xl border overflow-hidden" style={{ height: 520, background: 'linear-gradient(180deg,#f0f9ff,#eef2ff)', borderColor: 'var(--qms-border)' }}>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
        <g>
          {grid.map((l, i) => (
            <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="rgba(15,23,42,.04)" strokeWidth={0.6} />
          ))}
        </g>
        {STATE_ANCHORS.map(([code, lat, lng]) => {
          const p = project(lat, lng)
          return (
            <text key={code} x={p.x} y={p.y} fontSize={9} fontWeight={600} fill="#64748b">{code}</text>
          )
        })}
        <g>
          {geoFos.map((f) => {
            if (typeof f.lat !== 'number' || typeof f.lng !== 'number') return null
            const p = project(f.lat, f.lng)
            return <circle key={f.id} cx={p.x} cy={p.y} r={ringPx} fill="none" stroke="rgba(59,109,255,.18)" strokeWidth={0.8} strokeDasharray="2 2" />
          })}
        </g>
        <g>
          {geoFos.map((f) => {
            if (typeof f.lat !== 'number' || typeof f.lng !== 'number') return null
            const p = project(f.lat, f.lng)
            return (
              <circle key={f.id} cx={p.x} cy={p.y} r={4} fill="#3b6dff" stroke="#fff" strokeWidth={1.2} style={{ cursor: 'pointer' }}>
                <title>{f.name} · {f.hq} · load {f.loadPct}%</title>
              </circle>
            )
          })}
        </g>
        <g>
          {rows.map((r) => {
            if (typeof r.lat !== 'number' || typeof r.lng !== 'number') return null
            const p = project(r.lat, r.lng)
            const colour = HQ_TIER_COLOR[r.status].dot
            return (
              <circle
                key={r.id}
                cx={p.x} cy={p.y} r={3} fill={colour} stroke="#fff" strokeWidth={1.2}
                style={{ cursor: 'pointer' }}
                onClick={() => onOpenHq(r.id)}
              >
                <title>{r.hqName} · {r.city} · {r.status} · {(r.distanceKm ?? 0).toFixed(1)} KM</title>
              </circle>
            )
          })}
        </g>
      </svg>
      <div className="absolute bottom-2.5 left-2.5 rounded-lg px-2.5 py-2 text-[10.5px]" style={{ background: 'rgba(255,255,255,.92)', color: '#0f172a', boxShadow: '0 4px 12px rgba(15,23,42,.1)' }}>
        <div className="flex items-center gap-1.5 my-0.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#10b981' }} /> GREEN · serviceable</div>
        <div className="flex items-center gap-1.5 my-0.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f59e0b' }} /> YELLOW · FO load high</div>
        <div className="flex items-center gap-1.5 my-0.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f97316' }} /> ORANGE · 35-50 KM</div>
        <div className="flex items-center gap-1.5 my-0.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#f43f5e' }} /> RED · no FO &lt; 50 KM</div>
        <div className="flex items-center gap-1.5 my-0.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#3b6dff' }} /> FO · {radiusKm} KM ring shown</div>
      </div>
      <div className="absolute top-2.5 right-2.5 rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold" style={{ background: '#fff', border: '1px solid var(--qms-border)', color: '#0f172a' }}>
        {rows.length.toLocaleString()} HQ · {geoFos.length} FO
      </div>
    </div>
  )
}

export default HqMapSvg
