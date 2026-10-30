import type { ReactNode } from 'react'
import { FiFolder } from 'react-icons/fi'
import type { ProjectTypeBillingRow } from '@/features/crm/salesDashboard/salesDashboard.today'
import { PROJECT_TYPE_LABEL } from '@/types/project.types'
import { formatINR } from '@/utils/formatters'

interface ProjectTypeBillingSectionProps {
  rows: ProjectTypeBillingRow[]
  isLoading: boolean
  isError: boolean
}

const Shell = ({ children }: { children: ReactNode }) => (
  <div className="rounded-[20px] border p-4.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', backdropFilter: 'blur(20px) saturate(140%)' }}>
    <div className="mb-3">
      <h3 className="text-[15px] font-bold" style={{ color: 'var(--qms-text)', letterSpacing: '-0.01em' }}>Project types · count + committed value</h3>
      <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Across my portfolio</div>
    </div>
    {children}
  </div>
)

// "Project types · count + billing" — same real per-type project counts used elsewhere on this
// dashboard (salesDashboard.kpis.ts's buildProjectTiles), with a real "Committed value" (Σ campCost
// × totalCamps) per type — never labeled "Billed", since invoice:* is unreachable for this role.
const ProjectTypeBillingSection = ({ rows, isLoading, isError }: ProjectTypeBillingSectionProps) => {
  if (isLoading) {
    return (
      <Shell>
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl h-14 animate-pulse" style={{ background: 'var(--qms-surface-strong)' }} />
          ))}
        </div>
      </Shell>
    )
  }

  if (isError) {
    return (
      <Shell>
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Couldn't load your projects — try again shortly.</p>
      </Shell>
    )
  }

  return (
    <Shell>
      {rows.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No projects yet.</p>
      ) : (
        <div className="flex flex-col divide-y" style={{ borderColor: 'var(--qms-border)' }}>
          {rows.map((row) => (
            <div key={row.type} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0" style={{ borderColor: 'var(--qms-border)' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'linear-gradient(135deg, rgba(36,81,240,.16), rgba(20,184,166,.16))', color: 'var(--qms-brand)' }}
                >
                  <FiFolder size={15} />
                </div>
                <div>
                  <div className="font-bold text-[13px]" style={{ color: 'var(--qms-text)' }}>{PROJECT_TYPE_LABEL[row.type]}</div>
                  <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{row.count} project{row.count === 1 ? '' : 's'}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-[13px]" style={{ color: 'var(--qms-brand)' }}>{formatINR(row.committedValue)}</div>
                <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>committed</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  )
}

export default ProjectTypeBillingSection
