import { useMemo } from 'react'
import type { ActivityItem, SalesRep } from '@/types/salesdash.types'

interface ActivityTabProps {
  activityFeed: ActivityItem[]
  reps: SalesRep[]
}

const TONE_COLORS: Record<ActivityItem['tone'], string> = {
  green: '#10b981',
  amber: '#f59e0b',
  rose: '#f43f5e',
  '': '#94a3b8',
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// Deterministic mock intensity — seeded from rep id length + day/week index so
// the heatmap is stable across renders without needing real activity logs.
function cellIntensity(repId: string, week: number, day: number): number {
  const seed = repId.length * 7 + week * 3 + day * 5
  return seed % 5
}

const INTENSITY_COLORS = ['var(--qms-surface-strong)', '#c7f9e0', '#7ee8b8', '#34c98f', '#0f9d63']

const ActivityTab = ({ activityFeed, reps }: ActivityTabProps) => {
  const weeks = 6

  const heatmapReps = useMemo(() => reps.filter((r) => !r.relievedOn), [reps])

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          Recent activity
        </div>
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
        >
          {activityFeed.map((item, i) => (
            <div
              key={`${item.title}-${i}`}
              className="flex items-start gap-3 px-3.5 py-3"
              style={i > 0 ? { borderTop: '1px solid var(--qms-border)' } : undefined}
            >
              <span
                className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                style={{ background: TONE_COLORS[item.tone] }}
              />
              <div className="min-w-0">
                <div className="text-[13px] font-semibold" style={{ color: 'var(--qms-text)' }}>{item.title}</div>
                <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{item.meta}</div>
              </div>
            </div>
          ))}
          {activityFeed.length === 0 && (
            <div className="px-4 py-10 text-center text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
              No recent activity.
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
          Engagement heatmap · last {weeks} weeks
        </div>
        <div
          className="rounded-2xl border p-3.5 space-y-3"
          style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
        >
          {heatmapReps.map((rep) => (
            <div key={rep.id} className="flex items-center gap-2">
              <span className="text-[11px] font-semibold w-24 truncate shrink-0" style={{ color: 'var(--qms-text-soft)' }}>
                {rep.name.split(' ')[0]}
              </span>
              <div className="flex gap-1 flex-1">
                {Array.from({ length: weeks }, (_, week) => (
                  <div key={week} className="flex gap-0.5">
                    {DAYS.map((_, day) => {
                      const intensity = cellIntensity(rep.id, week, day)
                      return (
                        <span
                          key={day}
                          className="w-2.5 h-2.5 rounded-sm"
                          style={{ background: INTENSITY_COLORS[intensity] }}
                          title={`${rep.name} · week ${week + 1} · ${DAYS[day]}`}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {heatmapReps.length === 0 && (
            <div className="text-center text-[13px] py-6" style={{ color: 'var(--qms-text-muted)' }}>
              No active reps to show.
            </div>
          )}
          <div className="flex items-center gap-1.5 pt-1">
            <span className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>Less</span>
            {INTENSITY_COLORS.map((color) => (
              <span key={color} className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
            ))}
            <span className="text-[10px]" style={{ color: 'var(--qms-text-muted)' }}>More</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ActivityTab
