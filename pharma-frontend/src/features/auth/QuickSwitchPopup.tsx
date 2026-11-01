import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { FiRepeat } from 'react-icons/fi'
import {
  getCachedQuickSwitchAccounts,
  type QuickSwitchAccount,
} from '@qms/core'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { internalHref } from '@/config/env'
import { getApiErrorMessage } from '@/utils/apiError'
import { useQuickSwitch } from './useQuickSwitch'

interface QuickSwitchPopupProps {
  onClose: () => void
}

// This account remains a reliable escape hatch if the pharma app was opened directly before the
// internal app could transfer its cached catalogue. Normal internal-to-pharma navigation transfers
// the full catalogue across split dev origins, enabling the same direct role switching as internal.
const SYSTEM_ACCOUNT: QuickSwitchAccount = {
  label: 'System administrator',
  email: 'system@gmail.com',
  password: 'Test@123',
}

const QuickSwitchPopup = ({ onClose }: QuickSwitchPopupProps) => {
  const queryClient = useQueryClient()
  const switchAccount = useQuickSwitch()
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const accounts = useMemo(() => {
    const cached = getCachedQuickSwitchAccounts() ?? []
    return [SYSTEM_ACCOUNT, ...cached.filter((account) => account.email !== SYSTEM_ACCOUNT.email)]
  }, [])

  const handleSwitch = (account: QuickSwitchAccount) => {
    setPendingEmail(account.email)
    // Never let the next role see server-state cached for the current role while the hard
    // navigation is in flight.
    queryClient.clear()
    switchAccount.mutate(
      { email: account.email, password: account.password },
      {
        onSuccess: () => {
          // AuthContinuePage is the single audience router. It sends internal roles to their
          // internal landing page and pharma roles back to the correct /pharma/* portal.
          window.location.href = internalHref('/auth/continue')
        },
        onSettled: () => setPendingEmail(null),
      },
    )
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader
          className="shrink-0 px-4 py-3 space-y-0"
          style={{ borderBottom: '1px solid var(--qms-border)' }}
        >
          <DialogTitle
            className="flex items-center gap-2 text-[13px] font-bold"
            style={{ color: 'var(--qms-text)' }}
          >
            <FiRepeat size={14} style={{ color: 'var(--qms-brand)' }} />
            Quick switch (dev)
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2">
          {accounts.map((account) => (
            <button
              key={account.email}
              type="button"
              disabled={switchAccount.isPending}
              onClick={() => handleSwitch(account)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl text-left transition-colors hover:bg-(--qms-surface-hover) disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold truncate" style={{ color: 'var(--qms-text)' }}>
                  {account.label}
                </span>
                <span className="block text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>
                  {account.email}
                </span>
              </span>
              {pendingEmail === account.email && (
                <span className="text-[11px] font-semibold shrink-0" style={{ color: 'var(--qms-brand)' }}>
                  Signing in…
                </span>
              )}
            </button>
          ))}
        </div>

        {switchAccount.error && (
          <div className="shrink-0 mx-3 mb-3 text-[12px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger" role="alert">
            {getApiErrorMessage(switchAccount.error, 'Could not switch to that account.')}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default QuickSwitchPopup
