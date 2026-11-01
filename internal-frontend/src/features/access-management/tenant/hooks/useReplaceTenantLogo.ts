import { useReplaceFile, type UseReplaceFileOptions } from '@/hooks/useReplaceFile'
export type { ReplaceLogoState, CleanupSubState, AbandonResult } from '@/hooks/useReplaceFile'

// Thin wrapper over useReplaceFile — tenant logo's tenantId and entityId happen to be the same
// value (the tenant IS the entity), passed twice. Same state machine as useReplaceProfilePicture.ts.
export type UseReplaceTenantLogoOptions = UseReplaceFileOptions

export function useReplaceTenantLogo(tenantId: string, oldLogoId: string | null, options?: UseReplaceTenantLogoOptions) {
  return useReplaceFile(tenantId, 'tenant', 'logo', tenantId, oldLogoId, options)
}
