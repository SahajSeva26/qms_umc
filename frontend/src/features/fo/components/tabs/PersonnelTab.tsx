import { useMemo, useState } from 'react'
import { FiSearch, FiDownload, FiPlus, FiUsers, FiCheckCircle, FiDollarSign, FiFileText } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import type { FoClaim, LeaveRequest } from '@/features/fo/fo.types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import KpiTile from '@/components/ui/KpiTile'
import AddPersonnelModal from '@/features/fo/components/AddPersonnelModal'
import PersonnelProfileDrawer from '@/features/fo/components/PersonnelProfileDrawer'
import type { EmpTypeConfig } from '@/features/fo/components/fo.ui'
import { initials, avatarGradient, personCamps, closedCampsOf, downloadPersonnelCsv } from '@/features/fo/components/fo.ui'
import { formatINR } from '@/utils/formatters'

interface PersonnelTabProps {
  config: EmpTypeConfig
  people: Person[]
  camps: Camp[]
  devices: DeviceCatalogItem[]
  claims: FoClaim[]
  leaves: LeaveRequest[]
  salesView: boolean
  onAddPerson: (person: Person) => void
}

const PersonnelTab = ({ config, people, camps, devices, claims, leaves, salesView, onAddPerson }: PersonnelTabProps) => {
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const roster = useMemo(() => {
    if (config.empType === 'TP_MANPOWER') return people.filter((p) => p.empType === 'TP_MANPOWER' || p.role === 'Manpower')
    return people.filter((p) => p.empType === config.empType)
  }, [people, config.empType])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return roster
    return roster.filter((p) => `${p.name} ${p.hq} ${p.phone}`.toLowerCase().includes(q))
  }, [roster, search])

  const kpis = useMemo(() => {
    const headcount = roster.length
    let campsExecuted = 0
    let monthlySalary = 0
    let pendingClaims = 0
    roster.forEach((p) => {
      campsExecuted += closedCampsOf(personCamps(p, camps)).length
      monthlySalary += p.salaryInr ?? 0
      pendingClaims += claims.filter((c) => c.foId === p.id && (c.status === 'PENDING' || c.status === 'APPROVED')).reduce((s, c) => s + c.amount, 0)
    })
    return { headcount, campsExecuted, monthlySalary, pendingClaims }
  }, [roster, camps, claims])

  const openPerson = filtered.find((p) => p.id === openId) ?? null

  return (
    <div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
        <KpiTile label="Headcount" value={String(kpis.headcount)} tone="brand" icon={FiUsers} />
        <KpiTile label="Camps executed" value={String(kpis.campsExecuted)} tone="teal" icon={FiCheckCircle} />
        <KpiTile label="Monthly salary" value={formatINR(kpis.monthlySalary)} tone="amber" icon={FiDollarSign} />
        <KpiTile label="Expenses pending" value={formatINR(kpis.pendingClaims)} tone="rose" icon={FiFileText} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{config.label} ({filtered.length})</div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <FiSearch size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…" className="pl-7 w-[200px]" />
          </div>
          <Button variant="outline" onClick={() => downloadPersonnelCsv(filtered, camps, claims, leaves, `${config.empType?.toLowerCase()}.csv`)}>
            <FiDownload size={13} /> Export
          </Button>
          <Button onClick={() => setAddOpen(true)}><FiPlus size={13} /> {config.addLabel}</Button>
        </div>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {filtered.map((p) => (
          <button
            key={p.id}
            onClick={() => setOpenId(p.id)}
            className="text-left rounded-xl border p-3.5 transition-transform hover:-translate-y-0.5"
            style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-[12px] shrink-0" style={{ background: avatarGradient(p) }}>{initials(p.name)}</div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>{p.name}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{p.hq}{p.vendor ? ` · ${p.vendor}` : ''}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1 text-center">
              <div>
                <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{closedCampsOf(personCamps(p, camps)).length}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Camps</div>
              </div>
              <div>
                <div className="text-[13px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{p.salaryInr ? formatINR(p.salaryInr) : '—'}</div>
                <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Salary</div>
              </div>
            </div>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full text-center py-10 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No {config.label} records yet.</div>
        )}
      </div>

      <AddPersonnelModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={config.addLabel}
        showVendor={config.vendor}
        onAdd={(person) => onAddPerson({ ...person, empType: config.empType })}
      />

      <PersonnelProfileDrawer
        person={openPerson}
        people={people}
        camps={camps}
        devices={devices}
        claims={claims}
        config={config}
        salesView={salesView}
        onClose={() => setOpenId(null)}
      />
    </div>
  )
}

export default PersonnelTab
