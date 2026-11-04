import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { FiRepeat, FiRefreshCw } from 'react-icons/fi'
import { useRoles } from '@/features/access-management/role/hooks/useRoles'
import { useLogin } from '@/features/auth/hooks/useLogin'
import { AUTH_ROUTES } from '@/features/auth/auth.paths'
import { getApiErrorMessage, isForbiddenError } from '@/utils/apiError'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  getCachedQuickSwitchAccounts,
  DEMO_QUICK_SWITCH_PASSWORD,
  setCachedQuickSwitchAccounts,
  type QuickSwitchAccount,
} from '@qms/core'

interface QuickSwitchPopupProps {
  onClose: () => void
}

// seedQmsDemo.ts's fixed password for every demo account — a real password is hashed and
// can never be read back, so this is the one thing we assume rather than fetch.
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

// Dev-only. GET /roles needs role:search/tenant:manage, which most roles lack, so the account
// list is fetched once from an admin-ish session and cached (quickSwitch.cache.ts) for later switches.
const QuickSwitchPopup = ({ onClose }: QuickSwitchPopupProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mutate: login, isPending, error: loginError } = useLogin()
  const [pendingLabel, setPendingLabel] = useState<string | null>(null)
  const [cached] = useState<QuickSwitchAccount[] | null>(() => getCachedQuickSwitchAccounts())

  // Only actually fetches when there's no cache yet, or the user explicitly asked to refresh —
  // not on every popup open, since most sessions won't hold role:search.
  const shouldFetch = !cached
  const { data, isLoading, error: fetchError, refetch } = useRoles({ limit: '500', status: 'active' }, shouldFetch)

  const fetchedAccounts = useMemo(() => {
    if (!data?.data?.items) return []
    return data.data.items
      .map((role) => {
        const email = roleEmail(role)
        return email ? { label: roleLabel(role), email, password: DEMO_QUICK_SWITCH_PASSWORD } : null
      })
      .filter((a): a is QuickSwitchAccount => !!a)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [data])

  useEffect(() => {
    if (fetchedAccounts.length > 0) setCachedQuickSwitchAccounts(fetchedAccounts)
  }, [fetchedAccounts])

  const accounts = fetchedAccounts.length > 0 ? fetchedAccounts : (cached ?? [])
  const showForbiddenHint = !cached && isForbiddenError(fetchError)
  const showGenericFetchError = !cached && fetchError && !showForbiddenHint

  const handleSwitch = (email: string, password: string, label: string) => {
    setPendingLabel(label)
    // Drop every cached query so the next user never briefly sees stale data (useAuth.ts's signOut()).
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
    void refetch()
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="shrink-0 flex-row items-center justify-between px-4 py-3 space-y-0" style={{ borderBottom: '1px solid var(--qms-border)' }}>
          <DialogTitle className="flex items-center gap-2 text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>
            <FiRepeat size={14} style={{ color: 'var(--qms-brand)' }} />
            Quick switch (dev)
          </DialogTitle>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            title="Refresh the account list from the database"
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-(--qms-surface-hover) disabled:opacity-50"
            style={{ color: 'var(--qms-text-muted)' }}
          >
            <FiRefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
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
          <div className="shrink-0 mx-3 mb-3 text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
            {getApiErrorMessage(loginError, 'Could not sign in with that account.')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default QuickSwitchPopup
