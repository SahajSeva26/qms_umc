import { useMemo } from 'react'
import { FiCheck } from 'react-icons/fi'
import type { Doctor, EngagementBand, EngagementStats } from '@/features/doctors/doctors.types'
import DoctorFilterBar, { type DoctorFilters } from '@/features/doctors/components/DoctorFilterBar'
import BandPill from '@/features/doctors/components/BandPill'
import { visibleDoctors } from '@/features/doctors/doctors.filter'
import { initials } from '@/features/doctors/doctors.ui'

interface RosterTabProps {
  doctors: Doctor[]
  engagementFor: (doctorId: string) => EngagementStats
  engagementBand: (e: EngagementStats) => EngagementBand
  filters: DoctorFilters
  onFilterChange: (patch: Partial<DoctorFilters>) => void
  onOpenDoctor: (id: string) => void
  broadcastIds: Set<string>
  onToggleBroadcast: (id: string) => void
}

const RosterTab = ({ doctors, filters, onFilterChange, engagementFor, engagementBand, onOpenDoctor, broadcastIds, onToggleBroadcast }: RosterTabProps) => {
  const specialties = useMemo(() => [...new Set(doctors.map((d) => d.specialty || 'Others'))].sort(), [doctors])
  const cities = useMemo(() => [...new Set(doctors.map((d) => d.city).filter(Boolean))].sort(), [doctors])

  const bandOf = (d: Doctor) => engagementBand(engagementFor(d.id))

  const list = useMemo(() => visibleDoctors(doctors, filters, bandOf), [doctors, filters, engagementFor, engagementBand])

  return (
    <div>
      <DoctorFilterBar filters={filters} onChange={onFilterChange} specialties={specialties} cities={cities} />

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
        {list.map((d) => {
          const stats = engagementFor(d.id)
          const band = bandOf(d)
          const isOn = broadcastIds.has(d.id)
          const showCheck = broadcastIds.size > 0 || isOn
          return (
            <div
              key={d.id}
              onClick={(ev) => {
                // Mirrors the prototype's bindRosterCards(): once any doctor is
                // selected (or on a shift-click), clicking toggles broadcast
                // selection instead of opening the drawer.
                if (broadcastIds.size > 0 || ev.shiftKey) onToggleBroadcast(d.id)
                else onOpenDoctor(d.id)
              }}
              className="relative rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', outline: isOn ? '2px solid var(--qms-brand)' : undefined }}
            >
              {showCheck && (
                <div
                  className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full border flex items-center justify-center"
                  style={{ borderColor: isOn ? 'var(--qms-brand)' : 'var(--qms-border)', background: isOn ? 'var(--qms-brand)' : 'var(--qms-surface)' }}
                >
                  {isOn && <FiCheck size={12} color="#fff" />}
                </div>
              )}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: 'linear-gradient(135deg,#3b6dff,#8b5cf6)' }}
                >
                  {initials(d.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{d.specialty}</div>
                  <div className="text-[10.5px] truncate" style={{ color: 'var(--qms-text-soft)' }}>{d.code} · {d.city}, {d.state}</div>
                </div>
                <BandPill band={band} />
              </div>

              <div className="grid grid-cols-4 gap-1.5 rounded-xl p-2 text-center" style={{ background: 'var(--qms-surface-strong)' }}>
                <div>
                  <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{stats.closedCount}</div>
                  <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Camps</div>
                </div>
                <div>
                  <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{stats.patients}</div>
                  <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Patients</div>
                </div>
                <div>
                  <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{stats.rx}</div>
                  <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Rx</div>
                </div>
                <div>
                  <div className="text-sm font-extrabold tabular-nums" style={{ color: 'var(--qms-text)' }}>{stats.avgRating || '—'}</div>
                  <div className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>★</div>
                </div>
              </div>
            </div>
          )
        })}
        {list.length === 0 && (
          <div className="col-span-full text-[13px] py-10 text-center" style={{ color: 'var(--qms-text-muted)' }}>
            No doctors match these filters.
          </div>
        )}
      </div>
    </div>
  )
}

export default RosterTab
