import { useNavigate } from 'react-router-dom'
import type { User } from '@/types/user.types'
import UserAvatar from '@/components/ui/UserAvatar'
import StatusPill from '@/features/admin/components/StatusPill'
import type { UserRoleLabel, UserRoleLabelsEntry } from '@/features/admin/hooks/useUserRoleLabels'

// Literal path to avoid a circular import back through admin.routes.tsx (same pattern as CampDrawer.tsx).
const ADMIN_USER_DETAIL_PATH = '/admin/users/:id'

interface UsersTableProps {
  users: User[]
  // GET /users/:id requires user:get, distinct from user:search which reaches this list.
  canOpenDetail: boolean
  rolesByEmail: Record<string, UserRoleLabelsEntry>
}

function formatJoined(createdAt?: string): string {
  if (!createdAt) return '—'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ROLE_TONES = [
  { color: '#2563eb', background: 'rgba(59,109,255,.09)', border: 'rgba(59,109,255,.22)' },
  { color: '#7c3aed', background: 'rgba(124,58,237,.08)', border: 'rgba(124,58,237,.2)' },
  { color: '#059669', background: 'rgba(16,185,129,.08)', border: 'rgba(16,185,129,.22)' },
  { color: '#0891b2', background: 'rgba(14,165,233,.08)', border: 'rgba(14,165,233,.22)' },
  { color: '#d97706', background: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.24)' },
]

function toneForRole(code: string) {
  const hash = [...code].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  return ROLE_TONES[hash % ROLE_TONES.length]
}

function RolePill({ role }: { role: UserRoleLabel }) {
  const tone = toneForRole(role.code)
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap"
      style={{ color: tone.color, background: tone.background, borderColor: tone.border }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tone.color }} aria-hidden="true" />
      {role.name}
    </span>
  )
}

const UsersTable = ({ users, canOpenDetail, rolesByEmail }: UsersTableProps) => {
  const navigate = useNavigate()

  if (users.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border border-dashed" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        No users found.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <table className="w-full min-w-[640px] border-collapse text-left">
        <thead>
          <tr style={{ background: 'var(--qms-surface-card)' }}>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--qms-text-muted)' }}>User</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--qms-text-muted)' }}>Role</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--qms-text-muted)' }}>Status</th>
            <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.08em]" style={{ color: 'var(--qms-text-muted)' }}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => {
            const roleEntry = rolesByEmail[user.email]
            const identity = (
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar firstName={user.firstName} lastName={user.lastName} tone={user.avatarTone} size="sm" />
                <div className="min-w-0">
                  <div className="font-bold text-[13px] truncate" style={{ color: 'var(--qms-text)' }}>{user.firstName} {user.lastName}</div>
                  <div className="text-[10px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{user.email}</div>
                </div>
              </div>
            )

            return (
              <tr key={user._id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <td className="px-4 py-2.5 max-w-[360px]">
                  {canOpenDetail ? (
                    <button
                      type="button"
                      onClick={() => navigate(ADMIN_USER_DETAIL_PATH.replace(':id', user._id))}
                      className="w-full text-left rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--qms-brand)"
                      aria-label={`Open ${user.firstName} ${user.lastName}`}
                    >
                      {identity}
                    </button>
                  ) : identity}
                </td>
                <td className="px-4 py-2.5">
                  {roleEntry?.error ? (
                    <button
                      type="button"
                      onClick={roleEntry.refetch}
                      className="text-[11px] font-semibold"
                      style={{ color: 'var(--qms-danger, #b91c1c)' }}
                      aria-label={`Retry roles for ${user.firstName} ${user.lastName}`}
                    >
                      Couldn't load · Retry
                    </button>
                  ) : roleEntry?.isLoading ? (
                    <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Loading…</span>
                  ) : roleEntry?.roles.length ? (
                    <div className="flex flex-wrap gap-1.5">{roleEntry.roles.map((role) => <RolePill key={`${role.code}-${role.name}`} role={role} />)}</div>
                  ) : (
                    <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>—</span>
                  )}
                </td>
                <td className="px-4 py-2.5"><StatusPill status={user.status} /></td>
                <td className="px-4 py-2.5 text-[11px] whitespace-nowrap" style={{ color: 'var(--qms-text-muted)' }}>{formatJoined(user.createdAt)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default UsersTable
