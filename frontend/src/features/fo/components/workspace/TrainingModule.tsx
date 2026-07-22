import { useMemo, useState } from 'react'
import { FiAward, FiCheckCircle, FiAlertTriangle, FiXCircle } from 'react-icons/fi'
import type { Person } from '@/types/people.types'
import type { TrainingCategory, TrainingRecord, TrainingStatus } from '@/features/fo/fo.types'
import { TRAINING_CATALOG } from '@/features/fo/fo.types'
import { useFoTraining } from '@/features/fo/hooks/useFo'
import KpiTile from '@/components/ui/KpiTile'
import { Button } from '@/components/ui/button'
import TrainingVideoModal from '@/features/fo/components/workspace/TrainingVideoModal'
import FaqAccordion from '@/features/fo/components/workspace/FaqAccordion'
import { toast } from '@/components/ui/sonner'
import { formatDate } from '@/utils/formatters'

interface TrainingModuleProps {
  me: Person
}

type TrainingRow = TrainingRecord & { status: TrainingStatus }

const STATUS_STYLE: Record<TrainingStatus, { bg: string; color: string }> = {
  VALID: { bg: 'var(--success-soft)', color: 'var(--success)' },
  EXPIRED: { bg: 'var(--danger-soft)', color: 'var(--danger)' },
}

const CATEGORY_ORDER: TrainingCategory[] = ['SOP', 'Compliance', 'Device', 'Safety', 'Finance']

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

const TrainingModule = ({ me }: TrainingModuleProps) => {
  const { training, markComplete } = useFoTraining(me.id)
  const [openCode, setOpenCode] = useState<string | null>(null)

  const rows: TrainingRow[] = training

  const kpis = useMemo(() => {
    const valid = rows.filter((r) => r.status === 'VALID')
    const expiring = valid.filter((r) => { const d = daysUntil(r.expiresOn); return d >= 0 && d < 30 })
    const expired = rows.filter((r) => r.status === 'EXPIRED')
    return { courses: rows.length, valid: valid.length, expiring: expiring.length, expired: expired.length }
  }, [rows])

  const grouped = useMemo(() => {
    const byCat: Record<string, TrainingRow[]> = {}
    rows.forEach((r) => {
      const entry = TRAINING_CATALOG.find((t) => t.code === r.code)
      const cat = entry?.category ?? 'SOP'
      byCat[cat] = byCat[cat] ?? []
      byCat[cat].push(r)
    })
    return byCat
  }, [rows])

  const activeEntry = openCode ? TRAINING_CATALOG.find((t) => t.code === openCode) ?? null : null

  const handleMarkComplete = (code: string) => {
    markComplete(code)
    toast.success('Training marked complete — certification renewed')
    setOpenCode(null)
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))' }}>
        <KpiTile label="Courses" value={String(kpis.courses)} tone="brand" icon={FiAward} />
        <KpiTile label="Valid" value={String(kpis.valid)} tone="emerald" icon={FiCheckCircle} />
        <KpiTile label="Expiring < 30d" value={String(kpis.expiring)} tone="amber" icon={FiAlertTriangle} />
        <KpiTile label="Expired" value={String(kpis.expired)} tone="rose" icon={FiXCircle} />
      </div>

      {CATEGORY_ORDER.filter((cat) => grouped[cat]?.length).map((cat) => (
        <div key={cat} className="rounded-xl border overflow-hidden" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
          <div className="px-3.5 py-2.5 text-[12px] font-bold uppercase tracking-wide border-b" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-muted)' }}>{cat}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ background: 'var(--qms-surface-strong)' }}>
                  {['Code', 'Course', 'Score', 'Expires', 'Status', ''].map((h) => (
                    <th key={h} className="text-left font-semibold px-3 py-2 text-[11px] uppercase tracking-wide" style={{ color: 'var(--qms-text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grouped[cat].map((r) => (
                  <tr key={r.code} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--qms-text)' }}>{r.code}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text-soft)' }}>{TRAINING_CATALOG.find((t) => t.code === r.code)?.name ?? r.code}</td>
                    <td className="px-3 py-2" style={{ color: 'var(--qms-text)' }}>{r.score}</td>
                    <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--qms-text-muted)' }}>{formatDate(r.expiresOn)}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: STATUS_STYLE[r.status].bg, color: STATUS_STYLE[r.status].color }}>{r.status}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Button size="sm" variant="outline" onClick={() => setOpenCode(r.code)}>Open</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="rounded-xl border p-3.5" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <div className="text-[11px] font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>Frequently asked questions</div>
        <FaqAccordion />
      </div>

      <TrainingVideoModal open={!!openCode} entry={activeEntry} onClose={() => setOpenCode(null)} onMarkComplete={handleMarkComplete} />
    </div>
  )
}

export default TrainingModule
