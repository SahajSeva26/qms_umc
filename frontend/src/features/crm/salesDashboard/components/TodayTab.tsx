import { FiAlertCircle, FiClock } from 'react-icons/fi'
import type { LeadEntity } from '@/types/crm.types'
import { formatDate } from '@/utils/formatters'
import type { CompanyDivisionRow, ProjectTypeBillingRow } from '@/features/crm/salesDashboard/salesDashboard.today'
import CompanyDivisionsSection from '@/features/crm/salesDashboard/components/CompanyDivisionsSection'
import ProjectTypeBillingSection from '@/features/crm/salesDashboard/components/ProjectTypeBillingSection'

interface TodayTabProps {
  leads: LeadEntity[]
  onOpenLead: (id: string) => void
  companyRows: CompanyDivisionRow[]
  projectTypeRows: ProjectTypeBillingRow[]
  projectsLoading: boolean
  projectsError: boolean
  // Independent from projectsLoading/projectsError — a failed lead sweep must never collapse into
  // "Nothing overdue"/"Nothing due", since that reads as a real, good-news empty state rather than
  // an unknown one.
  leadsLoading: boolean
  leadsError: boolean
  onRetryLeads: () => void
}

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
}

const SkeletonCard = () => (
  <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
    <div className="h-4 w-40 rounded animate-pulse mb-3" style={{ background: 'var(--qms-surface-strong)' }} />
    <div className="space-y-1.5">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="h-8 rounded-lg animate-pulse" style={{ background: 'var(--qms-surface-strong)' }} />
      ))}
    </div>
  </div>
)

// Real, derived from the caller's own-scoped lead set — unlike the prototype's Today tab (an
// auto-generated localStorage task engine spanning meetings/leads/projects with snooze/done state),
// this is just "what's due" read straight off LeadEntity.followUpDate. No separate task entity exists
// in the real backend, so there is nothing to snooze/complete — this is a read-only due-list.
const TodayTab = ({
  leads, onOpenLead, companyRows, projectTypeRows, projectsLoading, projectsError, leadsLoading, leadsError, onRetryLeads,
}: TodayTabProps) => {
  const withFollowUp = leads.filter((l) => l.followUpDate && l.status !== 'won' && l.status !== 'lost')
  const overdue = withFollowUp.filter((l) => daysUntil(l.followUpDate!) < 0).sort((a, b) => daysUntil(a.followUpDate!) - daysUntil(b.followUpDate!))
  const dueSoon = withFollowUp.filter((l) => daysUntil(l.followUpDate!) >= 0 && daysUntil(l.followUpDate!) <= 7).sort((a, b) => daysUntil(a.followUpDate!) - daysUntil(b.followUpDate!))

  return (
    <div className="flex flex-col gap-3.5">
      {leadsLoading && (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!leadsLoading && leadsError && (
        <div className="flex items-center gap-3 text-[13px] rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          <span>Couldn't load your leads.</span>
          <button
            type="button"
            onClick={onRetryLeads}
            className="rounded-lg border px-3 py-1.5 font-medium"
            style={{ borderColor: 'var(--qms-border-strong)', color: 'var(--qms-text)' }}
          >
            Retry
          </button>
        </div>
      )}

      {!leadsLoading && !leadsError && (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
          <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <h3 className="text-[13px] font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--qms-text)' }}>
              <FiAlertCircle size={13} style={{ color: '#f43f5e' }} /> Overdue follow-ups ({overdue.length})
            </h3>
            <div className="space-y-1.5">
              {overdue.length === 0 && <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Nothing overdue.</p>}
              {overdue.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => onOpenLead(lead.id)}
                  className="w-full text-left rounded-lg p-2 text-[12px] hover:bg-(--qms-surface-hover)"
                  style={{ background: 'var(--qms-surface-strong)' }}
                >
                  <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{lead.title}</span>
                  {' · '}
                  <span style={{ color: '#f43f5e' }}>due {formatDate(lead.followUpDate!)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
            <h3 className="text-[13px] font-bold mb-3 flex items-center gap-1.5" style={{ color: 'var(--qms-text)' }}>
              <FiClock size={13} style={{ color: 'var(--qms-brand)' }} /> Due this week ({dueSoon.length})
            </h3>
            <div className="space-y-1.5">
              {dueSoon.length === 0 && <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>Nothing due in the next 7 days.</p>}
              {dueSoon.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => onOpenLead(lead.id)}
                  className="w-full text-left rounded-lg p-2 text-[12px] hover:bg-(--qms-surface-hover)"
                  style={{ background: 'var(--qms-surface-strong)' }}
                >
                  <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{lead.title}</span>
                  {' · '}
                  <span style={{ color: 'var(--qms-text-muted)' }}>due {formatDate(lead.followUpDate!)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        <CompanyDivisionsSection rows={companyRows} isLoading={projectsLoading} isError={projectsError} />
        <ProjectTypeBillingSection rows={projectTypeRows} isLoading={projectsLoading} isError={projectsError} />
      </div>
    </div>
  )
}

export default TodayTab
