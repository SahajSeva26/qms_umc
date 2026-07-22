import { useNavigate } from 'react-router-dom'
import type { User } from '@/types/user.types'
import UserAvatar from '@/components/ui/UserAvatar'
import RealRoleBadge from '@/features/admin/components/RealRoleBadge'
import StatusPill from '@/features/admin/components/StatusPill'

// Literal path (not imported from admin.routes.tsx) — that file imports
// UsersPage, which imports this component, so importing back from it here
// would be a circular module dependency (same pattern as CampDrawer.tsx).
const ADMIN_USER_DETAIL_PATH = '/admin/users/:id'

interface UsersTableProps {
  users: User[]
  /** Real bound RoleType name per user, keyed by email — see UsersPage.tsx. */
  roleTypeByEmail: Map<string, string>
  isLoadingRoles: boolean
}

function formatJoined(createdAt?: string): string {
  if (!createdAt) return '—'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const UsersTable = ({ users, roleTypeByEmail, isLoadingRoles }: UsersTableProps) => {
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
                User
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Role
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Joined
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user._id}
                onClick={() => navigate(ADMIN_USER_DETAIL_PATH.replace(':id', user._id))}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <UserAvatar firstName={user.firstName} lastName={user.lastName} tone={user.avatarTone} size="sm" />
                    <div className="min-w-0">
                      <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <RealRoleBadge roleTypeName={roleTypeByEmail.get(user.email) ?? null} isLoading={isLoadingRoles} />
                </td>
                <td className="px-4 py-2.5">
                  <StatusPill status={user.status} />
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {formatJoined(user.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No users found.
        </div>
      )}
    </div>
  )
}

export default UsersTable
