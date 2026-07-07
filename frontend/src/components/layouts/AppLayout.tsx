import { useState, useEffect } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const SB_INTENT_KEY = 'qms.sb.intent'
const SB_SMALL_MQ = '(max-width: 1280px)'

function getInitialCollapsed(): boolean {
  const intent = localStorage.getItem(SB_INTENT_KEY)
  if (intent === 'collapsed') return true
  if (intent === 'expanded') return false
  return window.matchMedia(SB_SMALL_MQ).matches
}

const AppLayout = () => {
  const { isAuthenticated } = useAuth()
  const [collapsed, setCollapsed] = useState(getInitialCollapsed)
  const [mobileOpen, setMobileOpen] = useState(false)

  // Auto-collapse/expand when crossing 1280px breakpoint, unless user has a saved intent
  useEffect(() => {
    const mql = window.matchMedia(SB_SMALL_MQ)
    const onChange = (e: MediaQueryListEvent) => {
      const intent = localStorage.getItem(SB_INTENT_KEY)
      if (!intent) setCollapsed(e.matches)
    }
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])

  const handleToggle = () => {
    setCollapsed((prev) => {
      const next = !prev
      localStorage.setItem(SB_INTENT_KEY, next ? 'collapsed' : 'expanded')
      return next
    })
  }

  if (!isAuthenticated) return <Navigate to="/auth/login" replace />

  return (
    <div className="app-bg flex h-screen overflow-hidden">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex shrink-0">
        <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </>
      )}

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Topbar onMobileMenuToggle={() => setMobileOpen((v) => !v)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
