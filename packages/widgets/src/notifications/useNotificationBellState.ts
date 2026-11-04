import { useRef, useState } from 'react'

// The open/mounted/drawer/ref state machine shared by every app's Topbar — extracted here so the
// two copies (internal-frontend, pharma-frontend) can't drift. NotificationBellTrigger (icon +
// badge) stays always-mounted; NotificationBellPopover only mounts on first click (`popoverMounted`)
// and only stays rendered-with-content while `open` is still true by the time its lazy chunk
// resolves — a click→click-again before that resolves must not leave a loading shell stuck on
// screen (see the Suspense fallback guidance on `open` in each Topbar).
export function useNotificationBellState() {
  const [open, setOpen] = useState(false)
  const [popoverMounted, setPopoverMounted] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const toggle = () => {
    setPopoverMounted(true)
    setOpen((v) => !v)
  }

  return {
    open,
    setOpen,
    popoverMounted,
    drawerOpen,
    setDrawerOpen,
    triggerRef,
    toggle,
  }
}
