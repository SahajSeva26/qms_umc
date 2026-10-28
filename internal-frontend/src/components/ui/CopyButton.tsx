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
    onClick={async (e) => {
      e.stopPropagation()
      try {
        if (!navigator.clipboard) throw new Error('Clipboard API unavailable')
        await navigator.clipboard.writeText(value)
        toast.success(label ? `${label} copied` : 'Copied')
      } catch {
        toast.error(label ? `Couldn't copy ${label.toLowerCase()}` : "Couldn't copy")
      }
    }}
    className={`shrink-0 rounded p-0.5 transition-colors hover:bg-(--qms-surface-hover) ${className}`}
    style={{ color: 'var(--qms-text-muted)' }}
    aria-label={label ? `Copy ${label.toLowerCase()}` : 'Copy'}
  >
    <FiCopy size={size} />
  </button>
)

export default CopyButton
