import { useParams } from 'react-router-dom'
import RequireEmployeeAccess from '@/components/layouts/RequireEmployeeAccess'
import { usePermission } from '@/hooks/usePermission'
import { useEmployee } from '@/features/access-management/employee/hooks/useEmployee'
import { canManageEmployees } from '@/features/access-management/employee/employeeAccess'
import EditEmployeeEditor from '@/features/access-management/employee/components/EditEmployeeEditor'
import EmployeeStatusPill from '@/features/access-management/employee/components/EmployeeStatusPill'
import QueryStateBlock from '@/components/ui/QueryStateBlock'
import type { EmployeeEntity, EmployeePopulatedTenant, EmployeePopulatedUser } from '@/types/accessManagement.types'

// A Field Officer viewing their own record (own-scope, server-side) gets a read-only view here —
// only a manage-capable role gets the editable form.
const ReadOnlyEmployeeView = ({ employee }: { employee: EmployeeEntity }) => {
  const userValue = employee.user as EmployeePopulatedUser | string
  const tenantValue = employee.tenant as EmployeePopulatedTenant | string
  const userName = typeof userValue !== 'string' ? `${userValue.firstName} ${userValue.lastName ?? ''}`.trim() : undefined
  const tenantName = typeof tenantValue !== 'string' ? tenantValue.name : undefined

  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border p-5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="flex items-center gap-3 flex-wrap mb-4">
          <div className="min-w-0">
            <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
              {userName ?? employee.email}
            </div>
            <div className="text-[13px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
              {employee.email} · {employee.phone}
            </div>
            {tenantName && (
              <div className="text-[11px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
                Company: {tenantName}
              </div>
            )}
          </div>
          <EmployeeStatusPill status={employee.status} />
        </div>
        <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          Date of joining: {new Date(employee.doj).toLocaleDateString()}
        </div>
      </div>
    </div>
  )
}

const EmployeeDetailContent = () => {
  const { id } = useParams<{ id: string }>()
  const { session, permissions } = usePermission()
  const { data, isLoading, error, refetch } = useEmployee(id)
  const employee = data?.data ?? null

  return (
    <QueryStateBlock
      isLoading={isLoading}
      error={error}
      loadingLabel="Loading employee…"
      errorLabel="Failed to load employee. Please try again."
      onRetry={refetch}
    >
      {employee ? (
        canManageEmployees(session?.roleType.code, permissions) ? (
          <EditEmployeeEditor key={employee.id} employee={employee} />
        ) : (
          <ReadOnlyEmployeeView employee={employee} />
        )
      ) : (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Employee not found, or you don't have access to it.
        </div>
      )}
    </QueryStateBlock>
  )
}

const EmployeeDetailPage = () => (
  <RequireEmployeeAccess>
    <EmployeeDetailContent />
  </RequireEmployeeAccess>
)

export default EmployeeDetailPage
