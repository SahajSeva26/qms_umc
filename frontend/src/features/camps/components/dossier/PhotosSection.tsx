import { FiImage } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import DossierSection from '@/features/camps/components/DossierSection'

interface PhotosSectionProps {
  camp: Camp
}

const PhotosSection = ({ camp }: PhotosSectionProps) => {
  const photos = [...(camp.photos ?? []), ...(camp.photoUrl ? [camp.photoUrl] : [])]

  return (
    <DossierSection title="Camp photos">
      {photos.length === 0 ? (
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No photos uploaded yet.</p>
      ) : (
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
          {photos.map((url, i) => (
            <div
              key={i}
              className="aspect-square rounded-lg border flex items-center justify-center overflow-hidden"
              style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)' }}
            >
              {url.startsWith('http') ? (
                <img src={url} alt={`Camp photo ${i + 1}`} className="w-full h-full object-cover" />
              ) : (
                <FiImage size={20} style={{ color: 'var(--qms-text-muted)' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </DossierSection>
  )
}

export default PhotosSection
