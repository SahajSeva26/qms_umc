import { useState } from 'react'
import { FiCheckCircle, FiExternalLink } from 'react-icons/fi'
import { useQaFeedback } from '@/features/qa-feedback/hooks/useQaFeedback'
import type { QaFeedbackEntity, QaFeedbackStatus } from '@/types/qaFeedback.types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

const STATUS_TABS: { id: QaFeedbackStatus | 'all'; label: string }[] = [
  { id: 'open', label: 'Open' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All' },
]

const reporterLabel = (reportedBy: QaFeedbackEntity['reportedBy']): string => {
  if (typeof reportedBy === 'string') return reportedBy
  return `${reportedBy.firstName}${reportedBy.lastName ? ` ${reportedBy.lastName}` : ''} (${reportedBy.email})`
}

const FeedbackCard = ({ report }: { report: QaFeedbackEntity }) => {
  const { updateFeedback, isUpdating } = useQaFeedback()
  const [note, setNote] = useState(report.resolutionNote)
  const [noteOpen, setNoteOpen] = useState(false)

  const toggleResolved = () => {
    updateFeedback(report.id, {
      status: report.status === 'open' ? 'resolved' : 'open',
      resolutionNote: note,
    })
  }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <div className="flex items-start gap-4">
        {/* Rough-position diagram, not a screenshot — a plain rectangle
            standing in for "the page," with a dot at the reported
            pinXPercent/pinYPercent. No visual capture is stored; this is
            purely so a reviewer has SOME spatial sense (e.g. "top-left" vs
            "bottom-right") without an actual image of the screen. */}
        <div
          className="relative shrink-0 rounded-lg border"
          style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-strong)', width: 96, height: 64 }}
          title={`${report.pinXPercent.toFixed(0)}%, ${report.pinYPercent.toFixed(0)}% of the page`}
        >
          <div
            className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
            style={{ left: `${report.pinXPercent}%`, top: `${report.pinYPercent}%`, background: 'var(--qms-brand)' }}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>
                <FiExternalLink size={12} />
                {report.pageTitle || report.pageRoute}
                <span className="font-mono text-[11px]">{report.pageRoute}</span>
              </div>
              <p className="text-[13px] mt-1.5" style={{ color: 'var(--qms-text)' }}>{report.comment}</p>
            </div>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
              style={{
                background: report.status === 'resolved' ? 'var(--qms-surface-strong)' : 'color-mix(in oklch, var(--qms-brand), transparent 88%)',
                color: report.status === 'resolved' ? 'var(--qms-text-muted)' : 'var(--qms-brand)',
              }}
            >
              {report.status === 'resolved' ? 'RESOLVED' : 'OPEN'}
            </span>
          </div>

          <div className="text-[11px] mt-2" style={{ color: 'var(--qms-text-muted)' }}>
            Reported by {reporterLabel(report.reportedBy)} · {new Date(report.createdAt).toLocaleString('en-IN')}
          </div>

          {report.resolutionNote && !noteOpen && (
            <div className="text-[12px] mt-2 rounded-lg px-2.5 py-1.5" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>
              Note: {report.resolutionNote}
            </div>
          )}

          {noteOpen && (
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note — e.g. 'fixed in commit abc123' or 'not a bug'"
              rows={2}
              className="mt-2"
            />
          )}

          <div className="flex items-center gap-2 mt-2.5">
            <Button size="sm" variant="ghost" onClick={() => setNoteOpen((v) => !v)}>
              {noteOpen ? 'Hide note' : 'Add note'}
            </Button>
            <Button size="sm" onClick={toggleResolved} disabled={isUpdating}>
              <FiCheckCircle size={13} />
              {report.status === 'open' ? 'Mark resolved' : 'Reopen'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const QaFeedbackReviewPage = () => {
  const [tab, setTab] = useState<QaFeedbackStatus | 'all'>('open')
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
