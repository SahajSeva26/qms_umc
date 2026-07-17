import type { DietStage } from '@/features/diet/diet.types'

// Mirrors diet-camps.js's .dc-status-{STAGE} classes.
const STAGE_STYLE: Record<DietStage, { bg: string; color: string; label: string }> = {
  REQUESTED: { bg: 'var(--warning-soft)', color: 'var(--warning)', label: 'Requested' },
  ASSIGNED: { bg: 'rgba(59,109,255,.12)', color: 'var(--qms-brand)', label: 'Diet Assigned' },
  UPCOMING: { bg: 'rgba(14,165,233,.12)', color: '#0ea5e9', label: 'Upcoming' },
  LIVE: { bg: 'var(--success-soft)', color: 'var(--success)', label: 'Live' },
  COMPLETED: { bg: 'rgba(20,184,166,.12)', color: '#14b8a6', label: 'Completed' },
  CANCELLED: { bg: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)', label: 'Cancelled' },
  CHARGED: { bg: 'var(--danger-soft)', color: 'var(--danger)', label: 'Cancelled · Charged' },
}

const DietStatusPill = ({ stage }: { stage: DietStage }) => {
  const s = STAGE_STYLE[stage]
  return (
    <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

export default DietStatusPill
