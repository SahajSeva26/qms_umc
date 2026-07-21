import { useMemo, useState } from 'react'
import { FiSearch, FiMapPin, FiCheckCircle, FiXCircle, FiAlertTriangle, FiList } from 'react-icons/fi'
import type { ClassifiedHq, GeoFo, HqRecord } from '@/features/hq/hq.types'
import { classifyHq } from '@/features/hq/hq.service'
import { lookupCity } from '@/features/hq/cityGazetteer'
import HqKpi from '@/features/hq/components/hqmapping/HqKpi'
import HqTable from '@/features/hq/components/hqmapping/HqTable'
import { HqStatusPill } from '@/features/hq/components/hqmapping/StatusPill'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SalesTabProps {
  rows: ClassifiedHq[]
  fos: GeoFo[]
  onOpenRow: (id: string) => void
}

// Exact port of hq-serviceability.js's renderSales()/bindSales()/
// hqCheckCity()/hqRunCheckCity() (lines 733-815) — live quick-search over the
// filtered rows plus a standalone "check a city" probe that runs classifyHq()
// against a synthetic HQ built from the typed city + optional device.
const SalesTab = ({ rows, fos, onOpenRow }: SalesTabProps) => {
  const [q, setQ] = useState('')
  const [checkCity, setCheckCity] = useState('')
  const [checkDevice, setCheckDevice] = useState('')
  const [checkResult, setCheckResult] = useState<ClassifiedHq | { error: string } | null>(null)

  const quickResults = useMemo(() => {
    const query = q.toLowerCase().trim()
    if (!query) return []
    return rows.filter((r) =>
      `${r.company} ${r.hqName} ${r.city} ${r.division} ${r.nearestFo?.name ?? ''}`.toLowerCase().includes(query)
    ).slice(0, 10)
  }, [rows, q])

  const runCheckCity = () => {
    const city = checkCity.trim()
    const coord = lookupCity(city)
    if (!coord) {
      setCheckResult({ error: `No coords for "${city}". Add to gazetteer or enter exact lat/lng.` })
      return
    }
    const probe: HqRecord = {
      id: 'probe', company: '', division: '', hqCode: '', hqName: city, state: coord.state,
      district: '', city, pincode: '', lat: coord.lat, lng: coord.lng,
      priority: 'MED', businessPotential: 'Silver', requiredDevice: checkDevice.trim(),
      campsPerMonth: 0, createdAt: new Date().toISOString(), source: 'seed',
    }
    setCheckResult(classifyHq(probe, fos))
  }

  const fast = rows.slice(0, 8)
  const green = rows.filter((r) => r.status === 'GREEN').length
  const red = rows.filter((r) => r.status === 'RED').length
  const edge = rows.filter((r) => r.status === 'YELLOW' || r.status === 'ORANGE').length

  return (
    <div>
      <div className="rounded-2xl border p-3.5 mb-2.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-2">
          <FiSearch size={16} style={{ color: 'var(--qms-text-muted)' }} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Type a city, pharma name, division, or FO name…" className="flex-1" />
        </div>
        {quickResults.length > 0 && (
          <div className="mt-2.5 max-h-[300px] overflow-y-auto">
            {quickResults.map((r) => (
              <div
                key={r.id}
                onClick={() => onOpenRow(r.id)}
                className="flex items-center gap-2.5 p-2 rounded-lg cursor-pointer hover:bg-(--qms-surface-hover)"
              >
                <div className="w-[30px] h-[30px] rounded-lg grid place-items-center shrink-0" style={{ background: 'rgba(124,92,255,.12)' }}>
                  <FiMapPin size={14} color="#6d28d9" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold truncate">{r.hqName}</div>
                  <div className="text-[10.5px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{r.company} · {r.city} · {r.state}</div>
                </div>
                <HqStatusPill status={r.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[13px] font-extrabold mb-2.5">Check a city</div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--qms-text-muted)' }}>City name</label>
            <Input value={checkCity} onChange={(e) => setCheckCity(e.target.value)} placeholder="e.g. Pune, Indore, Coimbatore" />
          </div>
          <div className="flex-1 min-w-[160px]">
            <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--qms-text-muted)' }}>Required device (optional)</label>
            <Input value={checkDevice} onChange={(e) => setCheckDevice(e.target.value)} placeholder="e.g. BP, ECG, Glucometer" />
          </div>
          <Button onClick={runCheckCity}><FiSearch size={13} /> Check</Button>
        </div>
        {checkResult && (
          <div className="mt-3">
            {'error' in checkResult ? (
              <div className="inline-flex items-center gap-1.5 text-[11.5px] font-bold px-2.5 py-1.5 rounded-lg" style={{ background: 'rgba(244,63,94,.16)', color: '#b91c1c' }}>
                {checkResult.error}
              </div>
            ) : (
              <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}>
                <HqStatusPill status={checkResult.status} />
                <div className="text-[13px] mt-2"><b>{checkResult.city}</b> · {checkResult.state}</div>
                <div className="text-[11.5px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>{checkResult.reason}</div>
                {checkResult.nearestFo && (
                  <div className="mt-2.5 p-2.5 rounded-lg text-[12px]" style={{ background: 'rgba(20,184,166,.06)' }}>
                    Nearest FO: <b>{checkResult.nearestFo.name}</b> · {checkResult.nearestFo.hq} · <b>{checkResult.distanceKm?.toFixed(1)} KM</b> (~{checkResult.etaMin} min)<br />
                    Device: {checkResult.nearestFo.devices.join(' · ') || '—'} · load {checkResult.nearestFo.loadPct}%
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <HqKpi label="In current filter" value={rows.length} icon={FiList} tone="blue" />
        <HqKpi label="Serviceable" value={green} sub="Ready to book" icon={FiCheckCircle} tone="green" />
        <HqKpi label="Not serviceable" value={red} sub="Needs ops escalation" icon={FiXCircle} tone="red" />
        <HqKpi label="Edge cases" value={edge} sub="YELLOW / ORANGE" icon={FiAlertTriangle} tone="yellow" />
      </div>

      <HqTable rows={fast} title="Top HQ matches" onOpenRow={onOpenRow} />
    </div>
  )
}

export default SalesTab
