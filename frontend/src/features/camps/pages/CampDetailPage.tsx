import { useNavigate, useParams } from 'react-router-dom'
import { FiArrowLeft, FiPrinter } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { useCamps } from '@/features/camps/hooks/useCamps'
import { perspectiveForRole } from '@/features/camps/camps.perspective'
import DossierHeader from '@/features/camps/components/DossierHeader'
import {
  CampDetailsSection,
  DoctorSection,
  MrSection,
  FieldSection,
  CoordinatorSection,
  SalesSection,
  PoSection,
  TimingSection,
} from '@/features/camps/components/dossier/CampInfoSections'
import PhotosSection from '@/features/camps/components/dossier/PhotosSection'
import PatientsSection from '@/features/camps/components/dossier/PatientsSection'
import {
  ConsumablesSection,
  ExpensesSection,
  RatingSection,
  RemarksSection,
  PaymentSection,
  EffortsSection,
  RemindersSection,
  DietitianCoordSection,
} from '@/features/camps/components/dossier/FinanceSections'

// Literal path (not imported from camps.routes.tsx) — that file imports this
// component, so importing back from it here would be a circular module
// dependency (same pattern as AnalyticsPage.tsx / CampDrawer.tsx).
const CAMPS_LIST_PATH = '/camps'

const CampDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { camps } = useCamps()

  const camp = camps.find((c) => c.id === id)
  const perspective = perspectiveForRole(user?.role)

  if (!camp) {
    return (
      <div className="max-w-2xl">
        <button
          onClick={() => navigate(CAMPS_LIST_PATH)}
          className="flex items-center gap-1.5 text-[13px] font-semibold mb-5 transition-colors hover:opacity-80"
          style={{ color: 'var(--qms-text-soft)' }}
        >
          <FiArrowLeft size={14} /> Back to camps
        </button>
        <p className="text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>
          Camp not found.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate(CAMPS_LIST_PATH)}
          className="flex items-center gap-1.5 text-[13px] font-semibold transition-colors hover:opacity-80"
          style={{ color: 'var(--qms-text-soft)' }}
        >
          <FiArrowLeft size={14} /> Back to camps
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all hover:bg-(--qms-surface-hover)"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}
        >
          <FiPrinter size={13} /> Print / Export
        </button>
      </div>

      <DossierHeader camp={camp} perspective={perspective} />
      <CampDetailsSection camp={camp} perspective={perspective} />
      <DoctorSection camp={camp} perspective={perspective} />
      <MrSection camp={camp} perspective={perspective} />
      <FieldSection camp={camp} perspective={perspective} />
      <CoordinatorSection camp={camp} perspective={perspective} />
      <SalesSection camp={camp} perspective={perspective} />
      <PoSection camp={camp} perspective={perspective} />
      <TimingSection camp={camp} perspective={perspective} />
      <PhotosSection camp={camp} />
      <DietitianCoordSection camp={camp} perspective={perspective} />
      <PatientsSection camp={camp} perspective={perspective} />
      <ConsumablesSection camp={camp} perspective={perspective} />
      <ExpensesSection camp={camp} perspective={perspective} />
      <RatingSection camp={camp} perspective={perspective} />
      <RemarksSection camp={camp} perspective={perspective} />
      <PaymentSection camp={camp} perspective={perspective} />
      <EffortsSection camp={camp} perspective={perspective} />
      <RemindersSection camp={camp} perspective={perspective} />
    </div>
  )
}

export default CampDetailPage
