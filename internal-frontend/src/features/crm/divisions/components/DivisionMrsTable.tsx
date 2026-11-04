import type { RoleEntity, RolePopulatedUser } from '@/types/accessManagement.types'
import RoleStatusPill from '@/features/access-management/role/components/RoleStatusPill'

// No click-through to the global Role editor (can't edit the MR's supervisor) — a row click opens
// a local summary drawer instead (onSelectMr).

interface DivisionMrsTableProps {
  mrs: RoleEntity[]
  onSelectMr?: (mr: RoleEntity) => void
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

function userPhone(user: RoleEntity['user']): string {
  if (typeof user === 'string') return '—'
  return (user as RolePopulatedUser)?.phone ?? '—'
}

const DivisionMrsTable = ({ mrs, onSelectMr }: DivisionMrsTableProps) => {
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
                Name
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Email
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Phone
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {mrs.map((mr) => (
              <tr
                key={mr.id}
                onClick={onSelectMr ? () => onSelectMr(mr) : undefined}
                className={onSelectMr ? 'cursor-pointer hover:bg-(--qms-surface-hover)' : undefined}
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                    {userName(mr.user)}
                  </div>
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {userEmail(mr.user) || '—'}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {userPhone(mr.user)}
                </td>
                <td className="px-4 py-2.5">
                  <RoleStatusPill status={mr.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mrs.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No MRs found.
        </div>
      )}
    </div>
  )
}

export default DivisionMrsTable
