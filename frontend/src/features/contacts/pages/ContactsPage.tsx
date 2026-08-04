import { useState } from 'react'
import { FiPlus, FiUser } from 'react-icons/fi'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import PaginationControls from '@/components/ui/PaginationControls'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { usePermission } from '@/hooks/usePermission'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import EditContactModal from '@/features/contacts/components/EditContactModal'
import type { ContactEntity, ContactStatus, ContactType } from '@/types/contact.types'

const PAGE_SIZE = 20

// Contact is a small, supporting entity for Appointment/Lead (not a
// headline module) — kept intentionally lean: one filterable/paginated
// list plus a create/edit modal, mirroring the simplicity of
// `@/features/doctors/pages/DoctorsPage.tsx`'s Roster tab without the
// aggregate KPI tabs (Contact has no geography/specialty grouping concept).
const ContactsPage = () => {
  const { hasAnyPermission } = usePermission()
  // Matches contact.routes.ts's real write guard exactly: contact:manage,
  // tenant:manage, tenant:admin. A Sales Rep (no contact:* grant at all,
  // confirmed via defaultRoleTypes.ts) sees contacts read-only.
  const canManage = hasAnyPermission(['contact:manage', 'tenant:manage', 'tenant:admin'])

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [type, setType] = useState<ContactType | 'ALL'>('ALL')
  const [status, setStatus] = useState<ContactStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [editModal, setEditModal] = useState<{ open: boolean; contact: ContactEntity | null }>({ open: false, contact: null })

  const { data, isLoading, error } = useContacts({
    name: debouncedSearch || undefined,
    type: type === 'ALL' ? undefined : type,
    status: status === 'ALL' ? undefined : status,
    page: String(page),
    limit: String(PAGE_SIZE),
  })
  const contacts = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Sales · CRM · Contacts</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Contacts</h1>
        </div>
        {canManage && (
          <button
            onClick={() => setEditModal({ open: true, contact: null })}
            className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> Add contact
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <Input
          placeholder="Search by name..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="max-w-xs"
        />
        <Select value={type} onValueChange={(v) => { setType(v as ContactType | 'ALL'); setPage(1) }}>
          <SelectTrigger className="w-40 text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All types</SelectItem>
            <SelectItem value="customer">Customer</SelectItem>
            <SelectItem value="platform">Platform</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v as ContactStatus | 'ALL'); setPage(1) }}>
          <SelectTrigger className="w-40 text-[13px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
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
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {contacts.map((c) => (
              <div
                key={c.id}
                onClick={() => canManage && setEditModal({ open: true, contact: c })}
                className="rounded-2xl border p-4 transition-all"
                style={{
                  background: 'var(--qms-surface)',
                  borderColor: 'var(--qms-border)',
                  cursor: canManage ? 'pointer' : 'default',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg,#3b6dff,#8b5cf6)' }}
                  >
                    <FiUser size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{c.name}</div>
                    {c.designation && (
                      <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{c.designation}</div>
                    )}
                    <div className="text-[10.5px] truncate" style={{ color: 'var(--qms-text-soft)' }}>
                      {[c.email, c.phone].filter(Boolean).join(' · ') || '—'}
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
              </div>
            ))}
            {contacts.length === 0 && (
              <div className="col-span-full text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
                No contacts match these filters.
              </div>
            )}
          </div>
          <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <EditContactModal
        open={editModal.open}
        contact={editModal.contact}
        onClose={() => setEditModal({ open: false, contact: null })}
      />
    </div>
  )
}

export default ContactsPage
