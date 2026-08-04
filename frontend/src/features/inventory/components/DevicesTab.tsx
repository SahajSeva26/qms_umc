import { useMemo, useState } from 'react'
import { FiCpu, FiTool, FiLayers } from 'react-icons/fi'
import type { DeviceCatalogItem } from '@/features/inventory/inventory.types'
import { useDeviceCatalog, useDeviceFleetUnits } from '@/features/inventory/hooks/useInventory'
import { deviceFleet, inr } from '@/features/inventory/inventory.service'
import DeviceDetailDrawer from '@/features/inventory/components/DeviceDetailDrawer'

// Exact port of inventory.js's tabDevices() (lines 525-572) + renderFilter
// ('devices') (lines 384-403) + window.invOpenDevice() (lines 881-973).
// Catalog/type-level card grid — NOT per-serial (that's the Calibration
// tab) — one '.inv-dev-card' per DEVICE_CATALOG entry, each opening the
// shared wide drawer with the fleet's per-unit breakdown.
const DevicesTab = () => {
  const { devices } = useDeviceCatalog()
  const { units, people } = useDeviceFleetUnits()

  const [type, setType] = useState('ALL')
  const [q, setQ] = useState('')
  const [openDeviceId, setOpenDeviceId] = useState<string | null>(null)

  // typeOpts — ['ALL', ...distinct device().type values], exact port of
  // renderFilter's typeOpts (inventory.js:386).
  const typeOpts = useMemo(() => ['ALL', ...new Set(devices.map((d) => d.type))], [devices])

  // List filtering — exact port of tabDevices()'s cat.filter (inventory.js:527-532).
  const list = useMemo(() => {
    const query = q.trim().toLowerCase()
    return devices.filter((d) => {
      if (type !== 'ALL' && d.type !== type) return false
      if (query && !((d.name || '').toLowerCase().includes(query) || (d.type || '').toLowerCase().includes(query) || (d.vendor || '').toLowerCase().includes(query))) return false
      return true
    })
  }, [devices, type, q])

  const openDevice = devices.find((d) => d.id === openDeviceId) ?? null
  const openFleet = openDeviceId ? deviceFleet(units, openDeviceId) : null

  return (
    <div>
      {/* renderFilter('devices') — shared sticky .inv-filter bar. Devices tab
          shows only Type + Search (forTab !== 'calibration'/'consumables' so
          no extra status select). */}
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
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search..."
          className="rounded-lg border text-xs"
          style={{ padding: '6px 10px', borderColor: 'var(--qms-border)', background: 'var(--qms-surface)', minWidth: 200, color: 'var(--qms-text)' }}
        />
      </div>

      {list.length === 0 ? (
        <div
          className="text-center rounded-[14px]"
          style={{ padding: 40, fontSize: 11, color: 'var(--qms-text-muted)', border: '1.5px dashed var(--qms-border-strong)', background: 'rgba(36,81,240,.03)' }}
        >
          No devices match.
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
          {list.map((d) => (
            <DeviceCard key={d.id} device={d} units={units} onOpen={() => setOpenDeviceId(d.id)} />
          ))}
        </div>
      )}

      <DeviceDetailDrawer device={openDevice} fleet={openFleet} people={people} onClose={() => setOpenDeviceId(null)} />
    </div>
  )
}

interface DeviceCardProps {
  device: DeviceCatalogItem
  units: ReturnType<typeof useDeviceFleetUnits>['units']
  onOpen: () => void
}

// '.inv-dev-card' — exact port of tabDevices()'s per-device card markup
// (inventory.js:542-567).
const DeviceCard = ({ device, units, onOpen }: DeviceCardProps) => {
  const fleet = deviceFleet(units, device.id)
  const utilization = fleet.total ? Math.round((fleet.deployed / fleet.total) * 100) : 0

  return (
    <div
      onClick={onOpen}
      className="flex flex-col gap-2.5 rounded-2xl border cursor-pointer transition-transform hover:-translate-y-0.5"
      style={{ padding: 14, background: 'var(--qms-surface)', borderColor: 'var(--qms-border)', boxShadow: 'none' }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.06)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
    >
      {/* header row */}
      <div className="flex gap-3 items-center">
        <div
          className="w-11 h-11 rounded-xl text-white grid place-items-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b6dff, #14b8a6)' }}
        >
          <FiCpu size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-[.04em] font-bold" style={{ color: 'var(--qms-text-muted)' }}>{device.type}</div>
          <div className="text-sm font-bold leading-tight" style={{ color: 'var(--qms-text)' }}>{device.name}</div>
          <div className="text-[11px]" style={{ color: 'var(--qms-text-muted)' }}>
            {device.vendor} · {device.model} · {inr(device.pricePerUnit)}
          </div>
        </div>
      </div>

      <div className="text-xs" style={{ color: 'var(--qms-text-muted)' }}>{device.laymanDescription || ''}</div>

      {/* .inv-fleet — 3-cell stat strip */}
      <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        {[
          { v: fleet.total, l: 'Total' },
          { v: fleet.deployed, l: 'Deployed' },
          { v: fleet.available, l: 'Available' },
        ].map((s) => (
          <div key={s.l} className="rounded-lg text-center" style={{ padding: 8, background: 'rgba(59,109,255,.05)' }}>
            <b className="block text-lg font-extrabold" style={{ color: 'var(--qms-brand-700, #1d40c4)' }}>{s.v}</b>
            <div className="text-[9px] uppercase tracking-[.04em]" style={{ color: 'var(--qms-text-muted)' }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* utilization bar */}
      <div>
        <div className="text-xs mb-1" style={{ color: 'var(--qms-text-muted)' }}>Utilization · {utilization}%</div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,.06)' }}>
          <div className="h-full" style={{ width: `${utilization}%`, background: 'linear-gradient(90deg,#3b6dff,#14b8a6)' }} />
        </div>
      </div>

      {/* chip row */}
      <div className="flex gap-1.5 flex-wrap">
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
        {fleet.overdue > 0 && (
          <span
            className="inline-flex items-center gap-1 font-bold uppercase tracking-[.04em] rounded-full"
            style={{ padding: '2px 8px', fontSize: 10, background: 'rgba(244,63,94,.15)', color: 'var(--qms-rose-600, #e11d48)' }}
          >
            {fleet.overdue} overdue
          </span>
        )}
        {fleet.soon > 0 && (
          <span
            className="inline-flex items-center gap-1 font-bold uppercase tracking-[.04em] rounded-full"
            style={{ padding: '2px 8px', fontSize: 10, background: 'rgba(245,158,11,.15)', color: '#d97706' }}
          >
            {fleet.soon} due
          </span>
        )}
      </div>
    </div>
  )
}

export default DevicesTab
