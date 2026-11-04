import { useEffect, useRef, useState } from 'react'

// Shared open/close + click-outside-to-close mechanics for a search-as-you-
// type dropdown picker. Query state, fetching, and item rendering stay with
// each caller — pickers differ too much there (single vs. multi-select,
// free-text vs. scoped-list) to share honestly.
export function useAsyncPickerState() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return { open, setOpen, containerRef }
}
