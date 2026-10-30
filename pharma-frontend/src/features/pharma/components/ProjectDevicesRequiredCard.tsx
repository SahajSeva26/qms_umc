import { FiWind } from 'react-icons/fi'
import { useProjectRequirements } from '@/features/pharma/hooks/useProjectRequirements'
import { CAMP_TYPE_LABEL, type CampType } from '@/types/campReal.types'

interface ProjectDevicesRequiredCardProps {
  projectId: string | null
  campType: CampType | ''
}

// Matches the prototype's camp-package card styling (dashed/tinted) without a package concept —
// tinted by the camp type instead.
const TYPE_COLOR: Record<CampType, string> = {
  screening: '#3b6dff',
  diet: '#10b981',
  lab: '#a855f7',
}

// Purely informational, never blocks submit. GET /projects/:id/requirements isn't built yet (see
// md-files/BACKEND_REQUEST_book-camp-requirements.md) — 404s until then, shown via Retry below.
const ProjectDevicesRequiredCard = ({ projectId, campType }: ProjectDevicesRequiredCardProps) => {
  const enabled = !!projectId && !!campType
  const { data, isLoading, error, refetch } = useProjectRequirements(projectId, enabled)

  if (!enabled) return null

  const color = (campType && TYPE_COLOR[campType]) || 'var(--qms-brand)'
  const devices = data?.data?.devices ?? []

  return (
    <div
      className="rounded-[10px] px-3 py-2.5 mt-2"
      style={{
        border: `1px dashed color-mix(in srgb, ${color} 40%, transparent)`,
        background: `color-mix(in srgb, ${color} 7%, transparent)`,
      }}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <FiWind size={15} style={{ color }} />
        {campType && (
          <span
            className="text-[12px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
          >
            {CAMP_TYPE_LABEL[campType]}
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5 animate-pulse">
          <span className="h-5 w-24 rounded-full" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }} />
          <span className="h-5 w-20 rounded-full" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }} />
          <span className="h-5 w-28 rounded-full" style={{ background: `color-mix(in srgb, ${color} 14%, transparent)` }} />
        </div>
      ) : error ? (
        <div className="flex items-center justify-between gap-2 text-[12px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          <span>Couldn't load this project's device requirements.</span>
          <button type="button" onClick={() => refetch()} className="shrink-0 font-semibold underline decoration-dotted underline-offset-2 hover:no-underline" style={{ color }}>
            Retry
          </button>
        </div>
      ) : devices.length === 0 ? (
        <div className="text-[11px] mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>
          This project's tests require no devices.
        </div>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
          <span className="text-[11px] font-bold" style={{ color: 'var(--qms-text-muted)' }}>
            Devices required:
          </span>
          {devices.map((d) => (
            <span
              key={d.id}
              className="text-[12px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color: 'var(--qms-text-soft)' }}
            >
              {d.name ?? d.code ?? d.id}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export default ProjectDevicesRequiredCard
