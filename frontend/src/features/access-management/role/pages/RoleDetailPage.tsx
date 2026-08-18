import { useParams } from 'react-router-dom'
import { useRole } from '@/features/access-management/role/hooks/useRole'
import CreateRoleEditor from '@/features/access-management/role/components/CreateRoleEditor'
import EditRoleEditor from '@/features/access-management/role/components/EditRoleEditor'

const RoleDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading } = useRole(id)
  const role = data?.data ?? null

  if (!id) return <CreateRoleEditor />

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
