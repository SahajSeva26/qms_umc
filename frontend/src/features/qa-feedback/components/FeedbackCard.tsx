import { useState } from 'react'
import { FiExternalLink } from 'react-icons/fi'
import { useQaFeedback } from '@/features/qa-feedback/hooks/useQaFeedback'
import type { QaFeedbackEntity } from '@/types/qaFeedback.types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

// Jira Cloud base — not a secret, matches backend/src/shared/config/app.config.ts's default.
const JIRA_BASE_URL = 'https://sahajseva.atlassian.net'

const reporterLabel = (reportedBy: QaFeedbackEntity['reportedBy']): string => {
  if (typeof reportedBy === 'string') return reportedBy
  return `${reportedBy.firstName}${reportedBy.lastName ? ` ${reportedBy.lastName}` : ''} (${reportedBy.email})`
}

interface FeedbackCardProps {
  report: QaFeedbackEntity
  // The per-page popover shows a denser card with no pin diagram/note-editing (read-only, any user);
  // the full review page keeps the richer reviewer-only card. Same data, two presentations.
  compact?: boolean
}

// Shared by QaFeedbackReviewPage (full reviewer dashboard) and the per-page FeedbackWidget popover.
const FeedbackCard = ({ report, compact = false }: FeedbackCardProps) => {
  // fetchList=false — this card only ever updates ITS OWN report (passed in as a prop from the
  // already-fetched list), it never reads items/count itself. Without this, every rendered card
  // fired its own redundant GET /qa-feedback?limit=100.
  const { updateFeedback, isUpdating } = useQaFeedback({}, false)
  const [note, setNote] = useState(report.resolutionNote)
  const [noteOpen, setNoteOpen] = useState(false)

  // Status is owned elsewhere now — the Jira webhook overwrites it from Jira's own workflow, so this
  // card never mutates `status` itself. resolutionNote is a genuinely independent, directly-editable field.
  const saveNote = () => updateFeedback(report.id, { resolutionNote: note })

  if (compact) {
    return (
      <div className="rounded-lg border p-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
        <div className="flex items-start justify-between gap-2">
          <p className="text-[12px] min-w-0" style={{ color: 'var(--qms-text)' }}>{report.comment}</p>
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{
              background: report.status === 'open' ? 'color-mix(in oklch, var(--qms-brand), transparent 88%)' : 'var(--qms-surface-strong)',
              color: report.status === 'open' ? 'var(--qms-brand)' : 'var(--qms-text-muted)',
            }}
          >
            {report.status.toUpperCase()}
          </span>
        </div>
        <div className="text-[10px] mt-1.5 flex items-center gap-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          <span className="truncate">{reporterLabel(report.reportedBy)} · {new Date(report.createdAt).toLocaleDateString('en-IN')}</span>
          <a
            href={`${JIRA_BASE_URL}/browse/${report.issueKey}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 font-semibold hover:underline shrink-0"
            style={{ color: 'var(--qms-brand)' }}
          >
            <FiExternalLink size={10} />
            {report.issueKey}
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
      <div className="flex items-start gap-4">
        {/* Rough-position diagram, not a screenshot — a plain rectangle standing in for "the page,"
            with a dot at the reported pinXPercent/pinYPercent. No visual capture is stored. */}
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
                background: report.status === 'open' ? 'color-mix(in oklch, var(--qms-brand), transparent 88%)' : 'var(--qms-surface-strong)',
                color: report.status === 'open' ? 'var(--qms-brand)' : 'var(--qms-text-muted)',
              }}
            >
              {report.status.toUpperCase()}
            </span>
          </div>

          <div className="text-[11px] mt-2 flex items-center gap-2" style={{ color: 'var(--qms-text-muted)' }}>
            <span>Reported by {reporterLabel(report.reportedBy)} · {new Date(report.createdAt).toLocaleString('en-IN')}</span>
            <a
              href={`${JIRA_BASE_URL}/browse/${report.issueKey}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold hover:underline"
              style={{ color: 'var(--qms-brand)' }}
            >
              <FiExternalLink size={11} />
              {report.issueKey}
            </a>
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
            {noteOpen && (
              <Button size="sm" onClick={saveNote} disabled={isUpdating}>
                {isUpdating ? 'Saving…' : 'Save note'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default FeedbackCard
