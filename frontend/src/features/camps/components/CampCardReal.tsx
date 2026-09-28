import { FiEye, FiUserPlus, FiClock, FiAlertTriangle, FiBriefcase, FiActivity, FiHeart, FiDroplet } from 'react-icons/fi'
import type { IconType } from 'react-icons'
import type { CampEntity, CampType } from '@/types/campReal.types'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import { useCampRefNames } from '@/features/camps/hooks/useCampRefNames'
import CampStatusPillReal from '@/features/camps/components/CampStatusPillReal'

// Matches the prototype's per-type icon tile gradient (camps.js:345 — linear-gradient(135deg,
// <typeColor>, #14b8a6)). Same 3 type colors already used app-wide for camp type pills.
const TYPE_COLOR: Record<CampType, string> = {
  screening: '#3b6dff',
  diet: '#10b981',
  lab: '#8b5cf6',
}

// FiHeart already matches this codebase's own Diet nav-icon convention (navConfig.ts) — FiActivity
// and FiDroplet are the closest react-icons/fi equivalents to the prototype's tent/flask-conical.
const TYPE_ICON: Record<CampType, IconType> = {
  screening: FiActivity,
  diet: FiHeart,
  lab: FiDroplet,
}

const formatCityState = (location: CampEntity['location']) =>
  location ? [location.city, location.state].filter(Boolean).join(', ') : ''

interface CampCardRealProps {
  camp: CampEntity
  onOpen: (id: string) => void
}

// Prototype's campCard() (camps.js:332-420) / .dev-card (styles.css:1495-1529). Two real gaps
// logged in md-files/ui-revisions.md: no done-patient-count field, staffing is FO-only.
const CampCardReal = ({ camp, onOpen }: CampCardRealProps) => {
  const { doctorName } = useCampRefNames()
  const tenantName = camp.tenant && typeof camp.tenant !== 'string' ? camp.tenant.name : '—'
  const cityState = formatCityState(camp.location)
  const color = TYPE_COLOR[camp.type]
  const TypeIcon = TYPE_ICON[camp.type]

  return (
    <div
      className="rounded-[20px] border p-4 backdrop-blur-xl transition-transform hover:-translate-y-0.5"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${color}, #14b8a6)` }}
        >
          <TypeIcon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[14px] truncate" style={{ color: 'var(--qms-text)' }}>
            {camp.code} · {CAMP_TYPE_LABEL[camp.type]}
          </div>
          <div className="text-[12px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
            {doctorName(camp.doctor)} · {cityState || 'Location unavailable'} · {new Date(camp.date).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 mt-3">
        <CampStatusPillReal status={camp.status} />
        {camp.timeSlot && (
          <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border"
            style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
          >
            <FiClock size={10} /> {CAMP_TIME_SLOT_LABEL[camp.timeSlot]}
          </span>
        )}
      </div>

      <div
        className="grid grid-cols-3 gap-1.5 mt-3 rounded-[14px] border px-2.5 py-2"
        style={{ background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)' }}
      >
        <div>
          <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>0/{camp.patientExpectation}</div>
          <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Patients</div>
        </div>
        <div>
          <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>{camp.devices.length}</div>
          <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Devices</div>
        </div>
        <div>
          {/* No executed-patient-count field exists anywhere in the API to compute a real
              percentage from — shown as "—", not a misleading fake "0%". */}
          <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>—</div>
          <div className="text-[9px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Done</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 mt-3 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
        <FiBriefcase size={11} className="shrink-0" />
        <span className="truncate">{tenantName}</span>
        {!camp.fo && (
          <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger shrink-0">
            <FiAlertTriangle size={10} /> Missing FO
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => onOpen(camp.id)}
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
        >
          <FiEye size={12} /> Details
        </button>
        {!camp.fo && (
          <button
            onClick={() => onOpen(camp.id)}
            className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors"
            style={{ color: 'var(--qms-brand)', background: 'color-mix(in srgb, var(--qms-brand) 10%, transparent)' }}
          >
            <FiUserPlus size={12} /> Assign FO
          </button>
        )}
      </div>
    </div>
  )
}

export default CampCardReal
