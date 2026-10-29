import { lazy, Suspense, useRef, useState, type RefObject } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiChevronDown, FiMenu, FiX } from 'react-icons/fi'
import { NotificationBellTrigger, useNotificationBellState } from '@qms/widgets'
import { useSession } from '@/hooks/useSession'
import { useSignOut } from '@/features/auth/useSignOut'
import ThemeToggle from '@/components/ui/ThemeToggle'
import api from '@/lib/api/api'
import { resolveNotificationEntity } from '@/features/notifications/notifications.entityResolver'

// Lazy: @base-ui/react/popover only needs to be fetched once the account button is actually
// pressed, not on every page's initial load (it was previously eager here, adding to the
// always-shipped shell for a menu most visits never open). Same reasoning applies to the
// notification popover (pulls in @base-ui/react/dialog + /popover for its own feed/drawer) —
// NotificationBellTrigger (the icon + badge) stays eager via @qms/widgets' own barrel since it has
// no @base-ui dependency; only the popover half is lazy, imported by its own direct subpath, NOT
// through @qms/widgets' eager barrel (see that package's index.ts for why a barrel re-export would
// defeat this chunk isolation even behind React.lazy).
const AccountMenu = lazy(() => import('@/components/layouts/AccountMenu'))
const NotificationBellPopover = lazy(() => import('@qms/widgets/notifications/NotificationBellPopover'))

interface TopbarProps {
  mobileMenuOpen: boolean
  onMobileMenuToggle: () => void
  /** AppLayout's DialogPrimitive.Popup uses this as its `finalFocus` target — returning focus
   * here on close, since the drawer's trigger lives outside the Dialog's own component tree. */
  mobileMenuToggleRef: RefObject<HTMLButtonElement | null>
  mobileSidebarId: string
}

function getInitials(firstName?: string, lastName?: string): string {
  return [(firstName?.[0] ?? ''), (lastName?.[0] ?? '')].join('').toUpperCase() || 'U'
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// Trimmed port of internal-frontend's Topbar — no global search/AI Copilot/notifications/
// quick-switch (notifications are a separate, not-yet-migrated milestone; quick-switch is
// internal-only dev tooling). Theme toggle IS restored below — pharma-frontend genuinely has its
// own themeStore (initialized before mount in main.tsx) and the shared theme.css's .dark variant;
// an earlier version of this comment claimed otherwise, which was simply wrong. Sign-out itself is
// owned by useSignOut (features/auth) — this component stays purely presentational, no transport.
const Topbar = ({ mobileMenuOpen, onMobileMenuToggle, mobileMenuToggleRef, mobileSidebarId }: TopbarProps) => {
  const { session, hasAnyPermission } = useSession()
  const navigate = useNavigate()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  // Deferred mount, same pattern as AppLayout's mobile drawer: fetch the popover's lazy chunk
  // only on first open, but keep it mounted afterward so base-ui's own close animation can play.
  const [accountMenuMounted, setAccountMenuMounted] = useState(false)
  const accountTriggerRef = useRef<HTMLButtonElement>(null)
  const { signOut, isPending, error } = useSignOut()

  // Same deferred-mount pattern as the account menu — NotificationBellTrigger (icon+badge) is
  // always eager; NotificationBellPopover (the actual feed/drawer) only mounts on first click.
  // State machine shared with internal-frontend's Topbar via @qms/widgets, so the two can't drift.
  const {
    open: notificationsOpen,
    setOpen: setNotificationsOpen,
    popoverMounted: notificationsPopoverMounted,
    drawerOpen: notificationsDrawerOpen,
    setDrawerOpen: setNotificationsDrawerOpen,
    triggerRef: notificationTriggerRef,
    toggle: toggleNotifications,
  } = useNotificationBellState()

  const user = session?.user
  const initials = getInitials(user?.firstName, user?.lastName)
  const firstName = user?.firstName ?? 'there'
  const roleLabel = session?.roleType?.name ?? ''

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3.5 px-6 py-3.5 backdrop-blur-xl"
      style={{ background: 'var(--qms-surface)', borderBottom: '1px solid var(--qms-border)' }}
    >
      <button
        ref={mobileMenuToggleRef}
        onClick={onMobileMenuToggle}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-all shrink-0"
        style={{ color: 'var(--qms-text-muted)' }}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={mobileMenuOpen}
        aria-controls={mobileSidebarId}
      >
        {mobileMenuOpen ? <FiX size={18} /> : <FiMenu size={18} />}
      </button>

      <div className="flex flex-col leading-tight min-w-0">
        <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>
          {getGreeting()}, {firstName}
        </span>
        {roleLabel && (
          <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{roleLabel}</span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        <NotificationBellTrigger
          ref={notificationTriggerRef}
          api={api}
          open={notificationsOpen}
          onClick={toggleNotifications}
        />
        {notificationsPopoverMounted && (
          <Suspense
            // Rendered only while notificationsOpen is true — NOT merely while
            // notificationsPopoverMounted is true. A click→click-again (open, then close before
            // the lazy chunk resolves) must not leave this loading shell stuck on screen after the
            // user has already closed the bell.
            fallback={
              notificationsOpen ? (
                // A real popover-shaped shell, not a blank gap — the trigger above stays fully
                // responsive while this chunk loads; this is only ever shown for the brief window
                // between the first click and the lazy chunk resolving, and only if still open.
                <div
                  className="fixed z-50 w-80 rounded-xl border shadow-xl p-3 text-[12px] text-center"
                  style={{
                    borderColor: 'var(--qms-border)',
                    backgroundColor: 'var(--popover)',
                    color: 'var(--qms-text-muted)',
                    top: (notificationTriggerRef.current?.getBoundingClientRect().bottom ?? 0) + 8,
                    right: window.innerWidth - (notificationTriggerRef.current?.getBoundingClientRect().right ?? 0),
                  }}
                >
                  Loading…
                </div>
              ) : null
            }
          >
            <NotificationBellPopover
              api={api}
              open={notificationsOpen}
              onOpenChange={setNotificationsOpen}
              anchor={notificationTriggerRef.current}
              resolveEntity={resolveNotificationEntity}
              roleTypeCode={session?.roleType?.code}
              hasAnyPermission={hasAnyPermission}
              onNavigate={(href) => navigate(href)}
              drawerOpen={notificationsDrawerOpen}
              onDrawerOpenChange={setNotificationsDrawerOpen}
            />
          </Suspense>
        )}

        {/* This is profile info plus one action, not a real multi-item menu, so the
            lazily-mounted AccountMenu below is a non-modal Popover (role="dialog",
            Escape-to-close via base-ui) rather than a hand-rolled role="menu". Non-modal means it
            is dismissable but NOT a focus trap — fine here since it's one action, not content the
            user must finish interacting with before leaving. */}
        <button
          ref={accountTriggerRef}
          onClick={() => {
            setAccountMenuMounted(true)
            setUserMenuOpen((v) => !v)
          }}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border transition-all"
          style={{ borderColor: 'var(--qms-border)', backgroundColor: 'var(--qms-surface-strong)' }}
          aria-haspopup="dialog"
          aria-expanded={userMenuOpen}
          aria-label={userMenuOpen ? 'Close account menu' : 'Open account menu'}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: 'var(--qms-brand)' }}
          >
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-[13px] font-semibold leading-none" style={{ color: 'var(--qms-text)' }}>
              {user ? `${user.firstName} ${user.lastName}` : '—'}
            </div>
          </div>
          <FiChevronDown size={13} style={{ color: 'var(--qms-text-muted)' }} />
        </button>
      </div>

      {accountMenuMounted && (
        <Suspense fallback={null}>
          <AccountMenu
            open={userMenuOpen}
            onOpenChange={setUserMenuOpen}
            anchor={accountTriggerRef.current}
            name={user ? `${user.firstName} ${user.lastName}` : '—'}
            email={user?.email}
            onSignOut={signOut}
            isPending={isPending}
            error={error}
          />
        </Suspense>
      )}
    </header>
  )
}

export default Topbar
