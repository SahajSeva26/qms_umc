import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import RolePicker from '../components/RolePicker'
import CredentialsForm from '../components/CredentialsForm'
import OtpStep from '../components/OtpStep'
import ThemeToggle from '../components/ThemeToggle'
import { useLogin } from '../hooks/useLogin'
import { QMS_INTERNAL_ROLES, PHARMA_EXTERNAL_ROLES } from '../components/RolePicker'

type Step = 'role' | 'credentials' | 'otp'

const ROLE_HOME: Record<string, string> = {
  super_admin: '/dashboard',
  admin: '/dashboard',
  sales_lead: '/crm',
  sales_rep: '/crm',
  camp_coord: '/camps',
  diet_camp_coord: '/diet',
  om_screening: '/om',
  om_diet: '/om',
  fo: '/fo',
  dedicated_fo: '/fo',
  logistics: '/admin',
  accounts: '/billing',
  dietitian: '/diet',
  analytics_viewer: '/analytics',
  pharma_ho: '/pharma',
  pharma_rsm: '/pharma',
  pharma_asm: '/pharma',
  pharma_mr: '/pharma',
}

const ALL_ROLES = [...QMS_INTERNAL_ROLES, ...PHARMA_EXTERNAL_ROLES]

const LoginPage = () => {
  const navigate = useNavigate()
  const { isPending, error: loginError } = useLogin()

  const [step, setStep] = useState<Step>('role')
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [otpError, setOtpError] = useState<string | undefined>()

  const selectedRole = ALL_ROLES.find((r) => r.id === selectedRoleId) ?? null

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId)
    setStep('credentials')
  }

  const handleCredentialsSubmit = (emailValue: string, _password: string) => {
    setEmail(emailValue)
    // TODO: call POST /auth/login once backend OTP flow is ready
    setStep('otp')
  }

  const handleOtpVerify = (otp: string) => {
    if (otp.length < 6) return
    setOtpError(undefined)
    // TODO: wire to POST /auth/verify-otp
    const home = ROLE_HOME[selectedRoleId ?? ''] ?? '/dashboard'
    navigate(home)
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* ── Left panel ── */}
      <div className="auth-panel hidden lg:flex lg:w-[52%] flex-col p-12 relative overflow-hidden">
        <div className="auth-panel-dots absolute inset-0 pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="auth-logo w-10 h-10 rounded-2xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
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

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { value: '12,400+', label: 'Camps executed' },
              { value: '2.1M', label: 'Patients reached' },
              { value: '28', label: 'Pharma clients' },
            ].map((stat) => (
              <div key={stat.label} className="auth-stat-card rounded-xl px-4 py-3">
                <div className="text-white font-bold leading-tight" style={{ fontSize: '22px' }}>{stat.value}</div>
                <div className="mt-0.5" style={{ fontSize: '12px', color: '#aebbe5' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Compliance badges */}
          <div className="flex items-center gap-5">
            {[
              { icon: 'shield', label: 'DPDP-ready' },
              { icon: 'lock', label: 'SOC 2 in progress' },
              { icon: 'grid', label: 'ABDM compatible' },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-blue-300 text-xs">
                {icon === 'shield' && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                )}
                {icon === 'lock' && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                )}
                {icon === 'grid' && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                )}
                {label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="auth-right-panel flex-1 flex items-start justify-center overflow-y-auto px-12">
        <div className="flex flex-col items-center justify-center min-h-full w-full py-10">
          <div className="auth-card w-full max-w-105 rounded-2xl p-8">

            {step === 'role' && (
              <>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-[#e8ebff] tracking-tight mb-1.5">Choose your panel</h2>
                <p className="text-sm text-gray-500 dark:text-[#aab2dc] mb-5">
                  Each role lands on a different workspace with its own permissions.
                </p>
                <RolePicker selectedRole={selectedRoleId} onSelect={handleRoleSelect} />
                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-[rgba(148,168,255,0.12)] flex items-center justify-between">
                  <span className="text-xs text-gray-400 dark:text-[#7b85b8]">© QMS Health Platforms</span>
                  <ThemeToggle />
                </div>
              </>
            )}

            {step === 'credentials' && selectedRole && (
              <CredentialsForm
                selectedRole={selectedRole}
                onSubmit={handleCredentialsSubmit}
                onBack={() => setStep('role')}
                isLoading={isPending}
                error={loginError?.message}
              />
            )}

            {step === 'otp' && (
              <OtpStep
                email={email}
                onVerify={handleOtpVerify}
                onBack={() => setStep('credentials')}
                isLoading={false}
                error={otpError}
              />
            )}

          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
