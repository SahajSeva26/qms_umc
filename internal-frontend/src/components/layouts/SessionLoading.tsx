import { FiLoader } from 'react-icons/fi'

// Distinct from RouteFallback, which assumes the app shell is already mounted.
const SessionLoading = () => {
  return (
    <div className="flex h-dvh w-full items-center justify-center">
      <FiLoader size={22} className="animate-spin" style={{ color: 'var(--qms-text-muted)' }} />
    </div>
  )
}

export default SessionLoading
