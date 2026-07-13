import { useState } from 'react'
import { useClientsData } from '@/features/crm/clients/hooks/useClientsData'
import ClientList from '@/features/crm/clients/components/ClientList'
import ClientProfile from '@/features/crm/clients/components/ClientProfile'
import DivisionDetail from '@/features/crm/clients/components/DivisionDetail'
import CmBreadcrumb, { type Crumb } from '@/features/crm/clients/components/CmBreadcrumb'
import AddDoctorDialog from '@/features/crm/clients/components/AddDoctorDialog'

type DrillState =
  | { level: 'list' }
  | { level: 'client'; clientId: string }
  | { level: 'division'; clientId: string; divisionId: string }

const ClientsPage = () => {
  const {
    clients,
    divisions,
    mrs,
    projects,
    invoices,
    camps,
    addPo,
    updatePo,
    addMr,
    addDoctor,
    bookCamp,
  } = useClientsData()

  const [drill, setDrill] = useState<DrillState>({ level: 'list' })
  const [addDoctorOpen, setAddDoctorOpen] = useState(false)

  const client = drill.level !== 'list' ? clients.find((c) => c.id === drill.clientId) : undefined
  const division = drill.level === 'division' ? divisions.find((d) => d.id === drill.divisionId) : undefined

  const crumbs: Crumb[] = [{ label: 'All Clients', onClick: () => setDrill({ level: 'list' }) }]
  if (client) {
    crumbs.push({
      label: client.name,
      onClick: () => setDrill({ level: 'client', clientId: client.id }),
    })
  }
  if (division) crumbs.push({ label: division.name })

  return (
    <div className="max-w-7xl">
      <div className="mb-4 flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Client Management</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
              Sales · Clients
            </span>
            <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-success-soft text-success">
              Camps sync · live
            </span>
          </div>
        </div>
        {drill.level === 'division' && (
          <button
            onClick={() => setAddDoctorOpen(true)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
          >
            Add doctor
          </button>
        )}
      </div>

      {drill.level !== 'list' && <CmBreadcrumb crumbs={crumbs} />}

      {drill.level === 'list' && (
        <ClientList
          clients={clients}
          divisions={divisions}
          mrs={mrs}
          projects={projects}
          invoices={invoices}
          onOpen={(clientId) => setDrill({ level: 'client', clientId })}
        />
      )}

      {drill.level === 'client' && client && (
        <ClientProfile
          client={client}
          divisions={divisions.filter((d) => d.clientId === client.id)}
          projects={projects.filter((p) => p.clientId === client.id)}
          mrs={mrs.filter((m) => m.clientId === client.id)}
          invoices={invoices}
          onOpenDivision={(divisionId) => setDrill({ level: 'division', clientId: client.id, divisionId })}
        />
      )}

      {drill.level === 'division' && client && division && (
        <DivisionDetail
          client={client}
          division={division}
          projects={projects}
          mrs={mrs}
          camps={camps}
          invoices={invoices}
          onAddPo={addPo}
          onUpdatePo={updatePo}
          onAddMr={addMr}
          onBookCamp={bookCamp}
        />
      )}

      {addDoctorOpen && (
        <AddDoctorDialog
          onClose={() => setAddDoctorOpen(false)}
          onSave={async (input) => {
            await addDoctor(input)
            setAddDoctorOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default ClientsPage
