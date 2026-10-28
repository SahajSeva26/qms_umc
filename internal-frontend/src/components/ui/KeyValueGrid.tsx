interface KeyValueGridProps {
  items: { label: string; value: string | number | undefined | null }[]
  columns?: 2 | 3
}

const KeyValueGrid = ({ items, columns = 2 }: KeyValueGridProps) => (
  <div className="grid gap-x-4 gap-y-2.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
    {items.map((item) => (
      <div key={item.label}>
        <div className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--qms-text-muted)' }}>
          {item.label}
        </div>
        <div className="text-[13px] font-medium" style={{ color: 'var(--qms-text)' }}>
          {item.value === undefined || item.value === null || item.value === '' ? '—' : item.value}
        </div>
      </div>
    ))}
  </div>
)

export default KeyValueGrid
