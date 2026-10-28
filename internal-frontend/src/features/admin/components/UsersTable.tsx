import { useNavigate } from 'react-router-dom'
import type { User } from '@/types/user.types'
import UserAvatar from '@/components/ui/UserAvatar'
import StatusPill from '@/features/admin/components/StatusPill'

// Literal path to avoid a circular import back through admin.routes.tsx (same pattern as CampDrawer.tsx).
const ADMIN_USER_DETAIL_PATH = '/admin/users/:id'

interface UsersTableProps {
  users: User[]
  // GET /users/:id requires user:get, distinct from user:search which reaches this list.
  canOpenDetail: boolean
}

function formatJoined(createdAt?: string): string {
  if (!createdAt) return '—'
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const UsersTable = ({ users, canOpenDetail }: UsersTableProps) => {
  const navigate = useNavigate()

  if (users.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border border-dashed" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        No users found.
      </div>
    )
  }

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
      {users.map((user) => (
        <div
          key={user._id}
          onClick={canOpenDetail ? () => navigate(ADMIN_USER_DETAIL_PATH.replace(':id', user._id)) : undefined}
          onKeyDown={canOpenDetail ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(ADMIN_USER_DETAIL_PATH.replace(':id', user._id)) } } : undefined}
          role={canOpenDetail ? 'button' : undefined}
          tabIndex={canOpenDetail ? 0 : undefined}
          className={`rounded-xl border p-4 transition-transform ${canOpenDetail ? 'cursor-pointer hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--qms-brand)' : ''}`}
          style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)', backdropFilter: 'blur(20px) saturate(140%)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <UserAvatar firstName={user.firstName} lastName={user.lastName} tone={user.avatarTone} size="md" />
            <div className="min-w-0 flex-1">
              <div className="font-bold text-[14px] truncate" style={{ color: 'var(--qms-text)' }}>{user.firstName} {user.lastName}</div>
              <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{user.email}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <StatusPill status={user.status} />
            <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>Joined {formatJoined(user.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default UsersTable
