import type { TenantStatus } from '@/types/accessManagement.types'

// Mirrors `@/features/admin/components/StatusPill.tsx` exactly, keyed on
// TenantStatus. `status` is only present server-side when the caller holds
// `system:manage` (see Tenant['status'] TODO in accessManagement.types.ts), so this
// renders a neutral placeholder when it's missing.
const STATUS_CLASSES: Record<TenantStatus, string> = {
  active: 'bg-success-soft text-success',
  inactive: 'bg-danger-soft text-danger',
}

const STATUS_LABEL: Record<TenantStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

interface TenantStatusPillProps {
  status?: TenantStatus
}

const TenantStatusPill = ({ status }: TenantStatusPillProps) => {
  if (!status) {
    return (
      <span className="inline-flex items-center text-[11px] font-bold" style={{ color: 'var(--qms-text-muted)' }}>
        —
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_CLASSES[status]}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {STATUS_LABEL[status]}
    </span>
  )
}

export default TenantStatusPill
