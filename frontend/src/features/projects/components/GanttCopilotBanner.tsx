import { FiZap, FiPlay } from 'react-icons/fi'
import type { ProjectKpis } from '@/types/project.types'

interface GanttCopilotBannerProps {
  kpis: ProjectKpis
}

// Templated from live KPI data, matching the prototype's renderAi() exactly —
// same three predicates as the KPI tiles, joined with ' · '. The "Review"
// button is decorative in the source (no handler wired) and stays that way here.
const GanttCopilotBanner = ({ kpis }: GanttCopilotBannerProps) => {
  const parts: string[] = []
  if (kpis.overdue > 0) parts.push(`${kpis.overdue} project${kpis.overdue > 1 ? 's' : ''} past end date — needs extension or close-out`)
  if (kpis.renewingIn30d > 0) parts.push(`${kpis.renewingIn30d} renewing in 30d`)
  if (kpis.atRisk > 0) parts.push(`${kpis.atRisk} at risk (health < 75)`)

  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 mb-4" style={{ background: 'linear-gradient(135deg, color-mix(in oklab, var(--qms-brand) 12%, transparent), color-mix(in oklab, var(--qms-teal) 12%, transparent))' }}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
          <FiZap size={15} color="#fff" />
        </div>
        <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>
          <span className="font-bold">Gantt copilot:</span>{' '}
          {parts.length > 0 ? parts.join(' · ') : 'All projects on track. No actions queued.'}
        </div>
      </div>
      <button className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border shrink-0" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}>
        <FiPlay size={12} /> Review
      </button>
    </div>
  )
}

export default GanttCopilotBanner
