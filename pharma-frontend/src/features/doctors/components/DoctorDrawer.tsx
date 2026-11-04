import { FiMail, FiPhone, FiMapPin, FiExternalLink, FiEdit2, FiHash, FiLayers } from 'react-icons/fi'
import type { DoctorEntity } from '@/types/doctor.types'
import { SPECIALIZATION_LABEL } from '@/types/doctor.types'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@qms/ui'
import StatusPill from '@/features/doctors/components/StatusPill'

// Drops the first word (typically "Dr"), takes the next two; falls back to the first two letters on a single-word name.
const doctorInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/)
  const initials = parts.slice(1, 3).map((p) => p[0]).join('').toUpperCase()
  return initials || name.slice(0, 2).toUpperCase()
}

interface DoctorDrawerProps {
  doctor: DoctorEntity | null
  canEdit: boolean
  onClose: () => void
  onEdit: () => void
}

// Ported from internal-frontend's DoctorDrawer, trimmed: no AI-prediction placeholder panel, no
// WhatsApp/Email buttons that only fire a toast — neither does anything real yet.
const DoctorDrawer = ({ doctor, canEdit, onClose, onEdit }: DoctorDrawerProps) => {
  if (!doctor) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const d = doctor
  const mapsLink = d.location?.coordinates
    ? `https://www.google.com/maps?q=${d.location.coordinates[1]},${d.location.coordinates[0]}`
    : d.location?.googlePlaceId
      ? `https://www.google.com/maps/place/?q=place_id:${d.location.googlePlaceId}`
      : null

  return (
    <SideDrawer open={!!doctor} title={`${d.name} · ${d.pharmaCode}`} onClose={onClose} widthClassName="max-w-[560px]">
      <div className="flex items-start gap-3.5 mb-4">
        <div
          className="rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shrink-0"
          style={{ width: 64, height: 64, background: 'linear-gradient(135deg,#3b6dff,#8b5cf6)' }}
        >
          {doctorInitials(d.name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[18px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
          <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>{d.specialization ? SPECIALIZATION_LABEL[d.specialization] : '—'} · {d.pharmaCode}</div>
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

      <div className="grid grid-cols-2 gap-2.5 mb-5">
        <div className="rounded-lg border p-2.5" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>Camps</div>
          <div className="text-[18px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{d.stats ? d.stats.camps : '—'}</div>
        </div>
        <div className="rounded-lg border p-2.5" style={{ borderColor: 'var(--qms-border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>Patients</div>
          <div className="text-[18px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{d.stats ? d.stats.patientsCompleted : '—'}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{d.stats ? `of ${d.stats.patients}` : '—'}</div>
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        <FiPhone size={11} /> Contact &amp; address
      </h3>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[13px] mb-5">
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
        {/* PUT /doctors/:id is doctor:manage-only server-side. */}
        {canEdit && <Button onClick={onEdit}><FiEdit2 size={13} /> Edit</Button>}
        <Button variant="outline" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </SideDrawer>
  )
}

export default DoctorDrawer
