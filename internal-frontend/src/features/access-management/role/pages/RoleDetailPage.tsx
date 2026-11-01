import { useParams } from 'react-router-dom'
import { useRole } from '@/features/access-management/role/hooks/useRole'
import EditRoleEditor from '@/features/access-management/role/components/EditRoleEditor'

// Create happens via CreateRoleModal — this page is edit-only, always reached with a real :id.
const RoleDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useRole(id)
  const role = data?.data ?? null

  if (isLoading) {
    return (
      <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
        Loading role…
      </div>
    )
  }

  if (role) return <EditRoleEditor key={role.id} role={role} />

  return (
    <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
      Failed to load role. Please try again.
    </div>
  )
}

export default RoleDetailPage
