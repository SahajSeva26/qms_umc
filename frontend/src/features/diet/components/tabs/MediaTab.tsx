import { useState } from 'react'
import { FiUpload, FiPlus, FiAlertCircle, FiVideo } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { MediaItem } from '@/features/diet/diet.types'
import { clientName } from '@/types/campref.types'
import { Button } from '@/components/ui/button'
import AddMediaModal from '@/features/diet/components/AddMediaModal'

interface MediaTabProps {
  camps: Camp[]
  media: Record<string, MediaItem[]>
}

// Mirrors tabMedia()/mediaSection() (diet-camps.js:1241-1296) — scope is
// LIVE + COMPLETED camps only, split into camps with media (grid of real
// clickable photo/video cells, opening the URL in a new tab, same as
// window.open(it.url,'_blank')) and camps without media (a warning callout
// listing their ids, first 8 + "N more").
const MediaTab = ({ camps, media }: MediaTabProps) => {
  const [uploadCampId, setUploadCampId] = useState<string | null>(null)

  const eligible = camps.filter((c) => c.status === 'CLOSED' || c.status === 'LIVE')
  const withMedia = eligible.filter((c) => (media[c.id]?.length ?? 0) > 0)
  const without = eligible.filter((c) => (media[c.id]?.length ?? 0) === 0)

  return (
    <div>
      <div className="text-xs mb-3.5" style={{ color: 'var(--qms-text-muted)' }}>
        Photos and videos uploaded by FOs during/after the camp. Visible to QMS team + pharma client.
      </div>

      {withMedia.length === 0 ? (
        <div className="rounded-xl border p-10 text-center text-[13px]" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
          No media uploaded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {withMedia.map((camp) => {
            const items = media[camp.id] ?? []
            const photos = items.filter((i) => i.kind === 'photo').length
            const videos = items.filter((i) => i.kind === 'video').length
            return (
              <div key={camp.id} className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
                <div className="flex items-center justify-between mb-2.5">
                  <div>
                    <div className="text-[14px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{camp.id} · {clientName(camp.clientId)}</div>
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
                      {camp.date} · {camp.city || '—'} · {photos} photo{photos !== 1 ? 's' : ''} · {videos} video{videos !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setUploadCampId(camp.id)}>
                    <FiUpload size={14} /> Upload more
                  </Button>
                </div>
                <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))' }}>
                  {items.map((it, i) => (
                    <div
                      key={i}
                      onClick={() => window.open(it.url, '_blank')}
                      className="relative rounded-xl border overflow-hidden cursor-pointer"
                      style={{ borderColor: 'var(--qms-border)' }}
                    >
                      <div className="aspect-square flex items-center justify-center" style={{ background: 'var(--qms-surface-strong)' }}>
                        {it.kind === 'video' ? (
                          <video src={it.url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={it.url} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div
                        className="absolute top-1.5 left-1.5 flex items-center gap-1 text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'var(--qms-surface)', color: 'var(--qms-text-muted)' }}
                      >
                        {it.kind === 'video' && <FiVideo size={9} />} {it.kind === 'video' ? 'video' : 'photo'}
                      </div>
                      {it.caption && (
                        <div className="p-1.5 text-[10px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{it.caption}</div>
                      )}
                    </div>
                  ))}
                  <div
                    onClick={() => setUploadCampId(camp.id)}
                    className="aspect-square rounded-xl border border-dashed flex items-center justify-center cursor-pointer text-center"
                    style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
                  >
                    <div>
                      <FiPlus size={18} className="mx-auto mb-1" />
                      <div className="text-[11px]">Add</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {without.length > 0 && (
        <div className="rounded-xl border p-3.5 mt-3.5" style={{ background: 'rgba(245,158,11,.05)', borderColor: 'rgba(245,158,11,.2)' }}>
          <div className="flex items-center gap-1.5 text-[13px] font-bold mb-2" style={{ color: 'var(--qms-text)' }}>
            <FiAlertCircle size={13} style={{ color: '#d97706' }} />
            {without.length} closed/live camp{without.length > 1 ? 's' : ''} without media
          </div>
          <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>
            {without.slice(0, 8).map((c) => c.id).join(', ')}
            {without.length > 8 ? ` + ${without.length - 8} more` : ''}
          </div>
        </div>
      )}

      {uploadCampId && (
        <AddMediaModal open={!!uploadCampId} campId={uploadCampId} onClose={() => setUploadCampId(null)} />
      )}
    </div>
  )
}

export default MediaTab
