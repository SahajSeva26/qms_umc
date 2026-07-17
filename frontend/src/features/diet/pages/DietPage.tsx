import { useMemo, useState } from 'react'
import { FiHeart, FiUsers, FiVideo, FiCpu, FiBell, FiImage, FiPlus } from 'react-icons/fi'
import { useAuth } from '@/hooks/useAuth'
import { useDietCamps } from '@/features/diet/hooks/useDietCamps'
import { dietStage, dietViewOnly, isKam } from '@/features/diet/diet.utils'
import { scopedClientIds } from '@/types/salesdash.types'
import DietKpiStrip from '@/features/diet/components/DietKpiStrip'
import CampsTab from '@/features/diet/components/tabs/CampsTab'
import DietitiansTab from '@/features/diet/components/tabs/DietitiansTab'
import TeleDietitianTab from '@/features/diet/components/tabs/TeleDietitianTab'
import DevicesTab from '@/features/diet/components/tabs/DevicesTab'
import RemindersTab from '@/features/diet/components/tabs/RemindersTab'
import MediaTab from '@/features/diet/components/tabs/MediaTab'
import NewDietRequestModal from '@/features/diet/components/NewDietRequestModal'
import type { DietStage } from '@/features/diet/diet.types'

type TabId = 'camps' | 'dietitians' | 'tele' | 'devices' | 'reminders' | 'media'

const TABS: { id: TabId; label: string; icon: typeof FiHeart }[] = [
  { id: 'camps', label: 'Diet Camps', icon: FiHeart },
  { id: 'dietitians', label: 'Dietitians', icon: FiUsers },
  { id: 'tele', label: 'Tele Dietitian', icon: FiVideo },
  { id: 'devices', label: 'Devices', icon: FiCpu },
  { id: 'reminders', label: 'Reminders', icon: FiBell },
  { id: 'media', label: 'Media', icon: FiImage },
]

const DietPage = () => {
  const { user } = useAuth()
  const [tab, setTab] = useState<TabId>('camps')
  const [statusFilter, setStatusFilter] = useState<DietStage | 'ALL'>('ALL')
  const [newRequestOpen, setNewRequestOpen] = useState(false)
  const diet = useDietCamps()

  const viewOnly = dietViewOnly(user?.role)
  const kamScoped = isKam(user?.role)

  // AuthUser has no field linking a logged-in user to a people/rep id (same
  // root gap as CampReportSection.tsx's identical call) — passing user._id
  // here would silently never match ASSIGNMENTS' mock rep-ids (e.g.
  // 'p-riya'), so a KAM would see every client's diet camps unfiltered with
  // no sign the filter failed. Pass undefined honestly until the backend
  // adds a real user<->rep mapping; scopedClientIds resolves that to "no
  // scoping" rather than faking a match.
  const scopedIds = kamScoped ? scopedClientIds(user?.role, undefined) : null

  const camps = useMemo(() => {
    if (!scopedIds) return diet.camps
    return diet.camps.filter((c) => scopedIds.has(c.clientId))
  }, [diet.camps, scopedIds])

  const filteredCamps = useMemo(() => {
    if (statusFilter === 'ALL') return camps
    return camps.filter((c) => dietStage(c) === statusFilter)
  }, [camps, statusFilter])

  return (
    <div className="max-w-7xl">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Operations · Diet Camp Management</p>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--qms-text)' }}>Diet Camps</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {['Request-first flow', 'Dietitian master', 'State + city matching', '48h · 24h · 2h reminders', 'FO media uploads'].map((chip) => (
              <span key={chip} className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>{chip}</span>
            ))}
          </div>
        </div>
        {!viewOnly && (
          <button
            onClick={() => setNewRequestOpen(true)}
            className="flex items-center gap-1.5 text-[13px] font-bold px-3.5 py-2 rounded-xl text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}
          >
            <FiPlus size={14} /> New request
          </button>
        )}
      </div>

      <DietKpiStrip camps={camps} dietitians={diet.dietitians} media={diet.media} />

      <div className="flex flex-wrap gap-1 mb-4 border-b" style={{ borderColor: 'var(--qms-border)' }}>
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-semibold border-b-2 transition-colors"
              style={{
                color: tab === t.id ? 'var(--qms-text)' : 'var(--qms-text-muted)',
                borderBottomColor: tab === t.id ? 'var(--qms-brand)' : 'transparent',
              }}
            >
              <Icon size={13} /> {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'camps' && (
        <CampsTab
          camps={filteredCamps}
          dietitians={diet.dietitians}
          viewOnly={viewOnly}
          statusFilter={statusFilter}
          onSelectStatus={setStatusFilter}
          diet={diet}
        />
      )}
      {tab === 'dietitians' && <DietitiansTab dietitians={diet.dietitians} camps={camps} />}
      {tab === 'tele' && <TeleDietitianTab diet={diet} viewOnly={viewOnly} />}
      {tab === 'devices' && <DevicesTab dietitians={diet.dietitians} />}
      {tab === 'reminders' && <RemindersTab camps={camps} reminders={diet.reminders} viewOnly={viewOnly} diet={diet} />}
      {tab === 'media' && <MediaTab camps={camps} media={diet.media} />}

      <NewDietRequestModal
        open={newRequestOpen}
        onClose={() => setNewRequestOpen(false)}
        onConfirm={(camp) => { diet.newDietCampRequest(camp); setNewRequestOpen(false) }}
      />
    </div>
  )
}

export default DietPage
