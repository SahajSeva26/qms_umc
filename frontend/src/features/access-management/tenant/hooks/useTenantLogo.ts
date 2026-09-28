import { useQuery, type QueryKey } from '@tanstack/react-query'
import { fileService } from '@/lib/file/file.service'

// Resolves a tenant's currently-active logo file. A direct useQuery (not useEntityQuery, whose
// staleTime default of 5min is wrong for a short-lived, single-use presigned S3 url). Two calls:
// search finds the active file's id, getFile(id) returns the actual url (search never does).
export const tenantLogoKeys = {
  detail: (tenantId: string): QueryKey => ['tenants', 'logo', tenantId],
}

export interface TenantLogoResult {
  fileId: string | null
  url: string | null
}

async function fetchTenantLogo(tenantId: string): Promise<TenantLogoResult> {
  const searchRes = await fileService.searchFiles({
    entityType: 'tenant',
    relation: 'logo',
    entityId: tenantId,
    status: 'active',
  })
  const found = searchRes.data?.items?.[0]
  if (!found) return { fileId: null, url: null }

  const getRes = await fileService.getFile(found.id)
  return { fileId: found.id, url: getRes.data?.url ?? null }
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
