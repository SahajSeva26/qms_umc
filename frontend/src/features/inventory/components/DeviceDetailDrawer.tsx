import { FiCpu, FiCreditCard as FiWallet, FiTool, FiLayers, FiInfo, FiHelpCircle, FiPackage, FiList, FiFileText, FiPlayCircle, FiShoppingCart } from 'react-icons/fi'
import SideDrawer from '@/components/ui/SideDrawer'
import { toast } from '@/components/ui/sonner'
import { personName } from '@/hooks/usePeopleData'
import type { Person } from '@/types/people.types'
import type { DeviceCatalogItem, DeviceFleet, InventoryUnit } from '@/features/inventory/inventory.types'
import { calibStatus, consumableStatus, inr, inrShort } from '@/features/inventory/inventory.service'
import { useConsumables } from '@/features/inventory/hooks/useInventory'

// Status pill colors — exact port of inventory.js's injected <style
// id="qms-inv-css"> .inv-status-OK/.inv-status-SOON/.inv-status-OVER/
// .inv-status-CRIT/.inv-status-LOW/.inv-status-HEALTH rules (this drawer
// renders both the calibStatus and consumableStatus vocabularies).
const STATUS_STYLE: Record<string, { bg: string; fg: string }> = {
  OK: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
  SOON: { bg: 'rgba(245,158,11,.15)', fg: '#d97706' },
  OVER: { bg: 'rgba(244,63,94,.15)', fg: 'var(--qms-rose-600, #e11d48)' },
  LOW: { bg: 'rgba(245,158,11,.15)', fg: '#d97706' },
  CRIT: { bg: 'rgba(244,63,94,.15)', fg: 'var(--qms-rose-600, #e11d48)' },
  HEALTH: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
}

function StatusPill({ code, label }: { code: string; label: string }) {
  const s = STATUS_STYLE[code] ?? { bg: 'var(--qms-surface-strong)', fg: 'var(--qms-text-muted)' }
  return (
    <span
      className="inline-flex items-center gap-1 font-bold uppercase tracking-[.04em] rounded-full"
      style={{ padding: '2px 8px', fontSize: 10, background: s.bg, color: s.fg }}
    >
      {label}
    </span>
  )
}

// Section heading — exact port of invOpenDevice()'s repeated section-title
// markup (dashed bottom border, 22px gradient icon tile, white icon).
// Previously reimplemented inline 4 times (Description/FAQ/Consumables/Units
// in fleet) — consolidated into one private component, same markup, same
// values. Intentionally distinct from the shared `components/ui/SectionHeader`
// (that one has no border and a translucent brand-tinted tile, not this
// drawer's gradient-filled one) — not interchangeable, kept local.
function DrawerSectionHeading({ icon: Icon, children }: { icon: typeof FiInfo; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-2.5 pb-2 border-b border-dashed text-xs font-bold uppercase tracking-[.04em]" style={{ borderColor: 'var(--qms-border)', color: 'var(--qms-text-soft)' }}>
      <span className="w-[22px] h-[22px] rounded-[7px] text-white grid place-items-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, var(--qms-brand), var(--qms-teal))' }}>
        <Icon size={13} />
      </span>
      {children}
    </div>
  )
}

interface DeviceDetailDrawerProps {
  device: DeviceCatalogItem | null
  fleet: DeviceFleet | null
  people: Person[]
  onClose: () => void
}

// Exact port of inventory.js's window.invOpenDevice() (lines 881-973) — the
// shared right-side drawer in its WIDE variant (min(940px,100%) vs the
// default min(640px,100%)). Structure: hero row → 4-cell id-kpi-grid →
// Description → (optional) FAQ → (optional) linked Consumables table →
// Units in fleet table (capped at 30 rows) → action row.
const DeviceDetailDrawer = ({ device, fleet, people, onClose }: DeviceDetailDrawerProps) => {
  const { consumables } = useConsumables()
  const linkedCons = device ? consumables.filter((c) => (c.deviceIds || []).includes(device.id)) : []
  const utilizationPct = fleet && fleet.total ? Math.round((fleet.deployed / fleet.total) * 100) : 0
  const shownUnits: InventoryUnit[] = fleet ? fleet.units.slice(0, 30) : []
  const extraUnits = fleet ? Math.max(0, fleet.units.length - 30) : 0

  return (
    <SideDrawer open={!!device} title={device?.name ?? 'Device'} onClose={onClose} widthClassName="max-w-[940px]">
      {device && fleet && (
        <div>
          {/* Hero row */}
          <div className="flex gap-3.5 items-start mb-3.5">
            <div
              className="w-[60px] h-[60px] rounded-2xl text-white grid place-items-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#3b6dff,#14b8a6)' }}
            >
              <FiCpu size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold tracking-[-.01em]" style={{ color: 'var(--qms-text)' }}>{device.name}</div>
              <div className="text-[13px]" style={{ color: 'var(--qms-text-soft)' }}>
                {device.type} · {device.vendor} · {device.model}
              </div>
              <div className="flex gap-1.5 flex-wrap mt-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full text-xs font-medium"
                  style={{ padding: '6px 10px', background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}
                >
                  <FiWallet size={11} /> {inr(device.pricePerUnit)} / unit
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full text-xs font-medium"
                  style={{ padding: '6px 10px', background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}
                >
                  <FiTool size={11} /> Calib {device.calibIntervalDays}d
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full text-xs font-medium"
                  style={{ padding: '6px 10px', background: 'var(--qms-surface-strong)', border: '1px solid var(--qms-border)', color: 'var(--qms-text-soft)' }}
                >
                  <FiLayers size={11} /> {device.paramCount} param{device.paramCount > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>

          {/* id-kpi-grid — 4 cells, 2-col under 720px */}
          <div className="grid gap-2.5 mb-3.5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            {[
              { l: 'Total fleet', v: String(fleet.total), d: inrShort(fleet.total * device.pricePerUnit) },
              { l: 'Deployed', v: String(fleet.deployed), d: `${utilizationPct}% utilization` },
              { l: 'Available', v: String(fleet.available), d: 'Ready to ship' },
              { l: 'Calib alerts', v: String(fleet.overdue + fleet.soon), d: `${fleet.overdue} overdue · ${fleet.soon} soon` },
            ].map((k) => (
              <div key={k.l} className="rounded-[14px] border" style={{ padding: 12, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)' }}>
                <div className="text-[10px] uppercase tracking-[.04em] font-semibold" style={{ color: 'var(--qms-text-muted)' }}>{k.l}</div>
                <div className="text-lg font-extrabold tracking-[-.02em] mt-0.5" style={{ color: 'var(--qms-text)' }}>{k.v}</div>
                <div className="text-[10px] mt-0.5" style={{ color: 'var(--qms-text-muted)' }}>{k.d}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          <DrawerSectionHeading icon={FiInfo}>Description</DrawerSectionHeading>
          <div className="rounded-xl border mb-3.5 text-[13px]" style={{ padding: 12, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>
            {device.laymanDescription || '—'}
          </div>

          {/* FAQ — conditional */}
          {device.faq && (
            <>
              <DrawerSectionHeading icon={FiHelpCircle}>FAQ</DrawerSectionHeading>
              <div className="rounded-xl border mb-3.5 text-xs whitespace-pre-line" style={{ padding: 12, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}>
                {device.faq}
              </div>
            </>
          )}

          {/* Consumables — conditional */}
          {linkedCons.length > 0 && (
            <>
              <DrawerSectionHeading icon={FiPackage}>{`Consumables (${linkedCons.length})`}</DrawerSectionHeading>
              <div className="overflow-x-auto mb-3.5">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>
                      {['SKU', 'Name', 'Stock', 'Per patient', 'Status'].map((h, i) => (
                        <th
                          key={h}
                          className={`text-left font-bold uppercase tracking-[.04em] ${i >= 2 && i <= 3 ? 'text-right' : ''}`}
                          style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {linkedCons.map((c) => {
                      const s = consumableStatus(c)
                      return (
                        <tr key={c.id} className="hover:bg-[rgba(59,109,255,.03)]">
                          <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                            <b style={{ color: 'var(--qms-text)' }}>{c.sku}</b>
                          </td>
                          <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{c.name}</td>
                          <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                            {c.stock} {c.uom}
                          </td>
                          <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                            {c.qtyPerPatient}
                          </td>
                          <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                            <StatusPill code={s.code} label={s.label} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Units in fleet */}
          <DrawerSectionHeading icon={FiList}>{`Units in fleet (${fleet.units.length})`}</DrawerSectionHeading>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  {['Serial', 'Status', 'Calibration', 'Assigned / location'].map((h) => (
                    <th
                      key={h}
                      className="text-left font-bold uppercase tracking-[.04em]"
                      style={{ padding: '8px 6px', fontSize: 10, color: 'var(--qms-text-muted)', borderBottom: '1px dashed var(--qms-border)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shownUnits.map((u) => {
                  const cs = calibStatus(u)
                  const assignedName = u.assignedTo ? personName(people, u.assignedTo) : ''
                  return (
                    <tr key={u.id} className="hover:bg-[rgba(59,109,255,.03)]">
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <b style={{ color: 'var(--qms-text)' }}>{u.sn}</b>
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{u.status}</td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                        <StatusPill code={cs.code} label={cs.label} />
                      </td>
                      <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                        {assignedName || u.location || '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {extraUnits > 0 && (
              <div className="text-xs mt-1.5" style={{ color: 'var(--qms-text-muted)' }}>+ {extraUnits} more units</div>
            )}
          </div>

          {/* Action row */}
          <div className="flex gap-2 mt-3.5 items-center flex-wrap">
            {device.userManualUrl && (
              <a
                href={device.userManualUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium"
                style={{ padding: '7px 12px', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
              >
                <FiFileText size={14} /> Manual
              </a>
            )}
            {device.videoUrl && (
              <a
                href={device.videoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium"
                style={{ padding: '7px 12px', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
              >
                <FiPlayCircle size={14} /> Video
              </a>
            )}
            <button
              onClick={() => toast.success('PO drafted')}
              className="inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium"
              style={{ padding: '7px 12px', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
            >
              <FiShoppingCart size={14} /> Procure more
            </button>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border text-xs font-medium ml-auto"
              style={{ padding: '7px 12px', borderColor: 'var(--qms-border)', color: 'var(--qms-text)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </SideDrawer>
  )
}

export default DeviceDetailDrawer
