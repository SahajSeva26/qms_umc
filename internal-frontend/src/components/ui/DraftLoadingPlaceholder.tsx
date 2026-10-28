import { FiLoader } from 'react-icons/fi'

// No editable form renders alongside this, so nothing typed can be silently
// overwritten once the resume/fresh-start decision is made.
const DraftLoadingPlaceholder = () => (
  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
    <FiLoader size={20} className="animate-spin" style={{ color: 'var(--qms-text-muted)' }} />
    <p className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Checking for a saved draft…</p>
  </div>
)

export default DraftLoadingPlaceholder
