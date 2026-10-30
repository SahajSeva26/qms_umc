import { FiZap, FiPlay } from 'react-icons/fi'

interface AiCopilotBannerProps {
  message: string
}

// Matches the prototype's .ai-banner (styles.css:423-450) — gradient surface, violet→brand icon tile.
// The prototype's own message reads target attainment/at-risk/exceeded/coverage numbers — all of
// which need a Targets module we don't have (see crm.myKpis.ts), so the copy here is built from
// whatever real KPI numbers the caller passes in instead. "Coach team" is a stub even in the
// prototype itself (just a toast placeholder) — kept disabled here rather than wired to nothing.
const AiCopilotBanner = ({ message }: AiCopilotBannerProps) => (
  <div
    className="relative flex items-center gap-4 overflow-hidden mb-5.5"
    style={{
      padding: '16px 20px',
      borderRadius: 20,
      background: 'linear-gradient(120deg, rgba(123,224,212,.18), rgba(91,140,255,.18) 50%, rgba(139,92,246,.18))',
      border: '1px solid var(--qms-border-strong)',
    }}
  >
    <div
      className="w-10 h-10 rounded-xl grid place-items-center text-white shrink-0"
      style={{ background: 'linear-gradient(135deg, #8b5cf6, var(--qms-brand))', boxShadow: '0 10px 24px -8px rgba(139,92,246,.6)' }}
    >
      <FiZap size={18} />
    </div>
    <div className="flex-1 text-[14px]" style={{ color: 'var(--qms-text-soft)' }}>
      <b style={{ color: 'var(--qms-text)' }}>Sales copilot: </b>
      {message}
    </div>
    <button
      type="button"
      disabled
      title="Coaching plan generator — not available yet"
      className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold shrink-0 opacity-60 cursor-not-allowed"
      style={{ borderColor: 'var(--qms-border-strong)', color: 'var(--qms-text-soft)' }}
    >
      <FiPlay size={14} /> Coach team
    </button>
  </div>
)

export default AiCopilotBanner
