import { useReplaceFile, type UseReplaceFileOptions } from '@/hooks/useReplaceFile'

// Thin wrapper over useReplaceFile for a user's own profile picture. Unlike tenant logo, tenantId
// and entityId are genuinely different here — entityId is the user's own id, tenantId their tenant's.
export function useReplaceProfilePicture(
  tenantId: string,
  userId: string,
  oldFileId: string | null,
  options?: UseReplaceFileOptions,
) {
  return useReplaceFile(tenantId, 'user', 'profile_picture', userId, oldFileId, options)
}
