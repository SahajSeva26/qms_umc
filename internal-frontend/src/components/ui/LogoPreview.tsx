import { FiImage } from 'react-icons/fi'

interface LogoPreviewProps {
  src?: string | null
  alt: string
  isLoading?: boolean
  size?: 'sm' | 'lg'
}

const SIZE_CLASSES: Record<NonNullable<LogoPreviewProps['size']>, string> = {
  sm: 'w-14 h-14',
  lg: 'w-32 h-24',
}

// isLoading checked before src — a background refetch can leave a stale src cached; the caller
// decides what src/isLoading mean, this just renders in that priority order.
const LogoPreview = ({ src, alt, isLoading, size = 'lg' }: LogoPreviewProps) => {
  return (
    <div
      className={`rounded-xl border shrink-0 flex items-center justify-center overflow-hidden ${SIZE_CLASSES[size]}`}
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
    >
      {isLoading ? (
        <span className="text-[9px]" style={{ color: 'var(--qms-text-muted)' }}>…</span>
      ) : src ? (
        <img src={src} alt={alt} className="w-full h-full object-contain" />
      ) : (
        <FiImage size={20} style={{ color: 'var(--qms-text-muted)' }} />
      )}
    </div>
  )
}

export default LogoPreview
