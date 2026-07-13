import { FiShield, FiLock } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { CampPerspective } from '@/features/camps/camps.perspective'
import { clientName } from '@/features/camps/camps.refs'
import { SLOTS } from '@/features/camps/camps.mock'
import CampStatusPill from '@/features/camps/components/CampStatusPill'
import { formatDate } from '@/utils/formatters'

interface DossierHeaderProps {
  camp: Camp
  perspective: CampPerspective
}

const DossierHeader = ({ camp, perspective }: DossierHeaderProps) => {
  const initials = camp.id.slice(-3)
  const slot = SLOTS.find((s) => s.id === camp.slot)

  return (
    <div
      className="rounded-2xl border p-4 md:p-5 mb-3.5 flex items-start gap-4"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
      >
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[12px] mb-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {clientName(camp.clientId)} · {camp.type} · {camp.projectId ?? '—'}
        </div>
        <h1 className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
          {camp.id} — {camp.city}, {camp.state}
        </h1>
        <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {formatDate(camp.date)} · {slot?.label ?? camp.slot}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <CampStatusPill status={camp.status} />
        {perspective === 'pharma' ? (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,.14)', color: '#8b5cf6' }}>
            <FiShield size={10} /> PHARMA VIEW · PII REDACTED
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-danger-soft text-danger">
            <FiLock size={10} /> QMS INTERNAL
          </span>
        )}
      </div>
    </div>
  )
}

export default DossierHeader
