import { useMemo, useState } from 'react'
import { FiChevronRight, FiMapPin, FiUsers, FiFile, FiTrash2, FiSave, FiPlay, FiDownload } from 'react-icons/fi'
import type { Client, Division, ClientMr } from '@/types/client.types'
import type { GeoFo, ClassifiedCity } from '@/features/hq/hq.types'
import { classifyCity } from '@/features/hq/hq.service'
import { ROLLUP_PROJECTS, PROJECT_DEVICE, type RollupProject } from '@/features/hq/components/hqmapping/mappingRollups'
import { downloadCsv } from '@/features/hq/components/hqmapping/hq.ui'
import { toast } from '@/components/ui/sonner'

interface MappingGenerateViewProps {
  division: Division
  client: Client | undefined
  mrs: ClientMr[]
  fos: GeoFo[]
  onOpenCompanies: () => void
  onOpenCompany: (id: string) => void
  onOpenDivision: (id: string) => void
}

interface MappingResult {
  projectType: RollupProject
  device: string
  rows: ClassifiedCity[]
  generatedAt: string
}

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase())

// Exact port of hq-mapping.js's viewMapping()/generate()/renderResults()/
// hmExportMapping() (lines 402-654) — a 3-step wizard (upload/paste HQ city
// list → pick project type → generate) that runs classifyCity() per city and
// renders serviceable/non-serviceable result tabs. Per-division HQ lists are
// kept in local component state (mirrors the prototype's own per-division
// localStorage key qms.hqmap.hqlist.<divId> — session-scoped here since this
// is a planning scratchpad, not persisted master data).
const MappingGenerateView = ({ division, client, mrs, fos, onOpenCompanies, onOpenCompany, onOpenDivision }: MappingGenerateViewProps) => {
  const dmr = useMemo(() => mrs.filter((m) => m.divisionId === division.id), [mrs, division.id])

  const [cityListText, setCityListText] = useState('')
  const [projectType, setProjectType] = useState<RollupProject>('Screening')
  const [result, setResult] = useState<MappingResult | null>(null)
  const [resultTab, setResultTab] = useState<'serv' | 'non'>('serv')

  const cities = useMemo(
    () => Array.from(new Set(cityListText.split(/[\n,;]+/).map((s) => titleCase(s.trim())).filter(Boolean))),
    [cityListText]
  )

  const prefillFromMrs = () => {
    const mrCities = Array.from(new Set(dmr.map((m) => m.hq).filter(Boolean)))
    setCityListText(mrCities.join('\n'))
    toast.success(`Prefilled ${mrCities.length} MR HQ cities`)
  }

  const generate = () => {
    if (!cities.length) { toast.error('Add at least one HQ city — prefill or paste above'); return }
    const device = PROJECT_DEVICE[projectType]
    const rows = cities.map((city) => classifyCity(city, device, fos))
    setResult({ projectType, device, rows, generatedAt: new Date().toISOString() })
    setResultTab('serv')
    toast.success(`Generated · ${rows.filter((r) => r.serviceable).length}/${rows.length} serviceable`)
  }

  const exportMapping = () => {
    if (!result) return
    const rows = result.rows.map((r) => {
      const near = r.nearestDeviceFo
      const note = r.serviceable
        ? r.reason
        : (near ? `Nearest ${result.device} location: ${near.fo.hq} (${near.km} KM)` : `No FO carries ${result.device}${r.nearestAnyFo ? ` · nearest FO of any kind: ${r.nearestAnyFo.fo.hq} (${r.nearestAnyFo.km} KM)` : ''}`)
      return {
        City: r.city, Serviceable: r.serviceable ? 'YES' : 'NO', Status: r.status, Project: result.projectType,
        RequiredDevice: result.device, NearestDeviceLocation: near?.fo.hq || '', NearestDeviceFO: near?.fo.name || '',
        Distance_KM: near?.km ?? '', ETA_min: near?.etaMin ?? '', Note: note,
      }
    })
    const base = `HQ-Mapping_${(client?.name || '').replace(/\W+/g, '')}_${division.name.replace(/\W+/g, '')}_${result.projectType}`
    downloadCsv(`${base}.csv`, rows)
    toast.success('Exported CSV')
  }

  const serv = result?.rows.filter((r) => r.serviceable) ?? []
  const non = result?.rows.filter((r) => !r.serviceable) ?? []
  const pct = result?.rows.length ? Math.round((serv.length / result.rows.length) * 100) : 0

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] mb-3.5 flex-wrap" style={{ color: 'var(--qms-text-muted)' }}>
        <a onClick={onOpenCompanies} className="font-bold cursor-pointer" style={{ color: 'var(--qms-brand)' }}>Companies</a>
        <FiChevronRight size={13} />
        <a onClick={() => client && onOpenCompany(client.id)} className="font-bold cursor-pointer" style={{ color: 'var(--qms-brand)' }}>{client?.name || 'Company'}</a>
        <FiChevronRight size={13} />
        <a onClick={() => onOpenDivision(division.id)} className="font-bold cursor-pointer" style={{ color: 'var(--qms-brand)' }}>{division.name}</a>
        <FiChevronRight size={13} />
        <b style={{ color: 'var(--qms-text)' }}>HQ Mapping</b>
      </div>

      <div className="rounded-2xl border p-4 mb-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold mb-1"><FiMapPin size={14} /> HQ Mapping — {division.name}</div>
        <div className="text-[11px] mb-3.5" style={{ color: 'var(--qms-text-muted)' }}>
          Paste or prefill the MR HQ list, choose the project, then generate serviceability. Test device: <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,109,255,.1)', color: 'var(--qms-brand)' }}>{PROJECT_DEVICE[projectType]}</span>
        </div>

        <div className="grid gap-3.5">
          <div className="grid gap-2.5" style={{ gridTemplateColumns: '28px 1fr' }}>
            <div className="w-7 h-7 rounded-lg grid place-items-center font-extrabold text-[13px] text-white" style={{ background: cities.length ? '#10b981' : 'var(--qms-brand)' }}>1</div>
            <div>
              <div className="font-bold text-[13px] mb-1.5">Upload HQ list <span className="text-[11px] font-normal" style={{ color: 'var(--qms-text-muted)' }}>({cities.length} cities loaded)</span></div>
              <div className="flex gap-2 mb-2 flex-wrap">
                <button onClick={prefillFromMrs} className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
                  <FiUsers size={12} /> Prefill from {dmr.length} division MRs
                </button>
                <button onClick={() => downloadCsv('hq-list-template.csv', [{ City: 'Mumbai' }, { City: 'Pune' }, { City: 'Nagpur' }])} className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
                  <FiFile size={12} /> Template
                </button>
                {cities.length > 0 && (
                  <button onClick={() => { setCityListText(''); setResult(null); toast.info('Cleared') }} className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
                    <FiTrash2 size={12} /> Clear
                  </button>
                )}
              </div>
              <textarea
                value={cityListText}
                onChange={(e) => setCityListText(e.target.value)}
                placeholder="…or paste cities, one per line (e.g. Mumbai, Pune, Nagpur)"
                className="w-full min-h-[74px] text-[12px] rounded-lg border p-2 font-sans resize-y"
                style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text)' }}
              />
              <div className="mt-1.5">
                <button onClick={() => toast.success(`Saved ${cities.length} cities`)} className="flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
                  <FiSave size={12} /> Save pasted list
                </button>
              </div>
            </div>
          </div>

          <div className="grid gap-2.5" style={{ gridTemplateColumns: '28px 1fr' }}>
            <div className="w-7 h-7 rounded-lg grid place-items-center font-extrabold text-[13px] text-white" style={{ background: '#10b981' }}>2</div>
            <div>
              <div className="font-bold text-[13px] mb-1.5">Project type</div>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as RollupProject)}
                className="text-[12.5px] px-2.5 py-1.5 rounded-lg border"
                style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text)' }}
              >
                {ROLLUP_PROJECTS.map((p) => <option key={p} value={p}>{p} → {PROJECT_DEVICE[p]}</option>)}
              </select>
            </div>
          </div>

          <div className="grid gap-2.5" style={{ gridTemplateColumns: '28px 1fr' }}>
            <div className="w-7 h-7 rounded-lg grid place-items-center font-extrabold text-[13px] text-white" style={{ background: 'var(--qms-brand)' }}>3</div>
            <div>
              <div className="font-bold text-[13px] mb-1.5">Generate the list</div>
              <button onClick={generate} className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
                <FiPlay size={13} /> Generate serviceability
              </button>
              <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>Uses the loaded list, or whatever cities are in the box above.</div>
            </div>
          </div>
        </div>
      </div>

      {result && (
        <div>
          <div className="grid gap-2.5 mb-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}>
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}><div className="text-[10px] uppercase font-bold" style={{ color: 'var(--qms-text-muted)' }}>Total HQ cities</div><div className="text-[22px] font-extrabold mt-0.5" style={{ color: 'var(--qms-brand)' }}>{result.rows.length}</div></div>
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}><div className="text-[10px] uppercase font-bold" style={{ color: 'var(--qms-text-muted)' }}>Serviceable</div><div className="text-[22px] font-extrabold mt-0.5" style={{ color: '#059669' }}>{serv.length}</div></div>
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}><div className="text-[10px] uppercase font-bold" style={{ color: 'var(--qms-text-muted)' }}>Non-serviceable</div><div className="text-[22px] font-extrabold mt-0.5" style={{ color: '#e11d48' }}>{non.length}</div></div>
            <div className="rounded-xl border p-3" style={{ borderColor: 'var(--qms-border)' }}><div className="text-[10px] uppercase font-bold" style={{ color: 'var(--qms-text-muted)' }}>Coverage</div><div className="text-[22px] font-extrabold mt-0.5" style={{ color: 'var(--qms-brand)' }}>{pct}%</div></div>
          </div>

          <div className="flex justify-end mb-2.5">
            <button onClick={exportMapping} className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
              <FiDownload size={13} /> Export CSV
            </button>
          </div>

          <div className="flex gap-1.5 mb-2.5 flex-wrap">
            <button onClick={() => setResultTab('serv')} className="text-[12px] font-bold px-3 py-1.5 rounded-lg border" style={{ background: resultTab === 'serv' ? 'var(--qms-brand)' : 'var(--qms-surface)', color: resultTab === 'serv' ? '#fff' : 'var(--qms-text-muted)', borderColor: resultTab === 'serv' ? 'var(--qms-brand)' : 'var(--qms-border)' }}>
              Serviceable ({serv.length})
            </button>
            <button onClick={() => setResultTab('non')} className="text-[12px] font-bold px-3 py-1.5 rounded-lg border" style={{ background: resultTab === 'non' ? 'var(--qms-brand)' : 'var(--qms-surface)', color: resultTab === 'non' ? '#fff' : 'var(--qms-text-muted)', borderColor: resultTab === 'non' ? 'var(--qms-brand)' : 'var(--qms-border)' }}>
              Non-serviceable ({non.length})
            </button>
          </div>

          {resultTab === 'serv' ? (
            <div className="rounded-2xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
              <table className="w-full text-[12px] border-collapse">
                <thead><tr>{['City', 'Status', 'Nearest device-FO', 'Distance', 'Device'].map((h) => <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {serv.length ? serv.map((r) => (
                    <tr key={r.city} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                      <td className="px-2 py-1.5"><b>{r.city}</b></td>
                      <td className="px-2 py-1.5"><span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.15)', color: '#059669' }}>Serviceable</span></td>
                      <td className="px-2 py-1.5">{r.nearestDeviceFo ? `${r.nearestDeviceFo.fo.name} · ${r.nearestDeviceFo.fo.hq}` : '—'}</td>
                      <td className="px-2 py-1.5">{r.nearestDeviceFo ? `${r.nearestDeviceFo.km} KM` : '—'}</td>
                      <td className="px-2 py-1.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{result.device}</td>
                    </tr>
                  )) : <tr><td colSpan={5} className="text-center py-4" style={{ color: 'var(--qms-text-muted)' }}>None.</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-2xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
              <div className="text-[11px] mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>For each non-serviceable city, the nearest serviceable location whose FO carries the required device, and the distance.</div>
              <table className="w-full text-[12px] border-collapse">
                <thead><tr>{['City', 'Status', 'Nearest location with device', 'Distance', 'Required device'].map((h) => <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>)}</tr></thead>
                <tbody>
                  {non.length ? non.map((r) => (
                    <tr key={r.city} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                      <td className="px-2 py-1.5"><b>{r.city}</b></td>
                      <td className="px-2 py-1.5">
                        <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: r.status === 'ORANGE' ? 'rgba(245,158,11,.15)' : 'rgba(244,63,94,.15)', color: r.status === 'ORANGE' ? '#d97706' : '#e11d48' }}>
                          {r.status === 'ORANGE' ? 'Extended' : 'Non-serviceable'}
                        </span>
                      </td>
                      <td className="px-2 py-1.5">
                        {r.nearestDeviceFo ? `${r.nearestDeviceFo.fo.hq} · ${r.nearestDeviceFo.fo.name}` : <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>no FO has {result.device}</span>}
                      </td>
                      <td className="px-2 py-1.5">{r.nearestDeviceFo ? <><b>{r.nearestDeviceFo.km} KM</b> <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>~{r.nearestDeviceFo.etaMin} min</span></> : '—'}</td>
                      <td className="px-2 py-1.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{result.device}</td>
                    </tr>
                  )) : <tr><td colSpan={5} className="text-center py-4" style={{ color: 'var(--qms-text-muted)' }}>None.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default MappingGenerateView
