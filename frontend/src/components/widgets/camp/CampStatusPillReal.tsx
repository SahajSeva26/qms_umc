import type { CampStatus } from '@/types/campReal.types'
import ColorPill from '@/components/ui/ColorPill'
import { CAMP_STATUS_COLOR, CAMP_STATUS_LABEL } from '@/components/widgets/camp/campStatus.constants'

// Lives under components/widgets/camp/ since it's consumed across camps, dashboard, and pharma — same pattern as widgets/doctor/.
interface CampStatusPillRealProps {
  status: CampStatus
  onClick?: () => void
}

const CampStatusPillReal = ({ status, onClick }: CampStatusPillRealProps) => (
  <ColorPill status={status} colorMap={CAMP_STATUS_COLOR} labelMap={CAMP_STATUS_LABEL} onClick={onClick} />
)

export default CampStatusPillReal
