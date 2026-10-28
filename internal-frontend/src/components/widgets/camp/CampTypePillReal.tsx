import type { CampType } from '@/types/campReal.types'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'
import ColorPill from '@/components/ui/ColorPill'
import { CAMP_TYPE_COLOR } from '@/components/widgets/camp/campType.constants'

// Lives alongside CampStatusPillReal — consumed across camps and pharma.
interface CampTypePillRealProps {
  type: CampType
}

const CampTypePillReal = ({ type }: CampTypePillRealProps) => (
  <ColorPill status={type} colorMap={CAMP_TYPE_COLOR} labelMap={CAMP_TYPE_LABEL} />
)

export default CampTypePillReal
