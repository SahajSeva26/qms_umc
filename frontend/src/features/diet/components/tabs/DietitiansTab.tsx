import { useState } from 'react'
import { FiCheckCircle, FiXCircle, FiPlus } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { Dietitian } from '@/features/diet/diet.types'
import { Button } from '@/components/ui/button'
import EnrollDietitianModal from '@/features/diet/components/EnrollDietitianModal'
import DietitianDetailDrawer from '@/features/diet/components/DietitianDetailDrawer'

interface DietitiansTabProps {
  dietitians: Dietitian[]
  camps: Camp[]
}

function initials(name: string) {
  return name.split(' ').map((x) => x[0]).slice(0, 2).join('').toUpperCase()
}

const DietitiansTab = ({ dietitians, camps }: DietitiansTabProps) => {
  const [enrollOpen, setEnrollOpen] = useState(false)
  const [openDietitianId, setOpenDietitianId] = useState<string | null>(null)

  const openDietitian = dietitians.find((d) => d.id === openDietitianId) ?? null

  return (
    <div>
      <div className="flex justify-end mb-3">
        <Button size="sm" onClick={() => setEnrollOpen(true)}>
          <FiPlus size={13} /> Enrol dietitian
        </Button>
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
        {dietitians.map((d) => {
          const dCamps = camps.filter((c) => c.dietitianId === d.id)
          return (
            <div
              key={d.id}
              onClick={() => setOpenDietitianId(d.id)}
              className="rounded-2xl border p-4 cursor-pointer transition-all hover:-translate-y-0.5"
              style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
            >
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-[12px] shrink-0" style={{ background: 'linear-gradient(135deg, #10b981, #14b8a6)' }}>
                  {initials(d.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{d.name}</div>
                  <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{d.city}, {d.state}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mb-3">
                <span
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: d.interviewed ? 'var(--success-soft)' : 'var(--danger-soft)', color: d.interviewed ? 'var(--success)' : 'var(--danger)' }}
                >
                  {d.interviewed ? <FiCheckCircle size={10} /> : <FiXCircle size={10} />} {d.interviewed ? 'Interviewed' : 'Not interviewed'}
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-muted)' }}>{d.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
                <div>Camps: <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>{dCamps.length}</span></div>
                <div>Rate: <span className="font-semibold" style={{ color: 'var(--qms-text)' }}>₹{d.remuneration}</span></div>
              </div>
            </div>
          )
        })}
      </div>

      <EnrollDietitianModal open={enrollOpen} onClose={() => setEnrollOpen(false)} />

      <DietitianDetailDrawer
        open={!!openDietitian}
        onClose={() => setOpenDietitianId(null)}
        dietitian={openDietitian}
        camps={camps}
      />
    </div>
  )
}

export default DietitiansTab
