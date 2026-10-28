import { useEffect, useState } from 'react'
import { FiChevronDown, FiLogOut, FiMenu, FiX } from 'react-icons/fi'
import { useSession } from '@/hooks/useSession'
import { useSignOut } from '@/features/auth/useSignOut'

interface TopbarProps {
  mobileMenuOpen: boolean
  onMobileMenuToggle: () => void
  mobileMenuToggleId: string
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
// quick-switch/theme-toggle (pharma-frontend has no themeStore and the shared theme.css has no
// dark-mode variant at all, so a toggle here would have nothing to switch to). Sign-out itself is
// owned by useSignOut (features/auth) — this component stays purely presentational, no transport.
const Topbar = ({ mobileMenuOpen, onMobileMenuToggle, mobileMenuToggleId, mobileSidebarId }: TopbarProps) => {
  const { session } = useSession()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const { signOut, isPending, error } = useSignOut()

  const user = session?.user
  const initials = getInitials(user?.firstName, user?.lastName)
  const firstName = user?.firstName ?? 'there'
  const roleLabel = session?.roleType?.name ?? ''

  // Escape closes the user menu from anywhere, matching native menu/dialog behavior.
  useEffect(() => {
    if (!userMenuOpen) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [userMenuOpen])

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3.5 px-6 py-3.5 backdrop-blur-xl"
      style={{ background: 'var(--qms-surface)', borderBottom: '1px solid var(--qms-border)' }}
    >
      <button
        id={mobileMenuToggleId}
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

      <div className="ml-auto relative">
        <button
          onClick={() => setUserMenuOpen((v) => !v)}
          className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border transition-all"
          style={{ borderColor: 'var(--qms-border)', backgroundColor: 'var(--qms-surface-strong)' }}
          aria-haspopup="menu"
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

        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
            <div
              className="absolute right-0 top-full mt-2 w-52 z-50 rounded-xl border shadow-xl backdrop-blur-xl overflow-hidden"
              style={{ borderColor: 'var(--qms-border)', backgroundColor: 'var(--popover)' }}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
                <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>
                  {user ? `${user.firstName} ${user.lastName}` : '—'}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{user?.email}</div>
              </div>
              <div className="py-1">
                <button
                  onClick={signOut}
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
            </div>
          </>
        )}
      </div>
    </header>
  )
}

export default Topbar
