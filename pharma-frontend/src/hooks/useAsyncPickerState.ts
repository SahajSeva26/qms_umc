import { useEffect, useRef, useState } from 'react'

// Shared open/close + click-outside-to-close mechanics for a search-as-you-type dropdown —
// query state and item rendering stay with each caller, which differ too much to share.
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
