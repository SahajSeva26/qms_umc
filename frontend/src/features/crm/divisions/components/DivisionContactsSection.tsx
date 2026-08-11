import { useState } from 'react'
import { FiPlus, FiUser } from 'react-icons/fi'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { usePermission } from '@/hooks/usePermission'
import CreateDivisionContactModal from '@/features/crm/divisions/components/CreateDivisionContactModal'

interface DivisionContactsSectionProps {
  tenantId: string
  divisionId: string
}

// Contacts scoped to one division — sits alongside Bulk MR Import on DivisionDetailPage.tsx.
const DivisionContactsSection = ({ tenantId, divisionId }: DivisionContactsSectionProps) => {
  const { hasAnyPermission } = usePermission()
  const canManage = hasAnyPermission(['contact:manage', 'tenant:manage', 'tenant:admin'])

  const [createOpen, setCreateOpen] = useState(false)

  const { data, isLoading, error } = useContacts({ division: divisionId, limit: '50' })
  const contacts = data?.data?.items ?? []
  const totalCount = data?.data?.count ?? 0

  return (
    <div
      className="rounded-xl border p-5 mt-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="flex items-center justify-between mb-4 gap-3">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>Contacts</h2>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
            {!isLoading && !error ? `${totalCount} total` : 'Contacts for this division.'}
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={13} /> New contact
          </button>
        )}
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
        <div className="space-y-2">
          {contacts.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-lg border p-3"
              style={{ borderColor: 'var(--qms-border)' }}
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
              No contacts on record for this division.
            </div>
          )}
        </div>
      )}

      {createOpen && (
        <CreateDivisionContactModal
          tenantId={tenantId}
          divisionId={divisionId}
          onClose={() => setCreateOpen(false)}
        />
      )}
    </div>
  )
}

export default DivisionContactsSection
