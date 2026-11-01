import { useEffect, useState } from 'react'

// Delays reflecting `value` until it stops changing for `delayMs` — keystrokes in a search
// input wired to a query key don't each fire their own request.
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(timeout)
  }, [value, delayMs])

  return debounced
}
