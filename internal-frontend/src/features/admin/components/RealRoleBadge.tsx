// Shows a user's REAL bound Role Type (from the access-management system),
// as a replacement for the old RoleBadge's fake, hash-derived UserRole —
// see admin.mock.ts's own comment: the backend User model has no role
// field, so the old badge showed cosmetic-only, made-up data. Now that
// real Tenant/RoleType/Role data exists, this shows the genuine assignment.

interface RealRoleBadgeProps {
  /** The user's real bound RoleType name (e.g. "HR", "Sales"), or null if this user has no Role at all. */
  roleTypeName: string | null
  /** True while the Roles lookup this depends on is still loading. */
  isLoading?: boolean
}

const RealRoleBadge = ({ roleTypeName, isLoading }: RealRoleBadgeProps) => {
  if (isLoading) {
    return <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>…</span>
  }

  if (!roleTypeName) {
    return <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>No role assigned</span>
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold"
      style={{
        background: 'color-mix(in oklch, var(--qms-brand), transparent 88%)',
        borderColor: 'color-mix(in oklch, var(--qms-brand), transparent 76%)',
        color: 'var(--qms-brand)',
      }}
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: 'var(--qms-brand)' }} />
      {roleTypeName}
    </span>
  )
}

export default RealRoleBadge
