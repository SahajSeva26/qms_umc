import type { ScreeningEntity } from '@/features/clinical/screening/screening.types'
import StageHistoryList from '@/components/ui/StageHistoryList'

interface ScreeningStageHistoryListProps {
  screening: ScreeningEntity
}

const ScreeningStageHistoryList = ({ screening }: ScreeningStageHistoryListProps) => (
  <StageHistoryList entries={screening.stageHistory} />
)

export default ScreeningStageHistoryList
