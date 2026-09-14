import { FiMail, FiPhone, FiMapPin, FiEdit2 } from 'react-icons/fi'
import type { ContactEntity } from '@/types/contact.types'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'

interface ContactDrawerProps {
  contact: ContactEntity | null
  canEdit: boolean
  onClose: () => void
  onEdit: () => void
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '—'
}

const ContactDrawer = ({ contact, canEdit, onClose, onEdit }: ContactDrawerProps) => {
  if (!contact) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const c = contact

  return (
    <SideDrawer open={!!contact} title={c.name} onClose={onClose} widthClassName="max-w-lg">
      <div className="flex items-start gap-3.5 mb-4">
        <div
          className="rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0"
          style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#3b6dff,#8b5cf6)' }}
        >
          {initials(c.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{c.name}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{c.designation || '—'}</div>
          <div className="mt-2">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'active' ? 'bg-success-soft text-success' : ''}`}
              style={c.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
            >
              {c.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Contact details</h3>
      <div className="grid grid-cols-[90px_1fr] gap-y-1.5 text-[13px] mb-5" style={{ color: 'var(--qms-text)' }}>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiMail size={11} /> Email</div><div>{c.email || '—'}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiPhone size={11} /> Phone</div><div>{c.phone || '—'}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiMapPin size={11} /> Location</div><div>{c.location || '—'}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>Type</div><div>{c.type === 'platform' ? 'Platform (QMS internal)' : 'Customer'}</div>
        {c.user && (
          <>
            <div style={{ color: 'var(--qms-text-muted)' }}>Login</div>
            <div>{c.user.firstName} {c.user.lastName ?? ''} · {c.user.email}</div>
          </>
        )}
      </div>

      {canEdit && (
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <Button variant="outline" onClick={onEdit}>
            <FiEdit2 size={13} /> Edit contact
          </Button>
        </div>
      )}
    </SideDrawer>
  )
}

export default ContactDrawer
