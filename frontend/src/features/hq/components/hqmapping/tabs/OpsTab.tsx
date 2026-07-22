import { useMemo, useState } from 'react'
import { FiXCircle, FiClock, FiAlertTriangle, FiActivity, FiPauseCircle, FiCpu, FiUserPlus, FiZap, FiDownload } from 'react-icons/fi'
import type { ClassifiedHq, GeoFo } from '@/features/hq/hq.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import { lookupCity } from '@/features/hq/cityGazetteer'
import HqKpi from '@/features/hq/components/hqmapping/HqKpi'
import { downloadCsv, todayIso } from '@/features/hq/components/hqmapping/hq.ui'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'

interface OpsTabProps {
  rows: ClassifiedHq[]
  fos: GeoFo[]
  devices: DeviceCatalogItem[]
  deviceLoadPct: number
}

// Exact port of hq-serviceability.js's renderOps()/hqProposeExpansion()/
// hqExportExpansion() (lines 820-935) — under-covered territories by state,
// suggested manpower expansion by city (most RED HQs), and FO load
// distribution table.
const OpsTab = ({ rows, fos, devices, deviceLoadPct }: OpsTabProps) => {
  const [expandedState, setExpandedState] = useState<string | null>(null)

  const red = rows.filter((r) => r.status === 'RED')
  const orange = rows.filter((r) => r.status === 'ORANGE')
  const yellow = rows.filter((r) => r.status === 'YELLOW')
  const overloaded = fos.filter((f) => f.loadPct >= deviceLoadPct)
  const idle = fos.filter((f) => f.loadPct === 0)

  const gapRows = useMemo(() => {
    const gaps: Record<string, ClassifiedHq[]> = {}
    red.forEach((r) => {
      const k = r.state || 'UNKNOWN'
      if (!gaps[k]) gaps[k] = []
      gaps[k].push(r)
    })
    return Object.entries(gaps).sort((a, b) => b[1].length - a[1].length).slice(0, 10)
  }, [red])

  const expansionCities = useMemo(() => {
    const cityGaps: Record<string, number> = {}
    red.forEach((r) => { cityGaps[r.city] = (cityGaps[r.city] || 0) + 1 })
    return Object.entries(cityGaps).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [red])

  const exportExpansion = (state: string) => {
    const stateRows = rows.filter((r) => r.state === state && r.status === 'RED')
    downloadCsv(`hq-expansion-${state}-${todayIso()}.csv`, stateRows.map((r) => ({
      city: r.city, hq: r.hqName, company: r.company, division: r.division,
      currentNearestFo: r.nearestFo?.name || '—',
      currentDistanceKm: r.distanceKm == null ? '—' : r.distanceKm.toFixed(2),
      gapReason: r.reason,
    })))
    toast.success('Exported expansion proposal CSV')
  }

  return (
    <div>
      <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <HqKpi label="Red HQ" value={red.length} sub="No FO < 50 KM" icon={FiXCircle} tone={red.length ? 'red' : 'green'} />
        <HqKpi label="Orange HQ" value={orange.length} sub="35-50 KM" icon={FiClock} tone={orange.length ? 'orange' : 'none'} />
        <HqKpi label="Yellow HQ" value={yellow.length} sub="Overloaded FO" icon={FiAlertTriangle} tone={yellow.length ? 'yellow' : 'none'} />
        <HqKpi label="Overloaded FOs" value={overloaded.length} sub={`>= ${deviceLoadPct}% daily cap`} icon={FiActivity} tone={overloaded.length ? 'red' : 'none'} />
        <HqKpi label="Idle FOs" value={idle.length} sub="Zero camps today" icon={FiPauseCircle} tone={idle.length ? 'yellow' : 'none'} />
        <HqKpi label="Devices" value={devices.length} sub={`${devices.filter((d) => d.faulty).length} faulty`} icon={FiCpu} />
      </div>

      <div className="rounded-2xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-extrabold">Under-covered territories</span>
          <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>RED HQ count by state</span>
        </div>
        {gapRows.length ? (
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                {['State', 'RED HQs', 'Top affected pharma', 'Action'].map((h) => (
                  <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gapRows.map(([state, list]) => {
                const byCo: Record<string, number> = {}
                list.forEach((h) => { byCo[h.company] = (byCo[h.company] || 0) + 1 })
                const top = Object.entries(byCo).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([c, n]) => `${c} (${n})`).join(', ')
                return (
                  <tr key={state} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                    <td className="px-2 py-1.5 font-bold">{state}</td>
                    <td className="px-2 py-1.5">
                      <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>
                        <span className="w-[7px] h-[7px] rounded-full" style={{ background: '#f43f5e' }} /> {list.length}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">{top}</td>
                    <td className="px-2 py-1.5">
                      <button
                        onClick={() => setExpandedState(expandedState === state ? null : state)}
                        className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border"
                        style={{ borderColor: 'var(--qms-border)' }}
                      >
                        <FiZap size={12} /> Propose expansion
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-5 font-bold" style={{ color: '#10b981' }}>All territories covered.</div>
        )}
        {expandedState && (() => {
          const list = rows.filter((r) => r.state === expandedState && r.status === 'RED')
          const cityCount: Record<string, number> = {}
          list.forEach((r) => { cityCount[r.city] = (cityCount[r.city] || 0) + 1 })
          const candidates = Object.entries(cityCount).sort((a, b) => b[1] - a[1])
          return (
            <div className="mt-3 rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[12.5px] font-extrabold">Manpower expansion · {expandedState} ({candidates.length} city candidate{candidates.length === 1 ? '' : 's'})</div>
                <Button size="sm" onClick={() => exportExpansion(expandedState)}><FiDownload size={12} /> Export proposal</Button>
              </div>
              {candidates.length ? (
                <table className="w-full text-[12px] border-collapse">
                  <thead><tr>{['City', 'Red HQs', 'Coords'].map((h) => <th key={h} className="text-left px-2 py-1 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {candidates.map(([c, n]) => {
                      const cc = lookupCity(c)
                      return (
                        <tr key={c}>
                          <td className="px-2 py-1 font-bold">{c}</td>
                          <td className="px-2 py-1">{n}</td>
                          <td className="px-2 py-1">{cc ? `${cc.lat.toFixed(3)}, ${cc.lng.toFixed(3)}` : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-3" style={{ color: '#10b981' }}>No expansion needed in this state.</div>
              )}
            </div>
          )
        })()}
      </div>

      <div className="rounded-2xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-extrabold">Suggested manpower expansion</span>
          <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>Cities with the most RED HQs</span>
        </div>
        {expansionCities.length ? expansionCities.map(([city, n]) => {
          const coord = lookupCity(city)
          return (
            <div key={city} className="flex gap-2 items-start rounded-xl p-2.5 mb-2" style={{ background: 'linear-gradient(135deg, rgba(124,92,255,.06), rgba(14,165,233,.06))', border: '1px solid rgba(124,92,255,.2)' }}>
              <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 text-white" style={{ background: 'linear-gradient(135deg,#7c5cff,#3b6dff)' }}>
                <FiUserPlus size={13} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold">{city.charAt(0).toUpperCase() + city.slice(1)}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                  {n} red HQ{n > 1 ? 's' : ''} {coord ? `· would unlock ${coord.state}` : ''}. Deploy <b>1 FO</b> here to lift these to GREEN.
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full shrink-0" style={{ background: 'rgba(249,115,22,.18)', color: '#c2410c' }}>
                <span className="w-[7px] h-[7px] rounded-full" style={{ background: '#f97316' }} /> Priority
              </span>
            </div>
          )
        }) : (
          <div className="text-center py-4 font-bold" style={{ color: '#10b981' }}>No manpower additions needed right now.</div>
        )}
      </div>

      <div className="rounded-2xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[13px] font-extrabold mb-2.5">FO load distribution — today's load %</div>
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              {['FO', 'HQ city', 'Devices', "Load · today", 'Status'].map((h) => (
                <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...fos].sort((a, b) => b.loadPct - a.loadPct).map((f) => {
              const tone = f.loadPct >= 100 ? 'red' : f.loadPct >= deviceLoadPct ? 'yellow' : f.loadPct === 0 ? 'grey' : 'green'
              const barColor = tone === 'red' ? '#f43f5e' : tone === 'yellow' ? '#f59e0b' : '#10b981'
              const pillBg = tone === 'red' ? 'rgba(244,63,94,.16)' : tone === 'yellow' ? 'rgba(245,158,11,.18)' : tone === 'grey' ? 'rgba(15,23,42,.06)' : 'rgba(16,185,129,.16)'
              const pillFg = tone === 'red' ? '#b91c1c' : tone === 'yellow' ? '#92400e' : tone === 'grey' ? '#475569' : '#047857'
              return (
                <tr key={f.id} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                  <td className="px-2 py-1.5 font-bold">{f.name}</td>
                  <td className="px-2 py-1.5">{f.hq} · {f.state}</td>
                  <td className="px-2 py-1.5">{f.deviceTypes.join(' · ') || '—'}</td>
                  <td className="px-2 py-1.5" style={{ width: '30%' }}>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,.06)' }}>
                      <span className="block h-full" style={{ width: `${Math.min(100, f.loadPct)}%`, background: barColor }} />
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{f.loadToday}/{f.dailyCap} · {f.loadPct}%</div>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: pillBg, color: pillFg }}>
                      {tone === 'red' ? 'OVERLOAD' : tone === 'yellow' ? 'HIGH' : tone === 'grey' ? 'IDLE' : 'OK'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default OpsTab
