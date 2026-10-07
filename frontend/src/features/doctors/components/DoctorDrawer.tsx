import { FiMail, FiPhone, FiMapPin, FiExternalLink, FiEdit2, FiMessageCircle, FiHash, FiLayers, FiActivity } from 'react-icons/fi'
import type { DoctorEntity } from '@/types/doctor.types'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/sonner'
import { initials, SPECIALIZATION_LABEL } from '@/features/doctors/doctors.ui'
import StatusPill from '@/features/doctors/components/StatusPill'

interface DoctorDrawerProps {
  doctor: DoctorEntity | null
  canEdit: boolean
  onClose: () => void
  onEdit: () => void
}

// Camps/Patients are real (report=true on doctor search); ★/Engagement and the AI prediction panel have no backend field yet.
const DoctorDrawer = ({ doctor, canEdit, onClose, onEdit }: DoctorDrawerProps) => {
  if (!doctor) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const d = doctor
  const handleWhatsApp = () => toast.info('WhatsApp opened')
  const handleEmail = () => toast.info('Email composer opened')
  const mapsLink = d.location?.coordinates
    ? `https://www.google.com/maps?q=${d.location.coordinates[1]},${d.location.coordinates[0]}`
    : d.location?.googlePlaceId
      ? `https://www.google.com/maps/place/?q=place_id:${d.location.googlePlaceId}`
      : null

  return (
    <SideDrawer open={!!doctor} title={`${d.name} · ${d.pharmaCode}`} onClose={onClose} widthClassName="max-w-[940px]">
      <div className="flex items-start gap-3.5 mb-4">
        <div
          className="rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0"
          style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#3b6dff,#8b5cf6)' }}
        >
          {initials(d.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
          <div className="text-[13px]" style={{ color: 'var(--qms-text-soft)' }}>{d.specialization ? SPECIALIZATION_LABEL[d.specialization] : '—'} · {d.pharmaCode}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <StatusPill status={d.status} />
            {d.location?.city && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                <FiMapPin size={10} /> {d.location.city}, {d.location.state}
              </span>
            )}
            {d.location?.pincode && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                <FiHash size={10} /> {d.location.pincode}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <div className="doc-id-kpi"><div className="l">Camps</div><div className="v">{d.stats ? d.stats.camps : '—'}</div><div className="s">total</div></div>
        <div className="doc-id-kpi"><div className="l">Patients</div><div className="v">{d.stats ? d.stats.patientsCompleted : '—'}</div><div className="s">{d.stats ? `of ${d.stats.patients}` : '—'}</div></div>
        <div className="doc-id-kpi"><div className="l">Avg ★</div><div className="v">—</div><div className="s">Patient feedback</div></div>
        <div className="doc-id-kpi"><div className="l">Engagement</div><div className="v">—</div><div className="s">Score</div></div>
      </div>

      <div
        className="rounded-xl px-3.5 py-3 mb-5"
        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,.07), rgba(59,109,255,.07))', border: '1px solid rgba(124,58,237,.2)' }}
      >
        <div className="flex items-center gap-1.5 text-[12px] font-extrabold mb-1.5" style={{ color: '#6d28d9' }}>
          <FiActivity size={12} /> AI prediction
        </div>
        <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
          Not available — no scoring model exists yet.
        </p>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        <FiPhone size={11} /> Contact &amp; address
      </h3>
      <div className="doc-kv mb-5">
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiMail size={11} /> Email</div><div style={{ color: 'var(--qms-text)' }}>{d.email || '—'}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiPhone size={11} /> Mobile</div><div style={{ color: 'var(--qms-text)' }}>{d.mobile || '—'}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiLayers size={11} /> Specialization</div><div style={{ color: 'var(--qms-text)' }}>{d.specialization ? SPECIALIZATION_LABEL[d.specialization] : '—'}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiMapPin size={11} /> City</div><div style={{ color: 'var(--qms-text)' }}>{d.location?.city || '—'}, {d.location?.state || '—'} · {d.location?.pincode || '—'}</div>
        {mapsLink && (
          <>
            <div style={{ color: 'var(--qms-text-muted)' }}>Map</div>
            <div>
              <a href={mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold" style={{ color: 'var(--qms-brand)' }}>
                Open Google Maps <FiExternalLink size={11} />
              </a>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-3">
        {d.mobile && <Button variant="outline" onClick={handleWhatsApp}><FiMessageCircle size={13} /> WhatsApp</Button>}
        {d.email && <Button variant="outline" onClick={handleEmail}><FiMail size={13} /> Email</Button>}
        {/* PUT /doctors/:id is gated on doctor:manage server-side. */}
        {canEdit && <Button onClick={onEdit}><FiEdit2 size={13} /> Edit</Button>}
        <Button variant="outline" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </SideDrawer>
  )
}

export default DoctorDrawer
