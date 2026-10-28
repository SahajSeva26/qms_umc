import type { RefObject } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import Sidebar from '@/components/layouts/Sidebar'

interface MobileNavDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  finalFocusRef: RefObject<HTMLButtonElement | null>
  id: string
}

// Split out of AppLayout so @base-ui/react/dialog is only ever fetched once the hamburger is
// actually pressed, not on every page's initial load — see the main-bundle-size P1 finding.
// Same DialogPrimitive SideDrawer.tsx uses: focus trap, Escape-to-close and finalFocus come from
// base-ui itself.
const MobileNavDrawer = ({ open, onOpenChange, finalFocusRef, id }: MobileNavDrawerProps) => (
  <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
      <DialogPrimitive.Popup
        id={id}
        finalFocus={finalFocusRef}
        aria-label="Navigation"
        className="fixed inset-y-0 left-0 z-50 lg:hidden outline-none duration-150 data-open:animate-in data-open:slide-in-from-left data-closed:animate-out data-closed:slide-out-to-left"
      >
        <Sidebar />
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
)

export default MobileNavDrawer
