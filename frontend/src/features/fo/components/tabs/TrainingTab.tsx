import { useEffect, useMemo, useState } from 'react'
import { FiRefreshCw } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { Camp } from '@/types/camp.types'
import type { TrainingRecord, TrainingStatus } from '@/features/fo/fo.types'
import { TRAINING_CATALOG } from '@/features/fo/fo.types'
import * as foService from '@/features/fo/fo.service'
import { initials, avatarGradient, stubRecertify, foLiveStatus } from '@/features/fo/components/fo.ui'
import FoFilterBar, { type FoFilters } from '@/features/fo/components/FoFilterBar'
import { formatDate } from '@/utils/formatters'

interface TrainingTabProps {
  fos: Person[]
  camps: Camp[]
}

type TrainingRow = TrainingRecord & { status: TrainingStatus }

const STATUS_STYLE: Record<TrainingStatus, { bg: string; color: string }> = {
  VALID: { bg: 'var(--success-soft)', color: 'var(--success)' },
  EXPIRED: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
}

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

const FoTrainingCard = ({ fo }: { fo: Person }) => {
  const [rows, setRows] = useState<TrainingRow[]>([])

  useEffect(() => {
    let cancelled = false
    foService.getTraining(fo.id).then((r) => { if (!cancelled) setRows(r) })
    return () => { cancelled = true }
  }, [fo.id])

  const valid = rows.filter((r) => r.status === 'VALID').length
  const soon = rows.filter((r) => r.status === 'VALID' && daysUntil(r.expiresOn) >= 0 && daysUntil(r.expiresOn) < 30).length
  const expired = rows.filter((r) => r.status === 'EXPIRED').length

  return (
    <div className="rounded-xl border overflow-hidden mb-3" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
      <div className="flex items-center gap-2.5 px-3.5 py-3 border-b" style={{ borderColor: 'var(--qms-border)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-[12px] shrink-0" style={{ background: avatarGradient(fo) }}>{initials(fo.name)}</div>
        <div className="min-w-0 flex-1">
          <div className="font-extrabold truncate" style={{ color: 'var(--qms-text)' }}>{fo.name}</div>
          <div className="text-[11px] truncate" style={{ color: 'var(--qms-text-muted)' }}>{fo.hq}</div>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}>✓ {valid} valid</span>
          {soon > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>⚠ {soon} expiring</span>}
          {expired > 0 && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>✕ {expired} expired</span>}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ background: 'var(--qms-surface-strong)' }}>
              {['Code', 'Name', 'Passed', 'Expires', 'Score', 'Status', ''].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{r.code}</td>
                <td className="px-3 py-2" style={{ color: 'var(--qms-text-soft)' }}>{TRAINING_CATALOG.find((t) => t.code === r.code)?.name ?? r.code}</td>
                <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(r.passedOn)}</td>
                <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(r.expiresOn)}</td>
                <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{r.score}</td>
                <td className="px-3 py-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLE[r.status].bg, color: STATUS_STYLE[r.status].color }}>{r.status}</span>
                </td>
                <td className="px-3 py-2">
                  {r.status === 'EXPIRED' && (
                    <button onClick={stubRecertify} aria-label="Re-certify" style={{ color: 'var(--qms-brand)' }}>
                      <FiRefreshCw size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const TrainingTab = ({ fos, camps }: TrainingTabProps) => {
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
      {filtered.map((fo) => <FoTrainingCard key={fo.id} fo={fo} />)}
      {filtered.length === 0 && <div className="text-center py-10 text-[13px]" style={{ color: 'var(--qms-text-muted)' }}>No FOs match the filter.</div>}
    </div>
  )
}

export default TrainingTab
