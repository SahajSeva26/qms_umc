import { useNavigate } from 'react-router-dom'
import type { Tenant } from '@/types/pbac.types'
import { TENANT_ROUTES } from '@/features/pbac/tenant/tenant.routes'
import TenantTypeBadge from '@/features/pbac/tenant/components/TenantTypeBadge'
import TenantStatusPill from '@/features/pbac/tenant/components/TenantStatusPill'

// Hand-built table matching `@/features/admin/components/UsersTable.tsx`
// exactly: var(--qms-*) custom properties, no shadcn Table, row-click
// navigates to the detail route, inline empty state.

interface TenantsTableProps {
  tenants: Tenant[]
}

function formatCreated(createdAt?: string): string {
  if (!createdAt) return '—'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const TenantsTable = ({ tenants }: TenantsTableProps) => {
  const navigate = useNavigate()

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Code
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Name
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Type
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((tenant) => (
              <tr
                key={tenant.id}
                onClick={() => navigate(TENANT_ROUTES.TENANT_DETAIL.replace(':id', tenant.id))}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>
                    {tenant.code}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                    {tenant.name}
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <TenantTypeBadge type={tenant.type} />
                </td>
                <td className="px-4 py-2.5">
                  <TenantStatusPill status={tenant.status} />
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {formatCreated(tenant.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tenants.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No tenants found.
        </div>
      )}
    </div>
  )
}

export default TenantsTable
