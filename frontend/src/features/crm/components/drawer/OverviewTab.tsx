import type { LeadEntity } from '@/types/crm.types'
import { LEAD_PROJECT_TYPE_LABEL } from '@/types/crm.types'
import { roleLabel, roleCode, tenantLabel, divisionLabel } from '@/features/crm/crm.utils'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import UserAvatar from '@/components/ui/UserAvatar'
import { formatDate } from '@/utils/formatters'

interface OverviewTabProps {
  lead: LeadEntity
}

const OverviewTab = ({ lead }: OverviewTabProps) => (
  <div className="space-y-4">
    <KeyValueGrid
      columns={2}
      items={[
        { label: 'Lead ID', value: lead.id },
        { label: 'Company', value: tenantLabel(lead.tenant) },
        { label: 'Division', value: divisionLabel(lead.division) },
        { label: 'Contact person', value: `${roleLabel(lead.contactPerson)}${roleCode(lead.contactPerson) ? ` (${roleCode(lead.contactPerson)})` : ''}` },
        { label: 'Project type', value: LEAD_PROJECT_TYPE_LABEL[lead.projectType] },
        { label: 'Number of MRs', value: lead.numberOfMRS },
        { label: 'Focus therapy', value: lead.focusTherapy.join(', ') },
        { label: 'Focus doctors', value: lead.focusTherapyDoctor.join(', ') },
        { label: 'Currently doing', value: lead.currentlyDoing.join(', ') },
        { label: 'Confidence', value: `${lead.confidence}%` },
        { label: 'Created', value: formatDate(lead.createdAt) },
        { label: 'Last update', value: formatDate(lead.updatedAt) },
      ]}
    />

    <div className="flex items-center gap-2">
      <UserAvatar firstName={roleLabel(lead.salesPerson)} size="sm" />
      <div>
        <div className="text-[12px] font-semibold" style={{ color: 'var(--qms-text)' }}>{roleLabel(lead.salesPerson)}</div>
        <div className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Sales rep</div>
      </div>
    </div>

    <div
      className="rounded-xl border p-3"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        Problem statement
      </div>
      <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{lead.problemStatement}</p>
    </div>

    {lead.offers.length > 0 && (
      <div
        className="rounded-xl border p-3"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          QMS offers
        </div>
        <div className="space-y-1.5">
          {lead.offers.map((offer, i) => (
            <div key={i} className="text-[13px]" style={{ color: 'var(--qms-text)' }}>
              <span className="font-semibold">{offer.code}</span>
              {offer.subOffer && <span style={{ color: 'var(--qms-text-muted)' }}> · {offer.subOffer}</span>}
              {offer.reason && <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{offer.reason}</div>}
            </div>
          ))}
        </div>
      </div>
    )}

    <div
      className="rounded-xl border p-3"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
    >
      <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--qms-text-muted)' }}>
        Follow-up
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[13px]" style={{ color: 'var(--qms-text)' }}>Next follow-up date</span>
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-card)', color: 'var(--qms-brand)' }}>
          {lead.followUpDate ? formatDate(lead.followUpDate) : '—'}
        </span>
      </div>
    </div>
  </div>
)

export default OverviewTab
