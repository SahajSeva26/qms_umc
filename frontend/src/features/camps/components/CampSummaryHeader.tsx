import CampStatusPillReal from '@/features/camps/components/CampStatusPillReal'
import type { CampEntity, CampPopulatedDivision, CampPopulatedDoctor, CampPopulatedProject } from '@/features/camps/campReal.types'

type RefValue<T> = T | string | null | undefined

interface CampSummaryHeaderProps {
  camp: CampEntity | null
  isCreateMode: boolean
  doctorName: (value: RefValue<CampPopulatedDoctor>) => string
  divisionName: (value: RefValue<CampPopulatedDivision>) => string
  projectName: (value: RefValue<CampPopulatedProject>) => string
}

const CampSummaryHeader = ({ camp, isCreateMode, doctorName, divisionName, projectName }: CampSummaryHeaderProps) => {
  return (
    <div
      className="rounded-xl border p-5 mb-5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      {isCreateMode ? (
        <div className="text-lg font-bold" style={{ color: 'var(--qms-text)' }}>New camp</div>
      ) : (
        camp && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-lg font-bold truncate" style={{ color: 'var(--qms-text)' }}>
                {doctorName(camp.doctor)} · {divisionName(camp.division)}
              </div>
              <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                {camp.city}, {camp.state} · {new Date(camp.date).toLocaleDateString()}
              </div>
              {camp.project && (
                <div className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
                  Project: {projectName(camp.project)}
                </div>
              )}
            </div>
            <CampStatusPillReal status={camp.status} />
          </div>
        )
      )}
    </div>
  )
}

export default CampSummaryHeader
