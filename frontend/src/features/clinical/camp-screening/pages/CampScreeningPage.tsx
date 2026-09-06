import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft } from 'react-icons/fi'
import { useCampReal } from '@/features/camps/hooks/useCampReal'
import { usePermission } from '@/hooks/usePermission'
import { canRunScreening } from '@/features/camps/campsReal.utils'
import ScreeningList from '@/features/clinical/screening/components/ScreeningList'
import ScreeningDetail from '@/features/clinical/screening/components/ScreeningDetail'
import TestRecordingSection from '@/features/clinical/test-result/components/TestRecordingSection'
import { useScreening } from '@/features/clinical/screening/hooks/useScreening'

// The route only checks "can this role touch Screening at all" — this page
// does the precise assigned-FO check, since it needs the camp's own `fo` field.
const CampScreeningPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasAnyPermission, session } = usePermission()
  const canManageScreening = hasAnyPermission(['screening:manage', 'system:manage'])

  const { data, isLoading, error } = useCampReal(id)
  const camp = data?.data ?? null

  const [openScreeningId, setOpenScreeningId] = useState<string | null>(null)
  // Re-fetches live rather than trusting the row snapshot from the list click.
  const { data: openScreeningData } = useScreening(openScreeningId ?? undefined)
  const openScreening = openScreeningData?.data ?? null

  const canWrite = camp ? canRunScreening(camp, session?.role.id, session?.roleType.code, canManageScreening) : false

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate(`/camps/${id}`)}
        className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
        style={{ color: 'var(--qms-text-soft)' }}
      >
        <FiArrowLeft size={14} />
        Back to camp
      </button>

      {isLoading && (
        <div className="text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
          Loading camp…
        </div>
      )}

      {error && !isLoading && (
        <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
          Failed to load camp. Please try again.
        </div>
      )}

      {camp && !isLoading && (
        <>
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--qms-text)' }}>{camp.code} — Screening</h1>
          <p className="text-[12px] mb-5" style={{ color: 'var(--qms-text-muted)' }}>{camp.location ? `${camp.location.city}, ${camp.location.state}` : 'Location unavailable'} · {camp.date}</p>

          {camp.status !== 'live' ? (
            <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              This camp is not live — screening can only be run while a camp is live.
            </div>
          ) : !canWrite ? (
            <div className="text-[13px] rounded-xl px-3 py-2 bg-danger-soft border border-danger text-danger">
              Only the field officer assigned to this camp (or a screening manager) can run its screenings.
            </div>
          ) : openScreening ? (
            openScreening.status === 'completed' ? (
              <div className="space-y-5">
                <ScreeningDetail
                  screening={openScreening}
                  canWrite={canWrite}
                  canMoveStage={canWrite}
                  onClose={() => setOpenScreeningId(null)}
                />
                <TestRecordingSection camp={camp} screeningId={openScreening.id} />
              </div>
            ) : (
              <ScreeningDetail
                screening={openScreening}
                canWrite={canWrite}
                canMoveStage={canWrite}
                onClose={() => setOpenScreeningId(null)}
              />
            )
          ) : (
            <ScreeningList campId={camp.id} canWrite={canWrite} onOpen={(s) => setOpenScreeningId(s.id)} />
          )}
        </>
      )}
    </div>
  )
}

export default CampScreeningPage
