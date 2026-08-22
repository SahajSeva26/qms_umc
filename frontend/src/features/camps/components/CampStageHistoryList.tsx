import type { CampEntity } from '@/features/camps/campReal.types'

interface CampStageHistoryListProps {
  camp: CampEntity
}

const CampStageHistoryList = ({ camp }: CampStageHistoryListProps) => {
  if (camp.stageHistory.length === 0) return null

  return (
    <div
      className="rounded-xl border p-5 mb-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <h2 className="text-sm font-bold mb-4" style={{ color: 'var(--qms-text)' }}>Stage history</h2>
      <div className="space-y-3">
        {[...camp.stageHistory].reverse().map((entry, i) => (
          <div
            key={i}
            className="text-[13px] pb-3"
            style={i < camp.stageHistory.length - 1 ? { borderBottom: '1px solid var(--qms-border)' } : undefined}
          >
            <div style={{ color: 'var(--qms-text)' }}>
              <span className="font-semibold">{entry.from}</span> → <span className="font-semibold">{entry.to}</span>
            </div>
            <div className="text-[12px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
              {entry.actor?.name || entry.actor?.email || entry.actor?.roleId || 'Unknown actor'}
              {' · '}
              {new Date(entry.createdAt).toLocaleString()}
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

export default CampStageHistoryList
