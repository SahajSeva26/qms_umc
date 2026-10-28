import { useNavigate } from 'react-router-dom'
import type { RoleTypeEntity } from '@/types/accessManagement.types'
import { ROLE_TYPE_ROUTES } from '@/features/access-management/role-type/role-type.routes'
import RoleTypeStatusPill from '@/features/access-management/role-type/components/RoleTypeStatusPill'

interface RoleTypesTableProps {
  roleTypes: RoleTypeEntity[]
}

function tenantLabel(tenant: RoleTypeEntity['tenant']): string {
  if (typeof tenant === 'string') return '—'
  return tenant?.name ?? '—'
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

const RoleTypesTable = ({ roleTypes }: RoleTypesTableProps) => {
  const navigate = useNavigate()

  if (roleTypes.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border border-dashed" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        No role types found.
      </div>
    )
  }

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      {roleTypes.map((roleType) => (
        <div
          key={roleType.id}
          onClick={() => navigate(ROLE_TYPE_ROUTES.ROLE_TYPE_DETAIL.replace(':id', roleType.id))}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(ROLE_TYPE_ROUTES.ROLE_TYPE_DETAIL.replace(':id', roleType.id)) } }}
          role="button"
          tabIndex={0}
          className="rounded-xl border p-4 cursor-pointer transition-transform hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--qms-brand)"
          style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)', backdropFilter: 'blur(20px) saturate(140%)' }}
        >
          <div className="flex items-start gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-extrabold text-white"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              {initial(roleType.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="font-bold text-[14px] truncate" style={{ color: 'var(--qms-text)' }}>{roleType.name}</div>
                <RoleTypeStatusPill status={roleType.status} />
              </div>
              <div className="text-[11px] font-mono truncate" style={{ color: 'var(--qms-text-muted)' }}>{roleType.code}</div>
              {roleType.description && (
                <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{roleType.description}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg" style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)' }}>
            <div>
              <div className="text-[12px] font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>{tenantLabel(roleType.tenant)}</div>
              <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Company</div>
            </div>
            <div>
              <div className="text-[12px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{roleType.permissions ? roleType.permissions.length : '—'}</div>
              <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Permissions</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default RoleTypesTable
