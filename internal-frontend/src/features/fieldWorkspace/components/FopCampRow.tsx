import type { ReactNode } from 'react'
import { FopPill } from '@/features/fieldWorkspace/components/fieldWorkspace.primitives'
import { CAMP_STATUS_TONE, CAMP_STATUS_LABEL, fmtShortDate } from '@/features/fieldWorkspace/fieldWorkspace.utils'
import type { CampEntity } from '@/types/campReal.types'

// Mirrors the prototype's .fop-camp-row exactly (fo-portal.js campRow()).
const FopCampRow = ({ camp, action }: { camp: CampEntity; action?: ReactNode }) => {
  const { day, month } = fmtShortDate(camp.date)
  const city = camp.location?.city
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-dashed last:border-b-0" style={{ borderColor: 'var(--qms-border)' }}>
      <div className="w-[60px] shrink-0 text-center py-2 rounded-[9px]" style={{ background: 'rgba(20,184,166,.08)' }}>
        <div className="text-[18px] font-extrabold leading-none" style={{ color: '#0f766e' }}>{day}</div>
        <div className="text-[9.5px] font-bold uppercase tracking-wide mt-0.5" style={{ color: '#64748b' }}>{month}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>{camp.code} · {camp.type}</div>
        <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>
          {city ?? '—'}{camp.timeSlot && ` · ${camp.timeSlot}`}
        </div>
      </div>
      <FopPill tone={CAMP_STATUS_TONE[camp.status]}>{CAMP_STATUS_LABEL[camp.status]}</FopPill>
      {action}
    </div>
  )
}

export default FopCampRow
