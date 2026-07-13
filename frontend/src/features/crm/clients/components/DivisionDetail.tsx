import { useState } from 'react'
import type { Client, ClientInvoice, ClientMr, ClientProject, Division, PurchaseOrder } from '@/types/client.types'
import { Button } from '@/components/ui/button'
import CmKpiTiles from '@/features/crm/clients/components/CmKpiTiles'
import PoSection from '@/features/crm/clients/components/PoSection'
import PoDialog from '@/features/crm/clients/components/PoDialog'
import HierarchyTree from '@/features/crm/clients/components/HierarchyTree'
import MrList from '@/features/crm/clients/components/MrList'
import AddMrDialog from '@/features/crm/clients/components/AddMrDialog'
import BookCampDialog from '@/features/crm/clients/components/BookCampDialog'
import type { BookCampInput } from '@/features/crm/clients/clients.service'
import { formatINR } from '@/utils/formatters'
import type { Camp } from '@/types/camp.types'
import {
  billingForDivision,
  campsCancelled,
  campsExecuted,
  campsForDivision,
  distinctDoctorCount,
  outstandingForDivision,
  unionServiceableCities,
} from '@/features/crm/clients/clients.utils'

interface DivisionDetailProps {
  client: Client
  division: Division
  projects: ClientProject[]
  mrs: ClientMr[]
  camps: Camp[]
  invoices: ClientInvoice[]
  onAddPo: (projectId: string, po: PurchaseOrder) => void | Promise<void>
  onUpdatePo: (projectId: string, po: PurchaseOrder) => void | Promise<void>
  onAddMr: (mr: ClientMr) => void | Promise<void>
  onBookCamp: (input: BookCampInput) => unknown
}

const DivisionDetail = ({
  client,
  division,
  projects,
  mrs,
  camps,
  invoices,
  onAddPo,
  onUpdatePo,
  onAddMr,
  onBookCamp,
}: DivisionDetailProps) => {
  const [selectedMrId, setSelectedMrId] = useState<string | null>(null)
  const [poDialog, setPoDialog] = useState<{ projectId: string; po: PurchaseOrder } | null | 'new'>(null)
  const [addMrOpen, setAddMrOpen] = useState(false)
  const [bookCampMrId, setBookCampMrId] = useState<string | null>(null)

  const divisionProjects = projects.filter((p) => p.divisionId === division.id)
  const divisionMrs = mrs.filter((m) => m.divisionId === division.id)
  const divisionCamps = campsForDivision(camps, division.id)

  const billing = billingForDivision(invoices, client.name, division.id)
  const outstanding = outstandingForDivision(invoices, client.name, division.id)
  const cities = unionServiceableCities(divisionMrs)

  const handleSavePo = async (projectId: string, po: PurchaseOrder, isEdit: boolean) => {
    if (isEdit) await onUpdatePo(projectId, po)
    else await onAddPo(projectId, po)
    setPoDialog(null)
  }

  const handleSaveMr = async (mr: ClientMr) => {
    await onAddMr(mr)
    setAddMrOpen(false)
  }

  const handleSaveBookCamp = async (input: BookCampInput) => {
    await onBookCamp(input)
    setBookCampMrId(null)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--qms-text)' }}>{division.name}</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{division.therapy}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setAddMrOpen(true)}>Add MR</Button>
          <Button size="sm" variant="outline" onClick={() => setPoDialog('new')}>Add PO</Button>
        </div>
      </div>

      <CmKpiTiles
        tiles={[
          { label: 'Projects', value: divisionProjects.length },
          { label: 'MRs', value: divisionMrs.length },
          { label: 'Serviceable cities', value: cities.length },
          { label: 'Camps executed', value: campsExecuted(divisionCamps) },
          { label: 'Camps cancelled', value: campsCancelled(divisionCamps) },
          { label: 'Doctors touched', value: distinctDoctorCount(divisionCamps) },
          { label: 'Billing', value: formatINR(billing) },
          { label: 'Outstanding', value: formatINR(outstanding), sub: outstanding > 0 ? 'Pending' : undefined },
        ]}
      />

      <PoSection
        projects={divisionProjects}
        onAdd={() => setPoDialog('new')}
        onModify={(projectId, po) => setPoDialog({ projectId, po })}
      />

      <HierarchyTree mrs={divisionMrs} onSelectMr={setSelectedMrId} />

      <MrList
        mrs={divisionMrs}
        camps={divisionCamps}
        selectedMrId={selectedMrId}
        onSelect={setSelectedMrId}
        onBookCamp={setBookCampMrId}
      />

      {poDialog && (
        <PoDialog
          projects={divisionProjects}
          editing={poDialog === 'new' ? null : poDialog}
          onClose={() => setPoDialog(null)}
          onSave={handleSavePo}
        />
      )}

      {addMrOpen && (
        <AddMrDialog
          clientId={client.id}
          divisionId={division.id}
          onClose={() => setAddMrOpen(false)}
          onSave={handleSaveMr}
        />
      )}

      {bookCampMrId && (
        <BookCampDialog
          client={client}
          division={division}
          projects={divisionProjects}
          mrs={divisionMrs}
          initialMrId={bookCampMrId}
          onClose={() => setBookCampMrId(null)}
          onSave={handleSaveBookCamp}
        />
      )}
    </div>
  )
}

export default DivisionDetail
