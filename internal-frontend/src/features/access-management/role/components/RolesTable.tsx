import { useNavigate } from 'react-router-dom'
import type { RoleEntity, RolePopulatedRoleType, RolePopulatedTenant, RolePopulatedUser } from '@/types/accessManagement.types'
import { ROLE_ROUTES } from '@/features/access-management/role/role.routes'
import RoleStatusPill from '@/features/access-management/role/components/RoleStatusPill'

// RoleEntity['type']/['user'] are `Populated | string`: create/update return raw ObjectIds, search/get populate them.

interface RolesTableProps {
  roles: RoleEntity[]
  // GET /roles/:id requires tenant:admin/tenant:manage/role:get — role:search alone (enough for the list) 403s. Non-navigable when false.
  canOpenDetail: boolean
}

function roleTypeLabel(type: RoleEntity['type']): string {
  if (typeof type === 'string') return '—'
  const t = type as RolePopulatedRoleType
  return t?.name ?? '—'
}

function tenantLabel(tenant: RoleEntity['tenant']): string {
  if (typeof tenant === 'string') return '—'
  return (tenant as RolePopulatedTenant)?.name ?? '—'
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

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

const RolesTable = ({ roles, canOpenDetail }: RolesTableProps) => {
  const navigate = useNavigate()

  if (roles.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border border-dashed" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        No roles found.
      </div>
    )
  }

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      {roles.map((role) => (
        <div
          key={role.id}
          onClick={canOpenDetail ? () => navigate(ROLE_ROUTES.ROLE_DETAIL.replace(':id', role.id)) : undefined}
          onKeyDown={canOpenDetail ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(ROLE_ROUTES.ROLE_DETAIL.replace(':id', role.id)) } } : undefined}
          role={canOpenDetail ? 'button' : undefined}
          tabIndex={canOpenDetail ? 0 : undefined}
          className={`rounded-xl border p-4 transition-transform ${canOpenDetail ? 'cursor-pointer hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--qms-brand)' : ''}`}
          style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)', backdropFilter: 'blur(20px) saturate(140%)' }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              {initial(role.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="font-bold text-[14px] truncate" style={{ color: 'var(--qms-text)' }}>{role.name}</div>
                <RoleStatusPill status={role.status} />
              </div>
              <div className="text-[11px] font-mono truncate" style={{ color: 'var(--qms-text-muted)' }}>{role.code}</div>
              {role.description && (
                <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{role.description}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg mb-2.5" style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)' }}>
            <div>
              <div className="text-[12px] font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>{tenantLabel(role.tenant)}</div>
              <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Company</div>
            </div>
            <div>
              <div className="text-[12px] font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>{roleTypeLabel(role.type)}</div>
              <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Role type</div>
            </div>
            <div>
              <div className="text-[12px] font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>{userName(role.user)}</div>
              <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>User</div>
            </div>
          </div>

          {userEmail(role.user) && (
            <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{userEmail(role.user)}</div>
          )}
        </div>
      ))}
    </div>
  )
}

export default RolesTable
