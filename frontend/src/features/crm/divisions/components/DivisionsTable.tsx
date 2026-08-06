import type { DivisionEntity } from '@/types/crm.types'
import { DIVISION_THERAPY_LABEL } from '@/types/crm.types'

// Hand-built table matching RoleTypesTable.tsx / PermissionGroupsTable.tsx
// exactly: var(--qms-*) custom properties, no shadcn Table, inline empty
// state. Rows navigate to DivisionDetailPage on click (same as RolesTable's
// own row-click pattern) — creation still stays a modal (CreateDivisionModal,
// "for creating we will have modal" scope), only editing moved to a page.

function ownerName(owner: DivisionEntity['owner']): string | null {
  if (!owner || typeof owner === 'string') return null
  if (!owner.user) return null
  return [owner.user.firstName, owner.user.lastName].filter(Boolean).join(' ')
}

function tenantName(tenant: DivisionEntity['tenant']): string | null {
  if (!tenant || typeof tenant === 'string') return null
  return tenant.name
}

interface DivisionsTableProps {
  divisions: DivisionEntity[]
  onRowClick: (division: DivisionEntity) => void
}

const DivisionsTable = ({ divisions, onRowClick }: DivisionsTableProps) => {
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
                Therapy
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Tenant
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Head
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {divisions.map((division) => (
              <tr
                key={division.id}
                onClick={() => onRowClick(division)}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <span className="font-semibold font-mono" style={{ color: 'var(--qms-text)' }}>
                    {division.code}
                  </span>
                </td>
                <td className="px-4 py-2.5 font-semibold" style={{ color: 'var(--qms-text)' }}>
                  {division.name}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {DIVISION_THERAPY_LABEL[division.therapy]}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {tenantName(division.tenant) ?? '—'}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {ownerName(division.owner) ?? '—'}
                </td>
                <td className="px-4 py-2.5">
                  {division.status ? (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${division.status === 'active' ? 'bg-success-soft text-success' : ''}`}
                      style={division.status !== 'active' ? { background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' } : undefined}
                    >
                      {division.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--qms-text-muted)' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {divisions.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No divisions found.
        </div>
      )}
    </div>
  )
}

export default DivisionsTable
