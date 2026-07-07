import { useState, useEffect } from 'react'
import { Search, Bell, HelpCircle, ChevronDown, LogOut, User, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useAuthStore } from '@/features/auth/store'
import ThemeToggle from '@/components/ui/ThemeToggle'

interface TopbarProps {
  onMobileMenuToggle: () => void
}

function greeting(): string {
  const hr = new Date().getHours()
  if (hr >= 5 && hr < 12) return 'Good morning'
  if (hr >= 12 && hr < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatClock(): string {
  const now = new Date()
  return (
    now.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }) +
    ' · ' +
    now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  )
}

function getInitials(firstName?: string, lastName?: string): string {
  return [(firstName?.[0] ?? ''), (lastName?.[0] ?? '')].join('').toUpperCase() || 'U'
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', admin: 'Admin',
  sales_lead: 'Sales Head', sales_rep: 'Key Account Manager',
  camp_coord: 'Camp Coordinator', diet_camp_coord: 'Diet Coord',
  om_screening: 'OM · Screening', om_diet: 'OM · Diet',
  fo: 'Field Officer', dedicated_fo: 'Dedicated FO',
  logistics: 'Logistics', accounts: 'Accounts',
  dietitian: 'Dietitian', analytics_viewer: 'Analytics Viewer',
  pharma_ho: 'Pharma HO', pharma_rsm: 'Pharma RSM',
  pharma_asm: 'Pharma ASM', pharma_mr: 'Pharma MR',
}

const ROLE_COLOR: Record<string, string> = {
  super_admin: '#f43f5e', admin: '#8b5cf6',
  sales_lead: '#3b6dff', sales_rep: '#0ea5e9',
  camp_coord: '#10b981', diet_camp_coord: '#10b981',
  om_screening: '#3b6dff', om_diet: '#10b981',
  fo: '#14b8a6', dedicated_fo: '#0ea5e9',
  logistics: '#f59e0b', accounts: '#a855f7',
  dietitian: '#10b981', analytics_viewer: '#0ea5e9',
  pharma_ho: '#7c5cff', pharma_rsm: '#0ea5e9',
  pharma_asm: '#8b5cf6', pharma_mr: '#ec4899',
}

const Topbar = ({ onMobileMenuToggle }: TopbarProps) => {
  const { user } = useAuth()
  const { clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const [clock, setClock] = useState(formatClock)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setClock(formatClock()), 60_000)
    return () => clearInterval(interval)
  }, [])

  const initials = getInitials(user?.firstName, user?.lastName)
  const firstName = user?.firstName ?? 'there'
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role) : ''
  const roleColor = user ? (ROLE_COLOR[user.role] ?? '#3b6dff') : '#3b6dff'

  const handleSignOut = () => {
    clearAuth()
    navigate('/auth/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3.5 px-6 py-3.5 bg-[rgba(255,255,255,0.72)] dark:bg-[rgba(20,26,55,0.55)] border-b border-[rgba(36,81,240,0.10)] dark:border-[rgba(148,168,255,0.1)] backdrop-blur-xl">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuToggle}
        className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-[#aab2dc] hover:bg-gray-100 dark:hover:bg-[rgba(148,168,255,0.07)] transition-all"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* Greeting + clock */}
      <div className="hidden sm:flex flex-col leading-tight mr-1">
        <span className="text-[13px] font-bold text-gray-900 dark:text-white">
          {greeting()}, {firstName} 👋
        </span>
        <span className="text-[11px] text-gray-400 dark:text-[#7b85b8]">{clock}</span>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-[520px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#7b85b8]" />
        <input
          type="text"
          placeholder="Search camps, doctors, leads, devices, projects..."
          className="w-full pl-9 pr-12 py-2 text-[13px] rounded-xl border border-gray-200 dark:border-[rgba(148,168,255,0.15)] bg-gray-50 dark:bg-[rgba(22,29,62,0.6)] text-gray-900 dark:text-[#e8ebff] placeholder:text-gray-400 dark:placeholder:text-[#7b85b8] outline-none focus:border-blue-400 dark:focus:border-[rgba(148,168,255,0.4)] focus:ring-2 focus:ring-blue-100 dark:focus:ring-[rgba(90,139,255,0.2)] transition-all"
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] px-1.5 py-0.5 rounded-md border border-gray-200 dark:border-[rgba(148,168,255,0.15)] bg-white dark:bg-[rgba(22,29,62,0.8)] text-gray-400 dark:text-[#7b85b8] font-mono">
          ⌘K
        </kbd>
      </div>

      {/* Right actions */}
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-[#aab2dc] hover:bg-gray-100 dark:hover:bg-[rgba(148,168,255,0.07)] transition-all" aria-label="Notifications">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#070b1c]" />
        </button>

        {/* Help */}
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 dark:text-[#aab2dc] hover:bg-gray-100 dark:hover:bg-[rgba(148,168,255,0.07)] transition-all" aria-label="Help">
          <HelpCircle size={16} />
        </button>

        {/* User chip */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border border-gray-200 dark:border-[rgba(148,168,255,0.15)] bg-gray-50 dark:bg-[rgba(22,29,62,0.6)] hover:border-gray-300 dark:hover:border-[rgba(148,168,255,0.3)] transition-all"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
              style={{ background: roleColor }}
            >
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-[13px] font-semibold text-gray-900 dark:text-[#e8ebff] leading-none">
                {user ? `${user.firstName} ${user.lastName}` : '—'}
              </div>
              <div className="text-[11px] text-gray-400 dark:text-[#7b85b8] leading-none mt-0.5">{roleLabel}</div>
            </div>
            <ChevronDown size={13} className="text-gray-400 dark:text-[#7b85b8]" />
          </button>

          {/* Dropdown */}
          {userMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 z-50 rounded-xl border border-gray-200 dark:border-[rgba(148,168,255,0.15)] bg-white dark:bg-[rgba(14,20,45,0.98)] shadow-xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-[rgba(148,168,255,0.08)]">
                  <div className="text-[13px] font-bold text-gray-900 dark:text-[#e8ebff]">
                    {user ? `${user.firstName} ${user.lastName}` : '—'}
                  </div>
                  <div className="text-[11px] text-gray-400 dark:text-[#7b85b8] mt-0.5">{user?.email}</div>
                </div>
                <div className="py-1">
                  <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-gray-700 dark:text-[#aab2dc] hover:bg-gray-50 dark:hover:bg-[rgba(148,168,255,0.07)] transition-all">
                    <User size={14} className="text-gray-400 dark:text-[#7b85b8]" />
                    My Profile
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-rose-600 hover:bg-rose-50 dark:hover:bg-[rgba(244,63,94,0.08)] transition-all"
                  >
                    <LogOut size={14} />
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
