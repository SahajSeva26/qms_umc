import type { CampEntity } from '@/types/campReal.types'
import StageHistoryList from '@/components/ui/StageHistoryList'

interface CampStageHistoryListProps {
  camp: CampEntity
}

const CampStageHistoryList = ({ camp }: CampStageHistoryListProps) => (
  <StageHistoryList entries={camp.stageHistory.map((e) => ({ ...e, at: e.createdAt }))} />
)

export default CampStageHistoryList
