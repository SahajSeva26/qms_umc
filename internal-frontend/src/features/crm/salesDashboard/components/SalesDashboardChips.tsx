import { FiBriefcase } from 'react-icons/fi'

interface SalesDashboardChipsProps {
  // The prototype's "Q2 FY26" quarter chip is a hardcoded seed constant, not computed from the
  // current date — dropped rather than faked. The accounts count chip only renders once a real
  // count is known (see "My Accounts" section — currently a dash placeholder, see crm.myKpis.ts).
  // Deliberately NOT "My accounts · live" (the prototype's own label) — account ownership
  // filtering is explicitly not wired up yet; projects ARE genuinely own-scoped server-side
  // (Project.salesRep), so the scope chip claims only what's actually true.
  accountsCount: number | null
}

// Matches the prototype's header .chip row (styles.css:414-421, sales.html:22-26) — pill shape,
// translucent surface, a pulsing emerald dot on the scope chip.
const SalesDashboardChips = ({ accountsCount }: SalesDashboardChipsProps) => (
  <div className="flex flex-wrap items-center gap-2">
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium"
      style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}
    >
      <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#10b981', boxShadow: '0 0 0 4px rgba(16,185,129,.18)' }} />
      My projects · live
    </span>
    {accountsCount !== null && (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium"
        style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}
      >
        <FiBriefcase size={12} /> {accountsCount} account{accountsCount === 1 ? '' : 's'}
      </span>
    )}
  </div>
)

export default SalesDashboardChips
