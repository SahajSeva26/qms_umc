import SideDrawer from '@/components/ui/SideDrawer'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import CampStatusPillReal from '@/components/widgets/camp/CampStatusPillReal'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import type { CampEntity, CampPopulatedDoctor, CampPopulatedRole } from '@/types/campReal.types'

interface PharmaCampDetailDrawerProps {
  camp: CampEntity | null
  onClose: () => void
}

const doctorName = (doctor: CampEntity['doctor']) =>
  doctor && typeof doctor !== 'string' ? (doctor as CampPopulatedDoctor).name : (doctor ?? '—')

const roleName = (role: CampEntity['fo']) =>
  role && typeof role !== 'string' ? (role as CampPopulatedRole).name : (role ?? undefined)

// Pharma field force (camp:book) can read a camp but has no stage-move capability (camp:manage only), so this stays display-only.
const PharmaCampDetailDrawer = ({ camp, onClose }: PharmaCampDetailDrawerProps) => {
  if (!camp) return null

  return (
    <SideDrawer open title={`Camp · ${camp.code}`} onClose={onClose}>
      <div className="flex items-center gap-2 mb-4">
        <CampStatusPillReal status={camp.status} />
      </div>

      <KeyValueGrid
        items={[
          { label: 'Doctor', value: doctorName(camp.doctor) },
          { label: 'Date', value: new Date(camp.date).toLocaleDateString() },
          { label: 'Time slot', value: camp.timeSlot ? CAMP_TIME_SLOT_LABEL[camp.timeSlot] : undefined },
          { label: 'Type', value: camp.type },
          { label: 'Location', value: camp.location ? `${camp.location.city}, ${camp.location.state}` : undefined },
          { label: 'Expected patients', value: camp.patientExpectation },
          { label: 'MR', value: roleName(camp.mr) },
          {
            label: camp.type === 'diet' ? 'Dietitian' : 'Field Officer',
            value: roleName(camp.type === 'diet' ? camp.dietitian : camp.fo) ?? 'Not yet assigned',
          },
        ]}
      />

      {camp.notes && (
        <div className="mt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--qms-text-muted)' }}>
            Notes
          </div>
          <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{camp.notes}</p>
        </div>
      )}
    </SideDrawer>
  )
}

export default PharmaCampDetailDrawer
