import type { ReactNode } from 'react'

// Unlike ChipPicker (a Select-to-add combobox), every chip here is always
// visible and independently toggleable by clicking it — no dropdown step.
export const ChipRow = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-wrap gap-1.5">{children}</div>
)

interface ChipToggleProps {
  active: boolean
  onClick: () => void
  children: ReactNode
}

export const ChipToggle = ({ active, onClick, children }: ChipToggleProps) => (
  <button
    type="button"
    onClick={onClick}
    className="px-2.5 py-1 rounded-full border text-[11px] font-bold transition-colors"
    style={
      active
        ? { background: 'var(--qms-brand)', color: '#fff', borderColor: 'var(--qms-brand)' }
        : { background: 'var(--qms-surface)', color: 'var(--qms-text-soft)', borderColor: 'var(--qms-border)' }
    }
  >
    {children}
  </button>
)
