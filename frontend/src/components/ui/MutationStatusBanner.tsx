import type { UseMutationResult } from '@tanstack/react-query'

interface MutationStatusBannerProps {
  mutation: Pick<UseMutationResult<unknown, unknown, unknown, unknown>, 'isError' | 'isSuccess' | 'error'>
  errorFallback?: string
  successMessage?: string
  /** Suppress the success banner (e.g. create-mode pages that navigate away on success instead). */
  showSuccess?: boolean
}

// Recurring error/success banner pair after a create/update mutation across
// the access-management detail pages — including the axios error-response
// message extraction, which was previously copy-pasted at each call site.
const MutationStatusBanner = ({
  mutation,
  errorFallback = 'Failed to save changes.',
  successMessage = 'Saved.',
  showSuccess = true,
}: MutationStatusBannerProps) => (
  <>
    {mutation.isError && (
      <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
        {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message || errorFallback}
      </div>
    )}
    {mutation.isSuccess && showSuccess && (
      <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success mt-4">{successMessage}</div>
    )}
  </>
)

export default MutationStatusBanner
