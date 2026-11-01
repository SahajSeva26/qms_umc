import { useNavigate } from 'react-router-dom'
import { FiShieldOff } from 'react-icons/fi'
import { Button } from '../primitives/Button'

interface UnauthorizedPageProps {
  /** Where "Go to dashboard" navigates — each app supplies its own landing route. */
  homePath: string
  /** Defaults to "Go to dashboard" — override for an app whose landing page isn't a dashboard. */
  homeLabel?: string
}

// Dedicated destination for a route-level permission redirect — distinct
// from an in-page denial message: this is a real navigation to its own URL
// (/unauthorized), not an inline conditional.
const UnauthorizedPage = ({ homePath, homeLabel = 'Go to dashboard' }: UnauthorizedPageProps) => {
  const navigate = useNavigate()

  return (
    <div className="max-w-md mx-auto mt-20 text-center">
      <div className="bg-danger-soft mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl">
        <FiShieldOff size={26} className="text-danger" />
      </div>
      <h1 className="text-xl font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
        You don't have permission to view this
      </h1>
      <p className="text-[13px] mb-6" style={{ color: 'var(--qms-text-muted)' }}>
        Your account doesn't have the required permissions for this page. If you think this is a
        mistake, contact your administrator.
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

export default UnauthorizedPage
