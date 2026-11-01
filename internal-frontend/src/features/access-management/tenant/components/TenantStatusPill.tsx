import type { TenantStatus } from '@/types/accessManagement.types'
import StatusPill from '@/components/ui/StatusPill'

// Colors match the prototype's .cm-badge.ok/.no pill (client-management.js) —
// this page's own scoped accent, not the shared StatusPill's default look.
const STATUS_CLASSES: Record<TenantStatus, string> = {
  active: 'bg-[color-mix(in_srgb,#10b981_16%,transparent)] text-[#047857]',
  inactive: 'bg-[color-mix(in_srgb,#f43f5e_16%,transparent)] text-[#be123c]',
}

const STATUS_LABEL: Record<TenantStatus, string> = {
  active: 'Active',
  inactive: 'Inactive',
}

interface TenantStatusPillProps {
  status?: TenantStatus
}

const TenantStatusPill = ({ status }: TenantStatusPillProps) => (
  <StatusPill status={status} classes={STATUS_CLASSES} labels={STATUS_LABEL} />
)

export default TenantStatusPill
