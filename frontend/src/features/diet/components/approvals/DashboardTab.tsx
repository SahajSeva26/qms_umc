import { useMemo } from 'react'
import { FiDownload } from 'react-icons/fi'
import type { Camp } from '@/types/camp.types'
import {
  campRequiresBca, dietitianExpense, clientName, fmtInrCompact, dietitianName,
} from '@/features/diet/dietitians.service'
import { fmtDate, csvDownload } from './helpers'

interface DashboardTabProps {
  camps: Camp[]
}

function daysAgoIso(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function monthStartIso(): string {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10)
}

const PANEL_STYLE: React.CSSProperties = { background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }

function Panel({ title, subtitle, action, children, last }: { title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${last ? '' : 'mb-4'}`} style={PANEL_STYLE}>
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <h3 className="text-[13.5px] font-bold" style={{ color: 'var(--qms-text)' }}>{title}</h3>
          {subtitle && <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shrink-0"
      style={{ background: 'var(--qms-surface-strong)', color: 'var(--qms-text-soft)' }}
    >
      <FiDownload size={11} /> Export CSV
    </button>
  )
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-[12.5px] py-4 text-center" style={{ color: 'var(--qms-text-muted)' }}>{text}</p>
}

const DashboardTab = ({ camps }: DashboardTabProps) => {
  const today = new Date().toISOString().slice(0, 10)
  const monthStart = monthStartIso()
  const last7 = daysAgoIso(7)
  const last30 = daysAgoIso(30)

  const kpis = useMemo(() => {
    const todayCount = camps.filter((c) => c.date === today).length
    const last7Count = camps.filter((c) => c.date >= last7 && c.date <= today).length
    const mtdCount = camps.filter((c) => c.date >= monthStart && c.date <= today).length
    const pendingTotal = camps.filter((c) => !/CANCEL/i.test(c.status) && c.status !== 'CLOSED').length
    const bcaCamps = camps.filter((c) => campRequiresBca(c))
    const bcaCities = new Set(bcaCamps.map((c) => `${c.city}|${c.state}`))
    const bcaTransport = bcaCamps.reduce((s, c) => s + dietitianExpense(c).travel, 0)
    return { todayCount, last7Count, mtdCount, pendingTotal, bcaCamps, bcaCities, bcaTransport }
  }, [camps, today, last7, monthStart])

  const dailyBuckets = useMemo(() => {
    const map = new Map<string, number>()
    camps.forEach((c) => {
      if (c.date >= last30 && c.date <= today) map.set(c.date, (map.get(c.date) ?? 0) + 1)
    })
    const days: { date: string; count: number }[] = []
    for (let i = 30; i >= 0; i--) {
      const iso = daysAgoIso(i)
      days.push({ date: iso, count: map.get(iso) ?? 0 })
    }
    return days
  }, [camps, last30, today])
  const maxDaily = Math.max(1, ...dailyBuckets.map((d) => d.count))

  const pendingByPharma = useMemo(() => {
    const scopePending = camps.filter((c) => !/CANCEL/i.test(c.status) && c.status !== 'CLOSED')
    const map = new Map<string, { clientId: string; pending: number; requested: number; withDiet: number; withoutDiet: number; est: number }>()
    scopePending.forEach((c) => {
      const key = c.clientId
      const row = map.get(key) ?? { clientId: key, pending: 0, requested: 0, withDiet: 0, withoutDiet: 0, est: 0 }
      row.pending++
      if (c.status === 'REQUESTED') row.requested++
      if (c.dietitianId) row.withDiet++
      else row.withoutDiet++
      row.est += dietitianExpense(c).total
      map.set(key, row)
    })
    return Array.from(map.values()).sort((a, b) => b.pending - a.pending)
  }, [camps])

  const bcaByLocation = useMemo(() => {
    const map = new Map<string, { city: string; state: string; camps: number; expected: number; done: number; transport: number }>()
    kpis.bcaCamps.forEach((c) => {
      const key = `${c.city}|${c.state}`
      const row = map.get(key) ?? { city: c.city, state: c.state, camps: 0, expected: 0, done: 0, transport: 0 }
      row.camps++
      row.expected += Number(c.patientsExpected || 0)
      row.done += Number(c.patientsDone || c.patientCount || 0)
      row.transport += dietitianExpense(c).travel
      map.set(key, row)
    })
    return Array.from(map.values()).sort((a, b) => b.camps - a.camps)
  }, [kpis.bcaCamps])

  const bcaByDietitian = useMemo(() => {
    const map = new Map<string, { dietitianId: string; camps: number; base: number; transport: number; total: number }>()
    kpis.bcaCamps.forEach((c) => {
      const key = c.dietitianId || 'UNASSIGNED'
      const row = map.get(key) ?? { dietitianId: key, camps: 0, base: 0, transport: 0, total: 0 }
      const e = dietitianExpense(c)
      row.camps++
      row.base += e.base
      row.transport += e.travel
      row.total += e.total
      map.set(key, row)
    })
    return Array.from(map.values()).sort((a, b) => b.transport - a.transport)
  }, [kpis.bcaCamps])

  const mrWise = useMemo(() => {
    const map = new Map<string, { key: string; clientId: string; total: number; pending: number; closed: number; cancelled: number }>()
    camps.forEach((c) => {
      const key = c.mrId || c.mrName || 'UNASSIGNED'
      const row = map.get(key) ?? { key, clientId: c.clientId, total: 0, pending: 0, closed: 0, cancelled: 0 }
      row.total++
      if (c.status === 'CLOSED') row.closed++
      else if (/CANCEL/i.test(c.status)) row.cancelled++
      else row.pending++
      map.set(key, row)
    })
    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [camps])

  return (
    <div>
      <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))' }}>
        <KpiBlock label="Today's diet camps" value={String(kpis.todayCount)} color="#0d9488" caption={fmtDate(today)} />
        <KpiBlock label="Last 7 days" value={String(kpis.last7Count)} caption="rolling" />
        <KpiBlock label="Month-to-date" value={String(kpis.mtdCount)} caption={`since ${fmtDate(monthStart)}`} />
        <KpiBlock label="Pending total" value={String(kpis.pendingTotal)} color="#b91c1c" caption="not closed / cancelled" />
        <KpiBlock label="BCA-scale camps" value={String(kpis.bcaCamps.length)} caption={`across ${kpis.bcaCities.size} cities`} />
        <KpiBlock label="BCA transport ₹" value={fmtInrCompact(kpis.bcaTransport)} caption="scaled per camp" />
      </div>

      <Panel title="Daily diet-camp count · last 30 days">
        {dailyBuckets.every((d) => d.count === 0) ? (
          <EmptyRow text="No diet camps in the last 30 days." />
        ) : (
          <div className="flex items-end gap-0.5 overflow-x-auto" style={{ height: 80 }}>
            {dailyBuckets.map((d) => {
              const isToday = d.date === today
              const h = Math.max(6, Math.round((d.count / maxDaily) * 70))
              return (
                <div key={d.date} className="flex flex-col items-center justify-end shrink-0" style={{ width: 20, height: 80 }}>
                  <span className="text-[9.5px] font-bold mb-0.5" style={{ color: isToday ? '#0d9488' : '#475569' }}>{d.count}</span>
                  <div
                    style={{
                      width: 14, height: h, borderRadius: 3,
                      background: isToday ? 'linear-gradient(180deg,#14b8a6,#0ea5e9)' : '#cbd5e1',
                    }}
                  />
                  <span className="text-[8.5px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{d.date.slice(5)}</span>
                </div>
              )
            })}
          </div>
        )}
      </Panel>

      <Panel
        title={`Pending camps · Pharma-wise (${pendingByPharma.length})`}
        subtitle="Groupings of all not closed / not cancelled diet camps by company."
        action={pendingByPharma.length > 0 && (
          <ExportButton onClick={() => csvDownload('pending-pharma.csv', pendingByPharma.map((r) => ({
            Pharma: clientName(r.clientId), Pending: r.pending, Requested: r.requested,
            With_Dietitian: r.withDiet, Without_Dietitian: r.withoutDiet, Est_Remuneration_INR: r.est,
          })))} />
        )}
      >
        {pendingByPharma.length === 0 ? <EmptyRow text="No pending pharma camps in your scope." /> : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Pharma</Th><Th align="right">Pending</Th><Th align="right">Requested</Th>
                <Th align="right">With dietitian</Th><Th align="right">Without</Th><Th align="right">Est. remuneration</Th>
              </tr>
            </thead>
            <tbody>
              {pendingByPharma.map((r) => (
                <tr key={r.clientId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <Td>{clientName(r.clientId)}</Td>
                  <Td align="right"><b style={{ color: '#b91c1c' }}>{r.pending}</b></Td>
                  <Td align="right">{r.requested}</Td>
                  <Td align="right" style={{ color: '#047857' }}>{r.withDiet}</Td>
                  <Td align="right" style={{ color: '#92400e' }}>{r.withoutDiet}</Td>
                  <Td align="right"><b>{fmtInrCompact(r.est)}</b></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      <Panel
        title={`BCA Scale · location-wise (${bcaByLocation.length})`}
        subtitle="Body composition analysis camps by city — count, expected vs done patients, and transport cost."
        action={bcaByLocation.length > 0 && (
          <ExportButton onClick={() => csvDownload('bca-location.csv', bcaByLocation.map((r) => ({
            City: r.city, State: r.state, BCA_Camps: r.camps, Patients_Expected: r.expected, Patients_Done: r.done, Transport_INR: r.transport,
          })))} />
        )}
      >
        {bcaByLocation.length === 0 ? <EmptyRow text="No BCA-flagged diet camps in your scope." /> : (
          <TableWrap>
            <thead>
              <tr><Th>City</Th><Th>State</Th><Th align="right">Camps</Th><Th align="right">Expected</Th><Th align="right">Done</Th><Th align="right">Transport ₹</Th></tr>
            </thead>
            <tbody>
              {bcaByLocation.map((r) => (
                <tr key={`${r.city}|${r.state}`} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <Td><b>{r.city}</b></Td>
                  <Td>{r.state}</Td>
                  <Td align="right"><b>{r.camps}</b></Td>
                  <Td align="right">{r.expected}</Td>
                  <Td align="right" style={{ color: '#047857' }}>{r.done}</Td>
                  <Td align="right"><b>{fmtInrCompact(r.transport)}</b></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      <Panel
        title={`Remuneration · BCA Scale transport (${bcaByDietitian.length} dietitian${bcaByDietitian.length === 1 ? '' : 's'})`}
        subtitle="Per-dietitian transport remuneration for BCA-scale camps. Base = camp fee, Transport = scaled by distance."
        action={bcaByDietitian.length > 0 && (
          <ExportButton onClick={() => csvDownload('bca-dietitian-remuneration.csv', bcaByDietitian.map((r) => ({
            Dietitian: r.dietitianId === 'UNASSIGNED' ? 'Unassigned' : dietitianName(r.dietitianId), Dietitian_ID: r.dietitianId,
            Camps: r.camps, Base_INR: r.base, Transport_INR: r.transport, Total_INR: r.total,
          })))} />
        )}
      >
        {bcaByDietitian.length === 0 ? <EmptyRow text="No BCA-scale remuneration yet." /> : (
          <TableWrap>
            <thead>
              <tr><Th>Dietitian</Th><Th align="right">Camps</Th><Th align="right">Base ₹</Th><Th align="right">Transport ₹</Th><Th align="right">Total ₹</Th></tr>
            </thead>
            <tbody>
              {bcaByDietitian.map((r) => (
                <tr key={r.dietitianId} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <Td>
                    <b>{r.dietitianId === 'UNASSIGNED' ? 'Unassigned' : dietitianName(r.dietitianId)}</b>{' '}
                    <span style={{ color: 'var(--qms-text-muted)' }}>{r.dietitianId}</span>
                  </Td>
                  <Td align="right">{r.camps}</Td>
                  <Td align="right">{fmtInrCompact(r.base)}</Td>
                  <Td align="right"><b style={{ color: '#0d9488' }}>{fmtInrCompact(r.transport)}</b></Td>
                  <Td align="right"><b>{fmtInrCompact(r.total)}</b></Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>

      <Panel
        title={`MR-wise camp count (${mrWise.length})`}
        subtitle="Pharma rep activity in your scope — all diet camps grouped by MR."
        last
        action={mrWise.length > 0 && (
          <ExportButton onClick={() => csvDownload('mr-wise.csv', mrWise.map((r) => ({
            MR: r.key === 'UNASSIGNED' ? 'Unassigned' : r.key, Pharma: clientName(r.clientId),
            Total: r.total, Pending: r.pending, Closed: r.closed, Cancelled: r.cancelled,
          })))} />
        )}
      >
        {mrWise.length === 0 ? <EmptyRow text="No MR data yet." /> : (
          <TableWrap>
            <thead>
              <tr><Th>MR</Th><Th>Pharma</Th><Th align="right">Total</Th><Th align="right">Pending</Th><Th align="right">Closed</Th><Th align="right">Cancelled</Th></tr>
            </thead>
            <tbody>
              {mrWise.map((r) => (
                <tr key={r.key} className="border-t" style={{ borderColor: 'var(--qms-border)' }}>
                  <Td><b>{r.key === 'UNASSIGNED' ? 'Unassigned' : r.key}</b></Td>
                  <Td>{clientName(r.clientId)}</Td>
                  <Td align="right"><b>{r.total}</b></Td>
                  <Td align="right" style={{ color: '#b91c1c' }}>{r.pending}</Td>
                  <Td align="right" style={{ color: '#047857' }}>{r.closed}</Td>
                  <Td align="right" style={{ color: '#92400e' }}>{r.cancelled}</Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </div>
  )
}

function KpiBlock({ label, value, color, caption }: { label: string; value: string; color?: string; caption: string }) {
  return (
    <div className="rounded-xl border p-3.5" style={PANEL_STYLE}>
      <div className="text-[10.5px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--qms-text-muted)' }}>{label}</div>
      <div className="text-[21px] font-extrabold leading-tight" style={{ color: color || 'var(--qms-text)' }}>{value}</div>
      <div className="text-[11px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{caption}</div>
    </div>
  )
}

function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]" style={{ color: 'var(--qms-text)' }}>{children}</table>
    </div>
  )
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' | 'left' }) {
  return <th className={`py-1.5 px-2 font-semibold text-[11px] uppercase tracking-wide ${align === 'right' ? 'text-right' : 'text-left'}`} style={{ color: 'var(--qms-text-muted)' }}>{children}</th>
}

function Td({ children, align, style }: { children: React.ReactNode; align?: 'right' | 'left'; style?: React.CSSProperties }) {
  return <td className={`py-1.5 px-2 ${align === 'right' ? 'text-right' : 'text-left'}`} style={style}>{children}</td>
}

export default DashboardTab
