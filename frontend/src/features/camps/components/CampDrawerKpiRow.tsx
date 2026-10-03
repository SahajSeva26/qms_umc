import type { CampStats } from '@/types/campReal.types'

// Patients is derivable from the screening collection; the other 3 have no backing field on CampEntity, so stay placeholders.
const PLACEHOLDER_TILES = ['Rx count', 'Feedback', 'FO rating'] as const

interface CampDrawerKpiRowProps {
  stats: CampStats | undefined
  // Settled but this camp wasn't in the result window — distinct from "still loading" (see CampDrawer.tsx's statsQuery).
  notFound: boolean
  // The stats search's own fetch error — must render as a distinct error+retry state.
  error: unknown
  onRetry: () => void
  patientExpectation: number
}

const CampDrawerKpiRow = ({ stats, notFound, error, onRetry, patientExpectation }: CampDrawerKpiRowProps) => (
  <div className="grid grid-cols-2 gap-2 mb-4">
    <div className="rounded-[14px] border p-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
      <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Patients</div>
      {stats ? (
        <div className="text-[13px] font-bold mt-0.5" style={{ color: 'var(--qms-text)' }}>
          {stats.patientsCompleted}/{stats.patients || patientExpectation}
          {stats.patients > 0 && (
            <span className="font-normal ml-1" style={{ color: 'var(--qms-text-muted)' }}>
              ({Math.round((stats.patientsCompleted / stats.patients) * 100)}% done)
            </span>
          )}
        </div>
      ) : error ? (
        <button onClick={onRetry} className="text-[13px] font-bold italic mt-0.5 underline decoration-dotted text-danger">
          Couldn't load — retry
        </button>
      ) : notFound ? (
        <div className="text-[13px] font-bold italic mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>Unavailable</div>
      ) : (
        <div className="text-[13px] font-bold italic mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
      )}
    </div>
    {PLACEHOLDER_TILES.map((label) => (
      <div
        key={label}
        className="rounded-[14px] border p-2.5"
        style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}
      >
        <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
        <div className="text-[13px] font-bold italic mt-0.5" style={{ color: '#8b5cf6' }}>Coming soon</div>
      </div>
    ))}
  </div>
)

export default CampDrawerKpiRow
