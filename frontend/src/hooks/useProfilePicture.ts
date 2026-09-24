import { useQuery, type QueryKey } from '@tanstack/react-query'
import { fileService } from '@/lib/file/file.service'

// Resolves a user's currently-active profile picture. Mirrors useTenantLogo.ts: a direct useQuery
// (not useEntityQuery, whose inherited 5min staleTime is wrong for a short-lived presigned S3 url).
export const profilePictureKeys = {
  detail: (userId: string): QueryKey => ['users', 'profile-picture', userId],
}

export interface ProfilePictureResult {
  fileId: string | null
  url: string | null
}

async function fetchProfilePicture(userId: string): Promise<ProfilePictureResult> {
  const searchRes = await fileService.searchFiles({
    entityType: 'user',
    relation: 'profile_picture',
    entityId: userId,
    status: 'active',
  })
  const found = searchRes.data?.items?.[0]
  if (!found) return { fileId: null, url: null }

  const getRes = await fileService.getFile(found.id)
  return { fileId: found.id, url: getRes.data?.url ?? null }
}

export function useProfilePicture(userId: string) {
  const query = useQuery({
    queryKey: profilePictureKeys.detail(userId),
    queryFn: () => fetchProfilePicture(userId),
    enabled: !!userId,
    staleTime: 0,
    refetchOnMount: 'always',
  })

  return {
    fileId: query.data?.fileId ?? null,
    url: query.data?.url ?? null,
    // Kept distinct from a bare null — a caller must not proceed as if no picture exists while this
    // is still loading/erroring, or it could violate the relation's cap-of-1 against an undetected one.
    isLoading: query.isLoading,
    isError: query.isError,
    // True during ANY fetch, including a background refetch — callers must gate mutations on this
    // too, or risk acting on a stale cached fileId/url.
    isFetching: query.isFetching,
    refetch: () => { void query.refetch() },
  }
}
