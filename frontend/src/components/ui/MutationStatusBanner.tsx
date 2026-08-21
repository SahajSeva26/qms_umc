import type { UseMutationResult } from '@tanstack/react-query'

interface MutationStatusBannerProps {
  mutation: Pick<UseMutationResult<unknown, unknown, unknown, unknown>, 'isError' | 'isSuccess' | 'error'>
  errorFallback?: string
  successMessage?: string
  /** Suppress the success banner (e.g. create-mode pages that navigate away on success instead). */
  showSuccess?: boolean
}

// A concurrent double-submit can surface a raw MongoDB driver error instead
// of a friendly message — detected generically since any module with a unique index can hit this race, not just one.
const isRawDuplicateKeyError = (message: string) => /E11000 duplicate key error/i.test(message)

const MutationStatusBanner = ({
  mutation,
  errorFallback = 'Failed to save changes.',
  successMessage = 'Saved.',
  showSuccess = true,
}: MutationStatusBannerProps) => {
  const rawMessage = (mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message
  const displayMessage = rawMessage && !isRawDuplicateKeyError(rawMessage) ? rawMessage : errorFallback

  return (
    <>
      {mutation.isError && (
        <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger mt-4">
          {displayMessage}
        </div>
      )}
      {mutation.isSuccess && showSuccess && (
        <div className="text-xs rounded-xl px-3 py-2 bg-success-soft text-success mt-4">{successMessage}</div>
      )}
    </>
  )
}

export default MutationStatusBanner
