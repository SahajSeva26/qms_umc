import { FiMail, FiPhone, FiMapPin, FiExternalLink, FiEdit2, FiMessageCircle } from 'react-icons/fi'
import type { DoctorEntity } from '@/types/doctor.types'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { initials } from '@/features/doctors/doctors.ui'
import StatusPill from '@/features/doctors/components/StatusPill'

interface DoctorDrawerProps {
  doctor: DoctorEntity | null
  onClose: () => void
  onEdit: () => void
}

// Real fields only — pharmaCode, name, specialization, mobile, email, city/
// state/pincode, googleMapLink, status. The mock-era engagement stats, AI
// prediction, company empanelment, MR coverage, and camp history sections
// have no backend equivalent (all camp-derived) and are dropped entirely,
// not faked.
const DoctorDrawer = ({ doctor, onClose, onEdit }: DoctorDrawerProps) => {
  if (!doctor) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const d = doctor
  const handleWhatsApp = () => toast.info('WhatsApp opened')
  const handleEmail = () => toast.info('Email composer opened')

  return (
    <SideDrawer open={!!doctor} title={`${d.name} · ${d.pharmaCode}`} onClose={onClose} widthClassName="max-w-lg">
      <div className="flex items-start gap-3.5 mb-4">
        <div
          className="rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0"
          style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#3b6dff,#8b5cf6)' }}
        >
          {initials(d.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{d.specialization.toUpperCase()} · {d.city}</div>
          <div className="mt-2"><StatusPill status={d.status} /></div>
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Contact &amp; address</h3>
      <div className="grid grid-cols-[90px_1fr] gap-y-1.5 text-[13px] mb-5" style={{ color: 'var(--qms-text)' }}>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiMail size={11} /> Email</div><div>{d.email || '—'}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiPhone size={11} /> Mobile</div><div>{d.mobile || '—'}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>Specialization</div><div>{d.specialization.toUpperCase()}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiMapPin size={11} /> City</div><div>{d.city || '—'}, {d.state || '—'} · {d.pincode || '—'}</div>
        {d.googleMapLink && (
          <>
            <div style={{ color: 'var(--qms-text-muted)' }}>Map</div>
            <div>
              <a href={d.googleMapLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--qms-brand)' }}>
                Open Google Maps <FiExternalLink size={11} />
              </a>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-3">
        {d.mobile && <Button variant="outline" onClick={handleWhatsApp}><FiMessageCircle size={13} /> WhatsApp</Button>}
        {d.email && <Button variant="outline" onClick={handleEmail}><FiMail size={13} /> Email</Button>}
        <Button onClick={onEdit}><FiEdit2 size={13} /> Edit</Button>
        <Button variant="outline" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </SideDrawer>
  )
}

export default DoctorDrawer
