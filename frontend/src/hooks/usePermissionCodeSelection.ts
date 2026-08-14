import { useCallback, useState } from 'react'

// setSelection/toggleCode are wrapped in useCallback for a stable identity,
// so callers can list them in an effect's dependency array without causing
// an extra re-run, and so memoized child components aren't defeated.
export function usePermissionCodeSelection(initial: string[] = []) {
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set(initial))

  const setSelection = useCallback((codes: string[]) => setSelectedCodes(new Set(codes)), [])

  const toggleCode = useCallback((code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }, [])

  return { selectedCodes, setSelectedCodes, setSelection, toggleCode }
}
