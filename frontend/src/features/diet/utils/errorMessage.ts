/**
 * Message to show the user when a Diet mutation or upload fails.
 *
 * Prefers the thrown error's own message, because the Diet services throw
 * actionable ones (StorageWriteError: "Local storage is full…",
 * DocumentTooLargeError: "That file is 4.2 MB…"). Falls back to the caller's
 * generic sentence for anything unexpected.
 *
 * When the backend lands, this is the single place to start unwrapping the
 * API's error envelope instead of reading `Error.message`.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}
