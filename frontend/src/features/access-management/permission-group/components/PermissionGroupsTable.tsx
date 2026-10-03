import { useNavigate } from 'react-router-dom'
import type { PermissionGroupEntity } from '@/types/accessManagement.types'
import { PERMISSION_GROUP_ROUTES } from '@/features/access-management/permission-group/permission-group.routes'
import PermissionGroupStatusPill from '@/features/access-management/permission-group/components/PermissionGroupStatusPill'

interface PermissionGroupsTableProps {
  groups: PermissionGroupEntity[]
  // group.tenant is a raw ObjectId; caller resolves it to a name via this map, falling back to the raw id.
  tenantLabelById?: Map<string, string>
  // GET /permission-groups/:id requires permission-group:get — distinct from
  // permission-group:search/tenant:admin, which is enough to reach this list.
  canOpenDetail: boolean
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

const PermissionGroupsTable = ({ groups, tenantLabelById, canOpenDetail }: PermissionGroupsTableProps) => {
  const navigate = useNavigate()

  if (groups.length === 0) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border border-dashed" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        No permission groups found.
      </div>
    )
  }

  return (
    <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
      {groups.map((group) => (
        <div
          key={group.id}
          onClick={canOpenDetail ? () => navigate(PERMISSION_GROUP_ROUTES.PERMISSION_GROUP_DETAIL.replace(':id', group.id)) : undefined}
          onKeyDown={canOpenDetail ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(PERMISSION_GROUP_ROUTES.PERMISSION_GROUP_DETAIL.replace(':id', group.id)) } } : undefined}
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
              {initial(group.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <div className="font-bold text-[14px] truncate" style={{ color: 'var(--qms-text)' }}>{group.name}</div>
                <PermissionGroupStatusPill status={group.status} />
              </div>
              <div className="text-[11px] font-mono truncate" style={{ color: 'var(--qms-text-muted)' }}>{group.code}</div>
              {group.description && (
                <div className="text-[11px] truncate mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{group.description}</div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg" style={{ background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)' }}>
            <div>
              <div className="text-[12px] font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>{tenantLabelById?.get(group.tenant) ?? group.tenant}</div>
              <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Company</div>
            </div>
            <div>
              {/* permissions omitted server-side without system:manage/tenant:admin — show '—', not a false 0. */}
              <div className="text-[12px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{group.permissions ? group.permissions.length : '—'}</div>
              <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Permissions</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default PermissionGroupsTable
