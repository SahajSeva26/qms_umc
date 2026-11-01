import { FiWifiOff, FiRefreshCw, FiLoader } from 'react-icons/fi'
import { Button } from '@/components/ui/button'

// Neutral copy — could be the service or the user's own connection, not necessarily "server down."
const ServerUnavailable = ({ onRetry, pending }: { onRetry: () => void; pending?: boolean }) => {
  return (
    <div className="text-center py-4">
      <div className="bg-warning-soft mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
        <FiWifiOff size={26} className="text-warning" />
      </div>
      <h2 className="text-lg font-bold mb-2 text-qms-text">We couldn't reach the service</h2>
      <p className="text-[13px] mb-6 text-qms-text-muted">
        Check your connection and try again.
      </p>
      <Button onClick={onRetry} disabled={pending} className="w-full">
        {pending ? <FiLoader size={14} className="animate-spin" /> : <FiRefreshCw size={14} />}
        {pending ? 'Retrying…' : 'Try again'}
      </Button>
    </div>
  )
}

export default ServerUnavailable
