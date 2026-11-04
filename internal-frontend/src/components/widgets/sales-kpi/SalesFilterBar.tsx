import { FiFilter } from 'react-icons/fi'

// Inert placeholder shell — kept visually in place per the Dashboard's layout. The rep/client/
// division/project dropdowns are gone: most KPI grid tiles still have no sales-target/quota
// backend model to scope by filter, even though some tiles below it are now live values.
const SalesFilterBar = () => {
  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2.5 mb-3.5"
      style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
    >
      <span className="flex items-center gap-1.5 text-[12px] font-bold" style={{ color: 'var(--qms-text-soft)' }}>
        <FiFilter size={13} /> Filters
      </span>
      <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>
        Not available — no live sales-target data to filter yet
      </span>
    </div>
  )
}

export default SalesFilterBar
