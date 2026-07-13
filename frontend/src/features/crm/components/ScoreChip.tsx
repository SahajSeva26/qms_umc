import { FiZap } from 'react-icons/fi'

interface ScoreChipProps {
  score: number
  size?: 'sm' | 'md'
}

function tierClass(score: number): string {
  if (score >= 80) return 'bg-success-soft text-success'
  if (score >= 60) return 'bg-warning-soft text-warning'
  return 'bg-danger-soft text-danger'
}

const ScoreChip = ({ score, size = 'md' }: ScoreChipProps) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full font-bold ${tierClass(score)} ${
      size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-[11px] px-2 py-0.5'
    }`}
  >
    <FiZap size={size === 'sm' ? 9 : 10} />
    {score}
  </span>
)

export default ScoreChip
