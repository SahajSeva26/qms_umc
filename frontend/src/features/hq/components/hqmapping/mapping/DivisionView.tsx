import { FiChevronRight, FiUsers, FiList, FiMapPin } from 'react-icons/fi'
import type { Client, Division, ClientMr } from '@/types/client.types'
import type { GeoFo } from '@/features/hq/hq.types'
import { classifyCity } from '@/features/hq/hq.service'
import { ROLLUP_PROJECTS, PROJECT_DEVICE, mrServiceability } from '@/features/hq/components/hqmapping/mappingRollups'

interface DivisionViewProps {
  division: Division
  client: Client | undefined
  mrs: ClientMr[]
  fos: GeoFo[]
  onOpenCompanies: () => void
  onOpenCompany: (id: string) => void
  onOpenMapping: (divisionId: string) => void
}

// Exact port of hq-mapping.js's viewDivision() (lines 347-399) — project-wise
// MR rollup + full MR roster with a per-MR Screening serviceability check +
// nearest device-FO, and the "HQ Mapping" launch button.
const DivisionView = ({ division, client, mrs, fos, onOpenCompanies, onOpenCompany, onOpenMapping }: DivisionViewProps) => {
  const dmr = mrs.filter((m) => m.divisionId === division.id)

  const projTable = ROLLUP_PROJECTS.map((pt) => {
    const r = mrServiceability(dmr, pt, fos)
    const tot = r.serviceable.length + r.nonServiceable.length
    const pct = tot ? Math.round((r.serviceable.length / tot) * 100) : 0
    return { pt, device: r.device, serv: r.serviceable.length, non: r.nonServiceable.length, pct }
  })

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] mb-3.5 flex-wrap" style={{ color: 'var(--qms-text-muted)' }}>
        <a onClick={onOpenCompanies} className="font-bold cursor-pointer" style={{ color: 'var(--qms-brand)' }}>Companies</a>
        <FiChevronRight size={13} />
        <a onClick={() => client && onOpenCompany(client.id)} className="font-bold cursor-pointer" style={{ color: 'var(--qms-brand)' }}>{client?.name || 'Company'}</a>
        <FiChevronRight size={13} />
        <b style={{ color: 'var(--qms-text)' }}>{division.name}</b>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3.5 flex-wrap">
        <div>
          <div className="text-[18px] font-extrabold">{division.name}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{client?.name || ''} · {division.therapy} · {dmr.length} MRs</div>
        </div>
        <button
          onClick={() => onOpenMapping(division.id)}
          className="flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-2 rounded-xl text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiMapPin size={14} /> HQ Mapping
        </button>
      </div>

      <div className="rounded-2xl border p-4 mb-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold mb-2.5"><FiUsers size={14} /> MR serviceability — project-wise</div>
        <table className="w-full text-[12px] border-collapse">
          <thead><tr>{['Project', 'Serviceable', 'Non-serviceable', 'Coverage'].map((h) => <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>)}</tr></thead>
          <tbody>
            {projTable.map((r) => (
              <tr key={r.pt} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                <td className="px-2 py-1.5"><b>{r.pt}</b><div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>device: {r.device}</div></td>
                <td className="px-2 py-1.5"><span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.15)', color: '#059669' }}>{r.serv}</span></td>
                <td className="px-2 py-1.5"><span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(244,63,94,.15)', color: '#e11d48' }}>{r.non}</span></td>
                <td className="px-2 py-1.5">{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold mb-2.5"><FiList size={14} /> MR roster ({dmr.length})</div>
        <table className="w-full text-[12px] border-collapse">
          <thead><tr>{['MR', 'HQ', 'Designation', 'Region', 'Screening', 'Nearest device-FO'].map((h) => <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>)}</tr></thead>
          <tbody>
            {dmr.length ? dmr.map((m) => {
              const res = classifyCity(m.hq, PROJECT_DEVICE.Screening, fos)
              return (
                <tr key={m.id} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                  <td className="px-2 py-1.5"><b>{m.name}</b><div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>{m.empCode}</div></td>
                  <td className="px-2 py-1.5">{m.hq || '—'}</td>
                  <td className="px-2 py-1.5">{m.designation}</td>
                  <td className="px-2 py-1.5">{m.region}</td>
                  <td className="px-2 py-1.5">
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: res.serviceable ? 'rgba(16,185,129,.15)' : 'rgba(244,63,94,.15)', color: res.serviceable ? '#059669' : '#e11d48' }}>
                      {res.serviceable ? 'Serviceable' : 'Gap'}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{res.nearestDeviceFo ? `${res.nearestDeviceFo.fo.hq} · ${res.nearestDeviceFo.km} KM` : '—'}</td>
                </tr>
              )
            }) : <tr><td colSpan={6} className="text-center py-4" style={{ color: 'var(--qms-text-muted)' }}>No MRs.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default DivisionView
