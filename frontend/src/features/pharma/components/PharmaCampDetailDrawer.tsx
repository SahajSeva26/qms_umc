import { useState, type ReactNode } from 'react'
import { FiStar, FiFileText } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import StageHistoryList from '@/components/ui/StageHistoryList'
import { Button } from '@/components/ui/button'
import CampDashboardStatusPill from '@/features/pharma/components/CampDashboardStatusPill'
import CampTypePillReal from '@/components/widgets/camp/CampTypePillReal'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import { specializationLabel } from '@/types/doctor.types'
import type { CampEntity, CampPopulatedDoctor, CampPopulatedRole } from '@/types/campReal.types'
import { useSession } from '@/hooks/useSession'
import { useRatings } from '@/features/rating/hooks/useRatings'
import RatingDisplay from '@/features/rating/components/RatingDisplay'
import RateCampModal from '@/features/rating/components/RateCampModal'

interface PharmaCampDetailDrawerProps {
  camp: CampEntity | null
  onClose: () => void
  /** Second of the prototype's two dossier entry points (the row-end icon button is the first). */
  onOpenDossier?: () => void
}

const doctorName = (doctor: CampEntity['doctor']) =>
  doctor && typeof doctor !== 'string' ? (doctor as CampPopulatedDoctor).name : (doctor ?? '—')

const doctor = (camp: CampEntity): CampPopulatedDoctor | null =>
  camp.doctor && typeof camp.doctor !== 'string' ? (camp.doctor as CampPopulatedDoctor) : null

const roleName = (role: CampEntity['fo']) =>
  role && typeof role !== 'string' ? (role as CampPopulatedRole).name : (role ?? undefined)

const Section = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="mt-4">
    <div className="text-[11px] font-extrabold uppercase tracking-[.06em] mb-2" style={{ color: 'var(--qms-text-muted)' }}>{title}</div>
    <div className="rounded-[14px] border p-3 space-y-1.5" style={{ borderColor: 'var(--qms-border)' }}>{children}</div>
  </div>
)

const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="flex items-start justify-between gap-3">
    <span className="text-[11px] font-semibold uppercase tracking-wider shrink-0" style={{ color: 'var(--qms-text-muted)' }}>{label}</span>
    <span className="text-[13px] text-right" style={{ color: 'var(--qms-text)' }}>{value}</span>
  </div>
)

// Rx count has no backing data model yet (no prescription entity) — shown honestly as
// "Coming soon", matching CampDrawerKpiRow's convention. FO rating is wired to the real
// rating module below (its own Section, not a tile — see RatingSection).
const KpiTile = ({ label, value, placeholder }: { label: string; value?: string; placeholder?: boolean }) => (
  <div className="rounded-[14px] border p-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
    <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
    <div className="text-[13px] font-bold italic mt-0.5" style={placeholder ? { color: '#8b5cf6' } : { color: 'var(--qms-text)' }}>
      {placeholder ? 'Coming soon' : value}
    </div>
  </div>
)

const mrRoleId = (mr: CampEntity['mr']): string | undefined =>
  mr && typeof mr !== 'string' ? (mr as CampPopulatedRole)._id : (mr ?? undefined)

// FO / camp rating — only the camp's own MR may rate, and only once the camp is closed
// (mirrors the backend's assertCampMrOrManage + RATEABLE_CAMP_STATUSES). Always offers an
// edit entry point once rated, unlike the prototype which hides the action entirely.
const RatingSection = ({ camp }: { camp: CampEntity }) => {
  const { session } = useSession()
  const [modalOpen, setModalOpen] = useState(false)
  const isOwnMr = !!session?.role.id && session.role.id === mrRoleId(camp.mr)
  const canRate = isOwnMr && camp.status === 'closed'

  const { items, isLoading } = useRatings({ camp: camp.id }, { enabled: canRate || camp.status === 'closed' })
  const existing = items[0] ?? null

  if (!canRate && !existing) return null

  return (
    <Section title="FO / camp rating">
      {isLoading ? (
        <div className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>Loading…</div>
      ) : existing ? (
        <>
          <RatingDisplay rating={existing} />
          {canRate && (
            <Button variant="outline" size="sm" className="mt-2" onClick={() => setModalOpen(true)}>
              <FiStar size={12} /> Edit rating
            </Button>
          )}
        </>
      ) : canRate ? (
        <Button size="sm" onClick={() => setModalOpen(true)}>
          <FiStar size={12} /> Rate camp
        </Button>
      ) : null}

      {modalOpen && (
        <RateCampModal open campId={camp.id} existing={existing} onClose={() => setModalOpen(false)} />
      )}
    </Section>
  )
}

// Pharma field force (camp:book) can read a camp but has no stage-move capability (camp:manage only), so this stays display-only.
const PharmaCampDetailDrawer = ({ camp, onClose, onOpenDossier }: PharmaCampDetailDrawerProps) => {
  if (!camp) return null

  const isDiet = camp.type === 'diet'
  const d = doctor(camp)
  const worker = isDiet ? camp.dietitian : camp.fo
  const patientsDone = camp.stats?.patientsCompleted
  const patientsTotal = camp.stats?.patients || camp.patientExpectation

  return (
    <SideDrawer open title={`Camp · ${camp.code}`} onClose={onClose} widthClassName="max-w-lg">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <CampTypePillReal type={camp.type} />
          <CampDashboardStatusPill status={camp.status} />
        </div>
        <div className="text-[12px] text-right" style={{ color: 'var(--qms-text-muted)' }}>
          {new Date(camp.date).toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' })}
          {camp.timeSlot && <> · {CAMP_TIME_SLOT_LABEL[camp.timeSlot]}</>}
        </div>
      </div>

      {onOpenDossier && (
        <Button variant="outline" size="sm" className="mb-4 w-full" onClick={onOpenDossier}>
          <FiFileText size={13} /> Open camp dossier
        </Button>
      )}

      <Section title="Doctor">
        <Row label="Name" value={doctorName(camp.doctor)} />
        <Row label="Specialization" value={specializationLabel(d?.specialization)} />
        <Row label="Location" value={camp.location ? `${camp.location.city}, ${camp.location.state}` : 'Location unavailable'} />
      </Section>

      <Section title={isDiet ? 'Dietitian' : 'Field Officer'}>
        <Row label="Name" value={roleName(worker) ?? 'Not yet assigned'} />
        <Row label="MR" value={roleName(camp.mr) ?? '—'} />
      </Section>

      <div className="grid grid-cols-2 gap-2 mt-4">
        <KpiTile label="Patients" value={`${patientsDone ?? 0} / ${patientsTotal}`} />
        <KpiTile label="Rx count" placeholder />
        <KpiTile label="Feedback" placeholder />
      </div>

      <RatingSection camp={camp} />

      {camp.notes && (
        <Section title="Notes">
          <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{camp.notes}</p>
        </Section>
      )}

      <div className="mt-4">
        <StageHistoryList entries={camp.stageHistory.map((e) => ({ ...e, at: e.createdAt }))} />
      </div>
    </SideDrawer>
  )
}

export default PharmaCampDetailDrawer
