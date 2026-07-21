import { FiBriefcase, FiZap } from 'react-icons/fi'
import type { Client, Division, ClientMr } from '@/types/client.types'
import type { GeoFo } from '@/features/hq/hq.types'
import { ROLLUP_PROJECTS, mrServiceability } from '@/features/hq/components/hqmapping/mappingRollups'

interface CompaniesViewProps {
  clients: Client[]
  divisions: Division[]
  mrs: ClientMr[]
  fos: GeoFo[]
  onOpenCompany: (id: string) => void
  onOpenExpansion: () => void
}

// Exact port of hq-mapping.js's viewCompanies()/companyRollup() (lines
// 236-282) — a CRM-style card grid, one per pharma company, showing
// division/MR counts + project-wise serviceable/total chips.
const CompaniesView = ({ clients, divisions, mrs, fos, onOpenCompany, onOpenExpansion }: CompaniesViewProps) => (
  <div>
    <div className="flex items-center gap-1.5 text-[12px] mb-3.5" style={{ color: 'var(--qms-text-muted)' }}>
      <FiBriefcase size={13} /> <b style={{ color: 'var(--qms-text)' }}>Companies</b>
    </div>
    <div className="flex items-start justify-between gap-2 mb-3.5 flex-wrap">
      <div>
        <div className="text-[18px] font-extrabold">HQ Mapping &amp; MR Serviceability</div>
        <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Pick a company → division → run HQ serviceability. Project-wise MR coverage is shown on every card.</div>
      </div>
      <button
        onClick={onOpenExpansion}
        className="flex items-center gap-1.5 text-[12.5px] font-bold px-3 py-2 rounded-xl text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        <FiZap size={13} /> Expansion recommender
      </button>
    </div>

    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))' }}>
      {clients.length ? clients.map((c) => {
        const divs = divisions.filter((d) => d.clientId === c.id)
        const mrList = mrs.filter((m) => m.clientId === c.id)
        const projRollups = ROLLUP_PROJECTS.map((pt) => {
          const r = mrServiceability(mrList, pt, fos)
          return { pt, ok: r.serviceable.length, bad: r.nonServiceable.length }
        })
        const totalServ = projRollups.reduce((s, p) => s + p.ok, 0)
        return (
          <div
            key={c.id}
            onClick={() => onOpenCompany(c.id)}
            className="rounded-2xl border p-4 cursor-pointer transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
          >
            <div className="flex gap-3 items-center mb-3">
              <div className="w-[46px] h-[46px] rounded-xl grid place-items-center shrink-0 text-white font-extrabold text-lg" style={{ background: c.color || '#3b6dff' }}>
                {c.logo || c.name[0]}
              </div>
              <div className="min-w-0">
                <div className="text-[15px] font-extrabold leading-tight">{c.name}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{c.city}{c.state ? `, ${c.state}` : ''} · {c.type}</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-2.5">
              <div className="text-center py-1.5 px-1 rounded-lg" style={{ background: 'rgba(59,109,255,.05)' }}>
                <b className="block text-[15px]" style={{ color: 'var(--qms-brand)' }}>{divs.length}</b>
                <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Divisions</div>
              </div>
              <div className="text-center py-1.5 px-1 rounded-lg" style={{ background: 'rgba(59,109,255,.05)' }}>
                <b className="block text-[15px]" style={{ color: 'var(--qms-brand)' }}>{mrList.length}</b>
                <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>MRs</div>
              </div>
              <div className="text-center py-1.5 px-1 rounded-lg" style={{ background: 'rgba(59,109,255,.05)' }}>
                <b className="block text-[15px]" style={{ color: 'var(--qms-brand)' }}>{totalServ}</b>
                <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Serviceable</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {projRollups.map((p) => (
                <span
                  key={p.pt}
                  title={`${p.pt}: ${p.ok} serviceable / ${p.bad} not`}
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex gap-1 items-center"
                  style={{ background: p.bad === 0 ? 'rgba(16,185,129,.13)' : 'rgba(244,63,94,.13)', color: p.bad === 0 ? '#059669' : '#e11d48' }}
                >
                  {p.pt} <b>{p.ok}</b>/<b>{p.ok + p.bad}</b>
                </span>
              ))}
            </div>
          </div>
        )
      }) : <div className="text-center py-8 col-span-full" style={{ color: 'var(--qms-text-muted)' }}>No companies found.</div>}
    </div>
  </div>
)

export default CompaniesView
