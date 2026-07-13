import type { UserRole } from '@/types/auth.types'
import { ROLE_LABEL, ROLE_COLOR } from '@/lib/roles'

interface RoleBadgeProps {
  role: UserRole
}

const RoleBadge = ({ role }: RoleBadgeProps) => {
  const label = ROLE_LABEL[role] ?? role
  const color = ROLE_COLOR[role] ?? 'var(--qms-brand)'

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

export default RoleBadge
