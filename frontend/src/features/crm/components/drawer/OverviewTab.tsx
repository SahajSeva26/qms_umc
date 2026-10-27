import { FiInfo } from 'react-icons/fi'
import type { LeadEntity } from '@/types/crm.types'
import { LEAD_PROJECT_TYPE_LABEL, LEAD_STATUS_LABEL } from '@/types/crm.types'
import { roleLabel, contactPersonLabel, contactPersonEmail, contactPersonPhone, tenantLabel, divisionLabel } from '@/features/crm/crm.utils'
import KeyValueRows from '@/components/ui/KeyValueRows'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import UserAvatar from '@/components/ui/UserAvatar'
import { formatDate, formatINR } from '@/utils/formatters'

interface OverviewTabProps {
  lead: LeadEntity
}

// Most recent transition INTO 'lost' — stageHistory has no dedicated lostReason/lostCategory
// fields; the reason lives on that transition entry itself (same source ActivityTab reads).
function lastLostReason(lead: LeadEntity): string | undefined {
  const lostEntries = lead.stageHistory.filter((h) => h.to === 'lost')
  if (lostEntries.length === 0) return undefined
  return lostEntries[lostEntries.length - 1].reason
}

const OverviewTab = ({ lead }: OverviewTabProps) => {
  const lostReason = lead.status === 'lost' ? lastLostReason(lead) : undefined

  return (
    <div className="space-y-4">
      {/* Matches the prototype's `.kv` block layout (crm.js), side-by-side not stacked. The
          prototype's brand/vendor/competitor/source fields have no backend equivalent — not faked. */}
      <KeyValueRows
        items={[
          { label: 'Lead ID', value: lead.code },
          { label: 'Company', value: tenantLabel(lead.tenant) },
          { label: 'Division', value: divisionLabel(lead.division) },
          { label: 'Contact person', value: contactPersonLabel(lead.contactPerson) },
          { label: 'Email', value: contactPersonEmail(lead.contactPerson) },
          { label: 'Phone', value: contactPersonPhone(lead.contactPerson) },
          { label: 'Project type', value: LEAD_PROJECT_TYPE_LABEL[lead.projectType] },
          { label: 'Number of MRs', value: lead.numberOfMRS },
          { label: 'Focus therapy', value: lead.focusTherapy.join(', ') },
          { label: 'Focus doctors', value: lead.focusTherapyDoctor.join(', ') },
          { label: 'Currently doing', value: lead.currentlyDoing.join(', ') },
          { label: 'Confidence', value: `${lead.confidence}%` },
          { label: 'Owner', value: roleLabel(lead.salesPerson) },
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

      {/* Matches the prototype's "Brief-aligned details" panel (crm-sales-leads.js decorateDrawer) —
          appended last, after Problem statement/QMS offers/Follow-up. */}
      <div
        style={{ marginTop: 16, padding: 12, borderRadius: 12, border: '1px solid var(--qms-border)', background: 'var(--qms-surface)' }}
      >
        <div className="flex items-center gap-2 mb-2.5">
          <FiInfo size={14} style={{ color: 'var(--qms-brand)' }} />
          <div className="text-[12px] font-extrabold uppercase tracking-wide" style={{ color: 'var(--qms-text)' }}>
            Brief-aligned details
          </div>
          <div className="flex flex-wrap gap-1.5 ml-auto">
            <span
              className="text-[10px] font-bold px-[7px] py-0.5 rounded-full"
              style={{ background: 'rgba(0,0,0,.04)', color: 'var(--qms-text-soft)', border: '1px solid var(--qms-border)' }}
            >
              {LEAD_STATUS_LABEL[lead.status]}
            </span>
            <span
              className="text-[10px] font-bold px-[7px] py-0.5 rounded-full"
              style={{ background: 'rgba(245,158,11,.10)', color: '#a16207', border: '1px solid rgba(245,158,11,.25)' }}
            >
              {lead.confidence}% conf
            </span>
            {lostReason && (
              <span
                className="text-[10px] font-bold px-[7px] py-0.5 rounded-full"
                style={{ background: 'rgba(244,63,94,.10)', color: '#be123c', border: '1px solid rgba(244,63,94,.25)' }}
              >
                Lost
              </span>
            )}
          </div>
        </div>

        <div style={{ padding: 10, borderRadius: 14, border: '1px solid var(--qms-border)', background: 'var(--qms-surface)' }}>
          <KeyValueGrid
            columns={2}
            items={[
              { label: 'Pharma', value: tenantLabel(lead.tenant) },
              { label: 'Division', value: divisionLabel(lead.division) },
              { label: 'Focus therapy', value: lead.focusTherapy.join(', ') },
              { label: 'Focus doctor', value: lead.focusTherapyDoctor.join(', ') },
              { label: 'Project type', value: LEAD_PROJECT_TYPE_LABEL[lead.projectType] },
              { label: 'Est. value', value: formatINR(lead.estimatedValue) },
              { label: 'Next follow-up', value: lead.followUpDate ? formatDate(lead.followUpDate) : undefined },
              { label: 'Owner', value: roleLabel(lead.salesPerson) },
            ]}
          />
        </div>

        <div className="text-[11px] mt-2.5" style={{ color: 'var(--qms-text-soft)' }}>
          <b>Problem statement:</b> {lead.problemStatement || '—'}
        </div>

        {lostReason && (
          <div
            className="mt-2.5 p-2.5"
            style={{ borderRadius: 10, background: 'rgba(244,63,94,.06)', border: '1px solid rgba(244,63,94,.20)' }}
          >
            <div className="text-[11px] font-extrabold uppercase tracking-wide mb-1" style={{ color: '#be123c' }}>
              Lost
            </div>
            <div className="text-[12px]" style={{ color: 'var(--qms-text)', lineHeight: 1.4 }}>{lostReason}</div>
          </div>
        )}
      </div>
    </div>
  )
}

export default OverviewTab
