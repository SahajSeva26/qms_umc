import { FiWind } from 'react-icons/fi'
import { useProjectRequiredDevices } from '@/hooks/useProjectRequiredDevices'
import type { ProjectPopulatedTest } from '@/types/project.types'
import { CAMP_TYPE_LABEL, type CampType } from '@/types/campReal.types'

interface ProjectDevicesRequiredCardProps {
  testIds: (ProjectPopulatedTest | string)[]
  campType?: CampType | ''
}

// Prototype's camp-package picker (camp-booking.js packagePickerHtml) shows a dashed, tinted card
// with a type pill + "Devices required" chips once a package is picked. We don't have a package
// concept — this derives the same visual from real Project.tests[] -> TestMaster.consumption data
// instead (see useProjectRequiredDevices), tinted by the camp type's own color (prototype's typeColor()).
const TYPE_COLOR: Record<CampType, string> = {
  screening: '#3b6dff',
  diet: '#10b981',
  lab: '#a855f7',
}

const ProjectDevicesRequiredCard = ({ testIds, campType }: ProjectDevicesRequiredCardProps) => {
  const { devices, isLoading, isError } = useProjectRequiredDevices(testIds, testIds.length > 0)

  if (testIds.length === 0 || isLoading || isError || devices.length === 0) {
    return null
  }

  const color = (campType && TYPE_COLOR[campType]) || 'var(--qms-brand)'

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
    </div>
  )
}

export default ProjectDevicesRequiredCard
