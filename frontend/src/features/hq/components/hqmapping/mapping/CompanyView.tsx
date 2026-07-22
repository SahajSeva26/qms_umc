import { FiChevronRight, FiUsers, FiLayers, FiDownload } from 'react-icons/fi'
import type { Client, Division, ClientMr } from '@/types/client.types'
import type { GeoFo } from '@/features/hq/hq.types'
import { ROLLUP_PROJECTS, PROJECT_DEVICE, mrServiceability } from '@/features/hq/components/hqmapping/mappingRollups'
import { downloadCsv } from '@/features/hq/components/hqmapping/hq.ui'
import { toast } from '@/components/ui/sonner'

interface CompanyViewProps {
  client: Client
  divisions: Division[]
  mrs: ClientMr[]
  fos: GeoFo[]
  radiusKm: number
  onOpenCompanies: () => void
  onOpenDivision: (id: string) => void
}

// Exact port of hq-mapping.js's viewCompany()/hmExportMrRollup() (lines
// 287-342, 656-675) — overall project-wise MR serviceability for the
// company + division cards + MR-rollup CSV export.
const CompanyView = ({ client, divisions, mrs, fos, radiusKm, onOpenCompanies, onOpenDivision }: CompanyViewProps) => {
  const divs = divisions.filter((d) => d.clientId === client.id)
  const mrList = mrs.filter((m) => m.clientId === client.id)

  const projTable = ROLLUP_PROJECTS.map((pt) => {
    const r = mrServiceability(mrList, pt, fos)
    const tot = r.serviceable.length + r.nonServiceable.length
    const pct = tot ? Math.round((r.serviceable.length / tot) * 100) : 0
    return { pt, device: r.device, serv: r.serviceable.length, non: r.nonServiceable.length, pct }
  })

  const exportRollup = () => {
    const rows: Record<string, unknown>[] = []
    ROLLUP_PROJECTS.forEach((pt) => {
      const r = mrServiceability(mrList, pt, fos)
      const device = PROJECT_DEVICE[pt]
      ;[...r.serviceable, ...r.nonServiceable].forEach(({ mr, serviceable }) => {
        const div = divisions.find((d) => d.id === mr.divisionId)
        rows.push({
          MR: mr.name, EmpCode: mr.empCode, Division: div?.name || '', HQ: mr.hq, Region: mr.region,
          Project: pt, Serviceable: serviceable ? 'YES' : 'NO', Required_Device: device,
        })
      })
    })
    downloadCsv(`MR-Serviceability_${client.name.replace(/\W+/g, '')}.csv`, rows)
    toast.success('Exported MR rollup')
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 text-[12px] mb-3.5 flex-wrap" style={{ color: 'var(--qms-text-muted)' }}>
        <a onClick={onOpenCompanies} className="font-bold cursor-pointer" style={{ color: 'var(--qms-brand)' }}>Companies</a>
        <FiChevronRight size={13} />
        <b style={{ color: 'var(--qms-text)' }}>{client.name}</b>
      </div>

      <div className="flex gap-3 items-center mb-3.5">
        <div className="w-[54px] h-[54px] rounded-xl grid place-items-center text-white font-extrabold text-xl shrink-0" style={{ background: client.color || '#3b6dff' }}>
          {client.logo || client.name[0]}
        </div>
        <div>
          <div className="text-[18px] font-extrabold">{client.name}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{divs.length} divisions · {mrList.length} MRs total</div>
        </div>
      </div>

      <div className="rounded-2xl border p-4 mb-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-center gap-1.5 text-[13px] font-extrabold mb-1"><FiUsers size={14} /> Overall MR serviceability — project-wise</div>
        <div className="text-[11px] mb-3" style={{ color: 'var(--qms-text-muted)' }}>
          Across all {mrList.length} MRs in {client.name}. A MR is serviceable when an FO carrying the project's device is within {radiusKm} KM of the MR HQ.
        </div>
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>{['Project', 'Serviceable', 'Non-serviceable', 'Coverage'].map((h) => <th key={h} className="text-left px-2 py-1.5 text-[10px] font-extrabold uppercase" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {projTable.map((r) => (
              <tr key={r.pt} style={{ borderBottom: '1px dashed var(--qms-border)' }}>
                <td className="px-2 py-1.5">
                  <b>{r.pt}</b>
                  <div className="text-[10.5px]" style={{ color: 'var(--qms-text-muted)' }}>device: {r.device}</div>
                </td>
                <td className="px-2 py-1.5"><span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,.15)', color: '#059669' }}>{r.serv} serviceable</span></td>
                <td className="px-2 py-1.5"><span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(244,63,94,.15)', color: '#e11d48' }}>{r.non} not</span></td>
                <td className="px-2 py-1.5">{r.pct}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3">
          <button onClick={exportRollup} className="flex items-center gap-1.5 text-[11.5px] font-bold px-3 py-1.5 rounded-lg border" style={{ borderColor: 'var(--qms-border)' }}>
            <FiDownload size={13} /> Export MR rollup
          </button>
        </div>
      </div>

      <div className="text-[13px] font-extrabold mt-4.5 mb-2.5">Divisions</div>
      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
        {divs.length ? divs.map((d) => {
          const dmr = mrList.filter((m) => m.divisionId === d.id)
          const chips = ROLLUP_PROJECTS.map((pt) => {
            const x = mrServiceability(dmr, pt, fos)
            return { pt, ok: x.serviceable.length, bad: x.nonServiceable.length }
          })
          return (
            <div key={d.id} onClick={() => onOpenDivision(d.id)} className="rounded-2xl border p-4 cursor-pointer transition-transform hover:-translate-y-0.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
              <div className="flex gap-3 items-center mb-3">
                <div className="w-[46px] h-[46px] rounded-xl grid place-items-center shrink-0 text-white" style={{ background: client.color || '#3b6dff' }}>
                  <FiLayers size={20} />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-extrabold">{d.name}</div>
                  <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{d.therapy} · {dmr.length} MRs</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((p) => (
                  <span key={p.pt} className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex gap-1 items-center" style={{ background: p.bad === 0 ? 'rgba(16,185,129,.13)' : 'rgba(244,63,94,.13)', color: p.bad === 0 ? '#059669' : '#e11d48' }}>
                    {p.pt} <b>{p.ok}</b>/<b>{p.ok + p.bad}</b>
                  </span>
                ))}
              </div>
            </div>
          )
        }) : <div className="text-center py-6 col-span-full" style={{ color: 'var(--qms-text-muted)' }}>No divisions.</div>}
      </div>
    </div>
  )
}

export default CompanyView
