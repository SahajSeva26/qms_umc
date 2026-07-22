import { coordScopedProjects, coordScopedClients } from '@/features/diet/dietitians.service'

interface ScopeBannerProps {
  adminLike: boolean
  coordId: string | null
}

// Shown atop Dashboard, Assign, Reopen, and Projects tabs — NOT Dietitians &
// bank. Renders nothing for admin-like roles or when no coordinator resolves
// (fail-open: those cases show the full unscoped dataset instead).
const ScopeBanner = ({ adminLike, coordId }: ScopeBannerProps) => {
  if (adminLike || !coordId) return null
  const projects = coordScopedProjects(coordId)
  const clients = coordScopedClients(coordId)
  return (
    <div
      className="rounded-lg px-3.5 py-2.5 mb-4 text-[12.5px]"
      style={{ background: 'rgba(59,109,255,.05)', borderLeft: '3px solid #3b6dff', color: 'var(--qms-text)' }}
    >
      <span className="font-bold">Scoped to your assignments</span>
      <span style={{ color: 'var(--qms-text-muted)' }}>
        {' '}· {projects.length} project(s) · {clients.length} compan{clients.length === 1 ? 'y' : 'ies'} · only camps under these surface here. Switch via Admin if you need wider access.
      </span>
    </div>
  )
}

export default ScopeBanner
