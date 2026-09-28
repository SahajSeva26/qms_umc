import { FiMail, FiPhone, FiMapPin, FiExternalLink } from 'react-icons/fi'
import type { DoctorEntity, DoctorStatus } from '@/types/doctor.types'
import SideDrawer from '@/components/ui/SideDrawer'
import { Button } from '@/components/ui/button'
import SharedStatusPill from '@/components/ui/StatusPill'

// Read-only, shared extraction (AGENTS.md's cross-feature-import rule) — the edit-capable
// features/doctors/components/DoctorDrawer.tsx is a separate, untouched component.

interface DoctorDetailDrawerProps {
  doctor: DoctorEntity | null
  onClose: () => void
}

const STATUS_CLASSES: Record<DoctorStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}
const STATUS_LABEL: Record<DoctorStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

function initials(name: string): string {
  return (name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
}

const DoctorDetailDrawer = ({ doctor, onClose }: DoctorDetailDrawerProps) => {
  if (!doctor) return <SideDrawer open={false} title="" onClose={onClose}>{null}</SideDrawer>

  const d = doctor
  const mapsLink = d.location?.coordinates
    ? `https://www.google.com/maps?q=${d.location.coordinates[1]},${d.location.coordinates[0]}`
    : d.location?.googlePlaceId
      ? `https://www.google.com/maps/place/?q=place_id:${d.location.googlePlaceId}`
      : null

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
          <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{d.specialization.toUpperCase()} · {d.location?.city ?? '—'}</div>
          <div className="mt-2"><SharedStatusPill status={d.status} classes={STATUS_CLASSES} labels={STATUS_LABEL} /></div>
        </div>
      </div>

      <h3 className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>Contact &amp; address</h3>
      <div className="grid grid-cols-[90px_1fr] gap-y-1.5 text-[13px] mb-5" style={{ color: 'var(--qms-text)' }}>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiMail size={11} /> Email</div><div>{d.email || '—'}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiPhone size={11} /> Mobile</div><div>{d.mobile || '—'}</div>
        <div style={{ color: 'var(--qms-text-muted)' }}>Specialization</div><div>{d.specialization.toUpperCase()}</div>
        <div className="flex items-center gap-1" style={{ color: 'var(--qms-text-muted)' }}><FiMapPin size={11} /> City</div><div>{d.location?.city || '—'}, {d.location?.state || '—'} · {d.location?.pincode || '—'}</div>
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
        <Button variant="outline" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </SideDrawer>
  )
}

export default DoctorDetailDrawer
