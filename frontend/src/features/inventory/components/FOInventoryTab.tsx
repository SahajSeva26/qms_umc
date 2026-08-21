import { useState } from 'react'
import type { IconType } from 'react-icons'
import { FiUsers, FiCalendar, FiCpu, FiPackage } from 'react-icons/fi'
import { TbWallet } from 'react-icons/tb'
import { Button } from '@/components/ui/button'
import SideDrawer from '@/components/ui/SideDrawer'
import { useFoInventoryRows, useFoHoldings } from '@/features/inventory/hooks/useInventory'
import { inr, inrShort } from '@/features/inventory/inventory.service'
import type { FoHoldings } from '@/features/inventory/inventory.types'
import { EXPIRY_BAND_STYLE } from '@/features/inventory/constants/expiryBandStyle'
import { TableEmptyRow } from '@/features/inventory/components/IntelTableUi'

const BandPill = ({ css, label }: { css: 'green' | 'yellow' | 'orange' | 'red'; label: string }) => {
  const s = EXPIRY_BAND_STYLE[css]
  return (
    <span
      className="inline-flex items-center gap-1 font-bold rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: s.bg, color: s.fg }}
    >
      {label}
    </span>
  )
}

const KpiCard = ({ icon: Icon, color, label, value, sub }: { icon: IconType; color: string; label: string; value: string | number; sub: string }) => (
  <div
    className="flex-1 flex items-center gap-2.5 rounded-xl border"
    style={{ minWidth: 120, padding: 12, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}
  >
    <div className="w-8.5 h-8.5 rounded-[9px] grid place-items-center shrink-0 text-white" style={{ width: 34, height: 34, background: color }}>
      <Icon size={17} />
    </div>
    <div>
      <div className="text-xs font-bold leading-tight" style={{ color: 'var(--qms-text)' }}>{label}</div>
      <div className="text-lg font-extrabold" style={{ color: 'var(--qms-text)' }}>{value}</div>
      <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{sub}</div>
    </div>
  </div>
)

// Read-only drill-down table of every active Field Officer's rollup
// holdings; row click opens the shared per-FO holdings drawer.
const FOInventoryTab = () => {
  const { rows, units, people, isLoading } = useFoInventoryRows()
  const [openFoId, setOpenFoId] = useState<string | null>(null)

  const totField = rows.reduce((a, r) => a + r.h.totalValue, 0)
  const totDev = rows.reduce((a, r) => a + r.h.devices.length, 0)
  const totExp = rows.reduce((a, r) => a + r.h.expSoon, 0)

  const openFo = openFoId ? people.find((p) => p.id === openFoId) ?? null : null
  const openHoldings = useFoHoldings(openFoId, units, people)

  if (isLoading) {
    return (
      <div className="text-center" style={{ padding: 48, fontSize: 12, color: 'var(--qms-text-muted)' }}>
        Loading…
      </div>
    )
  }

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-3.5">
        <KpiCard icon={TbWallet} color="#3b6dff" label="Field valuation" value={inrShort(totField)} sub="held by FOs" />
        <KpiCard icon={FiUsers} color="#14b8a6" label="Field Officers" value={rows.length} sub={`${totDev} devices out`} />
        <KpiCard icon={FiCalendar} color={totExp ? '#f97316' : '#10b981'} label="Expiring kits" value={totExp} sub="consumables < 90d" />
      </div>

      <div className="rounded-2xl border overflow-auto" style={{ background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
        <table className="border-collapse text-xs" style={{ width: '100%', minWidth: 720 }}>
          <thead>
            <tr>
              {['Field Officer', 'Devices', 'Device value', 'Consumables', 'Consum. value', 'Total valuation', 'Expiry'].map((h, i) => (
                <th
                  key={h}
                  className={`text-left font-bold uppercase ${i > 0 && i < 6 ? 'text-right' : ''}`}
                  style={{ padding: '8px 6px', fontSize: 10, letterSpacing: '.04em', color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <TableEmptyRow colSpan={7}>No Field Officers found.</TableEmptyRow>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.p.id}
                  onClick={() => setOpenFoId(r.p.id)}
                  className="cursor-pointer hover:bg-[rgba(59,109,255,.03)]"
                >
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                    <b style={{ color: 'var(--qms-text)' }}>{r.p.name}</b>
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{r.p.hq || '—'}</div>
                  </td>
                  <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                    {r.h.devices.length}
                  </td>
                  <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                    {inr(r.h.deviceCurrent)}
                  </td>
                  <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                    {r.h.consumables.length}
                  </td>
                  <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                    {inr(r.h.consumableValue)}
                  </td>
                  <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                    <b>{inr(r.h.totalValue)}</b>
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                    {r.h.expSoon > 0 ? <BandPill css="orange" label={`${r.h.expSoon} soon`} /> : <BandPill css="green" label="OK" />}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <SideDrawer
        open={!!openFo}
        title={openFo ? `${openFo.name} · inventory` : ''}
        onClose={() => setOpenFoId(null)}
        widthClassName="max-w-[940px]"
      >
        {openFo && openHoldings && (
          <FoInventoryDrawerBody fo={openFo} holdings={openHoldings} onClose={() => setOpenFoId(null)} />
        )}
      </SideDrawer>
    </div>
  )
}

const FoInventoryDrawerBody = ({ fo, holdings, onClose }: { fo: { name: string; hq: string }; holdings: FoHoldings; onClose: () => void }) => {
  const initials = (fo.name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div>
      <div className="text-xs mb-3" style={{ color: 'var(--qms-text-muted)' }}>
        Holdings &amp; valuation · {fo.hq || '—'}
      </div>

      <div className="flex items-center gap-3.5 mb-3.5">
        <div
          className="rounded-[14px] grid place-items-center text-white font-extrabold shrink-0"
          style={{ width: 54, height: 54, background: 'linear-gradient(135deg,#3b6dff,#14b8a6)' }}
        >
          {initials}
        </div>
        <div>
          <div className="text-[18px] font-bold" style={{ color: 'var(--qms-text)' }}>{fo.name}</div>
          <div className="text-[13px]" style={{ color: 'var(--qms-text-soft)' }}>Field Officer · {fo.hq || '—'}</div>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap mb-3.5">
        <KpiCard icon={TbWallet} color="#3b6dff" label="Total valuation" value={inrShort(holdings.totalValue)} sub="current book value" />
        <KpiCard icon={FiCpu} color="#14b8a6" label="Devices" value={holdings.devices.length} sub={`${inrShort(holdings.deviceCurrent)} · repl ${inrShort(holdings.deviceReplace)}`} />
        <KpiCard icon={FiPackage} color="#10b981" label="Consumables" value={holdings.consumables.length} sub={`${inrShort(holdings.consumableValue)} on hand`} />
        <KpiCard icon={FiCalendar} color={holdings.expSoon ? '#f97316' : '#10b981'} label="Expiring soon" value={holdings.expSoon} sub="< 90 days" />
      </div>

      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-soft)' }}>
        <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-[7px] shrink-0" style={{ background: 'color-mix(in srgb, var(--qms-brand) 10%, transparent)', color: 'var(--qms-brand)' }}>
          <FiCpu size={12} />
        </span>
        Devices ({holdings.devices.length})
      </div>
      {holdings.devices.length === 0 ? (
        <div className="text-xs mb-3" style={{ color: 'var(--qms-text-muted)' }}>No devices assigned.</div>
      ) : (
        <div className="rounded-xl border overflow-auto mb-3" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
          <table className="border-collapse text-xs" style={{ width: '100%', minWidth: 560 }}>
            <thead>
              <tr>
                {['Serial', 'Device', 'Type', 'Current ₹', 'Replace ₹', 'Calibration'].map((h, i) => (
                  <th
                    key={h}
                    className={`text-left font-bold uppercase ${i === 3 || i === 4 ? 'text-right' : ''}`}
                    style={{ padding: '8px 6px', fontSize: 10, letterSpacing: '.04em', color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.devices.map((d) => (
                <tr key={d.sn + d.deviceId}>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}><b style={{ color: 'var(--qms-text)' }}>{d.sn}</b></td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{d.name}</td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}>{d.type}</td>
                  <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{inr(d.current)}</td>
                  <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{inr(d.replace)}</td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}>{d.calibDue || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wide mb-1.5" style={{ color: 'var(--qms-text-soft)' }}>
        <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded-[7px] shrink-0" style={{ background: 'color-mix(in srgb, var(--qms-brand) 10%, transparent)', color: 'var(--qms-brand)' }}>
          <FiPackage size={12} />
        </span>
        Consumables ({holdings.consumables.length})
      </div>
      {holdings.consumables.length === 0 ? (
        <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>No consumables held.</div>
      ) : (
        <div className="rounded-xl border overflow-auto" style={{ borderColor: 'var(--qms-border)', background: 'var(--qms-surface)' }}>
          <table className="border-collapse text-xs" style={{ width: '100%', minWidth: 560 }}>
            <thead>
              <tr>
                {['Item', 'Batch', 'Qty', 'Expiry', 'Value ₹'].map((h, i) => (
                  <th
                    key={h}
                    className={`text-left font-bold uppercase ${i === 2 || i === 4 ? 'text-right' : ''}`}
                    style={{ padding: '8px 6px', fontSize: 10, letterSpacing: '.04em', color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {holdings.consumables.map((c, i) => (
                <tr key={c.item.id + i}>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                    <b style={{ color: 'var(--qms-text)' }}>{c.item.name}</b>
                    <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{c.item.code}</div>
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}>{c.item.batchNo || '—'}</td>
                  <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                    {c.qty} {c.item.uom || ''}
                  </td>
                  <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                    {c.band ? <BandPill css={c.band.css} label={c.band.label} /> : '—'}
                  </td>
                  <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                    {inr(c.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex gap-2 mt-3.5">
        <Button variant="ghost" className="ml-auto" onClick={onClose}>Close</Button>
      </div>
    </div>
  )
}

export default FOInventoryTab
