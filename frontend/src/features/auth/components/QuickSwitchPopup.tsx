import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { FiX, FiRepeat, FiRefreshCw } from 'react-icons/fi'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { AUTH_ROUTES } from '@/features/auth/auth.paths'
import { getApiErrorMessage, isForbiddenError } from '@/utils/apiError'
import {
  getCachedQuickSwitchAccounts,
  setCachedQuickSwitchAccounts,
  type QuickSwitchAccount,
} from '@/features/auth/quickSwitch.cache'

interface QuickSwitchPopupProps {
  onClose: () => void
}

// The seed script (seedQmsDemo.ts) uses this fixed password for every demo account; a real
// password is bcrypt-hashed server-side and can never be read back, so this is the one thing we
// have to assume rather than fetch.
const DEMO_PASSWORD = 'Test@123'

function roleLabel(role: { type: unknown; user: unknown }): string {
  const type = typeof role.type === 'object' && role.type ? (role.type as { name?: string }) : null
  const user = typeof role.user === 'object' && role.user ? (role.user as { firstName?: string; lastName?: string }) : null
  const typeName = type?.name ?? 'Unknown role'
  const userName = user ? [user.firstName, user.lastName].filter(Boolean).join(' ') : ''
  return userName ? `${typeName} — ${userName}` : typeName
}

function roleEmail(role: { user: unknown }): string | null {
  const user = typeof role.user === 'object' && role.user ? (role.user as { email?: string }) : null
  return user?.email ?? null
}

// Dev-only: drives the real POST /auth/login with a known demo account's credentials, one click
// per role — avoids opening a separate tab/incognito window to test as another role. Never shown
// in a production build (gated by import.meta.env.DEV at the Topbar call site).
//
// GET /roles (used to build this list) requires tenant:admin/tenant:manage/role:search, which most
// role types don't hold — so the list is fetched ONCE while on an admin-ish session and cached
// client-side (quickSwitch.cache.ts); every later switch, from any role, reads the cache instead
// of needing another privileged fetch. Opening this for the first time from a non-admin role (empty
// cache, 403 on fetch) shows a message to start from Admin instead of failing silently.
const QuickSwitchPopup = ({ onClose }: QuickSwitchPopupProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mutate: login, isPending, error: loginError } = useLogin()
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)
  const [cached, setCached] = useState<QuickSwitchAccount[] | null>(() => getCachedQuickSwitchAccounts())
  const [manualRefresh, setManualRefresh] = useState(false)

  // Only actually fetches when there's no cache yet, or the user explicitly asked to refresh —
  // not on every popup open, since most sessions won't hold role:search.
  const shouldFetch = !cached || manualRefresh
  const { data, isLoading, error: fetchError, refetch } = useRoles({ limit: '500', status: 'active' }, shouldFetch)

  useEffect(() => {
    if (!data?.data?.items) return
    const accounts: QuickSwitchAccount[] = data.data.items
      .map((role) => {
        const email = roleEmail(role)
        return email ? { label: roleLabel(role), email, password: DEMO_PASSWORD } : null
      })
      .filter((a): a is QuickSwitchAccount => !!a)
      // Stable, readable ordering.
      .sort((a, b) => a.label.localeCompare(b.label))

    if (accounts.length > 0) {
      setCachedQuickSwitchAccounts(accounts)
      setCached(accounts)
    }
    setManualRefresh(false)
  }, [data])

  const accounts = useMemo(() => cached ?? [], [cached])
  const showForbiddenHint = !cached && isForbiddenError(fetchError)
  const showGenericFetchError = !cached && fetchError && !showForbiddenHint

  const handleSwitch = (email: string, password: string, label: string) => {
    setPendingLabel(label)
    // Drop every cached query before switching — otherwise the next user could briefly see the
    // previous user's cached lists/details until each query's own staleTime naturally expires
    // (same reasoning as useAuth.ts's signOut()).
    queryClient.clear()
    login(
      { email, password },
      {
        onSuccess: () => navigate(AUTH_ROUTES.CONTINUE, { replace: true }),
        onSettled: () => setPendingLabel(null),
      },
    )
  }

  const handleRefresh = () => {
    setManualRefresh(true)
    void refetch()
  }

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4" style={{ background: 'rgba(7,11,28,.5)' }}>
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-sm max-h-[80vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          <div className="flex items-center gap-2">
            <FiRepeat size={14} style={{ color: 'var(--qms-brand)' }} />
            <span className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>Quick switch (dev)</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={isLoading}
              title="Refresh the account list from the database"
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-(--qms-surface-hover) disabled:opacity-50"
              style={{ color: 'var(--qms-text-muted)' }}
            >
              <FiRefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-(--qms-surface-hover)" style={{ color: 'var(--qms-text-muted)' }}>
              <FiX size={15} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-2 py-2">
          {isLoading && accounts.length === 0 && (
            <p className="text-[12px] px-3 py-4" style={{ color: 'var(--qms-text-muted)' }}>Loading accounts…</p>
          )}
          {showForbiddenHint && (
            <p className="text-[12px] px-3 py-4" style={{ color: 'var(--qms-text-muted)' }}>
              No cached accounts yet, and this session can't list roles. Sign in as Admin once first —
              the list loads and caches automatically, and every later switch (in any direction) will
              work from here without needing Admin access again.
            </p>
          )}
          {showGenericFetchError && (
            <p className="text-[12px] px-3 py-4 text-danger">
              {getApiErrorMessage(fetchError, "Couldn't load the account list.")}
            </p>
          )}
          {accounts.map((acc) => (
            <button
              key={acc.email}
              type="button"
              disabled={isPending}
              onClick={() => handleSwitch(acc.email, acc.password, acc.label)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-(--qms-surface-hover) disabled:opacity-50"
            >
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{acc.label}</div>
                <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{acc.email}</div>
              </div>
              {pendingLabel === acc.label && (
                <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--qms-brand)' }}>Signing in…</span>
              )}
            </button>
          ))}
        </div>

        {loginError && (
          <div className="mx-3 mb-3 text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
            {getApiErrorMessage(loginError, 'Could not sign in with that account.')}
          </div>
        )}
      </div>
    </div>
  )
}

export default QuickSwitchPopup
