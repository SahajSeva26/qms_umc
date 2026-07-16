import { useNavigate } from 'react-router-dom'
import type { PermissionGroupEntity } from '@/types/pbac.types'
import { PERMISSION_GROUP_ROUTES } from '@/features/pbac/permission-group/permission-group.routes'
import PermissionGroupStatusPill from '@/features/pbac/permission-group/components/PermissionGroupStatusPill'

// Hand-built table matching `@/features/pbac/tenant/components/TenantsTable.tsx`
// exactly: var(--qms-*) custom properties, no shadcn Table, row-click
// navigates to the detail route, inline empty state.

interface PermissionGroupsTableProps {
  groups: PermissionGroupEntity[]
}

const PermissionGroupsTable = ({ groups }: PermissionGroupsTableProps) => {
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
                Tenant
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Permissions
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr
                key={group.id}
                onClick={() => navigate(PERMISSION_GROUP_ROUTES.PERMISSION_GROUP_DETAIL.replace(':id', group.id))}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>
                    {group.code}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                    {group.name}
                  </div>
                  {group.description && (
                    <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                      {group.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {group.tenant}
                </td>
                <td className="px-4 py-2.5">
                  <PermissionGroupStatusPill status={group.status} />
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                  {/* `permissions` is only present server-side when the caller
                      holds `system:manage` or `tenant:admin` (mapper gate) —
                      show a neutral placeholder when it's absent rather than
                      implying a count of zero. */}
                  {group.permissions ? group.permissions.length : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {groups.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No permission groups found.
        </div>
      )}
    </div>
  )
}

export default PermissionGroupsTable
