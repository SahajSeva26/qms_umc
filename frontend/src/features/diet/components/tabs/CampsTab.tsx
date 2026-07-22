import { useState } from 'react'
import type { Camp } from '@/types/camp.types'
import type { Dietitian, DietStage } from '@/features/diet/diet.types'
import type { useDietCamps } from '@/features/diet/hooks/useDietCamps'
import DietCampCard from '@/features/diet/components/DietCampCard'
import DietCampDetail from '@/features/diet/components/DietCampDetail'
import AssignTeamModal from '@/features/diet/components/AssignTeamModal'

interface CampsTabProps {
  camps: Camp[]
  dietitians: Dietitian[]
  viewOnly: boolean
  statusFilter: DietStage | 'ALL'
  onSelectStatus: (s: DietStage | 'ALL') => void
  diet: ReturnType<typeof useDietCamps>
}

const STATUS_PILLS: { id: DietStage | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'REQUESTED', label: 'Requested' },
  { id: 'ASSIGNED', label: 'Diet Assigned' },
  { id: 'UPCOMING', label: 'Upcoming' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'CANCELLED', label: 'Cancelled' },
  { id: 'CHARGED', label: 'Cancelled · Charged' },
]

const CampsTab = ({ camps, dietitians, viewOnly, statusFilter, onSelectStatus, diet }: CampsTabProps) => {
  const [openCampId, setOpenCampId] = useState<string | null>(null)
  const [assignCampId, setAssignCampId] = useState<string | null>(null)

  const openCamp = camps.find((c) => c.id === openCampId) ?? null
  const assignCamp = camps.find((c) => c.id === assignCampId) ?? null

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        {STATUS_PILLS.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectStatus(p.id)}
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors"
            style={{
              borderColor: statusFilter === p.id ? 'var(--qms-brand)' : 'var(--qms-border)',
              background: statusFilter === p.id ? 'rgba(59,109,255,.1)' : 'transparent',
              color: statusFilter === p.id ? 'var(--qms-brand)' : 'var(--qms-text-muted)',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {camps.map((camp) => (
          <DietCampCard
            key={camp.id}
            camp={camp}
            dietitians={dietitians}
            viewOnly={viewOnly}
            onOpen={setOpenCampId}
            onInvite={setAssignCampId}
            onAssign={setAssignCampId}
            onOpenAssessments={setOpenCampId}
          />
        ))}
        {camps.length === 0 && (
          <div className="col-span-full text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
            No diet camps in this view.
          </div>
        )}
      </div>

      <DietCampDetail
        camp={openCamp}
        dietitians={dietitians}
        viewOnly={viewOnly}
        diet={diet}
        onClose={() => setOpenCampId(null)}
        onAssignTeam={() => { setAssignCampId(openCampId); setOpenCampId(null) }}
      />

      {assignCamp && (
        <AssignTeamModal
          open={!!assignCamp}
          camp={assignCamp}
          dietitians={dietitians}
          onClose={() => setAssignCampId(null)}
          onConfirm={(dietitianId, foId) => { diet.assignTeam(assignCamp.id, dietitianId, foId); setAssignCampId(null) }}
        />
      )}
    </div>
  )
}

export default CampsTab
