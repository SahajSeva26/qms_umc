// Public surface of the Tenant feature — other features import from here, never from
// features/access-management/tenant/{hooks,components}/* directly.
export { useTenants } from '@/features/access-management/tenant/hooks/useTenants'
export { TENANT_ROUTES } from '@/features/access-management/tenant/tenant.routes'
export { default as CreateTenantDialog } from '@/features/access-management/tenant/components/CreateTenantDialog'
