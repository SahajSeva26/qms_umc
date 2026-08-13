import type { ContactEntity } from '@/types/contact.types'

interface ContactsTableProps {
  contacts: ContactEntity[]
  onRowClick: (contact: ContactEntity) => void
}

const ContactsTable = ({ contacts, onRowClick }: ContactsTableProps) => {
  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Name
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Designation
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Email
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Phone
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                onClick={() => onRowClick(contact)}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>
                  {contact.name}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {contact.designation ?? '—'}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {contact.email ?? '—'}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {contact.phone ?? '—'}
                </td>
                <td className="px-4 py-2.5">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${contact.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                    style={contact.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
                  >
                    {contact.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {contacts.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No contacts found.
        </div>
      )}
    </div>
  )
}

export default ContactsTable
