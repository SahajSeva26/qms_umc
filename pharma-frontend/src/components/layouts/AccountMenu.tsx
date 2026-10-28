import { Popover as PopoverPrimitive } from '@base-ui/react/popover'
import { FiLogOut } from 'react-icons/fi'

interface AccountMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  anchor: HTMLElement | null
  name: string
  email?: string
  onSignOut: () => void
  isPending: boolean
  error: string | null
}

// Split out of Topbar so @base-ui/react/popover is only fetched once the account button is
// actually pressed, not on every page's initial load — see the main-bundle-size P1 finding.
// This is profile info plus one action, not a real multi-item menu — a non-modal Popover (which
// already gives role="dialog" + Escape-to-close via base-ui) is a more truthful fit than a
// hand-rolled role="menu" with no arrow-key navigation. It is NOT a focus trap — base-ui's
// Popover is non-modal by default, which is fine here since it's dismissable and not blocking.
const AccountMenu = ({ open, onOpenChange, anchor, name, email, onSignOut, isPending, error }: AccountMenuProps) => (
  <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Positioner anchor={anchor} side="bottom" align="end" sideOffset={8}>
        <PopoverPrimitive.Popup
          aria-label="Account"
          className="w-52 rounded-xl border shadow-xl backdrop-blur-xl overflow-hidden outline-none duration-100 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"
          style={{ borderColor: 'var(--qms-border)', backgroundColor: 'var(--popover)' }}
        >
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
            <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{name}</div>
            <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{email}</div>
          </div>
          <div className="py-1">
            <button
              onClick={onSignOut}
              disabled={isPending}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-all hover:bg-danger-soft disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ color: 'var(--danger)' }}
            >
              <FiLogOut size={14} />
              {isPending ? 'Signing out…' : 'Sign out'}
            </button>
            {error && (
              <p className="px-4 pb-2.5 text-[11px]" style={{ color: 'var(--danger)' }} role="alert">
                {error}
              </p>
            )}
          </div>
        </PopoverPrimitive.Popup>
      </PopoverPrimitive.Positioner>
    </PopoverPrimitive.Portal>
  </PopoverPrimitive.Root>
)

export default AccountMenu
