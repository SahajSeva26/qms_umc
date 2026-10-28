import { FiClipboard, FiUserCheck, FiClock, FiCheckCircle, FiXCircle, FiAlertTriangle, FiUsers, FiImage } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { Dietitian, MediaItem } from '@/features/diet/diet.types'
import { dietStage } from '@/features/diet/diet.utils'
import KpiTile from '@/components/ui/KpiTile'

interface DietKpiStripProps {
  camps: Camp[]
  dietitians: Dietitian[]
  media: Record<string, MediaItem[]>
}

// Mirrors renderKpis() exactly (diet-camps.js:531-540) — 8 tiles.
const DietKpiStrip = ({ camps, dietitians, media }: DietKpiStripProps) => {
  const counts = {
    REQUESTED: camps.filter((c) => dietStage(c) === 'REQUESTED').length,
    ASSIGNED: camps.filter((c) => dietStage(c) === 'ASSIGNED').length,
    UPCOMING: camps.filter((c) => dietStage(c) === 'UPCOMING').length,
    COMPLETED: camps.filter((c) => dietStage(c) === 'COMPLETED').length,
    CANCELLED: camps.filter((c) => dietStage(c) === 'CANCELLED').length,
    CHARGED: camps.filter((c) => dietStage(c) === 'CHARGED').length,
  }
  const interviewed = dietitians.filter((d) => d.interviewed).length
  const mediaCount = Object.values(media).reduce((sum, arr) => sum + arr.length, 0)
  const campsWithMedia = Object.keys(media).filter((k) => media[k].length > 0).length

  return (
    <div className="grid gap-2.5 mb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      <KpiTile label="Requested" value={String(counts.REQUESTED)} tone="amber" icon={FiClipboard} />
      <KpiTile label="Diet assigned" value={String(counts.ASSIGNED)} tone="brand" icon={FiUserCheck} />
      <KpiTile label="Upcoming" value={String(counts.UPCOMING)} tone="teal" icon={FiClock} />
      <KpiTile label="Completed" value={String(counts.COMPLETED)} tone="emerald" icon={FiCheckCircle} />
      <KpiTile label="Cancelled" value={String(counts.CANCELLED)} tone="rose" icon={FiXCircle} />
      <KpiTile label="Cancelled · charged" value={String(counts.CHARGED)} tone="rose" icon={FiAlertTriangle} />
      <KpiTile label="Dietitians" value={String(dietitians.length)} sub={`${interviewed} interviewed · ${dietitians.length - interviewed} pending`} tone="violet" icon={FiUsers} />
      <KpiTile label="Media items" value={String(mediaCount)} sub={`${campsWithMedia} camps`} tone="brand" icon={FiImage} />
    </div>
  )
}

export default DietKpiStrip
