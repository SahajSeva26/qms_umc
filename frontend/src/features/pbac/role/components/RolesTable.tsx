import { useNavigate } from 'react-router-dom'
import type { RoleEntity, RolePopulatedRoleType, RolePopulatedUser } from '@/types/pbac.types'
import { ROLE_ROUTES } from '@/features/pbac/role/role.routes'
import RoleStatusPill from '@/features/pbac/role/components/RoleStatusPill'

// Hand-built table matching `@/features/pbac/role-type/components/RoleTypesTable.tsx`
// / `@/features/admin/components/UsersTable.tsx` exactly: var(--qms-*) custom
// properties, no shadcn Table, row-click navigates to the detail route,
// inline empty state. Columns per the task: code, name, role type name,
// bound user name/email, status — a Role is the "ID card" binding one user to
// one RoleType, so those two populated relations are the interesting columns
// beyond the role's own fields.
//
// RoleEntity['type']/['user'] are typed as `Populated | string` (see
// pbac.types.ts) because create/update responses return raw ObjectIds while
// GET-by-id/search populate them — search results (what this table renders)
// are always populated, but the helpers below tolerate the raw-string shape
// defensively rather than assuming.

interface RolesTableProps {
  roles: RoleEntity[]
}

function roleTypeLabel(type: RoleEntity['type']): string {
  if (typeof type === 'string') return '—'
  const t = type as RolePopulatedRoleType
  return t?.name ?? '—'
}

function userName(user: RoleEntity['user']): string {
  if (typeof user === 'string') return '—'
  const u = user as RolePopulatedUser
  if (!u?.firstName) return '—'
  return `${u.firstName} ${u.lastName ?? ''}`.trim()
}

function userEmail(user: RoleEntity['user']): string {
  if (typeof user === 'string') return ''
  return (user as RolePopulatedUser)?.email ?? ''
}

const RolesTable = ({ roles }: RolesTableProps) => {
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
                Role Type
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                User
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr
                key={role.id}
                onClick={() => navigate(ROLE_ROUTES.ROLE_DETAIL.replace(':id', role.id))}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <span className="font-semibold font-mono" style={{ color: 'var(--qms-text)' }}>
                    {role.code}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                    {role.name}
                  </div>
                  {role.description && (
                    <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                      {role.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                  {roleTypeLabel(role.type)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                    {userName(role.user)}
                  </div>
                  {userEmail(role.user) && (
                    <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                      {userEmail(role.user)}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <RoleStatusPill status={role.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {roles.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No roles found.
        </div>
      )}
    </div>
  )
}

export default RolesTable
