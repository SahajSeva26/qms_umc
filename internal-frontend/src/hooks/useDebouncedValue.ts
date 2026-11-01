import { useEffect, useState } from 'react'

// Delays reflecting `value` until it's stopped changing for `delayMs` — for
// search/filter inputs wired straight into a query key, so each keystroke
// doesn't fire its own network request. Extracted from the inline
// setTimeout/clearTimeout pattern originally written for
// InternalMembersPicker.tsx's typeahead; use this instead of re-inlining it.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}
