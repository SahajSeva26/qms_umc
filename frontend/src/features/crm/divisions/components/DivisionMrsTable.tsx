import type { RoleEntity, RolePopulatedUser } from '@/types/accessManagement.types'
import RoleStatusPill from '@/features/access-management/role/components/RoleStatusPill'

// Trimmed columns vs. RolesTable.tsx (Code/Company/Role Type omitted — tenant,
// division, and role type are already fixed/implied by being on this page).
//
// Deliberately no click-through to /admin/roles/:id (the global Role editor):
// that page's "back" always returns to Roles, not this Division; it exposes
// broad role-management fields irrelevant to just viewing MRs here; and it
// can't even edit the MR's division/ASM supervisor despite being the reason
// you'd manage an MR from a Division context. Rows are plain, read-only text
// until a dedicated "Manage MR" action (a Division-context drawer/modal with
// only account-status/supervisor fields) is built.

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
