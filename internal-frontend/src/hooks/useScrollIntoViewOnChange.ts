import { useEffect, useRef } from 'react'

// Scrolls the returned ref's element into view whenever `trigger` becomes
// truthy — for form-error banners that can render far from the field the
// user is currently looking at (e.g. a validation message at the bottom of
// a long page or a scrollable dialog body), so a rejected submit is always
// visible instead of looking like the button silently did nothing.
export function useScrollIntoViewOnChange<T extends HTMLElement>(trigger: unknown) {
  const ref = useRef<T>(null)

  useEffect(() => {
    if (trigger) {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [trigger])

  return ref
}
