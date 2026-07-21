import { useRef, useState } from 'react'
import { FiPlay, FiDownload } from 'react-icons/fi'
import type { GeoFo, BulkTestResult } from '@/features/hq/hq.types'
import { bulkTestUniverse, computeBulk } from '@/features/hq/hq.service'
import { BulkStatusPill } from '@/features/hq/components/hqmapping/StatusPill'
import { downloadCsv, todayIso } from '@/features/hq/components/hqmapping/hq.ui'
import { toast } from '@/components/ui/sonner'

interface BulkCheckTabProps {
  fos: GeoFo[]
}

// Exact port of hq-serviceability.js's renderBulk()/bindBulk()/computeBulk()/
// bulkExport() (lines 1336-1538) — upload a city list (paste-based here,
// since the real prototype's Excel parse is SheetJS and this codebase has no
// xlsx dependency; a textarea list-entry is the same "give me a city list"
// affordance without inventing a parser), pick tests, run the 35 KM
// per-test serviceability check, export CSV per test (one download per test
// sheet, since a true multi-sheet .xlsx needs SheetJS which isn't installed).
const BulkCheckTab = ({ fos }: BulkCheckTabProps) => {
  const [citiesText, setCitiesText] = useState('')
  const [cities, setCities] = useState<string[]>([])
  const [selectedTests, setSelectedTests] = useState<string[]>([])
  const [results, setResults] = useState<Record<string, BulkTestResult> | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const universe = bulkTestUniverse(fos)

  const loadPasted = () => {
    const list = Array.from(new Set(citiesText.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)))
    if (!list.length) { toast.error('Paste at least one city name'); return }
    setCities(list)
    setResults(null)
    toast.success(`Loaded ${list.length} cities`)
  }

  const handleFile = (file: File | undefined) => {
    if (!file) return
    toast.info(`Import of ${file.name} — wiring comes next pass. Paste city names below instead.`)
  }

  const toggleTest = (t: string) => {
    setSelectedTests((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
  }

  const runCheck = () => {
    if (!cities.length) { toast.error('Load a city list first'); return }
    if (!selectedTests.length) { toast.error('Pick at least one test'); return }
    setResults(computeBulk(cities, selectedTests, fos))
    toast.success(`Checked ${cities.length} cities × ${selectedTests.length} tests`)
  }

  const exportResults = () => {
    if (!results) { toast.error('Run a check before exporting'); return }
    Object.entries(results).forEach(([test, g]) => {
      downloadCsv(`bulk-city-check-${test.replace(/[^a-z0-9]/gi, '_')}-${todayIso()}.csv`, g.rows.map((r) => ({
        City: r.city, Status: r.status, Serving_FO: r.servingFo || '', Serving_Distance_KM: r.servingKm ?? '',
        Nearest_Serviceable_City: r.nearestCity || '', Nearest_Distance_KM: r.nearestKm ?? '',
      })))
    })
    toast.success('Exported · one CSV per test')
  }

  return (
    <div>
      <div className="rounded-2xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[13px] font-extrabold">Bulk City Check</span>
          <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>Upload a city list, pick tests, check 35 KM serviceability</span>
        </div>
        <div className="flex flex-wrap gap-3.5 items-start mt-2.5">
          <div className="flex flex-col gap-1.5 min-w-[240px] flex-1">
            <div className="text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>1 · Provide a city list</div>
            <textarea
              value={citiesText}
              onChange={(e) => setCitiesText(e.target.value)}
              placeholder={'Paste cities, one per line (e.g. Mumbai, Pune, Nagpur)'}
              className="w-full min-h-[74px] text-[12px] rounded-lg border p-2 font-sans resize-y"
              style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text)' }}
            />
            <div className="flex gap-1.5">
              <button onClick={loadPasted} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>Save pasted list</button>
              <button onClick={() => fileInputRef.current?.click()} className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>Or upload .csv/.xlsx</button>
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            </div>
            <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>
              {cities.length ? `${cities.length} cities loaded` : 'Column named City — or first column.'}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 min-w-[240px]">
            <div className="text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>2 · Select tests</div>
            <div className="flex flex-wrap gap-1.5">
              {universe.map((t) => (
                <label key={t} className="inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full cursor-pointer" style={{ background: 'rgba(15,23,42,.06)' }}>
                  <input type="checkbox" checked={selectedTests.includes(t)} onChange={() => toggleTest(t)} className="m-0" />
                  {t}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3.5">
          <button onClick={runCheck} className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
            <FiPlay size={13} /> Check serviceability
          </button>
          <button onClick={exportResults} className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
            <FiDownload size={13} /> Export (one CSV per test)
          </button>
        </div>
      </div>

      {results ? Object.entries(results).map(([test, g]) => (
        <div key={test} className="rounded-2xl border p-3.5 mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[13px] font-extrabold">Test · {test}</span>
            <span className="text-[10.5px] font-semibold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{g.serviceable} serviceable · {g.nonServiceable} non-serviceable</span>
          </div>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                {['City', 'Status', 'Serving FO · KM', 'Nearest Serviceable City', 'Distance'].map((h) => (
                  <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.rows.map((r) => (
                <tr key={r.city} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                  <td className="px-2 py-1.5 font-bold">{r.city}</td>
                  <td className="px-2 py-1.5"><BulkStatusPill status={r.status} /></td>
                  <td className="px-2 py-1.5">{r.servingFo ? `${r.servingFo} · ${r.servingKm} KM` : '—'}</td>
                  <td className="px-2 py-1.5">{r.nearestCity || '—'}</td>
                  <td className="px-2 py-1.5">{r.nearestKm != null ? `${r.nearestKm} KM` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )) : (
        <div className="rounded-2xl border p-5 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          Load a city list and run a check to see results.
        </div>
      )}
    </div>
  )
}

export default BulkCheckTab
