import { FiWifiOff, FiRefreshCw, FiLoader } from 'react-icons/fi'
import { Button } from '@/components/ui/button'

// Shown when the session check failed inconclusively (429, network blip,
// 5xx) — not a confirmed 401. Caller must keep this mounted while `pending`
// is true rather than falling back to a loading/null state.
const SessionRecovery = ({ onRetry, pending }: { onRetry: () => void; pending?: boolean }) => {
  return (
    <div className="flex h-dvh w-full items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="bg-warning-soft mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
          <FiWifiOff size={26} className="text-warning" />
        </div>
        <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
          Couldn't confirm your session
        </h1>
        <p className="text-[13px] mb-6" style={{ color: 'var(--qms-text-muted)' }}>
          This is usually temporary. Try again — you won't be signed out unless we can confirm that's actually the case.
        </p>
        <Button onClick={onRetry} disabled={pending}>
          {pending ? <FiLoader size={14} className="animate-spin" /> : <FiRefreshCw size={14} />}
          {pending ? 'Retrying…' : 'Try again'}
        </Button>
      </div>
    </div>
  )
}

export default SessionRecovery
