import { useEffect, useLayoutEffect, useRef, useCallback } from 'react'

// Flushes the latest value on unmount so a cancelled timer never drops the
// last keystroke; stop() lets a caller disarm that flush before clearDraft().
export function useDebouncedDraftSync<T>(value: T, active: boolean, setDraft: (v: T) => void, delayMs = 400) {
  const latestValue = useRef(value)
  const activeRef = useRef(active)
  const setDraftRef = useRef(setDraft)
  const stoppedRef = useRef(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // A LAYOUT effect, not a passive one — a render that changes `value` and
  // unmounts before paint could skip a passive mirror and flush a stale value.
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

  // Cleanup reads the refs' current values rather than closing over a stale
  // render — active starts false, so a closure would miss a later flip to true.
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
