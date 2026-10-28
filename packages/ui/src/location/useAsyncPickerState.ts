import { useEffect, useRef, useState } from 'react'

// Shared open/close + click-outside mechanics for a dropdown picker — query/fetch/render logic
// stays with each caller, since pickers differ too much there to share honestly.
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
