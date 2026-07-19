import { useMemo, useState } from 'react'
import {
  FiEdit2, FiPhone, FiMail, FiMapPin, FiAward, FiCheckCircle, FiClock, FiActivity, FiStar,
  FiCpu, FiFileText,
} from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import { Button } from '@/components/ui/button'
import KpiTile from '@/components/ui/KpiTile'
import EditProfileModal from '@/features/fo/components/workspace/EditProfileModal'
import { initials, avatarGradient, closedCampsOf, upcomingCampsOf } from '@/features/fo/components/fo.ui'
import { useFoTraining } from '@/features/fo/hooks/useFo'
import { formatDate } from '@/utils/formatters'

interface ProfileModuleProps {
  me: Person
  camps: Camp[]
  onNavigate: (moduleId: string) => void
}

const ProfileModule = ({ me, camps, onNavigate }: ProfileModuleProps) => {
  const [editOpen, setEditOpen] = useState(false)
  const [localMe, setLocalMe] = useState(me)
  const { training } = useFoTraining(me.id)

  const validCerts = training.filter((t) => t.status === 'VALID').length

  const closed = useMemo(() => closedCampsOf(camps), [camps])
  const upcoming = useMemo(() => upcomingCampsOf(camps), [camps])

  const quickLinks = [
    { id: 'attendance', label: 'My attendance', icon: FiClock },
    { id: 'devices', label: 'My devices', icon: FiCpu },
    { id: 'training', label: 'Training', icon: FiAward },
    { id: 'leave', label: 'Leave', icon: FiFileText },
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3.5">
            <div
              className="rounded-full flex items-center justify-center text-white font-bold text-[26px] shrink-0"
              style={{ width: 72, height: 72, background: avatarGradient(localMe) }}
            >
              {initials(localMe.name)}
            </div>
            <div>
              <div className="text-[18px] font-extrabold" style={{ color: 'var(--qms-text)' }}>{localMe.name}</div>
              <div className="flex items-center gap-3 text-[12.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>
                <span className="inline-flex items-center gap-1"><FiMail size={12} /> {localMe.email || '—'}</span>
                <span className="inline-flex items-center gap-1"><FiPhone size={12} /> {localMe.phone || '—'}</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  <FiMapPin size={11} /> {localMe.hq || '—'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>
                  {(localMe.states ?? []).join(', ') || '—'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>
                  <FiAward size={11} /> {validCerts} certs valid
                </span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><FiEdit2 size={13} /> Edit</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <KpiTile label="Closed camps" value={String(closed.length)} tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Upcoming" value={String(upcoming.length)} tone="teal" icon={FiClock} />
        <KpiTile label="Occupancy" value={`${localMe.occupancyPct ?? 0}%`} tone="amber" icon={FiActivity} />
        <KpiTile label="★ Rating" value={localMe.feedbackAvg ? localMe.feedbackAvg.toFixed(1) : '—'} tone="violet" icon={FiStar} />
      </div>

      <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: 'var(--qms-text-muted)' }}>Personal &amp; HR</div>
        <dl className="text-[13px] space-y-1.5">
          {[
            ['Joined', formatDate(localMe.joined)],
            ['Reports to', localMe.reportsTo ?? '—'],
            ['PAN', localMe.panMasked ?? '—'],
            ['Aadhar', localMe.aadharMasked ?? '—'],
            ['Salary', localMe.salaryInr ? `₹${localMe.salaryInr.toLocaleString('en-IN')}/mo` : '—'],
            ['DA rule', localMe.daRule ?? '—'],
            ['TA rule', localMe.taRule ?? '—'],
            ['Permanent address', localMe.permanentAddress ?? '—'],
            ['Temporary address', localMe.temporaryAddress ?? '—'],
            ['Devices assigned', String((localMe.machinesAssigned ?? []).length)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3">
              <dt style={{ color: 'var(--qms-text-muted)' }}>{label}</dt>
              <dd className="text-right truncate" style={{ color: 'var(--qms-text)' }}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-2.5" style={{ color: 'var(--qms-text-muted)' }}>Quick links</div>
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((link) => (
            <Button key={link.id} variant="ghost" className="justify-start" onClick={() => onNavigate(link.id)}>
              <link.icon size={13} /> {link.label}
            </Button>
          ))}
        </div>
      </div>

      <EditProfileModal
        open={editOpen}
        me={localMe}
        onClose={() => setEditOpen(false)}
        onSave={(patch) => setLocalMe((prev) => ({ ...prev, ...patch }))}
      />
    </div>
  )
}

export default ProfileModule
