import type { Lead } from '@/types/lead.types'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import UserAvatar from '@/components/ui/UserAvatar'
import { formatDate } from '@/utils/formatters'

interface OverviewTabProps {
  lead: Lead
}

const OverviewTab = ({ lead }: OverviewTabProps) => (
  <div className="space-y-4">
    <KeyValueGrid
      columns={2}
      items={[
        { label: 'Lead ID', value: lead.id },
        { label: 'Email', value: lead.email },
        { label: 'Phone', value: lead.phone },
        { label: 'Therapy', value: lead.therapy },
        { label: 'Brand handled', value: lead.brand },
        { label: 'Existing activity', value: lead.existingActivity },
        { label: 'Current vendor', value: lead.currentVendor },
        { label: 'Competitor', value: lead.competitor },
        { label: 'Source', value: lead.source },
        { label: 'Created', value: formatDate(lead.created) },
        { label: 'Last update', value: formatDate(lead.updated) },
      ]}
    />

    <div className="flex items-center gap-2">
      <UserAvatar firstName={lead.owner.split(' ')[0]} lastName={lead.owner.split(' ')[1]} tone={lead.ownerTone} size="sm" />
      <div>
        <div className="text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>{lead.owner}</div>
        <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>{lead.ownerRole}</div>
      </div>
    </div>

    <div
      className="rounded-xl border p-3"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        Problem statement
      </div>
      <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{lead.problemStatement ?? lead.problem}</p>
    </div>

    <div
      className="rounded-xl border p-3"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        Next action
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{lead.nextAction}</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-card)', color: 'var(--qms-brand)' }}>
          {lead.nextFollowUpDate ? formatDate(lead.nextFollowUpDate) : lead.nextDue}
        </span>
      </div>
    </div>
  </div>
)

export default OverviewTab
