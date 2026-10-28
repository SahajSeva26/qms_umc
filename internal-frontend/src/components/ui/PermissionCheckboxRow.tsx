import { memo } from 'react'

interface Permission {
  code: string
  name: string
}

interface PermissionCheckboxRowProps {
  permission: Permission
  checked: boolean
  onToggle: (code: string) => void
}

// Memoized so toggling one checkbox doesn't re-render every other row in the
// list — callers must pass a stable (useCallback-wrapped) `onToggle`.
const PermissionCheckboxRow = memo(({ permission, checked, onToggle }: PermissionCheckboxRowProps) => (
  <label
    className="flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
    style={{
      borderColor: checked ? 'var(--qms-brand)' : 'var(--qms-border)',
      background: checked ? 'color-mix(in oklch, var(--qms-brand), transparent 92%)' : 'transparent',
    }}
  >
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onToggle(permission.code)}
      className="mt-0.5 accent-(--qms-brand)"
    />
    <span className="min-w-0">
      <span className="block text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
        {permission.name}
      </span>
      <span className="block text-[11px] font-mono truncate" style={{ color: 'var(--qms-text-muted)' }}>
        {permission.code}
      </span>
    </span>
  </label>
))

export default PermissionCheckboxRow
