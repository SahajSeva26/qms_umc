import { useNavigate } from 'react-router-dom'
import { FiCompass } from 'react-icons/fi'
import { Button } from '../primitives/Button'

interface NotFoundPageProps {
  /** Where "Go to dashboard" navigates — each app supplies its own landing route. */
  homePath: string
  /** Defaults to "Go to dashboard" — override for an app whose landing page isn't a dashboard. */
  homeLabel?: string
}

// Authenticated catch-all (`path: '*'`) — mounted as a child of the app shell so
// the sidebar/topbar stay visible for a bad in-app URL, matching
// UnauthorizedPage's visual pattern.
const NotFoundPage = ({ homePath, homeLabel = 'Go to dashboard' }: NotFoundPageProps) => {
  const navigate = useNavigate()

  return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: 'var(--qms-surface-strong)' }}>
        <FiCompass size={26} style={{ color: 'var(--qms-text-muted)' }} />
      </div>
      <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
        Page not found
      </h1>
      <p className="text-[13px] mb-6" style={{ color: 'var(--qms-text-muted)' }}>
        The page you're looking for doesn't exist or may have moved.
      </p>
      <div className="flex items-center justify-center gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
        <Button onClick={() => navigate(homePath)}>{homeLabel}</Button>
      </div>
    </div>
  )
}

export default NotFoundPage
