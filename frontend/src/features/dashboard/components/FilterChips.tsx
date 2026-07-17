interface FilterChipsProps {
  options: string[]
  active: string
  onChange: (value: string) => void
}

const FilterChips = ({ options, active, onChange }: FilterChipsProps) => (
  <div className="flex flex-wrap gap-1.5 mb-3">
    {options.map((opt) => {
      const isActive = opt === active
      return (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className="px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all"
          style={
            isActive
              ? { background: 'var(--qms-brand)', borderColor: 'var(--qms-brand)', color: '#fff' }
              : { background: 'var(--qms-surface-strong)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }
          }
        >
          {opt}
        </button>
      )
    })}
  </div>
)

export default FilterChips
