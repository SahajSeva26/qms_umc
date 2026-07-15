import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiUser, FiLock, FiEye, FiEyeOff, FiMapPin, FiShield, FiGrid } from 'react-icons/fi'
import { useLogin } from '../hooks/useLogin'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { ROLE_HOME, DASHBOARD_ROUTES } from '@/components/layouts/navConfig'

const LoginPage = () => {
  const navigate = useNavigate()
  const { mutate: login, isPending, error } = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return
    login(
      { email, password },
      {
        onSuccess: (data) => {
          // TODO: once backend adds role to response, remove this fallback entirely
          const role = data?.data?.data?.role ?? 'super_admin'
          navigate(ROLE_HOME[role] ?? DASHBOARD_ROUTES.DASHBOARD, { replace: true })
        },
      }
    )
  }

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* ── Left panel ── */}
      <div className="auth-panel hidden lg:flex lg:w-[52%] flex-col p-12 relative overflow-hidden">
        <div className="auth-panel-dots absolute inset-0 pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="auth-logo w-10 h-10 rounded-2xl flex items-center justify-center">
            <FiMapPin size={20} color="white" strokeWidth={2.2} />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">QMS</span>
        </div>

        {/* Headline + stats */}
        <div className="relative flex-1 flex flex-col justify-center">
          <h1 className="font-bold text-white mb-4" style={{ fontSize: 'clamp(28px, 3.6vw, 48px)', lineHeight: 1.05 }}>
            The healthcare operations{' '}
            <span className="auth-headline-accent">command center</span>
            {' '}for pharma India.
          </h1>
          <p className="mb-8 max-w-sm" style={{ fontSize: '16px', color: '#c2cef5', lineHeight: 1.6 }}>
            Run camps, field officers, doctors, devices and revenue from one AI-native platform.
            Built for PAN-India scale and pharma-grade compliance.
          </p>

          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: '12,400+', label: 'Camps executed' },
              { value: '2.1M',    label: 'Patients reached' },
              { value: '28',      label: 'Pharma clients' },
            ].map((stat) => (
              <div key={stat.label} className="auth-stat-card rounded-xl px-4 py-3">
                <div className="text-white font-bold leading-tight" style={{ fontSize: '22px' }}>{stat.value}</div>
                <div className="mt-0.5" style={{ fontSize: '12px', color: '#aebbe5' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-5">
            {[
              { icon: FiShield, label: 'DPDP-ready' },
              { icon: FiLock,   label: 'SOC 2 in progress' },
              { icon: FiGrid,   label: 'ABDM compatible' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-blue-300 text-xs">
                <Icon size={13} />
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right-panel flex-1 flex items-center justify-center px-8">
        <div className="auth-card w-full max-w-sm rounded-2xl p-8">

          {/* Header */}
          <div className="mb-7">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mb-4 text-white font-extrabold"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
              Q
            </div>
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--qms-text)' }}>Welcome back</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--qms-text-muted)' }}>Sign in to your QMS workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Email
              </label>
              <div className="relative">
                <FiUser size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@qms.health"
                  style={{
                    borderColor: 'var(--qms-border-input)',
                    backgroundColor: 'var(--qms-surface-input)',
                    color: 'var(--qms-text)',
                  }}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border outline-none focus:border-(--qms-border-strong) focus:ring-2 focus:ring-(--qms-ring) transition-all placeholder:text-qms-text-muted"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase mb-2" style={{ color: 'var(--qms-text-muted)' }}>
                Password
              </label>
              <div className="relative">
                <FiLock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--qms-text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    borderColor: 'var(--qms-border-input)',
                    backgroundColor: 'var(--qms-surface-input)',
                    color: 'var(--qms-text)',
                  }}
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border outline-none focus:border-(--qms-border-strong) focus:ring-2 focus:ring-(--qms-ring) transition-all placeholder:text-qms-text-muted"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--qms-text-muted)' }}
                >
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none" style={{ color: 'var(--qms-text-soft)' }}>
                <input type="checkbox" defaultChecked className="rounded" />
                Remember me
              </label>
              <a href="#" className="text-xs font-semibold transition-colors" style={{ color: 'var(--qms-brand)' }}>
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                {error.message ?? 'Invalid email or password.'}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !email || !password}
              className="w-full py-3 px-4 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
            >
              {isPending ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          <div className="mt-6 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--qms-border)' }}>
            <span className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>© QMS Health Platforms</span>
            <ThemeToggle />
          </div>

        </div>
      </div>
    </div>
  )
}

export default LoginPage
