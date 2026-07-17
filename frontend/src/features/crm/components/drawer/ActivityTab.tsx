import { ACTIVITY_TIMELINE } from '@/features/crm/crm.insights'

const ActivityTab = () => (
  <div className="space-y-3">
    {ACTIVITY_TIMELINE.map((entry, i) => (
      <div key={i} className="flex gap-3">
        <div className="flex flex-col items-center pt-1">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--qms-brand)' }} />
          {i < ACTIVITY_TIMELINE.length - 1 && <span className="w-px flex-1 mt-1" style={{ background: 'var(--qms-border)' }} />}
        </div>
        <div className="pb-3">
          <div className="text-[13px]" style={{ color: 'var(--qms-text)' }}>
            <span className="font-semibold">{entry.actor}</span> · {entry.action}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>{entry.at}</div>
        </div>
      </div>
    ))}
  </div>
)

export default ActivityTab
