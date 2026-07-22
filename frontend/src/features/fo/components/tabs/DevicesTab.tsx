import { useMemo, useState } from 'react'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { DeviceCatalogItem } from '@/types/device.types'
import FoFilterBar, { type FoFilters } from '@/features/fo/components/FoFilterBar'
import { foLiveStatus } from '@/features/fo/components/fo.ui'

interface DevicesTabProps {
  fos: Person[]
  camps: Camp[]
  devices: DeviceCatalogItem[]
  onOpenFo: (id: string) => void
}

const DevicesTab = ({ fos, camps, devices, onOpenFo }: DevicesTabProps) => {
  const [filters, setFilters] = useState<FoFilters>({ state: 'ALL', status: 'ALL', search: '' })
  const onFilterChange = (patch: Partial<FoFilters>) => setFilters((prev) => ({ ...prev, ...patch }))
  const states = useMemo(() => [...new Set(fos.flatMap((f) => f.states ?? []))].sort(), [fos])

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return fos.filter((f) => {
      if (filters.state !== 'ALL' && !(f.states ?? []).includes(filters.state)) return false
      if (filters.status !== 'ALL' && foLiveStatus(f, camps) !== filters.status) return false
      if (q && !`${f.name} ${f.hq} ${f.phone}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [fos, camps, filters])

  return (
    <div>
      <FoFilterBar filters={filters} onChange={onFilterChange} states={states} />
      <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ background: 'var(--qms-surface-strong)' }}>
                <th className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)', width: 200 }}>Field Officer</th>
                <th className="text-left font-semibold px-3 py-2.5 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>Devices handed over</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((f) => {
                const chips = (f.machinesAssigned ?? []).map((id) => devices.find((d) => d.id === id)?.name ?? id)
                return (
                  <tr key={f.id} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-2.5">
                      <button onClick={() => onOpenFo(f.id)} className="text-left">
                        <div className="font-semibold truncate" style={{ color: 'var(--qms-text)' }}>{f.name}</div>
                        <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{f.hq}</div>
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      {chips.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {chips.map((c, i) => (
                            <span key={i} className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}>{c}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>No devices handed over.</span>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={2} className="text-center py-8 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No FOs match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default DevicesTab
