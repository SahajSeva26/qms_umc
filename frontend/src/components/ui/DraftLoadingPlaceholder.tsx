import { FiLoader } from 'react-icons/fi'

// Shown while a wizard's draft-store hook is still resolving (session
// restore in flight, or the per-user store hasn't been looked up yet) — no
// editable form content renders alongside this, so nothing typed here can
// ever be silently overwritten once the real resume/fresh-start decision is made.
const DraftLoadingPlaceholder = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
    <FiLoader size={20} className="animate-spin" style={{ color: 'var(--qms-text-muted)' }} />
    <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Checking for a saved draft…</p>
  </div>
)

export default DraftLoadingPlaceholder
