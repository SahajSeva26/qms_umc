import { FiImage, FiVideo } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { MediaItem } from '@/features/diet/diet.types'
import { clientName } from '@/types/campref.types'

interface MediaTabProps {
  camps: Camp[]
  media: Record<string, MediaItem[]>
}

const MediaTab = ({ camps, media }: MediaTabProps) => {
  const campsWithMedia = camps.filter((c) => (media[c.id]?.length ?? 0) > 0)

  return (
    <div className="space-y-4">
      {campsWithMedia.map((camp) => (
        <div key={camp.id}>
          <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>{camp.id} · {clientName(camp.clientId)}</div>
          <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
            {media[camp.id].map((item, i) => (
              <div key={i} className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--qms-border)' }}>
                <div className="aspect-square flex items-center justify-center" style={{ background: 'var(--qms-surface-strong)' }}>
                  {item.kind === 'video' ? <FiVideo size={20} style={{ color: 'var(--qms-text-muted)' }} /> : <FiImage size={20} style={{ color: 'var(--qms-text-muted)' }} />}
                </div>
                <div className="p-1.5 text-[10px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{item.caption || item.by}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {campsWithMedia.length === 0 && (
        <div className="rounded-xl border p-8 text-center text-[13px]" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          No media uploaded yet.
        </div>
      )}
    </div>
  )
}

export default MediaTab
