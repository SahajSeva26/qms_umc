import type { ReactNode } from 'react'
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { FiX } from 'react-icons/fi'

interface SideDrawerProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Tailwind max-width class for the panel — defaults to the standard drawer width. */
  widthClassName?: string
}

// Right-side slide-in panel built on the base-ui Dialog primitive —
// portal, backdrop, focus trap, ESC-to-close and aria-modal come for free.
const SideDrawer = ({ open, title, onClose, children, widthClassName = 'max-w-md' }: SideDrawerProps) => (
  <DialogPrimitive.Root open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/40 supports-backdrop-filter:backdrop-blur-sm duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
      <DialogPrimitive.Popup
        className={`fixed inset-y-0 right-0 z-50 w-full ${widthClassName} flex flex-col shadow-2xl outline-none duration-150 data-open:animate-in data-open:slide-in-from-right data-closed:animate-out data-closed:slide-out-to-right`}
        style={{ background: 'var(--qms-surface-card)', borderLeft: '1px solid var(--qms-border)' }}
      >
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--qms-border)' }}
        >
          <DialogPrimitive.Title className="text-sm font-bold" style={{ color: 'var(--qms-text)' }}>
            {title}
          </DialogPrimitive.Title>
          <DialogPrimitive.Close
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-(--qms-surface-hover)"
            style={{ color: 'var(--qms-text-muted)' }}
            aria-label="Close"
          >
            <FiX size={16} />
          </DialogPrimitive.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
)

export default SideDrawer
