import { FiChevronDown, FiChevronRight } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import type { ClientMr } from '@/types/client.types'
import { Button } from '@/components/ui/button'
import KeyValueGrid from '@/components/ui/KeyValueGrid'
import { mrCampsExecuted, serviceableCities } from '@/features/crm/clients/clients.utils'

interface MrListProps {
  mrs: ClientMr[]
  /** This division's camps — used for the per-MR executed count */
  camps: Camp[]
  selectedMrId: string | null
  onSelect: (mrId: string | null) => void
  onBookCamp: (mrId: string) => void
}

const MrList = ({ mrs, camps, selectedMrId, onSelect, onBookCamp }: MrListProps) => (
  <section className="mb-6">
    <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--qms-text-muted)' }}>
      Medical Representatives
    </div>
    <div className="space-y-2">
      {mrs.map((mr) => {
        const cities = serviceableCities(mr)
        const serviceable = cities.length > 0
        const executed = mrCampsExecuted(camps, mr.id)
        const isOpen = selectedMrId === mr.id
        return (
          <div
            key={mr.id}
            className="rounded-xl border"
            style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}
          >
            <div
              className="flex items-center gap-3 p-3 cursor-pointer"
              onClick={() => onSelect(isOpen ? null : mr.id)}
            >
              <span className="flex-1 min-w-0">
                <span className="block text-[13px] font-bold truncate" style={{ color: 'var(--qms-text)' }}>{mr.name}</span>
                <span className="block text-[11px] mt-0.5 truncate" style={{ color: 'var(--qms-text-muted)' }}>
                  {mr.designation} · {mr.hq}
                </span>
              </span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${serviceable ? 'bg-success-soft text-success' : 'bg-danger-soft text-danger'}`}
              >
                {serviceable ? 'Serviceable' : 'Non-serviceable'}
              </span>
              <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: 'var(--qms-text-soft)' }}>
                {executed} executed
              </span>
              <Button
                size="xs"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onBookCamp(mr.id)
                }}
              >
                Book camp
              </Button>
              {isOpen ? (
                <FiChevronDown size={14} className="shrink-0" style={{ color: 'var(--qms-text-muted)' }} />
              ) : (
                <FiChevronRight size={14} className="shrink-0" style={{ color: 'var(--qms-text-muted)' }} />
              )}
            </div>

            {isOpen && (
              <div className="px-4 pb-4 pt-3" style={{ borderTop: '1px solid var(--qms-border)' }}>
                <KeyValueGrid
                  columns={2}
                  items={[
                    { label: 'Designation', value: mr.designation },
                    { label: 'HQ · Region', value: `${mr.hq} · ${mr.region}` },
                    { label: 'Manager', value: mr.manager },
                    { label: 'Serviceability', value: cities.length ? cities.join(', ') : 'Non-serviceable' },
                    { label: 'Camps booked', value: mr.campsBooked },
                    { label: 'Doctors mapped', value: mr.doctorsMapped },
                    { label: 'Phone', value: mr.phone },
                    { label: 'Email', value: mr.email },
                  ]}
                />
              </div>
            )}
          </div>
        )
      })}
      {mrs.length === 0 && (
        <div
          className="rounded-xl border border-dashed p-6 text-center text-[12px]"
          style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}
        >
          No MRs mapped to this division yet.
        </div>
      )}
    </div>
  </section>
)

export default MrList
