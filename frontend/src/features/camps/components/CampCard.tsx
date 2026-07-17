import type { IconType } from 'react-icons'
import { FiHome, FiHeart, FiActivity, FiUser, FiSmartphone, FiMessageSquare, FiX, FiUserPlus } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import { CAMP_TYPES, SLOTS } from '@/features/camps/camps.mock'
import { getDoctor } from '@/features/camps/camps.utils'
import { clientName, foName } from '@/features/camps/camps.refs'
import CampStatusPill from '@/features/camps/components/CampStatusPill'
import { formatDate } from '@/utils/formatters'

const TYPE_ICON: Record<Camp['type'], IconType> = {
  Screening: FiHome,
  Diet: FiHeart,
  Lab: FiActivity,
}

interface CampCardProps {
  camp: Camp
  onOpen: (id: string) => void
  onAssignFo: (id: string) => void
  onQuickCancel: (id: string) => void
}

const CampCard = ({ camp, onOpen, onAssignFo, onQuickCancel }: CampCardProps) => {
  const typeMeta = CAMP_TYPES.find((t) => t.id === camp.type)
  const doctor = getDoctor(camp.doctorId)
  const slot = SLOTS.find((s) => s.id === camp.slot)
  const Icon = TYPE_ICON[camp.type]
  const progress = camp.patientsExpected ? Math.round((camp.patientsDone / camp.patientsExpected) * 100) : 0
  const isFinal = camp.status === 'CANCELLED' || camp.status === 'CANCELLED_CHARGED' || camp.status === 'CLOSED'
  const staffName = camp.type === 'Diet' ? foName(camp.dietitianId) : foName(camp.foId)

  return (
    <div
      className="rounded-2xl border p-4 transition-all hover:-translate-y-0.5"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: `linear-gradient(135deg, ${typeMeta?.color ?? '#3b6dff'}, var(--qms-teal))` }}
        >
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>
            {camp.id} · {camp.type}
          </div>
          <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
            {doctor?.name ?? 'Doctor TBD'} · {camp.city} · {formatDate(camp.date)}
          </div>
        </div>
        <CampStatusPill status={camp.status} />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
          {slot?.label ?? camp.slot}
        </span>
        {camp.teleConsult && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-brand)' }}>
            <FiSmartphone size={10} /> Tele · {camp.teleChannel === 'IVR' ? 'IVR' : 'Video'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3 rounded-xl p-2.5" style={{ background: 'var(--qms-surface-strong)' }}>
        <div className="text-center">
          <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{camp.patientsDone}/{camp.patientsExpected}</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>Patients</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{camp.devicesAllocated.length}</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>Devices</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{progress}%</div>
          <div className="text-[9px] uppercase tracking-wider" style={{ color: 'var(--qms-text-muted)' }}>Done</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
          {clientName(camp.clientId)}
        </span>
        {staffName ? (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
            <FiUser size={10} /> {staffName}
          </span>
        ) : (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>
            Missing {camp.type === 'Diet' ? 'Dietitian' : 'FO'}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={() => onOpen(camp.id)}
          className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg border transition-all hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
        >
          Details
        </button>
        {!staffName && !isFinal ? (
          <button
            onClick={() => onAssignFo(camp.id)}
            className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1 text-white"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiUserPlus size={11} /> Assign
          </button>
        ) : (
          <button
            className="flex-1 text-[11px] font-semibold py-1.5 rounded-lg flex items-center justify-center gap-1"
            style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
          >
            <FiMessageSquare size={11} /> WhatsApp
          </button>
        )}
        {!isFinal && (
          <button
            onClick={() => onQuickCancel(camp.id)}
            className="w-7 h-7 flex items-center justify-center rounded-lg shrink-0 transition-all hover:bg-danger-soft"
            style={{ color: 'var(--qms-text-muted)' }}
            aria-label="Cancel camp"
          >
            <FiX size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

export default CampCard
