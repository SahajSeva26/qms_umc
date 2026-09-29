// Prototype's 4-tile KPI row (camps.js:554-559) — none have a backing field on our real
// CampEntity (see md-files/ui-revisions.md), so shown as placeholders, not fabricated numbers.
const TILES = ['Patients', 'Rx count', 'Feedback', 'FO rating'] as const

const CampDrawerKpiRow = () => (
  <div className="grid grid-cols-2 gap-2 mb-4">
    {TILES.map((label) => (
      <div
        key={label}
        className="rounded-[14px] border p-2.5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
        <div className="text-[13px] font-bold italic mt-0.5" style={{ color: '#8b5cf6' }}>Coming soon</div>
      </div>
    ))}
  </div>
)

export default CampDrawerKpiRow
