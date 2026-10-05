import { useState } from 'react'
import { useQaFeedback } from '@/features/qa-feedback/hooks/useQaFeedback'
import FeedbackCard from '@/features/qa-feedback/components/FeedbackCard'

// 'open' is the only status the app itself ever sets and the only one the backend's
// exact-match filter is worth offering as a tab — everything else is an arbitrary Jira
// workflow status (e.g. "In Progress", "Done"), shown via each card's own badge instead.
const STATUS_TABS: { id: 'open' | 'all'; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'all', label: 'All' },
]

const QaFeedbackReviewPage = () => {
  const [tab, setTab] = useState<'open' | 'all'>('open')
  const { items, count, isLoading, error } = useQaFeedback(tab === 'all' ? {} : { status: tab })

  return (
    <div className="max-w-4xl">
      <div className="mb-5">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>QA Feedback</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
          {!isLoading && !error ? `${count} report${count === 1 ? '' : 's'}` : 'Reports left by testers on any screen.'}
        </p>
      </div>

      <div className="flex gap-1 p-1 mb-4 rounded-xl w-fit" style={{ background: 'var(--qms-surface-strong)' }}>
        {STATUS_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={tab === t.id ? { background: 'var(--qms-surface-card)', color: 'var(--qms-text)' } : { color: 'var(--qms-text-muted)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>Loading reports…</div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load QA feedback. Please try again.
        </div>
      )}

      {!isLoading && !error && (
        <div className="space-y-3">
          {items.map((report) => <FeedbackCard key={report.id} report={report} />)}
          {items.length === 0 && (
            <div className="text-[13px] py-10 text-center rounded-xl border" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>
              No {tab === 'all' ? '' : tab} reports.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QaFeedbackReviewPage
