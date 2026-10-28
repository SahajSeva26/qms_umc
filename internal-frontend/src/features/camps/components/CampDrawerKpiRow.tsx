import { useRatings } from '@/features/rating/hooks/useRatings'
import type { CampStats } from '@/types/campReal.types'

// Rx count and Feedback have no backing data model yet (no prescription entity, no patient
// feedback entity) — shown honestly as "Coming soon". FO rating is wired to the real rating
// module below.
const PLACEHOLDER_TILES = ['Rx count', 'Feedback'] as const

interface CampDrawerKpiRowProps {
  campId: string
  stats: CampStats | undefined
  // Settled but this camp wasn't in the result window — distinct from "still loading" (see CampDrawer.tsx's statsQuery).
  notFound: boolean
  // The stats search's own fetch error — must render as a distinct error+retry state.
  error: unknown
  onRetry: () => void
  patientExpectation: number
}

// Matches the prototype's .id-kpi-grid (4-col grid, 2-col under 720px) / .id-kpi tile styling.
const KpiTile = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="rounded-[14px] border p-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
    <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
    <div className="text-[18px] font-extrabold tracking-tight mt-0.5" style={{ color: 'var(--qms-text)' }}>{children}</div>
  </div>
)

const FoRatingTile = ({ campId }: { campId: string }) => {
  const { items, isLoading } = useRatings({ camp: campId })
  const rating = items[0]

  return (
    <KpiTile label="FO rating">
      {isLoading ? (
        <span className="text-[13px] font-bold italic" style={{ color: 'var(--qms-text-muted)' }}>Loading…</span>
      ) : rating ? (
        <>
          {rating.overall.toFixed(1)}
          <span className="text-[11px] font-normal ml-1" style={{ color: 'var(--qms-text-muted)' }}>★ from pharma</span>
        </>
      ) : (
        <span className="text-[13px] font-bold italic" style={{ color: 'var(--qms-text-muted)' }}>Not yet rated</span>
      )}
    </KpiTile>
  )
}

const CampDrawerKpiRow = ({ campId, stats, notFound, error, onRetry, patientExpectation }: CampDrawerKpiRowProps) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
    <KpiTile label="Patients">
      {stats ? (
        <>
          {stats.patientsCompleted}/{stats.patients || patientExpectation}
          {stats.patients > 0 && (
            <span className="text-[11px] font-normal ml-1" style={{ color: 'var(--qms-text-muted)' }}>
              {Math.round((stats.patientsCompleted / stats.patients) * 100)}% done
            </span>
          )}
        </>
      ) : error ? (
        <button onClick={onRetry} className="text-[13px] font-bold italic underline decoration-dotted text-danger">
          Couldn't load — retry
        </button>
      ) : notFound ? (
        <span className="text-[13px] font-bold italic" style={{ color: 'var(--qms-text-muted)' }}>Unavailable</span>
      ) : (
        <span className="text-[13px] font-bold italic" style={{ color: 'var(--qms-text-muted)' }}>Loading…</span>
      )}
    </KpiTile>

    {PLACEHOLDER_TILES.map((label) => (
      <KpiTile key={label} label={label}>
        <span className="text-[13px] font-bold italic" style={{ color: '#8b5cf6' }}>Coming soon</span>
      </KpiTile>
    ))}

    <FoRatingTile campId={campId} />
  </div>
)

export default CampDrawerKpiRow
