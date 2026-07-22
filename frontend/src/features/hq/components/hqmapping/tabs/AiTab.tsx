import { useMemo } from 'react'
import { FiTrendingUp, FiUserPlus, FiCpu, FiThermometer, FiZap, FiMapPin, FiNavigation, FiAlertCircle } from 'react-icons/fi'
import type { ClassifiedHq, GeoFo } from '@/features/hq/hq.types'
import { haversine } from '@/features/hq/hq.service'
import { lookupCity } from '@/features/hq/cityGazetteer'
import HqKpi from '@/features/hq/components/hqmapping/HqKpi'
import { HqStatusPill } from '@/features/hq/components/hqmapping/StatusPill'

interface AiTabProps {
  rows: ClassifiedHq[]
  fos: GeoFo[]
}

// Exact port of hq-serviceability.js's renderAi() (lines 1231-1331) — 5
// rule-based panels: predicted high-demand HQs, suggested FO expansion,
// device shortage forecast, best-FO-for-priority-HQs, inefficient territories.
const AiTab = ({ rows, fos }: AiTabProps) => {
  const highDemand = useMemo(
    () => rows.filter((r) => r.status === 'GREEN' && (r.businessPotential === 'Platinum' || r.businessPotential === 'Gold') && (r.campsPerMonth || 0) >= 4).slice(0, 6),
    [rows]
  )

  const expansion = useMemo(() => {
    const byCity: Record<string, number> = {}
    rows.filter((r) => r.status === 'RED').forEach((r) => { byCity[r.city] = (byCity[r.city] || 0) + 1 })
    return Object.entries(byCity).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [rows])

  const deviceShort = useMemo(() => {
    const m: Record<string, { needed: number; matched: number }> = {}
    rows.forEach((r) => {
      if (!r.requiredDevice) return
      if (!m[r.requiredDevice]) m[r.requiredDevice] = { needed: 0, matched: 0 }
      m[r.requiredDevice].needed++
      if (r.deviceMatch && r.status === 'GREEN') m[r.requiredDevice].matched++
    })
    return Object.entries(m)
      .map(([d, x]) => ({ device: d, coverage: x.needed ? Math.round((x.matched / x.needed) * 100) : 0, ...x }))
      .sort((a, b) => a.coverage - b.coverage)
      .slice(0, 5)
  }, [rows])

  const priorityHQs = useMemo(() => rows.filter((r) => r.priority === 'HIGH' && r.status !== 'GREEN').slice(0, 6), [rows])

  const inefficient = useMemo(() => {
    return fos
      .filter((f) => f.loadPct < 30 && typeof f.lat === 'number')
      .map((f) => ({
        fo: f,
        nearRed: rows.filter((r) => r.status === 'RED' && typeof r.lat === 'number' && typeof r.lng === 'number' && haversine(f, { lat: r.lat, lng: r.lng }) <= 100).length,
      }))
      .filter((x) => x.nearRed > 0)
      .sort((a, b) => b.nearRed - a.nearRed)
      .slice(0, 5)
  }, [fos, rows])

  return (
    <div>
      <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <HqKpi label="High-demand HQs" value={highDemand.length} sub="Predicted" icon={FiTrendingUp} tone="green" />
        <HqKpi label="Expansion candidates" value={expansion.length} sub="Cities to add FO" icon={FiUserPlus} tone="blue" />
        <HqKpi label="Device shortages" value={deviceShort.filter((x) => x.coverage < 60).length} sub="< 60% match" icon={FiCpu} tone="red" />
        <HqKpi label="Inefficient FOs" value={inefficient.length} sub="Low load · RED HQs nearby" icon={FiThermometer} tone="yellow" />
      </div>

      <div className="rounded-2xl border p-3.5 mb-2.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold mb-2.5"><FiTrendingUp size={14} /> Predicted high-demand HQs</div>
        {highDemand.length ? highDemand.map((r) => (
          <div key={r.id} className="flex gap-2 items-start rounded-xl p-2.5 mb-2" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,.06), rgba(14,165,233,.06))', border: '1px solid rgba(124,92,255,.2)' }}>
            <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#7c5cff,#3b6dff)' }}><FiZap size={13} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold">{r.hqName}</div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{r.city} · {r.businessPotential} · {r.campsPerMonth || 0} camps/month · {r.requiredDevice || '—'}</div>
            </div>
            <HqStatusPill status={r.status} />
          </div>
        )) : <div className="text-center py-3.5" style={{ color: 'var(--qms-text-muted)' }}>No high-demand HQs detected.</div>}
      </div>

      <div className="rounded-2xl border p-3.5 mb-2.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold mb-2.5"><FiUserPlus size={14} /> Suggested FO expansion</div>
        {expansion.length ? expansion.map(([city, n]) => {
          const cc = lookupCity(city)
          return (
            <div key={city} className="flex gap-2 items-start rounded-xl p-2.5 mb-2" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,.06), rgba(14,165,233,.06))', border: '1px solid rgba(124,92,255,.2)' }}>
              <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#7c5cff,#3b6dff)' }}><FiMapPin size={13} /></div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold">{city}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{n} red HQ{n > 1 ? 's' : ''}{cc ? ` · ${cc.state}` : ''} · deploy 1 FO with the right device to lift to GREEN</div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full shrink-0" style={{ background: 'rgba(249,115,22,.18)', color: '#c2410c' }}>
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: '#f97316' }} /> Priority
              </span>
            </div>
          )
        }) : <div className="text-center py-3.5" style={{ color: '#10b981' }}>No expansion needed.</div>}
      </div>

      <div className="rounded-2xl border p-3.5 mb-2.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold mb-2.5"><FiCpu size={14} /> Device shortage forecast</div>
        {deviceShort.map((x) => (
          <div key={x.device} className="flex gap-2 items-start rounded-xl p-2.5 mb-2" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,.06), rgba(14,165,233,.06))', border: '1px solid rgba(124,92,255,.2)' }}>
            <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#7c5cff,#3b6dff)' }}><FiCpu size={13} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold">{x.device}</div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Coverage: {x.coverage}% · {x.matched}/{x.needed} HQs with a matching FO</div>
            </div>
            <span
              className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full shrink-0"
              style={{
                background: x.coverage >= 80 ? 'rgba(16,185,129,.16)' : x.coverage >= 50 ? 'rgba(245,158,11,.18)' : 'rgba(244,63,94,.16)',
                color: x.coverage >= 80 ? '#047857' : x.coverage >= 50 ? '#92400e' : '#b91c1c',
              }}
            >
              {x.coverage}%
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border p-3.5 mb-2.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold mb-2.5"><FiNavigation size={14} /> Best FO for priority HQs</div>
        {priorityHQs.length ? priorityHQs.map((r) => (
          <div key={r.id} className="flex gap-2 items-start rounded-xl p-2.5 mb-2" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,.06), rgba(14,165,233,.06))', border: '1px solid rgba(124,92,255,.2)' }}>
            <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#7c5cff,#3b6dff)' }}><FiZap size={13} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold">{r.hqName}</div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                {r.city} · {r.reason} · best: {r.nearestFo ? `${r.nearestFo.name} (${r.distanceKm?.toFixed(1)} KM)` : 'no FO found'}
              </div>
            </div>
            <HqStatusPill status={r.status} />
          </div>
        )) : <div className="text-center py-3.5" style={{ color: '#10b981' }}>All priority HQs are GREEN.</div>}
      </div>

      <div className="rounded-2xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold mb-2.5"><FiThermometer size={14} /> Inefficient territories</div>
        {inefficient.length ? inefficient.map((x) => (
          <div key={x.fo.id} className="flex gap-2 items-start rounded-xl p-2.5 mb-2" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,.06), rgba(14,165,233,.06))', border: '1px solid rgba(124,92,255,.2)' }}>
            <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#7c5cff,#3b6dff)' }}><FiAlertCircle size={13} /></div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold">{x.fo.name}</div>
              <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Load {x.fo.loadPct}% · {x.nearRed} RED HQs within 100 KM · consider redeploying or shifting territory</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full shrink-0" style={{ background: 'rgba(245,158,11,.18)', color: '#92400e' }}>
              <span className="w-[7px] h-[7px] rounded-full" style={{ background: '#f59e0b' }} /> Optimize
            </span>
          </div>
        )) : <div className="text-center py-3.5" style={{ color: '#10b981' }}>All territories optimised.</div>}
      </div>
    </div>
  )
}

export default AiTab
