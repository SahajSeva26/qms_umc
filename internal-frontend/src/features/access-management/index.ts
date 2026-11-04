// Narrow public read surface for cross-feature consumers. Keep mutation and editor
// internals feature-owned.
export { useRoles } from '@/features/access-management/role/hooks/useRoles'
export { useRole } from '@/features/access-management/role/hooks/useRole'
export { useRoleTypes } from '@/features/access-management/role-type/hooks/useRoleTypes'

