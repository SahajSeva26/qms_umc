import { FiChevronRight } from 'react-icons/fi'
import type { Client, ClientInvoice, ClientMr, ClientProject, Division } from '@/types/client.types'
import { formatINR } from '@/utils/formatters'
import CmKpiTiles from '@/features/crm/clients/components/CmKpiTiles'
import {
  billingForClient,
  clientStatusPillClass,
  isServiceable,
  outstandingForClient,
  PROJECT_TYPE_COLORS,
  unionServiceableCities,
} from '@/features/crm/clients/clients.utils'

interface ClientProfileProps {
  client: Client
  divisions: Division[]
  projects: ClientProject[]
  mrs: ClientMr[]
  invoices: ClientInvoice[]
  onOpenDivision: (divisionId: string) => void
}

const PROJECT_TYPES = ['Screening', 'Diet', 'Lab'] as const

const ClientProfile = ({ client, divisions, projects, mrs, invoices, onOpenDivision }: ClientProfileProps) => {
  // Billing joins invoices by client NAME — prototype quirk, see clients.mock.ts
  const billing = billingForClient(invoices, client.name)
  const outstanding = outstandingForClient(invoices, client.name)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span
          className="w-10 h-10 rounded-lg flex items-center justify-center text-[15px] font-extrabold text-white shrink-0"
          style={{ background: client.color }}
        >
          {client.logo}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold" style={{ color: 'var(--qms-text)' }}>{client.name}</h2>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${clientStatusPillClass(client.status)}`}>
              {client.status}
            </span>
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {client.city}, {client.state} · {client.type === 'PHARMA' ? 'Pharma' : 'Hospital'}
          </p>
        </div>
      </div>

      <CmKpiTiles
        tiles={[
          { label: 'Active Divisions', value: divisions.length },
          { label: 'Projects', value: projects.length },
          { label: 'Total MRs', value: mrs.length },
          { label: 'Billing', value: formatINR(billing) },
          { label: 'Outstanding', value: formatINR(outstanding) },
        ]}
      />

      <div
        className="rounded-xl border p-3 mb-5 max-w-sm"
        style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          Project Types
        </div>
        {PROJECT_TYPES.map((type) => (
          <div key={type} className="flex items-center justify-between py-1">
            <span className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: 'var(--qms-text-soft)' }}>
              <span className="w-2 h-2 rounded-full" style={{ background: PROJECT_TYPE_COLORS[type] }} />
              {type}
            </span>
            <span className="text-[12px] font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>
              {projects.filter((p) => p.type === type).length}
            </span>
          </div>
        ))}
      </div>

      <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
        Divisions
      </div>
      <div className="space-y-2">
        {divisions.map((division) => {
          const divMrs = mrs.filter((m) => m.divisionId === division.id)
          const cities = unionServiceableCities(divMrs)
          const nonServiceable = divMrs.filter((m) => !isServiceable(m)).length
          const projCount = projects.filter((p) => p.divisionId === division.id).length
          return (
            <button
              key={division.id}
              onClick={() => onOpenDivision(division.id)}
              className="w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                  {division.name}
                </span>
                <span className="block text-[11px] mt-0.5 truncate" style={{ color: 'var(--qms-text-muted)' }}>
                  {division.therapy} · {cities.length} serviceable cities · {nonServiceable} non-serviceable MRs
                </span>
              </span>
              <span className="flex items-center gap-4 shrink-0">
                <span className="flex flex-col items-end w-14">
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{projCount}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>Projects</span>
                </span>
                <span className="flex flex-col items-end w-14">
                  <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{divMrs.length}</span>
                  <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>MRs</span>
                </span>
              </span>
              <FiChevronRight size={16} className="shrink-0" style={{ color: 'var(--qms-text-muted)' }} />
            </button>
          )
        })}
        {divisions.length === 0 && (
          <div
            className="rounded-xl border border-dashed p-6 text-center text-[12px]"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
          >
            No divisions on record for this client.
          </div>
        )}
      </div>
    </div>
  )
}

export default ClientProfile
