import { useMemo, useState } from 'react'
import { FiShoppingCart } from 'react-icons/fi'
import { toast } from '@/components/ui/sonner'
import { useConsumables, useDeviceCatalog } from '@/features/inventory/hooks/useInventory'
import { consumableStatus, inr, raisePO } from '@/features/inventory/inventory.service'
import type { ConsumableStatusCode } from '@/features/inventory/inventory.types'

// Status pill colors — exact port of inventory.js's injected <style
// id="qms-inv-css"> .inv-status-CRIT/.inv-status-LOW/.inv-status-HEALTH
// rules. Only these 3 codes are ever rendered by this tab (OK/SOON/OVER
// belong to the Calibration tab's own status vocabulary).
const STATUS_STYLE: Record<ConsumableStatusCode, { bg: string; fg: string }> = {
  CRIT: { bg: 'rgba(244,63,94,.15)', fg: 'var(--qms-rose-600, #e11d48)' },
  LOW: { bg: 'rgba(245,158,11,.15)', fg: '#d97706' },
  HEALTH: { bg: 'rgba(16,185,129,.15)', fg: '#059669' },
}

const STATUS_FILTER_OPTIONS: { value: 'ALL' | ConsumableStatusCode; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'CRIT', label: 'Critical' },
  { value: 'LOW', label: 'Low' },
  { value: 'HEALTH', label: 'Healthy' },
]

// Exact port of inventory.js's tabConsumables() (lines 695-737) +
// renderFilter('consumables')/bindFilter (lines 384-411) + window
// .invRaisePO (lines 739-744). Reads window.QMS_MASTER.consumables /
// window.QMS_ADMIN.CONSUMABLES — a static catalog, NOT the Field
// Ops/Procurement item store (qms.inventory.items). No KPI tiles on this
// tab; all summary signal is per-row (Status pill + Days cover column).
const ConsumablesTab = () => {
  const { consumables } = useConsumables()
  const { devices } = useDeviceCatalog()

  // Local component state stands in for the prototype's shared mutable
  // `state.filter` object — filter SEMANTICS (which fields matched, which
  // codes) are kept identical.
  const [type, setType] = useState('ALL')
  const [status, setStatus] = useState<'ALL' | ConsumableStatusCode>('ALL')
  const [q, setQ] = useState('')

  // typeOpts — ['ALL', ...distinct device().type values], exact port. Note
  // (per the prototype's own code comment) this control is device-type
  // oriented and only weakly applies to a consumables list — kept as-is,
  // not redesigned.
  const typeOpts = useMemo(() => ['ALL', ...new Set(devices.map((d) => d.type))], [devices])

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    const list = consumables.filter((c) => {
      const stat = consumableStatus(c).code
      if (status !== 'ALL' && stat !== status) return false
      if (query && !(c.name.toLowerCase().includes(query) || c.sku.toLowerCase().includes(query) || c.vendor.toLowerCase().includes(query))) return false
      return true
    })

    // Cross-tab type filter doesn't quite apply to consumables, so we adapt
    // — exact port of the prototype's own comment + logic (inventory.js:705-707).
    if (type === 'ALL') return list
    return list.filter((c) => c.deviceIds.some((id) => devices.find((d) => d.id === id)?.type === type))
  }, [consumables, devices, type, status, q])

  const handleRaisePO = (sku: string) => {
    const result = raisePO(sku)
    if (result) toast.success(result.message)
  }

  return (
    <div>
      {/* renderFilter('consumables') — shared sticky .inv-filter bar */}
      <div
        className="flex gap-2 items-center flex-wrap mb-3 rounded-[10px] border sticky z-25"
        style={{ padding: '10px 12px', background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', top: 60 }}
      >
        <span className="text-xs font-bold uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>
          Filters
        </span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-lg border text-xs"
          style={{ padding: '6px 10px', borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text)' }}
        >
          {typeOpts.map((t) => (
            <option key={t} value={t}>{t === 'ALL' ? 'All types' : t}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'ALL' | ConsumableStatusCode)}
          className="rounded-lg border text-xs"
          style={{ padding: '6px 10px', borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', color: 'var(--qms-text)' }}
        >
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="rounded-lg border text-xs"
          style={{ padding: '6px 10px', borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', minWidth: 200, color: 'var(--qms-text)' }}
        />
      </div>

      {/* .inv-card padding:0;overflow:hidden — clips, does not scroll. Uses
          --qms-surface-card (not --qms-surface, which is the translucent
          glass-panel token) to match the prototype's --card CSS var used by
          .inv-card. */}
      <div className="rounded-[14px] border overflow-hidden" style={{ background: 'var(--qms-surface-card)', borderColor: 'var(--qms-border)' }}>
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              {['SKU', 'Item', 'Category', 'Vendor', 'Stock', 'Reorder', 'Days cover', 'Status', 'Unit ₹', ''].map((h) => (
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center" style={{ padding: 20, color: 'var(--qms-text-muted)' }}>
                  No items match.
                </td>
              </tr>
            ) : (
              rows.map((c) => {
                const stat = consumableStatus(c)
                const sc = STATUS_STYLE[stat.code]
                return (
                  <tr key={c.id} className="hover:bg-[rgba(59,109,255,.03)]">
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      <b style={{ color: 'var(--qms-text)' }}>{c.sku}</b>
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>{c.name}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}>{c.category}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text-soft)' }}>{c.vendor}</td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {c.stock} {c.uom}
                    </td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {c.reorderLevel}
                    </td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {stat.daysCover ?? '—'}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      <span
                        className="inline-flex items-center gap-1 font-bold uppercase tracking-[.04em] rounded-full"
                        style={{ padding: '2px 8px', fontSize: 10, background: sc.bg, color: sc.fg }}
                      >
                        {stat.label}
                      </span>
                    </td>
                    <td className="text-right tabular-nums" style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)', color: 'var(--qms-text)' }}>
                      {inr(c.pricePerUnit)}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px dashed var(--qms-border)' }}>
                      {(stat.code === 'LOW' || stat.code === 'CRIT') && (
                        // .btn.btn-ghost, padding overridden inline to 3px 8px
                        // (smaller than the standard .btn 11px 16px) — exact
                        // port of tabConsumables()'s Raise PO button markup.
                        <button
                          onClick={() => handleRaisePO(c.id)}
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold rounded-[14px] border transition-colors hover:[background:var(--qms-surface-strong)] hover:text-qms-text"
                          style={{ padding: '3px 8px', fontSize: 14, color: 'var(--qms-text-soft)', borderColor: 'var(--qms-border-strong)', background: 'transparent' }}
                        >
                          <FiShoppingCart size={13} /> Raise PO
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ConsumablesTab
