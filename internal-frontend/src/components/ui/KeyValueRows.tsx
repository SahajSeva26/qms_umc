// Matches the prototype's `.kv` exactly — 130px label column, side-by-side not stacked. Kept
// separate from KeyValueGrid (label-above-value, used elsewhere) so this layout doesn't leak there.
interface KeyValueRowsProps {
  items: { label: string; value: React.ReactNode }[]
}

const KeyValueRows = ({ items }: KeyValueRowsProps) => (
  <div
    className="grid"
    style={{
      gridTemplateColumns: '130px 1fr',
      columnGap: 14,
      rowGap: 8,
      padding: 12,
      borderRadius: 14,
      background: 'var(--qms-surface)',
      border: '1px solid var(--qms-border)',
      fontSize: 13,
    }}
  >
    {items.map((item, i) => (
      <div key={i} className="contents">
        <div className="font-semibold" style={{ color: 'var(--qms-text-muted)' }}>{item.label}</div>
        <div style={{ color: 'var(--qms-text)' }}>
          {item.value === undefined || item.value === null || item.value === '' ? '—' : item.value}
        </div>
      </div>
    ))}
  </div>
)

export default KeyValueRows
