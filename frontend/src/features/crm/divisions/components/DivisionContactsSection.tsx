import { useState } from 'react'
import { FiPlus, FiUser, FiSearch } from 'react-icons/fi'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { Input } from '@/components/ui/input'
import PaginationControls from '@/components/ui/PaginationControls'
import EditContactModal from '@/features/contacts/components/EditContactModal'
import type { ContactEntity } from '@/types/contact.types'

interface DivisionContactsSectionProps {
  tenantId: string
  divisionId: string
}

const PAGE_SIZE = 10

// Contacts scoped to one division — the real home for Contacts now that the
// standalone /crm/contacts page is gone.
const DivisionContactsSection = ({ tenantId, divisionId }: DivisionContactsSectionProps) => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['contact:manage', 'tenant:manage', 'tenant:admin'])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [page, setPage] = useState(1)
  const [editModal, setEditModal] = useState<{ open: boolean; contact: ContactEntity | null }>({ open: false, contact: null })

  const { data, isLoading, error } = useContacts({
    division: divisionId,
    name: debouncedSearch || undefined,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const contacts = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div
      className="rounded-xl border p-5 mt-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'color-mix(in oklch, var(--qms-brand), transparent 88%)' }}
        >
          <FiUser size={14} style={{ color: 'var(--qms-brand)' }} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Contacts</h2>
          <p className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Contacts for this division'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setEditModal({ open: true, contact: null })}
            className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={13} /> New contact
          </button>
        )}
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
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-8 text-[13px] max-w-xs"
        />
      </div>

      {isLoading && (
        <div className="text-[13px] py-6 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading contacts…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load contacts. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="space-y-1.5">
            {contacts.map((c) => (
              <div
                key={c.id}
                onClick={() => canManage && setEditModal({ open: true, contact: c })}
                className="flex items-center gap-3 rounded-lg border p-2.5 transition-colors"
                style={{
                  borderColor: 'var(--qms-border)',
                  cursor: canManage ? 'pointer' : 'default',
                }}
                onMouseEnter={(e) => { if (canManage) e.currentTarget.style.background = 'var(--qms-surface-hover)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#3b6dff,#8b5cf6)' }}
                >
                  <FiUser size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{c.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                    {[c.designation, c.email, c.phone].filter(Boolean).join(' · ') || '—'}
                  </div>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                  style={{
                    background: c.status === 'active' ? 'var(--qms-success-soft, #dcfce7)' : 'var(--qms-surface-strong)',
                    color: c.status === 'active' ? 'var(--qms-success, #16a34a)' : 'var(--qms-text-muted)',
                  }}
                >
                  {c.status === 'active' ? 'Active' : 'Inactive'}
                </span>
              </div>
            ))}
            {contacts.length === 0 && (
              <div
                className="rounded-xl border border-dashed p-6 text-center text-[12px]"
                style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
              >
                {debouncedSearch ? 'No contacts match this search.' : 'No contacts on record for this division.'}
              </div>
            )}
          </div>
          {totalPages > 1 && <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}

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
