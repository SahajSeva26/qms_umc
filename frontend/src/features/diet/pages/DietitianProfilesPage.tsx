import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FiUserPlus } from 'react-icons/fi'
import { useCampsData } from '@/hooks/useCampsData'
import { useAuth } from '@/hooks/useAuth'
import { dietitianRoster, dietitianProfileBundle } from '@/features/diet/dietitians.service'
import type { DietitianRosterEntry } from '@/features/diet/dietitians.types'
import PickerView from '@/features/diet/components/profile/PickerView'
import HeroHeader from '@/features/diet/components/profile/HeroHeader'
import OnboardingSection from '@/features/diet/components/profile/OnboardingSection'
import KpiStrip from '@/features/diet/components/profile/KpiStrip'
import PersonalHrCard from '@/features/diet/components/profile/PersonalHrCard'
import BcaEquipmentCard from '@/features/diet/components/profile/BcaEquipmentCard'
import RateTrendSection from '@/features/diet/components/profile/RateTrendSection'
import ProjectBreakdownCard from '@/features/diet/components/profile/ProjectBreakdownCard'
import FeedbacksCard from '@/features/diet/components/profile/FeedbacksCard'
import CampHistorySection from '@/features/diet/components/profile/CampHistorySection'
import PaymentLedgerSection from '@/features/diet/components/profile/PaymentLedgerSection'
import BankAccountsSection from '@/features/diet/components/profile/BankAccountsSection'
import AddDietitianModal from '@/features/diet/components/profile/AddDietitianModal'

// Dietitian Profiles screen (/diet/profiles) — faithful React port of the
// prototype's dietitian-profile.js. Picker view when no ?id=, full profile
// (hero + KPIs + onboarding + BCA + rate trend + project breakdown +
// feedbacks + camp history + payment ledger + bank accounts) when present.
// dietitianProfileBundle() from dietitians.service.ts is the single source
// of truth for almost every number on this page — see individual section
// components under features/diet/components/profile/ for the per-section
// spec citations.
const DietitianProfilesPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { camps } = useCampsData()
  const { user } = useAuth()
  const userName = user ? `${user.firstName} ${user.lastName}`.trim() : 'QMS Ops'

  const [refreshTick, setRefreshTick] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const bump = () => setRefreshTick((t) => t + 1)

  const id = searchParams.get('id')

  const roster = useMemo(() => dietitianRoster(), [refreshTick])

  const bundle = useMemo(() => {
    if (!id) return null
    return dietitianProfileBundle(id, camps)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, camps, refreshTick])

  const handleCreated = (rec: DietitianRosterEntry) => {
    setAddOpen(false)
    navigate(`/diet/profiles?id=${rec.id}`)
  }

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <div className="text-[12px] mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Diet · Profile</div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Dietitian Profile</h1>
          <p className="text-[12.5px] mt-1" style={{ color: 'var(--qms-text-muted)' }}>
            Camps · payments · rate trend · ratings · BCA · banking · stock movement · feedbacks · project-wise breakdown.
          </p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
        >
          <FiUserPlus size={14} /> Add Dietitian
        </button>
      </div>

      {!id && <PickerView roster={roster} />}

      {id && !bundle && (
        <div className="rounded-xl border p-6 text-center" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <p className="text-[14px] font-semibold mb-2" style={{ color: 'var(--qms-text)' }}>Dietitian {id} not found.</p>
          <Link to="/diet/profiles" className="text-[13px] font-bold" style={{ color: 'var(--qms-brand)' }}>← Back to picker</Link>
        </div>
      )}

      {id && bundle && (
        <div className="flex flex-col gap-4">
          <HeroHeader bundle={bundle} />

          <OnboardingSection bundle={bundle} onChanged={bump} />

          <KpiStrip bundle={bundle} />

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <PersonalHrCard bundle={bundle} />
            <BcaEquipmentCard bundle={bundle} userName={userName} onChanged={bump} />
          </div>

          <RateTrendSection bundle={bundle} />

          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
            <ProjectBreakdownCard bundle={bundle} />
            <FeedbacksCard bundle={bundle} />
          </div>

          <CampHistorySection bundle={bundle} />
          <PaymentLedgerSection bundle={bundle} />
          <BankAccountsSection bundle={bundle} onChanged={bump} />
        </div>
      )}

      <AddDietitianModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={handleCreated} />
    </div>
  )
}

export default DietitianProfilesPage
