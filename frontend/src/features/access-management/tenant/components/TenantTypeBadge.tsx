import type { TenantType } from '@/types/accessManagement.types'

// Mirrors `@/features/admin/components/RoleBadge.tsx`'s dot+pill styling,
// keyed on TenantType instead of UserRole. `type` is only present server-side
// when the caller holds `system:manage` (see Tenant['type'] TODO in
// accessManagement.types.ts), so this renders a neutral placeholder when it's missing.
const TYPE_LABEL: Record<TenantType, string> = {
  platform: 'Platform',
  customer: 'Customer',
}

const TYPE_COLOR: Record<TenantType, string> = {
  platform: 'var(--qms-brand)',
  customer: 'var(--qms-teal)',
}

interface TenantTypeBadgeProps {
  type?: TenantType
}

const TenantTypeBadge = ({ type }: TenantTypeBadgeProps) => {
  if (!type) {
    return (
      <span className="inline-flex items-center text-[11px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
        —
      </span>
    )
  }

  const label = TYPE_LABEL[type]
  const color = TYPE_COLOR[type]

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold"
      style={{
        background: `color-mix(in oklch, ${color}, transparent 88%)`,
        borderColor: `color-mix(in oklch, ${color}, transparent 76%)`,
        color,
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      {label}
    </span>
  )
}

export default TenantTypeBadge
