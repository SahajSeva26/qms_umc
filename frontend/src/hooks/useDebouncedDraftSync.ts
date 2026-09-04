import { useEffect, useLayoutEffect, useRef, useCallback } from 'react'

// Debounces writes to `setDraft`, flushes the latest value synchronously on
// unmount (so a cancelled debounce timer never drops the last keystroke),
// and exposes stop() so a caller can disarm the flush BEFORE calling
// clearDraft() on submit success — otherwise the unmount cleanup (or an
// already-scheduled debounce timer) could fire after the clear and silently
// resurrect the just-cleared draft.
export function useDebouncedDraftSync<T>(value: T, active: boolean, setDraft: (v: T) => void, delayMs = 400) {
  const latestValue = useRef(value)
  const activeRef = useRef(active)
  const setDraftRef = useRef(setDraft)
  const stoppedRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Mirrored in a LAYOUT effect, not a passive one — passive effects run
  // asynchronously after commit, so a render that both changes `value` and
  // unmounts before the browser paints (e.g. a final keystroke immediately
  // followed by the wizard's onClose()) can skip the passive mirror entirely
  // and go straight to the unmount cleanup below, which would then flush the
  // PREVIOUS value instead of the final one. useLayoutEffect runs
  // synchronously during commit, before any subsequent unmount is
  // processed, so the refs are always current by the time cleanup can run.
  useLayoutEffect(() => {
    latestValue.current = value
    activeRef.current = active
    setDraftRef.current = setDraft
  })

  useEffect(() => {
    if (!active || stoppedRef.current) return
    timeoutRef.current = setTimeout(() => {
      // Re-check stoppedRef here too — stop() may run in the gap between
      // this timer being scheduled and it firing.
      if (!stoppedRef.current) setDraftRef.current(latestValue.current)
    }, delayMs)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [value, active, delayMs])

  // ONE unmount-only effect (registered once), whose cleanup reads the refs'
  // CURRENT values at flush time rather than closing over a stale render —
  // active starts false for a fresh/resumed form, so a []-deps cleanup that
  // captured that first-render value would never see it flip true later.
  useEffect(() => {
    return () => {
      if (activeRef.current && !stoppedRef.current) setDraftRef.current(latestValue.current)
    }
  }, [])

  return useCallback(() => {
    stoppedRef.current = true
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])
}
