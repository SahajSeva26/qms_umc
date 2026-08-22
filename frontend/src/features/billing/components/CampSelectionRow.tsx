import { memo } from 'react'
import type { CampEntity } from '@/features/camps/campReal.types'
import { formatDate, formatINRFull } from '@/utils/formatters'

interface CampSelectionRowProps {
  camp: CampEntity
  checked: boolean
  onToggle: (campId: string) => void
  // Passed in from the parent project, never read off the camp itself —
  // campCost is not a camp field, it's what this camp will bill at.
  campCost: number
  disabled?: boolean
}

// Memoized so toggling one checkbox doesn't re-render every other row —
// callers must pass a stable (useCallback-wrapped) onToggle. Kept inside
// features/billing/ — finance-specific (shows campCost/eligibility framing),
// not a new cross-feature primitive.
const CampSelectionRow = memo(({ camp, checked, onToggle, campCost, disabled }: CampSelectionRowProps) => (
  <label
    className="flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
    style={{
      borderColor: checked ? 'var(--qms-brand)' : 'var(--qms-border)',
      background: checked ? 'color-mix(in oklch, var(--qms-brand), transparent 92%)' : 'transparent',
      opacity: disabled ? 0.5 : 1,
      cursor: disabled ? 'not-allowed' : 'pointer',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={() => onToggle(camp.id)}
      className="accent-(--qms-brand)"
    />
    <span className="min-w-0 flex-1 flex items-center justify-between gap-2">
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
          {camp.code}
        </span>
        <span className="block text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
          {formatDate(camp.date)} · {camp.type} · {camp.city}, {camp.state}
        </span>
      </span>
      <span className="text-[13px] font-bold shrink-0" style={{ color: 'var(--qms-text)' }}>
        {formatINRFull(campCost)}
      </span>
    </span>
  </label>
))

export default CampSelectionRow
