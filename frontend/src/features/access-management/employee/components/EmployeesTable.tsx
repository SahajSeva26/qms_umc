import { useNavigate } from 'react-router-dom'
import type { EmployeeEntity, EmployeePopulatedTenant, EmployeePopulatedUser } from '@/types/accessManagement.types'
import { EMPLOYEE_ROUTES } from '@/features/access-management/employee/employee.routes'
import EmployeeStatusPill from '@/features/access-management/employee/components/EmployeeStatusPill'

// Hand-built table matching RolesTable.tsx exactly: var(--qms-*) custom
// properties, no shadcn Table, row-click navigates to the detail route.

interface EmployeesTableProps {
  employees: EmployeeEntity[]
}

function userName(employee: EmployeeEntity): string {
  const { profile, user } = employee
  if (profile?.firstName) return `${profile.firstName} ${profile.lastName ?? ''}`.trim()
  if (typeof user === 'string') return '—'
  const u = user as EmployeePopulatedUser
  if (!u?.firstName) return '—'
  return `${u.firstName} ${u.lastName ?? ''}`.trim()
}

function tenantLabel(tenant: EmployeeEntity['tenant']): string {
  if (typeof tenant === 'string') return '—'
  return (tenant as EmployeePopulatedTenant)?.name ?? '—'
}

const TYPE_LABEL: Record<string, string> = {
  'field-officer': 'Field Officer',
}

const EmployeesTable = ({ employees }: EmployeesTableProps) => {
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
                Name
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Company
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Type
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Date of Joining
              </th>
              <th className="text-left font-bold text-[11px] uppercase tracking-wider px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((employee) => (
              <tr
                key={employee.id}
                onClick={() => navigate(EMPLOYEE_ROUTES.EMPLOYEE_DETAIL.replace(':id', employee.id))}
                className="cursor-pointer transition-colors hover:bg-(--qms-surface-hover)"
                style={{ borderBottom: '1px solid var(--qms-border)' }}
              >
                <td className="px-4 py-2.5">
                  <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                    {userName(employee)}
                  </div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                    {employee.email}
                  </div>
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {tenantLabel(employee.tenant)}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text)' }}>
                  {TYPE_LABEL[employee.type] ?? employee.type}
                </td>
                <td className="px-4 py-2.5" style={{ color: 'var(--qms-text-muted)' }}>
                  {new Date(employee.doj).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5">
                  <EmployeeStatusPill status={employee.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {employees.length === 0 && (
        <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          No employees found.
        </div>
      )}
    </div>
  )
}

export default EmployeesTable
