import type { ReactNode } from 'react'
import { FiShield, FiLock, FiStar, FiImage, FiActivity, FiNavigation, FiMapPin, FiHome, FiUser } from 'react-icons/fi'
import { CampRatingSection } from '@qms/widgets'
import { useSession } from '@/hooks/useSession'
import api from '@/lib/api/api'
import { toast } from '@/components/ui/sonner'
import { getApiErrorMessage } from '@/utils/apiError'
import { specializationLabel } from '@/types/doctor.types'
import { CAMP_TIME_SLOT_LABEL } from '@/types/campTimeSlot.constants'
import { CAMP_TYPE_LABEL } from '@/types/campReal.types'
import type { CampEntity, CampPopulatedDoctor, CampPopulatedProject, CampPopulatedRole } from '@/types/campReal.types'

// Clones the prototype's camp-detail.js `cd-*` design system. Mirrors internal-frontend's equivalent.

const populatedRole = (r: CampEntity['fo']): CampPopulatedRole | null => (r && typeof r !== 'string' ? r : null)
const populatedDoctor = (d: CampEntity['doctor']): CampPopulatedDoctor | null => (d && typeof d !== 'string' ? d : null)
const populatedProject = (p: CampEntity['project']): CampPopulatedProject | null => (p && typeof p !== 'string' ? p : null)

const CARD_ACCENTS = {
  camp: '#3b6dff',
  doctor: '#a855f7',
  worker: '#0ea5e9',
  photos: '#0ea5e9',
  patients: '#14b8a6',
  rating: '#f59e0b',
} as const

const initials = (name: string) => (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()

const STRING_PALETTE = ['#3b6dff', '#a855f7', '#10b981', '#f59e0b', '#0ea5e9', '#ec4899', '#14b8a6', '#7c5cff', '#f43f5e', '#84cc16']
const stringToColor = (s: string) => {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return STRING_PALETTE[h % STRING_PALETTE.length]
}

const Avatar = ({ name, size = 30 }: { name: string; size?: number }) => (
  <div
    className="rounded-full flex items-center justify-center text-white font-extrabold shrink-0"
    style={{ width: size, height: size, background: stringToColor(name), fontSize: Math.round(size * 0.36) }}
  >
    {initials(name)}
  </div>
)

const CardIcon = ({ icon: Icon, color }: { icon: typeof FiHome; color: string }) => (
  <span
    className="rounded-lg flex items-center justify-center shrink-0"
    style={{ width: 26, height: 26, background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
  >
    <Icon size={14} />
  </span>
)

const Card = ({ title, icon, color, children }: { title: string; icon: typeof FiHome; color: string; children: ReactNode }) => (
  <div className="rounded-[14px] border overflow-hidden mb-2.5" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}>
    <div className="px-3.5 py-2.5 flex items-center gap-2 border-b" style={{ borderColor: 'var(--qms-border)' }}>
      <CardIcon icon={icon} color={color} />
      <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>{title}</div>
    </div>
    <div className="p-3.5">{children}</div>
  </div>
)

const Field = ({ label, value }: { label: string; value: ReactNode }) => (
  <div>
    <div className="text-[10.5px] font-bold uppercase tracking-wide mb-0.5" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
    <div className="text-[13px] font-bold" style={{ color: 'var(--qms-text)' }}>{value}</div>
  </div>
)

const FieldGrid = ({ children }: { children: ReactNode }) => (
  <div className="grid gap-x-3 gap-y-2" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>{children}</div>
)

const Empty = ({ children }: { children: ReactNode }) => (
  <div className="text-[12px] italic text-center py-2.5" style={{ color: 'var(--qms-text-muted)' }}>{children}</div>
)

// Header — avatar (last 3 chars of camp code, hash-colored), title line, pills row, and the
// pharma-view/internal badge.
const DossierHeader = ({ camp }: { camp: CampEntity }) => {
  const project = populatedProject(camp.project)
  return (
    <div
      className="rounded-[14px] border p-3.5 flex items-center justify-between gap-3 flex-wrap mb-2.5"
      style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface-card)' }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="rounded-full flex items-center justify-center text-white font-extrabold shrink-0"
          style={{ width: 50, height: 50, background: stringToColor(camp.id), fontSize: 16 }}
        >
          {camp.code.slice(-3).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>
            {CAMP_TYPE_LABEL[camp.type]}{project ? ` · ${project.name}` : ''}
          </div>
          <div className="font-extrabold text-[18px]" style={{ color: 'var(--qms-text)' }}>
            {camp.code}{camp.location ? ` — ${camp.location.city}${camp.location.state ? `, ${camp.location.state}` : ''}` : ''}
          </div>
          <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>
            {new Date(camp.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            {camp.timeSlot && ` · ${CAMP_TIME_SLOT_LABEL[camp.timeSlot]}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap justify-end">
        <span
          className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full tracking-wide"
          style={{ background: 'color-mix(in srgb, #10b981 14%, transparent)', color: '#10b981' }}
        >
          {camp.status}
        </span>
        <span
          className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full tracking-wide inline-flex items-center gap-1"
          style={{ background: 'rgba(124,92,255,.14)', color: '#7c5cff' }}
        >
          <FiShield size={11} /> PHARMA VIEW · PII REDACTED
        </span>
      </div>
    </div>
  )
}

const CampDetailsCard = ({ camp }: { camp: CampEntity }) => (
  <Card title="Camp details" icon={FiHome} color={CARD_ACCENTS.camp}>
    <FieldGrid>
      <Field label="Camp ID" value={camp.code} />
      <Field label="Type" value={CAMP_TYPE_LABEL[camp.type]} />
      <Field label="Status" value={camp.status} />
      <Field label="Date" value={`${new Date(camp.date).toLocaleDateString()}${camp.timeSlot ? ` · ${CAMP_TIME_SLOT_LABEL[camp.timeSlot]}` : ''}`} />
      <Field label="City / State" value={camp.location ? `${camp.location.city}${camp.location.state ? `, ${camp.location.state}` : ''}` : '—'} />
      <Field label="Address" value={camp.location?.addressLine1 ?? '—'} />
    </FieldGrid>
  </Card>
)

// Doctor's mobile/email/location are dropped from the camp's own populate (narrow .select()) —
// see md-files/BACKEND_REQUEST_camp-dossier.md #1. Shown honestly as "—" rather than faked.
const DoctorDetailsCard = ({ camp }: { camp: CampEntity }) => {
  const d = populatedDoctor(camp.doctor)
  if (!d) return null
  return (
    <Card title="Doctor details" icon={FiActivity} color={CARD_ACCENTS.doctor}>
      <div className="flex items-center gap-2.5 mb-2.5">
        <Avatar name={d.name} />
        <div>
          <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
          <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>
            {d.pharmaCode ?? d._id} · {specializationLabel(d.specialization)}
          </div>
        </div>
      </div>
      <FieldGrid>
        <Field label="Phone" value="—" />
        <Field label="Email" value="—" />
        <Field label="Clinic address" value="—" />
      </FieldGrid>
    </Card>
  )
}

const MrDetailsCard = ({ camp }: { camp: CampEntity }) => {
  const mr = populatedRole(camp.mr)
  if (!mr) return null
  return (
    <Card title="MR details" icon={FiUser} color={CARD_ACCENTS.worker}>
      <div className="flex items-center gap-2.5">
        <Avatar name={mr.name} />
        <div>
          <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>{mr.name}</div>
          <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>{mr.code}</div>
        </div>
      </div>
    </Card>
  )
}

const WorkerCard = ({ camp }: { camp: CampEntity }) => {
  const isDiet = camp.type === 'diet'
  const worker = populatedRole(isDiet ? camp.dietitian : camp.fo)
  if (!worker) return null
  return (
    <Card title="FO / Dietitian" icon={FiNavigation} color={CARD_ACCENTS.worker}>
      <div className="flex items-center gap-2.5">
        <Avatar name={worker.name} />
        <div>
          <div className="font-extrabold text-[13px]" style={{ color: 'var(--qms-text)' }}>{worker.name}</div>
          <div className="text-[11.5px]" style={{ color: 'var(--qms-text-muted)' }}>{isDiet ? 'Dietitian' : 'Field Officer'}</div>
        </div>
      </div>
    </Card>
  )
}

const PhotosCard = () => (
  <Card title="Camp photos" icon={FiImage} color={CARD_ACCENTS.photos}>
    <Empty>No photos uploaded yet.</Empty>
  </Card>
)

// Shell only — real data needs screenings-per-camp + tests-per-screening (N+1) + PII redaction;
// flagged in md-files/BACKEND_REQUEST_camp-dossier.md #2.
const PatientsCard = () => (
  <Card title="Patients · results · interpretation" icon={FiMapPin} color={CARD_ACCENTS.patients}>
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr style={{ borderBottom: '1px solid var(--qms-border)' }}>
            {['Code', 'Age', 'Gender', 'Identifier', 'Tests', 'Risk', 'Interpretation'].map((h) => (
              <th key={h} className="text-left font-extrabold text-[10px] uppercase tracking-wide px-2 py-1.5" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
      </table>
      <Empty>Patient results are coming together — check back shortly.</Empty>
    </div>
  </Card>
)

// Permission-gated rating display/action is shared with internal-frontend and
// PharmaCampDetailDrawer's RatingSection via @qms/widgets' CampRatingSection — this just supplies
// the dossier's own Card chrome and computes the app-specific policy (who's "the rater", and
// whether this viewer holds the rating:* permissions) before handing primitives to the widget,
// which has no opinion on either.
const RatingCard = ({ camp }: { camp: CampEntity }) => {
  const { session, hasAnyPermission } = useSession()
  const isOwnMr = !!session?.role.id && session.role.id === populatedRole(camp.mr)?._id
  const canCreate = isOwnMr && camp.status === 'closed' && hasAnyPermission(['rating:create', 'rating:manage'])

  return (
    <CampRatingSection
      campId={camp.id}
      ratingAccess={{
        canSearch: hasAnyPermission(['rating:search', 'rating:manage']),
        canReadOwn: hasAnyPermission(['rating:get', 'rating:search', 'rating:manage']),
        canCreate,
        canUpdate: hasAnyPermission(['rating:update', 'rating:manage']),
      }}
      api={api}
      toast={toast}
      getErrorMessage={getApiErrorMessage}
      wrapper={(content) => <Card title="FO / camp rating" icon={FiStar} color={CARD_ACCENTS.rating}>{content}</Card>}
    />
  )
}

interface CampDossierContentProps {
  camp: CampEntity
}

// Internal-only sections (Sales team, PO, Timing, Consumables, etc.) are omitted entirely for a pharma viewer.
const CampDossierContent = ({ camp }: CampDossierContentProps) => (
  <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
    <DossierHeader camp={camp} />
    <CampDetailsCard camp={camp} />
    <DoctorDetailsCard camp={camp} />
    <MrDetailsCard camp={camp} />
    <WorkerCard camp={camp} />
    <PhotosCard />
    <PatientsCard />
    <RatingCard camp={camp} />
    {camp.notes && (
      <Card title="Notes" icon={FiLock} color={CARD_ACCENTS.camp}>
        <p className="text-[13px]" style={{ color: 'var(--qms-text)' }}>{camp.notes}</p>
      </Card>
    )}
  </div>
)

export default CampDossierContent
