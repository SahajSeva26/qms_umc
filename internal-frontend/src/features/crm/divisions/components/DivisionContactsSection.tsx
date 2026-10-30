import { useState } from 'react'
import { FiDownload, FiPlus, FiUser, FiSearch } from 'react-icons/fi'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { contactsService } from '@/features/contacts/contacts.service'
import { downloadContactsCsv } from '@/features/contacts/contact.export'
import { warnIfExportTruncated } from '@/utils/csvExport'
import { usePermission } from '@/hooks/usePermission'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import PaginationControls from '@/components/ui/PaginationControls'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import EditContactModal from '@/features/contacts/components/EditContactModal'
import ContactsTable from '@/features/crm/divisions/components/ContactsTable'
import ContactDrawer from '@/features/crm/divisions/components/ContactDrawer'
import { usePagination } from '@/hooks/usePagination'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'
import type { ContactEntity } from '@/types/contact.types'

interface DivisionContactsSectionProps {
  tenantId: string
  divisionId: string
}

const PAGE_SIZE = 10

const DivisionContactsSection = ({ tenantId, divisionId }: DivisionContactsSectionProps) => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['contact:manage', 'tenant:manage', 'tenant:admin'])

  const [search, setSearch] = useState('')
  const { page, setPage, totalPages, resetToFirstPage } = usePagination(PAGE_SIZE)
  const [editModal, setEditModal] = useState<{ open: boolean; contact: ContactEntity | null }>({ open: false, contact: null })
  const [viewContact, setViewContact] = useState<ContactEntity | null>(null)

  const { data, isLoading, error, refetch } = useContacts({
    division: divisionId,
    name: search || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const contacts = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  const [exporting, setExporting] = useState(false)
  // Exports the whole division's contact set, not just the current search/paginated
  // page — the table itself caps at PAGE_SIZE with no "show all" option.
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await contactsService.searchContacts({ division: divisionId, limit: '1000' })
      warnIfExportTruncated(res.data.items.length, res.data.count)
      downloadContactsCsv(res.data.items, `division-contacts-${new Date().toISOString().slice(0, 10)}.csv`)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to export contacts.'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'color-mix(in oklch, var(--qms-brand), transparent 88%)' }}
          >
            <FiUser size={14} style={{ color: 'var(--qms-brand)' }} />
          </div>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--qms-text)' }}>Contacts</h2>
            <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
              {!isLoading && !error ? `${totalCount} total` : 'Contacts for this division.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || totalCount === 0}>
            <FiDownload size={14} /> {exporting ? 'Exporting…' : 'Export'}
          </Button>
          {canManage && (
            <Button
              onClick={() => setEditModal({ open: true, contact: null })}
              className="text-white"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              <FiPlus size={14} /> New Contact
            </Button>
          )}
        </div>
      </div>

      <div className="relative mb-3">
        <FiSearch
          size={13}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--qms-text-muted)' }}
        />
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetToFirstPage() }}
          className="pl-8 text-[13px] max-w-xs"
        />
      </div>

      <QueryStateBlock isLoading={isLoading} error={error} loadingLabel="Loading contacts…" errorLabel="Failed to load contacts. Please try again." onRetry={refetch}>
        <ContactsTable
          contacts={contacts}
          onView={(contact) => setViewContact(contact)}
        />
        <PaginationControls page={page} totalPages={totalPages(totalCount)} onPageChange={setPage} />
      </QueryStateBlock>

      <ContactDrawer
        contact={viewContact}
        canEdit={canManage}
        onClose={() => setViewContact(null)}
        onEdit={() => { setEditModal({ open: true, contact: viewContact }); setViewContact(null) }}
      />

      <EditContactModal
        open={editModal.open}
        contact={editModal.contact}
        onClose={() => setEditModal({ open: false, contact: null })}
        fixedTenantId={tenantId}
        fixedDivisionId={divisionId}
      />
    </div>
  )
}

export default DivisionContactsSection
