import { useQuery, type QueryKey } from '@tanstack/react-query'
import { accessManagementService } from '@/features/access-management/accessManagement.service'

// Direct useQuery, not useEntityQuery — its 5min staleTime default is wrong for a short-lived,
// single-use presigned S3 url returned by GET /tenants/:id/logo.
export const tenantLogoKeys = {
  detail: (tenantId: string): QueryKey => ['tenants', 'logo', tenantId],
}

export interface TenantLogoResult {
  fileId: string | null
  url: string | null
}

async function fetchTenantLogo(tenantId: string): Promise<TenantLogoResult> {
  const res = await accessManagementService.getTenantLogo(tenantId)
  const found = res.data?.items?.[0]
  if (!found) return { fileId: null, url: null }
  return { fileId: found.id, url: found.url ?? null }
}

export function useTenantLogo(tenantId: string) {
  const query = useQuery({
    queryKey: tenantLogoKeys.detail(tenantId),
    queryFn: () => fetchTenantLogo(tenantId),
    enabled: !!tenantId,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  return {
    fileId: query.data?.fileId ?? null,
    url: query.data?.url ?? null,
    // Kept distinct from a bare null — a caller must not proceed as if no logo exists while this
    // is still loading/erroring, or it could violate the tenant's cap-of-1 against an undetected one.
    isLoading: query.isLoading,
    isError: query.isError,
    // True during ANY fetch, including a background refetch — callers must gate mutations on this
    // too, or risk acting on a stale cached fileId/url.
    isFetching: query.isFetching,
    refetch: () => { void query.refetch() },
  }
}
