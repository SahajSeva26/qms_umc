import { useMemo, useState } from 'react'
import { FiChevronRight, FiSearch } from 'react-icons/fi'
import type { Client, ClientInvoice, ClientMr, ClientProject, Division } from '@/types/client.types'
import { Input } from '@/components/ui/input'
import DatePicker from '@/components/ui/DatePicker'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { formatINR } from '@/utils/formatters'
import { billingForClient, clientStatusPillClass } from '@/features/crm/clients/clients.utils'

interface ClientListProps {
  clients: Client[]
  divisions: Division[]
  mrs: ClientMr[]
  projects: ClientProject[]
  invoices: ClientInvoice[]
  onOpen: (clientId: string) => void
}

const Stat = ({ label, value, wide }: { label: string; value: string | number; wide?: boolean }) => (
  <span className={`flex flex-col items-end ${wide ? 'w-20' : 'w-14'}`}>
    <span className="text-[13px] font-bold tabular-nums" style={{ color: 'var(--qms-text)' }}>{value}</span>
    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>{label}</span>
  </span>
)

const ClientList = ({ clients, divisions, mrs, projects, invoices, onOpen }: ClientListProps) => {
  const [search, setSearch] = useState('')
  // From/to are decorative at list level — kept for toolbar parity with the
  // prototype and passed through untouched (no date filtering here).
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [projectId, setProjectId] = useState('ALL')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q) && !c.city.toLowerCase().includes(q)) return false
      if (projectId !== 'ALL') {
        const project = projects.find((p) => p.id === projectId)
        if (project && project.clientId !== c.id) return false
      }
      return true
    })
  }, [clients, projects, search, projectId])

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>All Clients</h2>
        <span
          className="text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
        >
          {filtered.length}
        </span>
      </div>

      <div
        className="flex flex-wrap items-center gap-2 p-2.5 mb-3 rounded-xl border"
        style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      >
        <div className="relative">
          <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search client name or city..."
            className="w-56 pl-7 text-[12px]"
          />
        </div>
        <DatePicker value={from} onChange={setFrom} placeholder="From date" className="text-[12px]" />
        <DatePicker value={to} onChange={setTo} placeholder="To date" className="text-[12px]" />
        <Select value={projectId} onValueChange={(v) => setProjectId(v as string)}>
          <SelectTrigger className="text-[12px]"><SelectValue placeholder="All projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.id} · {p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {filtered.map((client) => {
          const divCount = divisions.filter((d) => d.clientId === client.id).length
          const projCount = projects.filter((p) => p.clientId === client.id).length
          const mrCount = mrs.filter((m) => m.clientId === client.id).length
          const billing = billingForClient(invoices, client.name)
          return (
            <button
              key={client.id}
              onClick={() => onOpen(client.id)}
              className="w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
            >
              {/* The prototype ships logo/color but never renders them — we do */}
              <span
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[14px] font-extrabold text-white shrink-0"
                style={{ background: client.color }}
              >
                {client.logo}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{client.name}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${clientStatusPillClass(client.status)}`}>
                    {client.status}
                  </span>
                </span>
                <span className="block text-[11px] mt-0.5 truncate" style={{ color: 'var(--qms-text-muted)' }}>
                  {client.city}, {client.state}
                </span>
              </span>
              <span className="hidden md:flex items-center gap-4 shrink-0">
                <Stat label="Divisions" value={divCount} />
                <Stat label="Projects" value={projCount} />
                <Stat label="MRs" value={mrCount} />
                <Stat label="Billing" value={formatINR(billing)} wide />
              </span>
              <FiChevronRight size={16} className="shrink-0" style={{ color: 'var(--qms-text-muted)' }} />
            </button>
          )
        })}
        {filtered.length === 0 && (
          <div
            className="rounded-xl border border-dashed p-6 text-center text-[12px]"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
          >
            No clients match the current filters.
          </div>
        )}
      </div>
    </div>
  )
}

export default ClientList
