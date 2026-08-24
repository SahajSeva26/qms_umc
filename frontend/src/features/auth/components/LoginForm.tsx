import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { FiUser, FiLock, FiEye, FiEyeOff } from 'react-icons/fi'
import { loginSchema, type LoginFormValues } from '../auth.schemas'
import { useLogin } from '../hooks/useLogin'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { DASHBOARD_ROUTES } from '@/components/layouts/navConfig'
import { useNavigate } from 'react-router-dom'
import { getApiErrorMessage, isServerUnreachable, isServiceFailure } from '@/utils/apiError'
import { useServerHealth } from '@/hooks/useServerHealth'
import ServerUnavailable from '@/components/layouts/ServerUnavailable'

const LoginForm = () => {
  const navigate = useNavigate()
  const { mutate: login, isPending, error, reset: resetLogin } = useLogin()
  const [showPassword, setShowPassword] = useState(false)
  const { checkHealth, isChecking } = useServerHealth()
  // Set once a login attempt gets no HTTP response — cleared only once a
  // health recheck actually confirms the service is reachable again.
  const [unreachable, setUnreachable] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, touchedFields },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = (values: LoginFormValues) => {
    login(values, {
      onSuccess: () => {
        navigate(DASHBOARD_ROUTES.DASHBOARD, { replace: true })
      },
      onError: (err) => {
        if (isServerUnreachable(err)) setUnreachable(true)
      },
    })
  }

  // Retry from the availability screen: a real health check, not just
  // re-attempting login — only a confirmed-reachable service dismisses it.
  const handleRetry = async () => {
    const result = await checkHealth()
    if (!result.isError) {
      resetLogin() // clears the stale unreachable-attempt error so the form doesn't reappear showing it
      setUnreachable(false)
    }
  }

  // Form stays visible here (unlike the unreachable case) — re-clicking Sign in is a real retry.
  const loginErrorMessage = (err: unknown) =>
    isServiceFailure(err)
      ? getApiErrorMessage(err, 'Sign-in is temporarily unavailable. Please try again.')
      : getApiErrorMessage(err, 'Invalid email or password.')

  return (
    <div className="auth-right-panel flex-1 flex items-center justify-center px-8">
      <div className="auth-card w-full max-w-sm rounded-2xl p-8">
        <div className="mb-7">
          <div className="auth-brand-gradient w-10 h-10 rounded-2xl flex items-center justify-center mb-4 text-white font-extrabold">
            Q
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-qms-text">Welcome back</h2>
          <p className="text-sm mt-1 text-qms-text-muted">Sign in to your QMS workspace.</p>
        </div>

        {unreachable ? (
          <ServerUnavailable onRetry={handleRetry} pending={isChecking} />
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase mb-2 text-qms-text-muted">
                Email
              </label>
              <div className="relative">
                <FiUser
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-qms-text-muted"
                />
                <input
                  type="email"
                  placeholder="you@qms.health"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border outline-none border-(--qms-border-input) bg-(--qms-surface-input) text-qms-text focus:border-(--qms-border-strong) focus:ring-2 focus:ring-ring transition-all placeholder:text-qms-text-muted"
                  autoFocus
                  {...register('email')}
                />
              </div>
              {touchedFields.email && errors.email && (
                <p className="text-xs text-danger mt-1.5">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-semibold tracking-widest uppercase mb-2 text-qms-text-muted">
                Password
              </label>
              <div className="relative">
                <FiLock
                  size={15}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-qms-text-muted"
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border outline-none border-(--qms-border-input) bg-(--qms-surface-input) text-qms-text focus:border-(--qms-border-strong) focus:ring-2 focus:ring-ring transition-all placeholder:text-qms-text-muted"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors text-qms-text-muted"
                >
                  {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                </button>
              </div>
              {touchedFields.password && errors.password && (
                <p className="text-xs text-danger mt-1.5">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs cursor-pointer select-none text-qms-text-soft">
                <input type="checkbox" defaultChecked className="rounded" />
                Remember me
              </label>
              <a href="#" className="text-xs font-semibold transition-colors text-(--qms-brand)">
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="text-xs rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
                {loginErrorMessage(error)}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending || !isValid}
              className="auth-brand-gradient w-full py-3 px-4 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isPending ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        )}

        <div className="mt-6 pt-4 flex items-center justify-between border-t border-qms-border">
          <span className="text-xs text-qms-text-muted">© QMS Health Platforms</span>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}

export default LoginForm
