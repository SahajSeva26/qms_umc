import type { ScreeningEntity } from '@/features/clinical/screening/screening.types'

interface ScreeningStageHistoryListProps {
  screening: ScreeningEntity
}

// Cloned from CampStageHistoryList.tsx's structure — not genericized, since
// this is the only other consumer of this exact shape today.
const ScreeningStageHistoryList = ({ screening }: ScreeningStageHistoryListProps) => {
  if (screening.stageHistory.length === 0) return null

  return (
    <div
      className="rounded-xl border p-5 mb-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Stage history</h2>
      <div className="space-y-3">
        {[...screening.stageHistory].reverse().map((entry, i) => (
          <div
            key={i}
            className="text-[13px] pb-3"
            style={i < screening.stageHistory.length - 1 ? { borderBottom: '1px solid var(--qms-border)' } : undefined}
          >
            <div style={{ color: 'var(--qms-text)' }}>
              {entry.from ? <><span className="font-semibold">{entry.from}</span> → </> : null}
              <span className="font-semibold">{entry.to}</span>
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
              {entry.actor?.name || entry.actor?.email || entry.actor?.roleId || 'Unknown actor'}
              {' · '}
              {new Date(entry.at).toLocaleString()}
            </div>
            {entry.reason && (
              <div className="text-[12px] mt-1 italic" style={{ color: 'var(--qms-text-muted)' }}>
                “{entry.reason}”
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ScreeningStageHistoryList
