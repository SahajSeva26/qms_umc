import { FiCopy } from 'react-icons/fi'
import { toast } from '@/components/ui/sonner'

interface CopyButtonProps {
  value: string
  /** Shown in the success toast, e.g. "Code" -> "Code copied". Defaults to "Copied". */
  label?: string
  size?: number
  className?: string
}

// Small icon-only copy-to-clipboard button — for inline use next to a code/id
// cell in any table, not tied to any one feature.
const CopyButton = ({ value, label, size = 12, className = '' }: CopyButtonProps) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation()
      navigator.clipboard?.writeText(value)
      toast.success(label ? `${label} copied` : 'Copied')
    }}
    className={`shrink-0 rounded p-0.5 transition-colors hover:bg-(--qms-surface-hover) ${className}`}
    style={{ color: 'var(--qms-text-muted)' }}
    aria-label={label ? `Copy ${label.toLowerCase()}` : 'Copy'}
  >
    <FiCopy size={size} />
  </button>
)

export default CopyButton
