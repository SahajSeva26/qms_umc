import { useMemo } from 'react'
import { FiCheck } from 'react-icons/fi'
import type { ClassifiedHq, GeoFo, HqRecord } from '@/features/hq/hq.types'
import type { Camp } from '@/types/camp.types'
import { classifyHq } from '@/features/hq/hq.service'
import { lookupCity } from '@/features/hq/cityGazetteer'
import HqTable from '@/features/hq/components/hqmapping/HqTable'
import { todayIso } from '@/features/hq/components/hqmapping/hq.ui'

interface CoordTabProps {
  rows: ClassifiedHq[]
  fos: GeoFo[]
  camps: Camp[]
  onOpenRow: (id: string) => void
  onAssignFo: (campId: string, foId: string) => void
}

// Exact port of hq-serviceability.js's renderCoord()/hqAssignFo() (lines
// 940-984) — open camps awaiting FO assignment (today's-nearest-FO
// recommendation via classifyHq() probed from the camp's own city/type),
// plus the serviceable (GREEN/YELLOW) HQ table below it.
const CoordTab = ({ rows, fos, camps, onOpenRow, onAssignFo }: CoordTabProps) => {
  const today = todayIso()
  const upcomingCamps = useMemo(
    () => camps.filter((c) => c.date >= today && !c.foId && !String(c.status || '').startsWith('CANCEL') && c.status !== 'CLOSED').slice(0, 20),
    [camps, today]
  )
  const servRows = useMemo(() => rows.filter((r) => r.status === 'GREEN' || r.status === 'YELLOW'), [rows])

  return (
    <div>
      <div className="rounded-2xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-extrabold">Open camps awaiting assignment</span>
          <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{upcomingCamps.length} camps</span>
        </div>
        {upcomingCamps.length ? (
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                {['Camp', 'Date', 'City', 'Type', 'Recommended FO', ''].map((h) => (
                  <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {upcomingCamps.map((c) => {
                const coord = lookupCity(c.city)
                const probe: HqRecord = {
                  id: 'probe', company: '', division: '', hqCode: '', hqName: c.city, state: c.state,
                  district: '', city: c.city, pincode: '', lat: coord?.lat, lng: coord?.lng,
                  priority: 'MED', businessPotential: 'Silver', requiredDevice: c.type,
                  campsPerMonth: 0, createdAt: new Date().toISOString(), source: 'seed',
                }
                const cls = classifyHq(probe, fos)
                return (
                  <tr key={c.id} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                    <td className="px-2 py-1.5">
                      <div className="font-bold">{c.id}</div>
                      <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{c.clientId || ''}</div>
                    </td>
                    <td className="px-2 py-1.5">{c.date}</td>
                    <td className="px-2 py-1.5">{c.city || '—'}</td>
                    <td className="px-2 py-1.5">{c.type || '—'}</td>
                    <td className="px-2 py-1.5">
                      {cls.nearestFo ? (
                        <>
                          <b>{cls.nearestFo.name}</b> · {cls.distanceKm?.toFixed(1)} KM · ~{cls.etaMin} min · load {cls.nearestFo.loadPct}%
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold px-2.5 py-1 rounded-full" style={{ background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>
                          <span className="w-[7px] h-[7px] rounded-full" style={{ background: '#f43f5e' }} /> No FO
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      {cls.nearestFo && (
                        <button
                          onClick={() => onAssignFo(c.id, cls.nearestFo!.id)}
                          className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg text-white"
                          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
                        >
                          <FiCheck size={12} /> Assign
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-4" style={{ color: 'var(--qms-text-muted)' }}>No open assignments — all set.</div>
        )}
      </div>

      <HqTable rows={servRows.slice(0, 60)} title="Serviceable HQs (drill into any to see nearest FO)" onOpenRow={onOpenRow} />
    </div>
  )
}

export default CoordTab
