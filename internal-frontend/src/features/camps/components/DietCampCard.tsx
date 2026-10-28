import { FiCalendar, FiMapPin, FiHeart, FiNavigation, FiAlertTriangle } from 'react-icons/fi'
import type { CampEntity } from '@/types/campReal.types'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import CampStatusPillReal from '@/components/widgets/camp/CampStatusPillReal'

const formatCityState = (location: CampEntity['location']) =>
  location ? [location.city, location.state].filter(Boolean).join(', ') : ''

// Matches diet-camps.js's campCard(), which renders only the last token of a name on its chips.
const lastName = (name: string) => name.trim().split(/\s+/).slice(-1)[0] ?? name

interface DietCampCardProps {
  camp: CampEntity
  onOpen: (id: string) => void
}

// Matches the prototype's .dc-camp-card layout (diet-camps.js campCard()).
const DietCampCard = ({ camp, onOpen }: DietCampCardProps) => {
  const { doctorName } = useCampRefNames()
  const tenantName = camp.tenant && typeof camp.tenant !== 'string' ? camp.tenant.name : '—'
  const cityState = formatCityState(camp.location)
  const dietitianName = camp.dietitian && typeof camp.dietitian !== 'string' ? camp.dietitian.name : null
  const foName = camp.fo && typeof camp.fo !== 'string' ? camp.fo.name : null

  return (
    <div
      className="rounded-xl border p-3 cursor-pointer transition-transform hover:-translate-y-0.5"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
      onClick={() => onOpen(camp.id)}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-extrabold text-[11px]" style={{ color: 'var(--qms-brand)' }}>{camp.code}</span>
        <CampStatusPillReal status={camp.status} />
      </div>

      <div className="font-bold text-[14px] truncate mb-0.5" style={{ color: 'var(--qms-text)' }}>{tenantName}</div>
      <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{doctorName(camp.doctor)}</div>

      <div className="flex items-center gap-1 mt-1.5 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
        <FiCalendar size={11} className="shrink-0" />
        <span className="truncate">
          {new Date(camp.date).toLocaleDateString()} · {camp.timeSlot ? CAMP_TIME_SLOT_LABEL[camp.timeSlot] : '—'}
        </span>
      </div>
      <div className="flex items-center gap-1 mt-1 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
        <FiMapPin size={11} className="shrink-0" />
        <span className="truncate">{cityState || '—'}</span>
      </div>

      <div
        className="grid grid-cols-3 gap-1.5 mt-2.5 rounded-lg border px-2 py-1.5"
        style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
      >
        <div className="text-center">
          <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-brand)' }}>{camp.patientExpectation || 0}</div>
          <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Expected</div>
        </div>
        <div className="text-center">
          <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-brand)' }}>{camp.stats?.patientsCompleted ?? 0}</div>
          <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Done</div>
        </div>
        <div className="text-center">
          <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-brand)' }}>{camp.devices.length}</div>
          <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Devices</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 mt-2.5">
        {dietitianName ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'color-mix(in srgb, #10b981 12%, transparent)', color: '#059669' }}
          >
            <FiHeart size={10} /> {lastName(dietitianName)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-danger-soft text-danger">
            <FiAlertTriangle size={10} /> No dietitian
          </span>
        )}
        {foName ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: 'color-mix(in srgb, var(--qms-brand) 10%, transparent)', color: 'var(--qms-brand)' }}
          >
            <FiNavigation size={10} /> {lastName(foName)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-danger-soft text-danger">
            <FiAlertTriangle size={10} /> No FO
          </span>
        )}
      </div>
    </div>
  )
}

export default DietCampCard
