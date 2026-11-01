import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiBriefcase, FiShield, FiLayers, FiKey, FiUsers } from 'react-icons/fi'
import { usePermission } from '@/hooks/usePermission'
import AdminPageShell, { type AdminPageTab } from '@/features/admin/components/AdminPageShell'
import PharmaClientsTab from '@/features/admin/components/PharmaClientsTab'
import RolesListPage from '@/features/access-management/role/pages/RolesListPage'
import RoleTypesListPage from '@/features/access-management/role-type/pages/RoleTypesListPage'
import PermissionGroupsListPage from '@/features/access-management/permission-group/pages/PermissionGroupsListPage'
import UsersPage from '@/features/admin/pages/UsersPage'

type AdminView = 'clients' | 'roles' | 'roleTypes' | 'permissionGroups' | 'users'

// Gated on each tab's own SEARCH permission, since each page calls search unconditionally on load
// and /admin itself has no route-level permission guard.
const CLIENTS_VIEW_PERMISSIONS = ['tenant:search', 'tenant:manage']
const ROLES_VIEW_PERMISSIONS = ['tenant:admin', 'tenant:manage', 'role:search']
const ROLE_TYPES_VIEW_PERMISSIONS = ['tenant:manage', 'tenant:admin']
const PERMISSION_GROUPS_VIEW_PERMISSIONS = ['permission-group:search', 'tenant:admin']
const USERS_VIEW_PERMISSIONS = ['user:search']

const AdminPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const { hasAnyPermission } = usePermission()

  const canViewClients = hasAnyPermission(CLIENTS_VIEW_PERMISSIONS)
  const canViewRoles = hasAnyPermission(ROLES_VIEW_PERMISSIONS)
  const canViewRoleTypes = hasAnyPermission(ROLE_TYPES_VIEW_PERMISSIONS)
  const canViewPermissionGroups = hasAnyPermission(PERMISSION_GROUPS_VIEW_PERMISSIONS)
  const canViewUsers = hasAnyPermission(USERS_VIEW_PERMISSIONS)

  const tabs = useMemo<AdminPageTab[]>(() => [
    ...(canViewClients ? [{ view: 'clients' as const, label: 'Pharma Clients', icon: FiBriefcase }] : []),
    ...(canViewRoles ? [{ view: 'roles' as const, label: 'Roles', icon: FiShield }] : []),
    ...(canViewRoleTypes ? [{ view: 'roleTypes' as const, label: 'Role Types', icon: FiLayers }] : []),
    ...(canViewPermissionGroups ? [{ view: 'permissionGroups' as const, label: 'Permission Groups', icon: FiKey }] : []),
    ...(canViewUsers ? [{ view: 'users' as const, label: 'Users', icon: FiUsers }] : []),
  ], [canViewClients, canViewRoles, canViewRoleTypes, canViewPermissionGroups, canViewUsers])

  const requestedView = searchParams.get('view') as AdminView | null
  // AdminPageTab.view is a plain string (shared shell), but every `tabs` entry was built from a literal AdminView.
  const view: AdminView | undefined =
    requestedView && tabs.some((t) => t.view === requestedView) ? requestedView : (tabs[0]?.view as AdminView | undefined)

  const setView = (next: string) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('view', next)
      return params
    }, { replace: true })
  }

  if (!view) {
    return (
      <div className="px-4 py-10 text-center text-[13px] rounded-xl border border-dashed" style={{ color: 'var(--qms-text-muted)', borderColor: 'var(--qms-border)' }}>
        You don't have permission to view any section of this page.
      </div>
    )
  }

  return (
    <AdminPageShell tabs={tabs} activeView={view} onViewChange={setView}>
      {view === 'clients' && <PharmaClientsTab />}
      {view === 'roles' && canViewRoles && <RolesListPage />}
      {view === 'roleTypes' && canViewRoleTypes && <RoleTypesListPage />}
      {view === 'permissionGroups' && canViewPermissionGroups && <PermissionGroupsListPage />}
      {view === 'users' && canViewUsers && <UsersPage />}
    </AdminPageShell>
  )
}

export default AdminPage
