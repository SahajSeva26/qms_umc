import type { Incident } from '@/features/fo/fo.types'
import { categoryLabel, fmtDt, fmtMins, slaDisplay, severityStyle, statusStyle, statusLabel } from './incidents.ui'

interface IncidentsAllTabProps {
  incidents: Incident[]
  onOpenTicket: (incident: Incident) => void
}

// All tickets — mirrors incidents.js's tabAll() EXACTLY: a flat, unfiltered
// table sorted newest-first with no search/status/severity filter controls
// of any kind. Confirmed by reading the prototype source in full (incidents.js
// lines 122-151) — tabAll() reads INC.loadTickets() straight into rows with
// zero filter state, unlike almost every other list screen in this codebase.
// That gap is preserved deliberately rather than "fixed" with invented
// filter chips, per this build's faithful-port mandate.
const IncidentsAllTab = ({ incidents, onOpenTicket }: IncidentsAllTabProps) => {
  const rows = [...incidents].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

  return (
    <div className="space-y-3">
      <div className="rounded-xl border p-3.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
        <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>All incidents</div>
        <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>
          {rows.length} ticket{rows.length === 1 ? '' : 's'} on record · click any row for the full detail drawer
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
                {['Ticket · Raised', 'Severity', 'Title · Category', 'Reporter', 'Assignee', 'Status', 'SLA'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-semibold" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const sla = slaDisplay(t)
                const sevStyle = severityStyle(t.severity)
                const statStyle = statusStyle(t.status)
                return (
                  <tr
                    key={t.id}
                    onClick={() => onOpenTicket(t)}
                    className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                    style={{ borderBottom: '1px solid var(--qms-border)' }}
                  >
                    <td className="px-3 py-2 align-top">
                      <div className="font-extrabold" style={{ color: 'var(--qms-text)' }}>{t.id}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{fmtDt(t.createdAt)}</div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide" style={{ background: sevStyle.bg, color: sevStyle.color }}>{t.severity}</span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-bold" style={{ color: 'var(--qms-text)' }}>{t.title}</div>
                      <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{categoryLabel(t.category)}{t.city ? ` · ${t.city}` : ''}</div>
                    </td>
                    <td className="px-3 py-2 align-top" style={{ color: 'var(--qms-text)' }}>{t.raisedByName || '—'}</td>
                    <td className="px-3 py-2 align-top" style={{ color: 'var(--qms-text)' }}>{t.assignedToName || '—'}</td>
                    <td className="px-3 py-2 align-top">
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full tracking-wide" style={{ background: statStyle.bg, color: statStyle.color }}>{statusLabel(t.status)}</span>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="w-[90px] h-2 rounded-full overflow-hidden" style={{ background: 'var(--qms-surface-strong)' }}>
                        <div className="h-full rounded-full" style={{ width: `${sla.pct}%`, background: sla.color }} />
                      </div>
                      <div className="text-[10.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                        {fmtMins(sla.elapsedMin)} / {fmtMins(sla.slaMin)}{sla.breachedBy > 0 ? <b style={{ color: 'var(--danger)' }}> over</b> : null}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
                    No tickets yet — click <b>Raise ticket</b> in the header to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default IncidentsAllTab
