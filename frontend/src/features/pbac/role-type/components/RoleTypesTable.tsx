import { useNavigate } from 'react-router-dom'
import type { RoleTypeEntity } from '@/types/pbac.types'
import { ROLE_TYPE_ROUTES } from '@/features/pbac/role-type/role-type.routes'
import RoleTypeStatusPill from '@/features/pbac/role-type/components/RoleTypeStatusPill'

// Hand-built table matching `@/features/admin/components/UsersTable.tsx` /
// `@/features/pbac/permission-group/components/PermissionGroupsTable.tsx`
// exactly: var(--qms-*) custom properties, no shadcn Table, row-click
// navigates to the detail route, inline empty state. Columns per the task:
// code, name, permission count, status.

interface RoleTypesTableProps {
  roleTypes: RoleTypeEntity[]
}

const RoleTypesTable = ({ roleTypes }: RoleTypesTableProps) => {
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
                Permissions
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {roleTypes.map((roleType) => (
              <tr
                key={roleType.id}
                onClick={() => navigate(ROLE_TYPE_ROUTES.ROLE_TYPE_DETAIL.replace(':id', roleType.id))}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <span className="font-semibold font-mono" style={{ color: 'var(--qms-text)' }}>
                    {roleType.code}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                    {roleType.name}
                  </div>
                  {roleType.description && (
                    <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                      {roleType.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                  {roleType.permissions ? roleType.permissions.length : '—'}
                </td>
                <td className="px-4 py-2.5">
                  <RoleTypeStatusPill status={roleType.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {roleTypes.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No role types found.
        </div>
      )}
    </div>
  )
}

export default RoleTypesTable
