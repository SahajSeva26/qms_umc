import { useState, useEffect } from 'react'
import { FiSearch, FiBell, FiHelpCircle, FiChevronDown, FiLogOut, FiUser, FiMenu } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABEL, ROLE_COLOR } from '@/lib/roles'
import { getGreeting, formatClockDisplay } from '@/utils/formatters'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface TopbarProps {
  onMobileMenuToggle: () => void
}

function getInitials(firstName?: string, lastName?: string): string {
  return [(firstName?.[0] ?? ''), (lastName?.[0] ?? '')].join('').toUpperCase() || 'U'
}

const Topbar = ({ onMobileMenuToggle }: TopbarProps) => {
  const { user, signOut } = useAuth()
  const [clock, setClock] = useState(formatClockDisplay)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setClock(formatClockDisplay()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const initials  = getInitials(user?.firstName, user?.lastName)
  const firstName = user?.firstName ?? 'there'
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role) : ''
  const roleColor = user ? (ROLE_COLOR[user.role] ?? 'var(--qms-brand)') : 'var(--qms-brand)'

  return (
    <header
      className="sticky top-0 z-40 flex items-center gap-3.5 px-6 py-3.5 backdrop-blur-xl"
      style={{
        background: 'var(--qms-surface)',
        borderBottom: '1px solid var(--qms-border)',
      }}
    >
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg transition-all"
        style={{ color: 'var(--qms-text-soft)' }}
        aria-label="Open menu"
      >
        <FiMenu size={18} />
      </button>

      {/* Greeting + clock */}
      <div className="hidden sm:flex flex-col leading-tight mr-1">
        <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>
          {getGreeting()}, {firstName} 👋
        </span>
        <span className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{clock}</span>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-130">
        <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
        <input
          type="text"
          placeholder="Search camps, doctors, leads, devices, projects..."
          style={{
            borderColor: 'var(--qms-border-input)',
            backgroundColor: 'var(--qms-surface-strong)',
            color: 'var(--qms-text)',
          }}
          className="w-full pl-9 pr-12 py-2 text-[13px] rounded-xl border outline-none focus:border-(--qms-border-strong) focus:ring-2 focus:ring-(--qms-ring) transition-all placeholder:text-qms-text-muted"
        />
        <kbd
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] px-1.5 py-0.5 rounded-md border font-mono"
          style={{
            borderColor: 'var(--qms-border)',
            backgroundColor: 'var(--qms-surface-card)',
            color: 'var(--qms-text-muted)',
          }}
        >
          ⌘K
        </kbd>
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          style={{ color: 'var(--qms-text-soft)' }}
          aria-label="Notifications"
        >
          <FiBell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full ring-2 ring-qms-surface" style={{ backgroundColor: 'var(--qms-role-super-admin)' }} />
        </button>

        {/* Help */}
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
          style={{ color: 'var(--qms-text-soft)' }}
          aria-label="Help"
        >
          <FiHelpCircle size={16} />
        </button>

        {/* User chip */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border transition-all"
            style={{
              borderColor: 'var(--qms-border)',
              backgroundColor: 'var(--qms-surface-strong)',
            }}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: roleColor }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[13px] font-semibold leading-none" style={{ color: 'var(--qms-text)' }}>
                {user ? `${user.firstName} ${user.lastName}` : '—'}
              </div>
              <div className="text-[11px] leading-none mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{roleLabel}</div>
            </div>
            <FiChevronDown size={13} style={{ color: 'var(--qms-text-muted)' }} />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div
                className="absolute right-0 top-full mt-2 w-52 z-50 rounded-xl border shadow-xl backdrop-blur-xl overflow-hidden"
                style={{
                  borderColor: 'var(--qms-border)',
                  backgroundColor: 'var(--popover)',
                }}
              >
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
                  <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>
                    {user ? `${user.firstName} ${user.lastName}` : '—'}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{user?.email}</div>
                </div>
                <div className="py-1">
                  <button
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-all hover:bg-(--qms-surface-hover)"
                    style={{ color: 'var(--qms-text-soft)' }}
                  >
                    <FiUser size={14} style={{ color: 'var(--qms-text-muted)' }} />
                    My Profile
                  </button>
                  <button
                    onClick={signOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] transition-all hover:bg-danger-soft"
                    style={{ color: 'var(--danger)' }}
                  >
                    <FiLogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Topbar
