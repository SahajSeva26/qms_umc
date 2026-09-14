import type { RoleEntity, RolePopulatedUser } from '@/types/accessManagement.types'
import RoleStatusPill from '@/features/access-management/role/components/RoleStatusPill'

// Deliberately no click-through to the global Role editor — its "back"
// returns to Roles, not this Division, and it can't edit the MR's supervisor.

interface DivisionMrsTableProps {
  mrs: RoleEntity[]
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

const DivisionMrsTable = ({ mrs }: DivisionMrsTableProps) => {
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
              <tr key={mr.id} style={{ borderBottom: '1px solid var(--qms-border)' }}>
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
