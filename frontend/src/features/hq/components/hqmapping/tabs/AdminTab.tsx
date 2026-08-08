import { useMemo } from 'react'
import { FiDatabase, FiCheckCircle, FiPercent, FiAlertTriangle, FiClock, FiXCircle, FiUsers, FiCpu } from 'react-icons/fi'
import type { ClassifiedHq, GeoFo } from '@/features/hq/hq.types'
import type { ClientMr, ClientProject } from '@/types/client.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import HqKpi from '@/features/hq/components/hqmapping/HqKpi'
import HqTable from '@/features/hq/components/hqmapping/HqTable'
import { buildProjectRollups, mrHasAnyServiceability } from '@/features/hq/components/hqmapping/mappingRollups'
import { HQ_TIER_COLOR, HQ_CARD_STYLE } from '@/features/hq/components/hqmapping/hq.ui'

interface AdminTabProps {
  rows: ClassifiedHq[]
  fos: GeoFo[]
  devices: DeviceCatalogItem[]
  mrs: ClientMr[]
  projects: ClientProject[]
  deviceLoadPct: number
  onOpenRow: (id: string) => void
}

const AdminTab = ({ rows, fos, devices, mrs, projects, deviceLoadPct, onOpenRow }: AdminTabProps) => {
  const byStatus = useMemo(() => {
    const m: Record<string, number> = {}
    rows.forEach((r) => { m[r.status] = (m[r.status] || 0) + 1 })
    return m
  }, [rows])

  const byState = useMemo(() => {
    const m: Record<string, { total: number; green: number; yellow: number; orange: number; red: number }> = {}
    rows.forEach((r) => {
      const s = r.state || '—'
      if (!m[s]) m[s] = { total: 0, green: 0, yellow: 0, orange: 0, red: 0 }
      m[s].total++
      m[s][r.status.toLowerCase() as 'green' | 'yellow' | 'orange' | 'red']++
    })
    return Object.entries(m).sort((a, b) => b[1].total - a[1].total).slice(0, 12)
  }, [rows])

  const overloaded = fos.filter((f) => f.loadPct >= deviceLoadPct).length
  const idleFos = fos.filter((f) => f.loadPct === 0).length
  const activeDevices = devices.filter((d) => !d.faulty && (d.status ?? '').toUpperCase() !== 'INACTIVE').length
  const tot = rows.length
  const coverPct = tot ? Math.round(((byStatus.GREEN || 0) / tot) * 100) : 0

  const projRows = useMemo(() => buildProjectRollups(mrs, projects), [mrs, projects])
  const servMr = mrs.filter(mrHasAnyServiceability).length

  return (
    <div>
      <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <HqKpi label="Total HQ" value={tot.toLocaleString()} sub="Master uploaded" icon={FiDatabase} tone="blue" />
        <HqKpi label="Serviceable" value={(byStatus.GREEN || 0).toLocaleString()} sub="Within 35 KM" icon={FiCheckCircle} tone="green" />
        <HqKpi label="Coverage %" value={`${coverPct}%`} sub="GREEN / Total" icon={FiPercent} tone={coverPct >= 80 ? 'green' : coverPct >= 50 ? 'yellow' : 'red'} />
        <HqKpi label="Yellow" value={(byStatus.YELLOW || 0).toLocaleString()} sub="FO load high" icon={FiAlertTriangle} tone="yellow" />
        <HqKpi label="Orange" value={(byStatus.ORANGE || 0).toLocaleString()} sub="35-50 KM" icon={FiClock} tone="orange" />
        <HqKpi label="Red" value={(byStatus.RED || 0).toLocaleString()} sub="No FO < 50 KM" icon={FiXCircle} tone={(byStatus.RED || 0) ? 'red' : 'none'} />
        <HqKpi label="Active FOs" value={fos.length.toLocaleString()} sub={`${overloaded} overloaded · ${idleFos} idle`} icon={FiUsers} tone="blue" />
        <HqKpi label="Devices" value={`${activeDevices}/${devices.length}`} sub="Active / total" icon={FiCpu} />
      </div>

      <div className="rounded-2xl border p-3.5 mb-3" style={HQ_CARD_STYLE}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-extrabold">State-wise coverage</span>
          <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>Top 12 states by HQ count</span>
        </div>
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              {['State', 'HQs', 'Coverage', 'Green', 'Yellow', 'Orange', 'Red', '%'].map((h) => (
                <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {byState.map(([s, b]) => {
              const pct = b.total ? Math.round((b.green / b.total) * 100) : 0
              const g = (b.green / b.total) * 100
              const y = ((b.green + b.yellow) / b.total) * 100
              const o = ((b.green + b.yellow + b.orange) / b.total) * 100
              return (
                <tr key={s} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                  <td className="px-2 py-1.5 font-bold">{s}</td>
                  <td className="px-2 py-1.5">{b.total}</td>
                  <td className="px-2 py-1.5" style={{ width: '30%' }}>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: `linear-gradient(to right, ${HQ_TIER_COLOR.GREEN.dot} 0%, ${HQ_TIER_COLOR.GREEN.dot} ${g}%, ${HQ_TIER_COLOR.YELLOW.dot} ${g}% ${y}%, ${HQ_TIER_COLOR.ORANGE.dot} ${y}% ${o}%, ${HQ_TIER_COLOR.RED.dot} ${o}% 100%)` }} />
                  </td>
                  <td className="px-2 py-1.5">{b.green}</td>
                  <td className="px-2 py-1.5">{b.yellow}</td>
                  <td className="px-2 py-1.5">{b.orange}</td>
                  <td className="px-2 py-1.5">{b.red}</td>
                  <td className="px-2 py-1.5 font-bold">{pct}%</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <HqKpi label="Total MRs" value={mrs.length.toLocaleString()} sub="Across all companies" icon={FiUsers} tone="blue" />
        <HqKpi label="Serviceable MRs" value={servMr.toLocaleString()} sub="Cover ≥1 camp city" icon={FiCheckCircle} tone="green" />
        <HqKpi label="Non-serviceable MRs" value={(mrs.length - servMr).toLocaleString()} sub="No serviceable city" icon={FiXCircle} tone={mrs.length - servMr ? 'red' : 'none'} />
        <HqKpi label="Projects" value={projRows.length.toLocaleString()} sub="With MR coverage" icon={FiDatabase} />
      </div>

      <div className="rounded-2xl border p-3.5 mb-3" style={HQ_CARD_STYLE}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-extrabold">MR serviceability · by project</span>
          <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>Serviceable = MR covers ≥1 city for that project's camp type</span>
        </div>
        {projRows.length ? (
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                {['Project', 'Company', 'Type', 'Total MRs', 'Serviceable', 'Non-serviceable', 'Coverage', '%'].map((h) => (
                  <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projRows.map((r) => {
                const pct = r.total ? Math.round((r.serv / r.total) * 100) : 0
                return (
                  <tr key={r.id} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                    <td className="px-2 py-1.5 font-bold">{r.name}</td>
                    <td className="px-2 py-1.5">{r.client}</td>
                    <td className="px-2 py-1.5">{r.type}</td>
                    <td className="px-2 py-1.5">{r.total}</td>
                    <td className="px-2 py-1.5" style={{ color: HQ_TIER_COLOR.GREEN.fg, fontWeight: 700 }}>{r.serv}</td>
                    <td className="px-2 py-1.5" style={{ color: r.non ? HQ_TIER_COLOR.RED.fg : 'var(--qms-text-muted)', fontWeight: 700 }}>{r.non}</td>
                    <td className="px-2 py-1.5" style={{ width: '24%' }}>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: `linear-gradient(to right,${HQ_TIER_COLOR.GREEN.dot} 0%,${HQ_TIER_COLOR.GREEN.dot} ${pct}%,${HQ_TIER_COLOR.RED.dot} ${pct}% 100%)` }} />
                    </td>
                    <td className="px-2 py-1.5 font-bold">{pct}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-4" style={{ color: 'var(--qms-text-muted)' }}>No MR-mapped divisions found.</div>
        )}
      </div>

      <HqTable rows={rows.slice(0, 100)} title="Top 100 HQ rows" onOpenRow={onOpenRow} />
    </div>
  )
}

export default AdminTab
