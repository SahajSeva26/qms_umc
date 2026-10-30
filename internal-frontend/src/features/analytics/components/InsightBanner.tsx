import { FiZap } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { ClientInvoice } from '@/types/client.types'
import type { LeadEntity } from '@/types/crm.types'
import { computeInsights } from '@/features/analytics/analytics.utils'

interface InsightBannerProps {
  camps: Camp[]
  leads: LeadEntity[]
  invoices: ClientInvoice[]
}

// Rule-based insight strip, not an AI/LLM call — see computeInsights() for
// the exact threshold logic (ported faithfully from the prototype's own
// non-AI "Insight copilot", confirmed via research).
const InsightBanner = ({ camps, leads, invoices }: InsightBannerProps) => {
  const parts = computeInsights(camps, leads, invoices)

  return (
    <div
      className="rounded-xl border p-3.5 mb-4 flex items-start gap-2.5"
      style={{ background: 'linear-gradient(135deg, rgba(36,81,240,.06), rgba(20,184,166,.05))', borderColor: 'var(--qms-border)' }}
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center text-white shrink-0"
        style={{ background: 'linear-gradient(135deg, var(--chart-3), var(--qms-brand))' }}
      >
        <FiZap size={14} />
      </span>
      <p className="text-[12px] leading-relaxed" style={{ color: 'var(--qms-text-soft)' }}>
        <span className="font-bold" style={{ color: 'var(--qms-text)' }}>Insight copilot: </span>
        {parts.length > 0 ? parts.join(' · ') : 'No insights for this period.'}
      </p>
    </div>
  )
}

export default InsightBanner
